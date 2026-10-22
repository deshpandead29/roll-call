-- How many shots each person on an event has taken. Photos stay sealed
-- until the reveal, but the count is public to the group: "who's shooting,
-- not what".

create function public.event_shot_counts(p_event_id uuid)
returns table (member_id uuid, shots int)
language sql
stable
security definer
set search_path = ''
as $$
  select em.member_id, count(p.id)::int
  from public.event_members em
  left join public.photos p on p.event_id = em.event_id and p.member_id = em.member_id
  where em.event_id = p_event_id
    and private.can_view_event(p_event_id)
  group by em.member_id
$$;

revoke execute on function public.event_shot_counts(uuid) from public, anon;
grant execute on function public.event_shot_counts(uuid) to authenticated;
