-- Server-recorded response time allows ten minutes for a slow upload.
create table private.roll_answer_attempts (
  photo_id uuid primary key,
  roll_call_id uuid not null references public.roll_calls(id) on delete cascade,
  member_id uuid not null references public.group_members(id) on delete cascade,
  started_at timestamptz not null default now()
);
alter table private.roll_answer_attempts enable row level security;
revoke all on private.roll_answer_attempts from public, anon, authenticated;

create function public.begin_roll_answer(p_roll_call_id uuid, p_photo_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare rc public.roll_calls; mid uuid; attempt private.roll_answer_attempts;
begin
  select * into rc from public.roll_calls where id = p_roll_call_id;
  mid := private.my_event_member(rc.event_id);
  if mid is null or not (mid = any(rc.recipients)) then
    raise exception 'This call is not for you.' using errcode = '42501';
  end if;
  if private.is_revealed(rc.event_id) then raise exception 'This event has revealed.' using errcode = 'P0001'; end if;
  select * into attempt from private.roll_answer_attempts where photo_id = p_photo_id;
  if found then
    if attempt.member_id <> mid or attempt.roll_call_id <> rc.id then
      raise exception 'Invalid answer attempt.' using errcode = '42501';
    end if;
    if now() > attempt.started_at + interval '10 minutes' then
      raise exception 'The upload window ended. Download your saved photo to keep it.' using errcode = 'P0001';
    end if;
    return;
  end if;
  if now() > rc.called_at + interval '15 minutes' then
    raise exception 'This call has closed. Download your saved photo to keep it.' using errcode = 'P0001';
  end if;
  insert into private.roll_answer_attempts(photo_id, roll_call_id, member_id)
  values(p_photo_id, rc.id, mid);
end $$;
revoke all on function public.begin_roll_answer(uuid, uuid) from public, anon;
grant execute on function public.begin_roll_answer(uuid, uuid) to authenticated;

create or replace function public.call_roll(
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
  -- A lost HTTP response must not create a second call or consume its budget.
  select roll_call_id into rid from public.photos
    where id = p_photo_id and event_id = p_event_id and member_id = me and kind = 'roll';
  if found then return rid; end if;

  st := private.roll_check(p_event_id, me);
  if not (st ->> 'ok')::boolean then
    -- RC429: refused only by the one-minute guard, so the same photo can be
    -- sent again shortly. Everything else stays a final refusal (P0001).
    if (st ->> 'live')::boolean and (st ->> 'cooldown_left_s')::int > 0 then
      raise exception '%', st ->> 'why' using errcode = 'RC429';
    end if;
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


create or replace function public.answer_roll(
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
  attempt private.roll_answer_attempts;
  existing public.photos;
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
  -- Serialise duplicate retries for this call, including a lost response.
  perform 1 from public.roll_calls where id = rc.id for update;
  select * into existing from public.photos where id = p_photo_id
    and roll_call_id = rc.id and member_id = me;
  if found then return jsonb_build_object('late', existing.late); end if;
  select * into attempt from private.roll_answer_attempts
    where photo_id = p_photo_id and roll_call_id = rc.id and member_id = me;
  if found then
    if now() > attempt.started_at + interval '10 minutes' then
      raise exception 'The upload window ended. Download your saved photo to keep it.' using errcode = 'P0001';
    end if;
    elapsed := attempt.started_at - rc.called_at;
  else
    elapsed := now() - rc.called_at;
  end if;
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
