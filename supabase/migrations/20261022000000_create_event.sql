-- Creates an event and its guest list in one go, hosted by whoever calls it.

create function public.create_event(
  p_group_id uuid,
  p_type public.event_type,
  p_name text,
  p_start_date date,
  p_end_date date,
  p_member_ids uuid[],
  p_honoree_member_id uuid default null,
  p_pace public.event_pace default 'normal'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  host uuid;
  eid uuid;
  members uuid[] := array(select distinct unnest(coalesce(p_member_ids, '{}')));
begin
  select id into host
  from public.group_members
  where group_id = p_group_id and user_id = (select auth.uid());
  if host is null then
    raise exception 'You''re not in this group.' using errcode = '42501';
  end if;

  if cardinality(members) < 2 then
    raise exception 'Pick at least two people.' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(members) as m
    where not exists (select 1 from public.group_members where id = m and group_id = p_group_id)
  ) then
    raise exception 'Someone you picked isn''t in this group.' using errcode = '22023';
  end if;
  if p_honoree_member_id is not null and not (p_honoree_member_id = any (members)) then
    raise exception 'Pick someone who''s coming.' using errcode = '22023';
  end if;

  insert into public.events (group_id, host_member_id, type, name, start_date, end_date, honoree_member_id, pace)
  values (
    p_group_id,
    host,
    p_type,
    btrim(p_name),
    p_start_date,
    case when p_type = 'trip' then p_end_date else p_start_date end,
    case when p_type = 'night' then null else p_honoree_member_id end,
    p_pace
  )
  returning id into eid;

  insert into public.event_members (event_id, member_id)
  select eid, m from unnest(members) as m;

  return eid;
end
$$;

revoke execute on function public.create_event(uuid, public.event_type, text, date, date, uuid[], uuid, public.event_pace) from public, anon;
grant execute on function public.create_event(uuid, public.event_type, text, date, date, uuid[], uuid, public.event_pace) to authenticated;
