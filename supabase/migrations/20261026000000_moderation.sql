-- Reports and removal, leaving a group, joining an event late, and cleaning
-- up photo files once their rows are gone.
--
-- File cleanup: Storage only deletes an object for someone who can also read
-- it, so letting the host delete everyone's files would let them see sealed
-- photos. Instead each file stays deletable by whoever uploaded it
-- (storage.objects.owner_id), and my_orphaned_files() lists the uploader's
-- files that no row points at any more. The app removes those on load, so a
-- deleted event's photos go as each person next opens Roll Call. Until then
-- nobody else can read them: reading now needs a live row.

-- ---------------------------------------------------------------------------
-- Joining an event late
-- ---------------------------------------------------------------------------

-- Missions are assigned by position, so late joiners go to the end instead of
-- shifting everyone else's challenge. Everyone already on an event shares the
-- same time, which keeps the old order (group join order) for them.
alter table public.event_members add column joined_at timestamptz not null default now();

-- Anyone in the group can add themselves, until the reveal.
drop policy "host or self adds to the event" on public.event_members;
create policy "host or self adds to the event" on public.event_members
  for insert to authenticated
  with check (
    private.can_view_event(event_id)
    and (
      private.is_event_host(event_id)
      or (private.owns_member(member_id) and not private.is_revealed(event_id))
    )
  );

-- ---------------------------------------------------------------------------
-- Removing a name must not take other people's photos with it
-- ---------------------------------------------------------------------------

-- Deleting a caller used to cascade to their Roll Calls and every answer.
alter table public.roll_calls
  drop constraint roll_calls_caller_member_id_fkey,
  alter column caller_member_id drop not null,
  add constraint roll_calls_caller_member_id_fkey
    foreign key (caller_member_id) references public.group_members (id) on delete set null;

create or replace function private.assert_member_in_event_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mid uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
begin
  if mid is null then
    return new;
  end if;
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

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

-- The event's host looks after its photos, and so does whoever made the
-- group, so a report about the host's own photo still reaches someone.
create function private.can_moderate(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_event_host(p_event_id) or exists (
    select 1
    from public.events e
    join public.groups g on g.id = e.group_id
    where e.id = p_event_id
      and g.created_by = (select auth.uid())
      and private.is_group_member(g.id)
  )
$$;

grant execute on function private.can_moderate(uuid) to authenticated;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  reporter_member_id uuid not null references public.group_members (id) on delete cascade,
  reason text not null check (reason in ('private', 'hurtful', 'other')),
  created_at timestamptz not null default now(),
  unique (photo_id, reporter_member_id)
);
create index reports_event_idx on public.reports (event_id);

alter table public.reports enable row level security;
revoke all on public.reports from anon;
revoke insert, update on public.reports from authenticated;

-- Reporters see their own (the app hides those photos for them); the host and
-- group maker see them all. Made through report_photo(), cleared by "Keep"
-- or by removing the photo.
create policy "reporters and moderators read reports" on public.reports
  for select to authenticated
  using (private.owns_member(reporter_member_id) or private.can_moderate(event_id));
create policy "moderators clear reports" on public.reports
  for delete to authenticated using (private.can_moderate(event_id));

-- Reports a revealed photo. Reporting twice updates the reason.
create function public.report_photo(p_photo_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ph public.photos;
  me uuid;
begin
  select * into ph from public.photos where id = p_photo_id;
  if ph.id is null or not private.can_view_event(ph.event_id) or not private.is_revealed(ph.event_id) then
    raise exception 'That photo is gone.' using errcode = 'P0002';
  end if;
  select m.id into me
  from public.group_members m
  join public.events e on e.group_id = m.group_id
  where e.id = ph.event_id and m.user_id = (select auth.uid());
  if me = ph.member_id then
    raise exception 'It''s yours. Delete it instead.' using errcode = 'P0001';
  end if;
  insert into public.reports (photo_id, event_id, reporter_member_id, reason)
  values (ph.id, ph.event_id, me, p_reason)
  on conflict (photo_id, reporter_member_id) do update set reason = excluded.reason, created_at = now();
end
$$;

revoke execute on function public.report_photo(uuid, text) from public, anon;
grant execute on function public.report_photo(uuid, text) to authenticated;

-- Owners could already delete their own. Moderators can remove any photo once
-- it's revealed (before that they can't see it).
create policy "moderators remove photos after the reveal" on public.photos
  for delete to authenticated
  using (private.can_moderate(event_id) and private.is_revealed(event_id));

