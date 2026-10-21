-- Roll Call foundations: schema, row-level security, invite links, storage.
--
-- Rules of thumb used throughout:
-- * Every table has RLS on. People see their own groups' data and nothing else.
-- * Other people's photos stay sealed until the event's reveal, in the table
--   and in Storage. Owners can always see their own.
-- * Helpers live in the `private` schema, which the API doesn't expose.
-- * Roll Call writes (budget, cooldown, one per person, backed extras) go
--   through a single Postgres function in step 4, so those tables are
--   read-only to clients for now.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.event_type as enum ('night', 'birthday', 'bigday', 'trip');
create type public.event_pace as enum ('chill', 'normal', 'chaos');
-- Same names as the prototype. `night` is the one-each deck challenge on any
-- non-trip event (night out, birthday, big day).
create type public.photo_kind as enum ('roll', 'group', 'hunt', 'wild', 'night', 'recreate');
create type public.hunt_type as enum ('colour', 'letter', 'shape', 'texture', 'number');
create type public.wild_category as enum ('people', 'lens', 'nerve', 'story');

-- ---------------------------------------------------------------------------
-- Pure helpers
-- ---------------------------------------------------------------------------

create function private.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz)
$$;

-- 10 characters from an alphabet without look-alikes (no 0/o, 1/l/i).
create function private.new_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  bytes bytea := extensions.gen_random_bytes(10);
  code text := '';
begin
  for i in 0..9 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return code;
end
$$;

-- Event dates are local to the group. Reveal is 11:00 the day after the last
-- day, or 00:00 the day after for trips. An early reveal can only move it
-- earlier.
create function private.reveal_at(
  p_type public.event_type,
  p_end_date date,
  p_timezone text,
  p_override timestamptz
)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select least(
    p_override,
    ((p_end_date + 1) + case when p_type = 'trip' then time '00:00' else time '11:00' end)
      at time zone p_timezone
  )
$$;

-- Returns the nth segment of a storage path as a uuid, or null.
create function private.path_uuid(p_name text, p_part int)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', p_part) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', p_part)::uuid
  end
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  invite_code text not null unique default private.new_invite_code(),
  timezone text not null default 'Europe/London' check (private.is_valid_timezone(timezone))
);

-- A member is a name in a group. Names added as chips have no user until
-- someone claims them from the invite link (joined_at is set then).
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  away_card_path text,
  unique (group_id, user_id),
  unique (group_id, id)
);
create unique index group_members_name_key on public.group_members (group_id, lower(btrim(display_name)));
create index group_members_user_idx on public.group_members (user_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  host_member_id uuid,
  type public.event_type not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  start_date date not null,
  end_date date not null,
  honoree_member_id uuid,
  pace public.event_pace not null default 'normal',
  revealed_at_override timestamptz,
  created_at timestamptz not null default now(),
  foreign key (group_id, host_member_id)
    references public.group_members (group_id, id) on delete set null (host_member_id),
  foreign key (group_id, honoree_member_id)
    references public.group_members (group_id, id) on delete set null (honoree_member_id),
  -- Trips run up to 21 days. Everything else is one date.
  check (
    (type = 'trip' and end_date between start_date and start_date + 20)
    or (type <> 'trip' and end_date = start_date)
  ),
  check (type <> 'night' or honoree_member_id is null)
);
create index events_group_idx on public.events (group_id, start_date);

create table public.event_members (
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  primary key (event_id, member_id)
);
create index event_members_member_idx on public.event_members (member_id);

create table public.roll_calls (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  caller_member_id uuid not null references public.group_members (id) on delete cascade,
  called_at timestamptz not null default now(),
  day date not null,
  reserved boolean not null default false,
  extra boolean not null default false,
  recipients uuid[] not null default '{}'
);
create index roll_calls_event_idx on public.roll_calls (event_id, called_at);

-- Rows hold Storage paths only: {event_id}/{member_id}/{file}.
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  day date not null,
  kind public.photo_kind not null,
  mission text,
  frame integer check (frame > 0),
  storage_path text not null unique,
  roll_call_id uuid references public.roll_calls (id) on delete cascade,
  late boolean not null default false,
  recreate_id text,
  starring smallint check (starring between 1 and 14),
  hunt_type public.hunt_type,
  hunt_tag text,
  hunt_order smallint,
  wild_cat public.wild_category,
  created_at timestamptz not null default now(),
  check ((kind = 'roll') = (roll_call_id is not null)),
  check (storage_path like event_id::text || '/' || member_id::text || '/%'),
  unique (roll_call_id, member_id)
);
create index photos_event_idx on public.photos (event_id, day);
create index photos_member_idx on public.photos (member_id);

