-- Profiles: one name and one away card per person, used in every group.
--
-- Names and away cards still live on group_members (the reveal, Roll Calls
-- and the rules read them there). The profile holds your defaults: setting
-- them updates every group you're in, and joining or making a group copies
-- them in. Profile away cards are stored at away-cards/u/{user_id}/{file},
-- readable by anyone in a group whose member row points at the file.

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text check (char_length(btrim(display_name)) between 1 and 40),
  away_card_path text check (away_card_path like 'u/' || user_id::text || '/%'),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
create policy "people read their own profile" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));

-- Start everyone off with the name they joined with first.
insert into public.profiles (user_id, display_name)
select distinct on (user_id) user_id, display_name
from public.group_members
where user_id is not null
order by user_id, joined_at nulls last, created_at
on conflict do nothing;

-- A member row can only point at its own group's card or its person's
-- profile card, so nobody can borrow someone else's file. Existing rows
-- already follow the first form.
alter table public.group_members add constraint group_members_away_card_path_check check (
  away_card_path is null
  or away_card_path like group_id::text || '/' || id::text || '/%'
  or (user_id is not null and away_card_path like 'u/' || user_id::text || '/%')
) not valid;

create policy "away cards: upload your profile card" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'away-cards'
    and name ~ '^u/[^/]+/[^/]+$'
    and split_part(name, '/', 2) = (select auth.uid())::text
  );

-- Your name everywhere. Stops if someone in one of your groups already has it.
create function public.set_my_name(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  n text := btrim(coalesce(p_name, ''));
  clash text;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  if char_length(n) not between 1 and 40 then
    raise exception 'Add your name.' using errcode = '22023';
  end if;
  select g.name into clash
  from public.group_members mine
  join public.group_members other
    on other.group_id = mine.group_id and other.id <> mine.id and lower(btrim(other.display_name)) = lower(n)
  join public.groups g on g.id = mine.group_id
  where mine.user_id = uid
  limit 1;
  if clash is not null then
    raise exception 'Someone in % is already %.', clash, n using errcode = '23505';
  end if;

  insert into public.profiles (user_id, display_name) values (uid, n)
  on conflict (user_id) do update set display_name = excluded.display_name, updated_at = now();
  update public.group_members set display_name = n where user_id = uid;
end
$$;

-- Your away card everywhere. Upload the file first.
create function public.set_my_away_card(p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  if p_path is null or p_path !~ ('^u/' || uid::text || '/[^/]+$') then
    raise exception 'That isn''t your card.' using errcode = '22023';
  end if;
  insert into public.profiles (user_id, away_card_path) values (uid, p_path)
  on conflict (user_id) do update set away_card_path = excluded.away_card_path, updated_at = now();
  update public.group_members set away_card_path = p_path where user_id = uid;
end
$$;

revoke execute on function public.set_my_name(text) from public, anon;
revoke execute on function public.set_my_away_card(text) from public, anon;
grant execute on function public.set_my_name(text) to authenticated;
grant execute on function public.set_my_away_card(text) to authenticated;

-- Making and joining groups: same as before, plus the profile. Your profile
-- name is the default, the name you join with becomes your profile name if
-- you don't have one, and your profile card comes with you.
create function private.after_joining(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  insert into public.profiles (user_id, display_name)
  select uid, display_name from public.group_members where group_id = p_group_id and user_id = uid
  on conflict (user_id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name);
  update public.group_members m
  set away_card_path = p.away_card_path
  from public.profiles p
  where p.user_id = uid and p.away_card_path is not null
    and m.group_id = p_group_id and m.user_id = uid;
end
$$;

create or replace function public.create_group(
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
  me text := coalesce(nullif(btrim(p_display_name), ''), (select display_name from public.profiles where user_id = uid));
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  if me is null then
    raise exception 'Add your name.' using errcode = '22023';
  end if;

  insert into public.groups (name, created_by, timezone)
  values (btrim(p_name), uid, p_timezone)
  returning id into gid;

  insert into public.group_members (group_id, user_id, display_name, joined_at)
  values (gid, uid, me, now());

  insert into public.group_members (group_id, display_name)
  select distinct on (lower(btrim(n))) gid, btrim(n)
  from unnest(coalesce(p_other_names, '{}')) as n
  where btrim(n) <> '' and lower(btrim(n)) <> lower(me);

  perform private.after_joining(gid);
  return gid;
end
$$;

create or replace function public.join_group(
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
  me text;
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
    me := coalesce(nullif(btrim(p_display_name), ''), (select display_name from public.profiles where user_id = uid));
    if me is null then
      raise exception 'Add your name.' using errcode = '22023';
    end if;
    insert into public.group_members (group_id, user_id, display_name, joined_at)
    values (gid, uid, me, now());
  end if;

  perform private.after_joining(gid);
  return gid;
end
$$;

-- Profile cards count as in use too.
create or replace function public.my_orphaned_files()
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
        and not exists (select 1 from public.group_members m where m.away_card_path = o.name)
        and not exists (select 1 from public.profiles p where p.away_card_path = o.name))
    )
  limit 200
$$;