-- ---------------------------------------------------------------------------
-- Leaving a group
-- ---------------------------------------------------------------------------

-- Your photos, reports, statuses and event places go; Roll Calls you started
-- stay, so everyone else's answers stay too. Events you host, and the group
-- itself if you made it, pass to whoever joined first. Your name stays as an
-- unclaimed name, so you can rejoin as yourself from the link. The last
-- person to leave deletes the group.
create function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  me uuid;
begin
  perform 1 from public.groups where id = p_group_id for update;
  select id into me from public.group_members where group_id = p_group_id and user_id = uid;
  if me is null then
    raise exception 'You''re not in this group.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id is not null and id <> me
  ) then
    delete from public.groups where id = p_group_id;
    return;
  end if;

  -- Someone on the event first, else anyone who's joined.
  update public.events e
  set host_member_id = (
    select m.id
    from public.group_members m
    left join public.event_members em on em.event_id = e.id and em.member_id = m.id
    where m.group_id = p_group_id and m.user_id is not null and m.id <> me
    order by em.member_id is null, em.joined_at, m.joined_at, m.created_at, m.id
    limit 1
  )
  where e.group_id = p_group_id and e.host_member_id = me;

  update public.groups
  set created_by = (
    select m.user_id
    from public.group_members m
    where m.group_id = p_group_id and m.user_id is not null and m.id <> me
    order by m.joined_at, m.created_at, m.id
    limit 1
  )
  where id = p_group_id and created_by = uid;

  delete from public.photos where member_id = me;
  delete from public.reports where reporter_member_id = me;
  delete from public.member_status where member_id = me;
  delete from public.event_members where member_id = me;
  update public.roll_calls c
  set recipients = array_remove(c.recipients, me)
  from public.events e
  where e.id = c.event_id and e.group_id = p_group_id and me = any (c.recipients);

  update public.group_members
  set user_id = null, joined_at = null, away_card_path = null
  where id = me;
end
$$;

revoke execute on function public.leave_group(uuid) from public, anon;
grant execute on function public.leave_group(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: reading needs a live row, uploaders clean up after themselves
-- ---------------------------------------------------------------------------

-- A photo file is readable while its row exists: by its owner, and by the
-- group after the reveal. Files left behind by a deleted row (or by someone
-- who left, if their name is claimed again) are readable only by whoever
-- uploaded them, through the policy below.
create or replace function private.can_read_photo_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.photos p
    join public.events e on e.id = p.event_id
    where p.storage_path = p_name
      and (
        private.owns_member(p.member_id)
        or (private.is_group_member(e.group_id) and private.is_revealed(e.id))
      )
  )
$$;

-- Same for away cards: only the one a member row points at.
create or replace function private.can_read_away_card(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.away_card_path = p_name and private.is_group_member(m.group_id)
  )
$$;

create policy "photos: uploaders read their files" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and owner_id = (select auth.uid())::text);
create policy "photos: uploaders delete their files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and owner_id = (select auth.uid())::text);
create policy "away cards: uploaders read their files" on storage.objects
  for select to authenticated
  using (bucket_id = 'away-cards' and owner_id = (select auth.uid())::text);
create policy "away cards: uploaders delete their files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'away-cards' and owner_id = (select auth.uid())::text);

-- Your files that no row points at any more: photos from a deleted event or
-- a removed shot, away cards you replaced, everything after leaving a group.
-- Files under ten minutes old are skipped, since a shot is uploaded just
-- before its row is written.
create function public.my_orphaned_files()
returns table (bucket text, path text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, o.name
  from storage.objects o
  where o.owner_id = (select auth.uid())::text
    and o.created_at < now() - interval '10 minutes'
    and (
      (o.bucket_id = 'photos'
        and not exists (select 1 from public.photos p where p.storage_path = o.name))
      or (o.bucket_id = 'away-cards'
        and not exists (select 1 from public.group_members m where m.away_card_path = o.name))
    )
  limit 200
$$;

revoke execute on function public.my_orphaned_files() from public, anon;
grant execute on function public.my_orphaned_files() to authenticated;