create table public.member_status (
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  snooze_until timestamptz,
  home boolean not null default false,
  home_at timestamptz,
  primary key (event_id, member_id)
);

create table public.extra_asks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  requester_member_id uuid not null references public.group_members (id) on delete cascade,
  asked_at timestamptz not null default now(),
  used boolean not null default false
);
create index extra_asks_event_idx on public.extra_asks (event_id, asked_at);

create table public.extra_backs (
  ask_id uuid not null references public.extra_asks (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  backed_at timestamptz not null default now(),
  primary key (ask_id, member_id)
);

create table public.swaps (
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  day date not null,
  count smallint not null default 0 check (count >= 0),
  primary key (event_id, member_id, day)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Any member_id stored against an event must belong to that event's group.
create function private.assert_member_in_event_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mid uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
begin
  if not exists (
    select 1
    from public.events e
    join public.group_members m on m.group_id = e.group_id
    where e.id = new.event_id and m.id = mid
  ) then
    raise exception 'member % is not in this event''s group', mid using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger event_members_same_group before insert or update on public.event_members
  for each row execute function private.assert_member_in_event_group('member_id');
create trigger roll_calls_same_group before insert or update on public.roll_calls
  for each row execute function private.assert_member_in_event_group('caller_member_id');
create trigger photos_same_group before insert or update on public.photos
  for each row execute function private.assert_member_in_event_group('member_id');
create trigger member_status_same_group before insert or update on public.member_status
  for each row execute function private.assert_member_in_event_group('member_id');
create trigger extra_asks_same_group before insert or update on public.extra_asks
  for each row execute function private.assert_member_in_event_group('requester_member_id');
create trigger swaps_same_group before insert or update on public.swaps
  for each row execute function private.assert_member_in_event_group('member_id');

-- ---------------------------------------------------------------------------
-- Access helpers (security definer so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------

create function private.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = (select auth.uid())
  )
$$;

create function private.owns_member(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where id = p_member_id and user_id = (select auth.uid())
  )
$$;

-- In the event's group, whether or not they're on the event.
create function private.can_view_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    join public.group_members m on m.group_id = e.group_id
    where e.id = p_event_id and m.user_id = (select auth.uid())
  )
$$;

create function private.is_on_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_members em
    join public.group_members m on m.id = em.member_id
    where em.event_id = p_event_id and m.user_id = (select auth.uid())
  )
$$;

create function private.is_event_host(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    join public.group_members m on m.id = e.host_member_id
    where e.id = p_event_id and m.user_id = (select auth.uid())
  )
$$;

create function private.is_revealed(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select now() >= private.reveal_at(e.type, e.end_date, g.timezone, e.revealed_at_override)
    from public.events e
    join public.groups g on g.id = e.group_id
    where e.id = p_event_id
  ), false)
$$;

-- Storage paths. Photos: {event_id}/{member_id}/{file}. Away cards:
-- {group_id}/{member_id}/{file}.
create function private.can_read_photo_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    join public.group_members m on m.group_id = e.group_id
    where p_name ~ '^[^/]+/[^/]+/[^/]+$'
      and e.id = private.path_uuid(p_name, 1)
      and m.id = private.path_uuid(p_name, 2)
      and (
        m.user_id = (select auth.uid())
        or (private.is_group_member(e.group_id) and private.is_revealed(e.id))
      )
  )
$$;

create function private.can_write_photo_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_name ~ '^[^/]+/[^/]+/[^/]+$'
    and private.owns_member(private.path_uuid(p_name, 2))
    and exists (
      select 1 from public.event_members
      where event_id = private.path_uuid(p_name, 1)
        and member_id = private.path_uuid(p_name, 2)
    )
    and not private.is_revealed(private.path_uuid(p_name, 1))
$$;

create function private.owns_photo_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_name ~ '^[^/]+/[^/]+/[^/]+$'
    and private.owns_member(private.path_uuid(p_name, 2))
$$;

