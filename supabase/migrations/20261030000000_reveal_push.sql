-- "Lisbon is out": a push to everyone on an event when it reveals.
--
-- Reveals happen on a clock, so something has to notice. Three things can,
-- and whichever comes first sends it (once, recorded in reveal_pushes):
-- * the host pressing Reveal now,
-- * anyone in the group opening the app after the reveal time,
-- * a scheduled job (Vercel cron), if a shared secret is set below.

create table private.reveal_pushes (
  event_id uuid primary key references public.events (id) on delete cascade,
  pushed_at timestamptz not null default now()
);

-- Holds the cron secret. Set it with:
--   insert into private.secrets (name, value) values ('cron', '<secret>')
--   on conflict (name) do update set value = excluded.value;
create table private.secrets (
  name text primary key,
  value text not null
);
revoke all on private.reveal_pushes, private.secrets from public, anon, authenticated;

-- Claims events for pushing (so two callers can't both send) and returns who
-- to push. Only events revealed in the last two days, so old ones stay quiet.
-- p_except leaves one person out: whoever triggered it is already looking.
create function private.claim_reveal_pushes(p_event_ids uuid[], p_except uuid)
returns table (endpoint text, keys jsonb, event_id uuid, event_name text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    insert into private.reveal_pushes (event_id)
    select e.id
    from public.events e
    join public.groups g on g.id = e.group_id
    where e.id = any (p_event_ids)
      and private.reveal_at(e.type, e.end_date, g.timezone, e.revealed_at_override) between now() - interval '2 days' and now()
    on conflict do nothing
    returning private.reveal_pushes.event_id
  )
  select s.endpoint, s.keys, e.id, e.name
  from due
  join public.events e on e.id = due.event_id
  join public.event_members em on em.event_id = e.id
  join public.group_members m on m.id = em.member_id
  join public.push_subscriptions s on s.user_id = m.user_id
  where p_except is null or m.user_id <> p_except;
end
$$;

-- From the app: events in your groups that have revealed and not been
-- announced yet.
create function public.reveal_push_targets()
returns table (endpoint text, keys jsonb, event_id uuid, event_name text)
language sql
security definer
set search_path = ''
as $$
  select * from private.claim_reveal_pushes(
    array(
      select e.id
      from public.events e
      join public.group_members m on m.group_id = e.group_id
      where m.user_id = (select auth.uid())
        and not exists (select 1 from private.reveal_pushes r where r.event_id = e.id)
    ),
    (select auth.uid())
  )
$$;

-- From the scheduled job: every event that's due, if the secret matches.
create function public.due_reveal_push_targets(p_secret text)
returns table (endpoint text, keys jsonb, event_id uuid, event_name text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_secret is null or not exists (select 1 from private.secrets where name = 'cron' and value = p_secret) then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  return query
  select * from private.claim_reveal_pushes(
    array(
      select e.id from public.events e
      where e.end_date >= current_date - 3
        and not exists (select 1 from private.reveal_pushes r where r.event_id = e.id)
    ),
    null
  );
end
$$;

revoke execute on function private.claim_reveal_pushes(uuid[], uuid) from public, anon, authenticated;
revoke execute on function public.reveal_push_targets() from public, anon;
revoke execute on function public.due_reveal_push_targets(text) from public;
grant execute on function public.reveal_push_targets() to authenticated;
grant execute on function public.due_reveal_push_targets(text) to anon, authenticated;
