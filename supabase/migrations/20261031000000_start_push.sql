-- "Sam's 30th is today": one push to everyone on an event on its first day,
-- from 09:00 in the group's timezone. Sent the same way as reveal alerts:
-- whichever comes first, once, recorded in start_pushes.

create table private.start_pushes (
  event_id uuid primary key references public.events (id) on delete cascade,
  pushed_at timestamptz not null default now()
);
revoke all on private.start_pushes from public, anon, authenticated;

create function private.claim_start_pushes(p_event_ids uuid[], p_except uuid)
returns table (endpoint text, keys jsonb, event_id uuid, event_name text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    insert into private.start_pushes (event_id)
    select e.id
    from public.events e
    join public.groups g on g.id = e.group_id
    where e.id = any (p_event_ids)
      and (now() at time zone g.timezone)::date = e.start_date
      and (now() at time zone g.timezone)::time >= time '09:00'
      and not private.is_revealed(e.id)
    on conflict do nothing
    returning private.start_pushes.event_id
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

create function public.start_push_targets()
returns table (endpoint text, keys jsonb, event_id uuid, event_name text)
language sql
security definer
set search_path = ''
as $$
  select * from private.claim_start_pushes(
    array(
      select e.id
      from public.events e
      join public.group_members m on m.group_id = e.group_id
      where m.user_id = (select auth.uid())
        and e.start_date between current_date - 1 and current_date + 1
        and not exists (select 1 from private.start_pushes s where s.event_id = e.id)
    ),
    (select auth.uid())
  )
$$;

create function public.due_start_push_targets(p_secret text)
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
  select * from private.claim_start_pushes(
    array(
      select e.id from public.events e
      where e.start_date between current_date - 1 and current_date + 1
        and not exists (select 1 from private.start_pushes s where s.event_id = e.id)
    ),
    null
  );
end
$$;

revoke execute on function private.claim_start_pushes(uuid[], uuid) from public, anon, authenticated;
revoke execute on function public.start_push_targets() from public, anon;
revoke execute on function public.due_start_push_targets(text) from public;
grant execute on function public.start_push_targets() to authenticated;
grant execute on function public.due_start_push_targets(text) to anon, authenticated;
