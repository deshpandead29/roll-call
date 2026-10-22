-- Web Push. Devices register themselves; when someone calls roll, the server
-- fetches the recipients' subscriptions once (through the caller's session,
-- straight after the call) and sends "Priya called roll". Snoozed and home
-- people aren't buzzed; they see the call in the app.

alter table public.roll_calls add column pushed_at timestamptz;

-- Saves this device's subscription for the signed-in user. A device that
-- changes hands moves to the new account.
create function public.save_push_subscription(p_endpoint text, p_keys jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  if p_endpoint !~ '^https://' or p_keys ->> 'p256dh' is null or p_keys ->> 'auth' is null then
    raise exception 'That isn''t a push subscription.' using errcode = '22023';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, keys)
  values ((select auth.uid()), p_endpoint, p_keys)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, keys = excluded.keys, created_at = now();
end
$$;

-- Who to buzz for a call. Only the caller, only within a minute of calling,
-- and only once per call.
create function public.roll_call_push_targets(p_roll_call_id uuid)
returns table (endpoint text, keys jsonb, caller_name text, event_id uuid, event_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  rc public.roll_calls;
begin
  select c.* into rc
  from public.roll_calls c
  join public.group_members m on m.id = c.caller_member_id
  where c.id = p_roll_call_id and m.user_id = (select auth.uid());
  if rc.id is null then
    raise exception 'Not your call.' using errcode = '42501';
  end if;
  if rc.pushed_at is not null or rc.called_at < now() - interval '1 minute' then
    return;
  end if;
  update public.roll_calls set pushed_at = now() where id = rc.id;

  return query
  select s.endpoint, s.keys, caller.display_name, e.id, e.name
  from unnest(rc.recipients) as r(member_id)
  join public.group_members m on m.id = r.member_id
  join public.push_subscriptions s on s.user_id = m.user_id
  join public.group_members caller on caller.id = rc.caller_member_id
  join public.events e on e.id = rc.event_id
  left join public.member_status st on st.event_id = rc.event_id and st.member_id = r.member_id
  where coalesce(st.snooze_until, '-infinity') <= now()
    and not coalesce(st.home, false);
end
$$;

-- Drops subscriptions the push service says are gone, limited to the
-- recipients of a call the user made.
create function public.forget_push_subscriptions(p_roll_call_id uuid, p_endpoints text[])
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions s
  using public.roll_calls c
  join public.group_members caller on caller.id = c.caller_member_id
  where c.id = p_roll_call_id
    and caller.user_id = (select auth.uid())
    and s.endpoint = any (p_endpoints)
    and s.user_id in (select m.user_id from public.group_members m where m.id = any (c.recipients))
$$;

revoke execute on function public.save_push_subscription(text, jsonb) from public, anon;
revoke execute on function public.roll_call_push_targets(uuid) from public, anon;
revoke execute on function public.forget_push_subscriptions(uuid, text[]) from public, anon;
grant execute on function public.save_push_subscription(text, jsonb) to authenticated;
grant execute on function public.roll_call_push_targets(uuid) to authenticated;
grant execute on function public.forget_push_subscriptions(uuid, text[]) to authenticated;