create function private.can_read_away_card(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_name ~ '^[^/]+/[^/]+/[^/]+$'
    and private.is_group_member(private.path_uuid(p_name, 1))
$$;

create function private.can_write_away_card(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_name ~ '^[^/]+/[^/]+/[^/]+$'
    and exists (
      select 1 from public.group_members
      where id = private.path_uuid(p_name, 2)
        and group_id = private.path_uuid(p_name, 1)
        and user_id = (select auth.uid())
    )
$$;

grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges. Supabase grants everything on public tables by default; narrow
-- that so anon reads nothing and updates are limited to the columns people
-- may change.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke update on public.groups, public.group_members, public.events from authenticated;
grant update (name, timezone) on public.groups to authenticated;
grant update (display_name, away_card_path) on public.group_members to authenticated;
grant update (name, start_date, end_date, honoree_member_id, pace, revealed_at_override)
  on public.events to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.roll_calls enable row level security;
alter table public.photos enable row level security;
alter table public.member_status enable row level security;
alter table public.extra_asks enable row level security;
alter table public.extra_backs enable row level security;
alter table public.swaps enable row level security;
alter table public.push_subscriptions enable row level security;

-- groups: created through create_group(), joined through join_group().
create policy "members read their groups" on public.groups
  for select to authenticated using (private.is_group_member(id));
create policy "creator edits the group" on public.groups
  for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "creator deletes the group" on public.groups
  for delete to authenticated using (created_by = (select auth.uid()));

-- group_members
create policy "members read the group's members" on public.group_members
  for select to authenticated using (private.is_group_member(group_id));
create policy "members add names" on public.group_members
  for insert to authenticated
  with check (private.is_group_member(group_id) and user_id is null and joined_at is null);
create policy "people edit their own member row" on public.group_members
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "people leave, or remove unclaimed names" on public.group_members
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or (user_id is null and private.is_group_member(group_id))
  );

-- events
create policy "members read the group's events" on public.events
  for select to authenticated using (private.is_group_member(group_id));
create policy "members create events they host" on public.events
  for insert to authenticated
  with check (private.is_group_member(group_id) and private.owns_member(host_member_id));
create policy "host edits the event" on public.events
  for update to authenticated
  using (private.owns_member(host_member_id)) with check (private.owns_member(host_member_id));
create policy "host deletes the event" on public.events
  for delete to authenticated using (private.owns_member(host_member_id));

-- event_members: the host picks who's coming; anyone in the group can add
-- or remove themselves.
create policy "members read who's coming" on public.event_members
  for select to authenticated using (private.can_view_event(event_id));
create policy "host or self adds to the event" on public.event_members
  for insert to authenticated
  with check (
    private.can_view_event(event_id)
    and (private.is_event_host(event_id) or private.owns_member(member_id))
  );
create policy "host or self removes from the event" on public.event_members
  for delete to authenticated
  using (private.is_event_host(event_id) or private.owns_member(member_id));

-- photos: sealed until the reveal, except to their owner.
create policy "owners always, the group after the reveal" on public.photos
  for select to authenticated
  using (
    private.owns_member(member_id)
    or (private.can_view_event(event_id) and private.is_revealed(event_id))
  );
-- Roll Call answers carry server-computed fields (late, roll_call_id), so
-- they're written by the step 4 function, not inserted directly.
create policy "people on the event add their own shots" on public.photos
  for insert to authenticated
  with check (
    kind <> 'roll'
    and private.owns_member(member_id)
    and exists (
      select 1 from public.event_members em
      where em.event_id = photos.event_id and em.member_id = photos.member_id
    )
    and not private.is_revealed(event_id)
  );
create policy "owners delete their shots" on public.photos
  for delete to authenticated using (private.owns_member(member_id));

-- roll_calls, extra_asks, extra_backs: read-only until step 4.
create policy "members read roll calls" on public.roll_calls
  for select to authenticated using (private.can_view_event(event_id));
create policy "members read asks" on public.extra_asks
  for select to authenticated using (private.can_view_event(event_id));
create policy "members read backs" on public.extra_backs
  for select to authenticated
  using (exists (
    select 1 from public.extra_asks a
    where a.id = extra_backs.ask_id and private.can_view_event(a.event_id)
  ));

-- member_status: everyone on the event sees who's snoozed or home; you set
-- your own.
create policy "members read status" on public.member_status
  for select to authenticated using (private.can_view_event(event_id));
create policy "people set their own status" on public.member_status
  for insert to authenticated
  with check (private.owns_member(member_id) and private.is_on_event(event_id));
create policy "people update their own status" on public.member_status
  for update to authenticated
  using (private.owns_member(member_id))
  with check (private.owns_member(member_id) and private.is_on_event(event_id));

-- swaps
create policy "members read swaps" on public.swaps
  for select to authenticated using (private.can_view_event(event_id));
create policy "people record their own swaps" on public.swaps
  for insert to authenticated
  with check (private.owns_member(member_id) and private.is_on_event(event_id));
create policy "people update their own swaps" on public.swaps
  for update to authenticated
  using (private.owns_member(member_id))
  with check (private.owns_member(member_id) and private.is_on_event(event_id));

-- push_subscriptions: per device, per user.
create policy "people manage their own push subscriptions" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Event details with the reveal time worked out in the group's timezone.
-- security_invoker keeps the events and groups policies in force.
-- ---------------------------------------------------------------------------

create view public.event_details with (security_invoker = true) as
select
  e.*,
  g.timezone,
  private.reveal_at(e.type, e.end_date, g.timezone, e.revealed_at_override) as reveal_at,
  now() >= private.reveal_at(e.type, e.end_date, g.timezone, e.revealed_at_override) as revealed
from public.events e
join public.groups g on g.id = e.group_id;

revoke all on public.event_details from anon;
grant select on public.event_details to authenticated;

-- ---------------------------------------------------------------------------
-- Groups and invite links
-- ---------------------------------------------------------------------------

-- Creates a group with you in it, plus any names added as chips.
create function public.create_group(
  p_name text,
  p_display_name text,
  p_timezone text default 'Europe/London',
  p_other_names text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  gid uuid;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;

  insert into public.groups (name, created_by, timezone)
  values (btrim(p_name), uid, p_timezone)
  returning id into gid;

  insert into public.group_members (group_id, user_id, display_name, joined_at)
  values (gid, uid, btrim(p_display_name), now());

  insert into public.group_members (group_id, display_name)
  select distinct on (lower(btrim(n))) gid, btrim(n)
  from unnest(coalesce(p_other_names, '{}')) as n
  where btrim(n) <> '' and lower(btrim(n)) <> lower(btrim(p_display_name));

  return gid;
end
$$;

-- What the invite page shows before you join: the group's name and the
-- names nobody has claimed yet.
create function public.group_preview(p_code text)
returns table (group_id uuid, name text, member_count int, open_names jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id,
    g.name,
    (select count(*)::int from public.group_members m where m.group_id = g.id),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.display_name) order by m.display_name)
      from public.group_members m
      where m.group_id = g.id and m.user_id is null
    ), '[]'::jsonb)
  from public.groups g
  where g.invite_code = lower(btrim(p_code))
