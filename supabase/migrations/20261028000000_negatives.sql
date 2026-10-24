-- Negatives: everyone on an event sees everyone's shots as small film
-- negatives before the reveal. The phone makes the negative at capture (tiny,
-- inverted and tinted, so it shows that someone shot, not what) and uploads it
-- to its own bucket at {event_id}/{member_id}/{photo_id}.jpg. The full photo
-- stays sealed until the reveal.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('negatives', 'negatives', false, 204800, array['image/jpeg'])
on conflict (id) do nothing;

create policy "negatives: the group reads" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'negatives'
    and name ~ '^[^/]+/[^/]+/[^/]+$'
    and private.can_view_event(private.path_uuid(name, 1))
  );
create policy "negatives: upload your own before the reveal" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'negatives' and private.can_write_photo_object(name));
create policy "negatives: uploaders delete their files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'negatives' and owner_id = (select auth.uid())::text);

-- Which shots exist, without what they are: no mission, no photo path.
create function public.event_negatives(p_event_id uuid)
returns table (id uuid, member_id uuid, kind public.photo_kind, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.member_id, p.kind, p.created_at
  from public.photos p
  where p.event_id = p_event_id
    and private.can_view_event(p_event_id)
  order by p.created_at
$$;

revoke execute on function public.event_negatives(uuid) from public, anon;
grant execute on function public.event_negatives(uuid) to authenticated;

-- A negative goes when its photo row does.
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
      or (o.bucket_id = 'negatives'
        and not exists (
          select 1 from public.photos p
          where p.id::text = split_part(split_part(o.name, '/', 3), '.', 1)
        ))
      or (o.bucket_id = 'away-cards'
        and not exists (select 1 from public.group_members m where m.away_card_path = o.name)
        and not exists (select 1 from public.profiles p where p.away_card_path = o.name))
    )
  limit 200
$$;
