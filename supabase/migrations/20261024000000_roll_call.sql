-- Roll Call rules, enforced on the server in one place. The same check drives
-- the button (roll_state) and the write (call_roll), so what the app says
-- and what the server allows can't drift apart. call_roll locks the event row,
-- so two people pressing at once are handled one after the other and the
-- second sees the first's call (cooldown, budget).

-- Whether `p_member_id` can call roll on `p_event_id` right now, and why not.
create function private.roll_check(p_event_id uuid, p_member_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ev public.events;
  tz text;
  today date;
  revealed boolean;
  live boolean;
  cooldown int;
  open_total int;
  reserved_total int;
  used_open int;
  reserved_used boolean;
  last_at timestamptz;
  remaining int;
  cooldown_left int;
  grant_id uuid;
  mine int;
  res jsonb;
begin
  select * into ev from public.events where id = p_event_id;
  select timezone into tz from public.groups where id = ev.group_id;
  today := (now() at time zone tz)::date;
  revealed := private.is_revealed(p_event_id);
  live := not revealed and today >= ev.start_date;

  cooldown := case
    when ev.pace = 'chaos' then 30
    when ev.type in ('night', 'birthday') then 75
    when ev.type = 'bigday' then 120
    else 180
  end;
  open_total := case
    when ev.pace = 'chaos' then null
    when ev.type = 'trip' then 2 * (ev.end_date - ev.start_date + 1)
    when ev.type = 'birthday' then 2
    else 3
  end;
  if ev.pace = 'chill' then
    open_total := greatest(1, open_total - 1);
  end if;
  reserved_total := case when ev.type <> 'night' and ev.honoree_member_id is not null then 1 else 0 end;

  select
    count(*) filter (where not reserved and not extra),
    coalesce(bool_or(reserved), false),
    max(called_at)
  into used_open, reserved_used, last_at
  from public.roll_calls
  where event_id = p_event_id;

  remaining := case when open_total is null then null else greatest(0, open_total - used_open) end;
  cooldown_left := case
    when last_at is null then 0
    else greatest(0, ceil(extract(epoch from (last_at + make_interval(mins => cooldown) - now()))))::int
  end;

  -- An ask backed by two others unlocks one call for 30 minutes.
  select a.id into grant_id
  from public.extra_asks a
  where a.event_id = p_event_id
    and a.requester_member_id = p_member_id
    and not a.used
    and a.asked_at > now() - interval '30 minutes'
    and (select count(*) from public.extra_backs b where b.ask_id = a.id) >= 2
  order by a.asked_at
  limit 1;

  -- One per person per event (per day on trips), except in Chaos.
  select count(*) into mine
  from public.roll_calls
  where event_id = p_event_id
    and caller_member_id = p_member_id
    and not extra
    and (ev.type <> 'trip' or day = today);

  res := jsonb_build_object(
    'live', live,
    'revealed', revealed,
    'open', open_total,
    'remaining', remaining,
    'reserved_total', reserved_total,
    'reserved_used', reserved_used,
    'cooldown_min', cooldown,
    'cooldown_left_s', cooldown_left,
    'day', case when ev.type = 'trip' then least(greatest(today, ev.start_date), ev.end_date) else ev.start_date end,
    'ok', false,
    'why', null,
    'can_ask', false,
    'reserved', false,
    'extra', false,
    'ask_id', null
  );

  if not live then
    return res || jsonb_build_object('why', case when revealed then 'Revealed.' else 'Opens when it starts.' end);
  end if;
  if cooldown_left > 0 then
    return res || jsonb_build_object('why', format('Next one in %s min', ceil(cooldown_left / 60.0)::int));
  end if;
  if grant_id is not null then
    return res || jsonb_build_object('ok', true, 'extra', true, 'ask_id', grant_id);
  end if;
  if ev.pace <> 'chaos' and mine > 0 then
    return res || jsonb_build_object(
      'why', case when ev.type = 'trip' then 'You''ve used yours today' else 'You''ve used yours' end,
      'can_ask', true
    );
  end if;
  -- The reserved call is the holder's, and is used first when they call.
  if p_member_id = ev.honoree_member_id and reserved_total > 0 and not reserved_used then
    return res || jsonb_build_object('ok', true, 'reserved', true);
  end if;
  if remaining is null or remaining > 0 then
    return res || jsonb_build_object('ok', true);
  end if;
  return res || jsonb_build_object('why', 'None left', 'can_ask', true);
end
$$;

-- The caller's member id on an event, or null if they aren't on it.
create function private.my_event_member(p_event_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.event_members em
  join public.group_members m on m.id = em.member_id
  where em.event_id = p_event_id and m.user_id = (select auth.uid())
$$;

grant execute on function private.roll_check(uuid, uuid) to authenticated;
grant execute on function private.my_event_member(uuid) to authenticated;

-- Everything the Roll Call card needs in one round trip: your state, the
-- calls with how many answered (answers stay sealed, counts don't), open
-- asks with their backers, and who's snoozed or home.
create function public.roll_state(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := private.my_event_member(p_event_id);
begin
  if not private.can_view_event(p_event_id) then
    return null;
  end if;
  return jsonb_build_object(
    'now', now(),
    'me', me,
    'state', case when me is null then null else private.roll_check(p_event_id, me) end,
    'calls', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'caller_member_id', c.caller_member_id,
        'called_at', c.called_at,
        'day', c.day,
        'reserved', c.reserved,
        'extra', c.extra,
        'recipients', c.recipients,
        'answered', (select count(*) from public.photos p where p.roll_call_id = c.id),
        'mine_answered', exists (select 1 from public.photos p where p.roll_call_id = c.id and p.member_id = me)
      ) order by c.called_at)
      from public.roll_calls c
      where c.event_id = p_event_id
    ), '[]'::jsonb),
    'asks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'requester_member_id', a.requester_member_id,
        'asked_at', a.asked_at,
        'backers', coalesce((select jsonb_agg(b.member_id) from public.extra_backs b where b.ask_id = a.id), '[]'::jsonb)
      ) order by a.asked_at)
      from public.extra_asks a
      where a.event_id = p_event_id and not a.used and a.asked_at > now() - interval '30 minutes'
    ), '[]'::jsonb),
    'statuses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'member_id', s.member_id,
        'snooze_until', s.snooze_until,
        'home', s.home,
        'home_at', s.home_at
      ))
      from public.member_status s
      where s.event_id = p_event_id
    ), '[]'::jsonb)
  );