$$;

-- Joins the group behind an invite code. Pass a member id to claim a name
-- someone already added, or a display name to join as someone new. Joining
-- twice is a no-op.
create function public.join_group(
  p_code text,
  p_display_name text default null,
  p_claim_member_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  gid uuid;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;

  select id into gid from public.groups where invite_code = lower(btrim(p_code));
  if gid is null then
    raise exception 'That link doesn''t work.' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.group_members where group_id = gid and user_id = uid) then
    return gid;
  end if;

  if p_claim_member_id is not null then
    update public.group_members
    set user_id = uid,
        joined_at = now(),
        display_name = coalesce(nullif(btrim(p_display_name), ''), display_name)
    where id = p_claim_member_id and group_id = gid and user_id is null;
    if not found then
      raise exception 'Someone already joined as that name.' using errcode = '23505';
    end if;
  else
    if nullif(btrim(p_display_name), '') is null then
      raise exception 'Add your name.' using errcode = '22023';
    end if;
    insert into public.group_members (group_id, user_id, display_name, joined_at)
    values (gid, uid, btrim(p_display_name), now());
  end if;

  return gid;
end
$$;

revoke execute on function public.create_group(text, text, text, text[]) from public, anon;
revoke execute on function public.join_group(text, text, uuid) from public, anon;
grant execute on function public.create_group(text, text, text, text[]) to authenticated;
grant execute on function public.join_group(text, text, uuid) to authenticated;
grant execute on function public.group_preview(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private buckets, sealed photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/webp']),
  ('away-cards', 'away-cards', false, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "photos: owners always, the group after the reveal" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and private.can_read_photo_object(name));
create policy "photos: upload your own before the reveal" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and private.can_write_photo_object(name));
create policy "photos: delete your own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and private.owns_photo_object(name));

create policy "away cards: the group reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'away-cards' and private.can_read_away_card(name));
create policy "away cards: upload your own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'away-cards' and private.can_write_away_card(name));
create policy "away cards: replace your own" on storage.objects
  for update to authenticated
  using (bucket_id = 'away-cards' and private.can_write_away_card(name))
  with check (bucket_id = 'away-cards' and private.can_write_away_card(name));
create policy "away cards: delete your own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'away-cards' and private.can_write_away_card(name));
