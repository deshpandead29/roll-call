-- A shared budget, a one-minute repeat guard, and explicit host extras.
-- Legacy pace/reserved/backing data is retained, but no longer gates calls.
create or replace function private.roll_check(p_event_id uuid, p_member_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  ev public.events;
  tz text;
  today date;
  is_live boolean;
  total int;
  used int;
  left_s int;
  res jsonb;
begin
  select * into ev from public.events where id = p_event_id;
  select timezone into tz from public.groups where id = ev.group_id;
  today := (now() at time zone tz)::date;
  is_live := not private.is_revealed(p_event_id) and today >= ev.start_date;
  total := case when ev.type = 'trip' then 2 * (ev.end_date - ev.start_date + 1) else 3 end;
  select count(*), greatest(0, ceil(extract(epoch from (max(called_at) + interval '1 minute' - now())))::int)
  into used, left_s from public.roll_calls where event_id = p_event_id;
  res := jsonb_build_object(
    'live', is_live, 'revealed', private.is_revealed(p_event_id),
    'open', total, 'remaining', greatest(0, total - used),
    'reserved_total', 0, 'reserved_used', false, 'reserved', false,
    'extra', false, 'ask_id', null, 'can_ask', false,
    'cooldown_min', 1, 'cooldown_left_s', coalesce(left_s, 0),
    'day', case when ev.type = 'trip' then least(greatest(today, ev.start_date), ev.end_date) else ev.start_date end,
    'ok', false, 'why', null
  );
  if not is_live then
    return res || jsonb_build_object('why', case when private.is_revealed(p_event_id) then 'Revealed.' else 'Opens when it starts.' end);
  end if;
  if left_s > 0 then
    return res || jsonb_build_object('why', 'A call just started. Try again in a minute.');
  end if;
  if used < total then return res || jsonb_build_object('ok', true); end if;
  if p_member_id = ev.host_member_id then
    return res || jsonb_build_object('ok', true, 'extra', true);
  end if;
  return res || jsonb_build_object('why', 'All shared calls used. The host can start an extra.');
end $$;

-- Only a valid group invite can reveal an event preview. No participant data.
create function public.event_invite_preview(p_code text, p_event_id uuid)
returns table (id uuid, name text, reveal_at timestamptz, timezone text, revealed boolean)
language sql stable security definer set search_path = '' as $$
  select e.id, e.name, private.reveal_at(e.type, e.end_date, g.timezone, e.revealed_at_override), g.timezone, private.is_revealed(e.id)
  from public.events e join public.groups g on g.id = e.group_id
  where e.id = p_event_id and g.invite_code = lower(btrim(p_code))
$$;

-- Joining the group and event is one transaction; retries are safe.
create function public.join_event_invite(p_code text, p_event_id uuid,
  p_display_name text default null, p_claim_member_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare gid uuid; mid uuid;
begin
  perform 1 from public.events e join public.groups g on g.id = e.group_id
  where e.id = p_event_id and g.invite_code = lower(btrim(p_code)) for update of e;
  if not found then raise exception 'That event invite does not work.' using errcode = 'P0002'; end if;
  if private.is_revealed(p_event_id) then
    raise exception 'This event has revealed. Ask the host for a group invite to view the album.' using errcode = 'P0001';
  end if;
  gid := public.join_group(p_code, p_display_name, p_claim_member_id);
  select id into mid from public.group_members where group_id = gid and user_id = (select auth.uid());
  insert into public.event_members(event_id, member_id) values (p_event_id, mid) on conflict do nothing;
  return p_event_id;
end $$;
revoke all on function public.event_invite_preview(text, uuid) from public;
grant execute on function public.event_invite_preview(text, uuid) to anon, authenticated;
revoke all on function public.join_event_invite(text, uuid, text, uuid) from public, anon;
grant execute on function public.join_event_invite(text, uuid, text, uuid) to authenticated;