end
$$;

-- Calls roll. The caller shoots first: their photo (already uploaded to
-- Storage) is recorded with the call, in the same transaction.
-- p_recipients null means everyone on the event except the caller.
create function public.call_roll(
  p_event_id uuid,
  p_photo_id uuid,
  p_storage_path text,
  p_frame int,
  p_recipients uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.my_event_member(p_event_id);
  st jsonb;
  recips uuid[];
  rid uuid;
  caller_name text;
begin
  if me is null then
    raise exception 'You''re not on this event.' using errcode = '42501';
  end if;

  perform 1 from public.events where id = p_event_id for update;

  st := private.roll_check(p_event_id, me);
  if not (st ->> 'ok')::boolean then
    raise exception '%', st ->> 'why' using errcode = 'P0001';
  end if;

  if p_recipients is null then
    recips := array(select member_id from public.event_members where event_id = p_event_id and member_id <> me);
  else
    recips := array(select distinct unnest(p_recipients));
    if me = any (recips) or exists (
      select 1 from unnest(recips) as r
      where not exists (select 1 from public.event_members where event_id = p_event_id and member_id = r)
    ) then
      raise exception 'Pick people on this event.' using errcode = '22023';
    end if;
  end if;

  insert into public.roll_calls (event_id, caller_member_id, day, reserved, extra, recipients)
  values (p_event_id, me, (st ->> 'day')::date, (st ->> 'reserved')::boolean, (st ->> 'extra')::boolean, recips)
  returning id into rid;

  if (st ->> 'extra')::boolean then
    update public.extra_asks set used = true where id = (st ->> 'ask_id')::uuid;
  end if;

  select display_name into caller_name from public.group_members where id = me;
  insert into public.photos (id, event_id, member_id, day, kind, mission, frame, storage_path, roll_call_id)
  values (p_photo_id, p_event_id, me, (st ->> 'day')::date, 'roll', 'roll call · ' || caller_name, p_frame, p_storage_path, rid);

  return rid;
end
$$;

-- Answers a Roll Call. Up to 2 minutes is on time, up to 15 counts but is
-- tagged late, after that the slot shows the away card.
create function public.answer_roll(
  p_roll_call_id uuid,
  p_photo_id uuid,
  p_storage_path text,
  p_frame int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rc public.roll_calls;
  me uuid;
  elapsed interval;
  caller_name text;
begin
  select * into rc from public.roll_calls where id = p_roll_call_id;
  if rc.id is null then
    raise exception 'That Roll Call is gone.' using errcode = 'P0002';
  end if;
  me := private.my_event_member(rc.event_id);
  if me is null or not (me = any (rc.recipients)) then
    raise exception 'This one wasn''t for you.' using errcode = '42501';
  end if;
  if private.is_revealed(rc.event_id) then
    raise exception 'Revealed. Shooting has ended.' using errcode = 'P0001';
  end if;
  elapsed := now() - rc.called_at;
  if elapsed > interval '15 minutes' then
    raise exception 'Too late. Your away card fills in.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.photos where roll_call_id = rc.id and member_id = me) then
    raise exception 'You already answered.' using errcode = '23505';
  end if;

  select display_name into caller_name from public.group_members where id = rc.caller_member_id;
  insert into public.photos (id, event_id, member_id, day, kind, mission, frame, storage_path, roll_call_id, late)
  values (p_photo_id, rc.event_id, me, rc.day, 'roll', 'roll call · ' || caller_name, p_frame, p_storage_path, rc.id,
          elapsed > interval '2 minutes');

  return jsonb_build_object('late', elapsed > interval '2 minutes');
end
$$;

-- Asks the group for one more call. Only when you're out of calls.
create function public.ask_extra(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.my_event_member(p_event_id);
  aid uuid;
begin
  if me is null then
    raise exception 'You''re not on this event.' using errcode = '42501';
  end if;
  if not (private.roll_check(p_event_id, me) ->> 'can_ask')::boolean then
    raise exception 'You can still call one.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.extra_asks
    where event_id = p_event_id and requester_member_id = me and not used and asked_at > now() - interval '30 minutes'
  ) then
    raise exception 'You''ve already asked.' using errcode = 'P0001';
  end if;
  insert into public.extra_asks (event_id, requester_member_id) values (p_event_id, me) returning id into aid;
  return aid;
end
$$;

-- Backs someone else's ask. Two backers unlock it.
create function public.back_extra(p_ask_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.extra_asks;
  me uuid;
begin
  select * into a from public.extra_asks where id = p_ask_id;
  if a.id is null or a.used or a.asked_at <= now() - interval '30 minutes' then
    raise exception 'That ask has closed.' using errcode = 'P0001';
  end if;
  me := private.my_event_member(a.event_id);
  if me is null then
    raise exception 'You''re not on this event.' using errcode = '42501';
  end if;
  if me = a.requester_member_id then
    raise exception 'Someone else has to back it.' using errcode = 'P0001';
  end if;
  insert into public.extra_backs (ask_id, member_id) values (p_ask_id, me) on conflict do nothing;
end
$$;

revoke execute on function public.roll_state(uuid) from public, anon;
revoke execute on function public.call_roll(uuid, uuid, text, int, uuid[]) from public, anon;
revoke execute on function public.answer_roll(uuid, uuid, text, int) from public, anon;
revoke execute on function public.ask_extra(uuid) from public, anon;
revoke execute on function public.back_extra(uuid) from public, anon;
grant execute on function public.roll_state(uuid) to authenticated;
grant execute on function public.call_roll(uuid, uuid, text, int, uuid[]) to authenticated;
grant execute on function public.answer_roll(uuid, uuid, text, int) to authenticated;
grant execute on function public.ask_extra(uuid) to authenticated;
grant execute on function public.back_extra(uuid) to authenticated;

-- Live updates for the Roll Call card and alert. Realtime applies RLS, so
-- people only hear about their own groups' events.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime
      add table public.roll_calls, public.extra_asks, public.extra_backs, public.member_status;
  end if;
end
$$;
