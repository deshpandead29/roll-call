-- The word a trip spells on letter day, picked by whoever makes the trip
-- (the destination, an in-joke). Each person finds one letter. Empty means
-- the app picks one sized to the group, as before.

alter table public.events
  add column hunt_word text check (hunt_word ~ '^[A-Z]{2,14}$');

-- The host sets it straight after creating the trip, under the existing
-- "host edits the event" policy.
grant update (hunt_word) on public.events to authenticated;

-- event_details lists the event's columns as they were when it was made, so
-- rebuild it to include the new one.
drop view public.event_details;
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
