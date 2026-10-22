import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { eventStatus, formatWhen, TYPES, type EventType, type Pace } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { InviteLink } from "./invite-link";

type Member = { id: string; display_name: string; user_id: string | null; away_card_path: string | null };
type EventRow = {
  id: string;
  name: string;
  type: EventType;
  start_date: string;
  end_date: string;
  pace: Pace;
  revealed: boolean;
};

// The group page does one job: its events. People, invites and away cards
// live on /people; the invite and away card only surface here while they're
// still needed.
export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect(`/sign-in?next=${encodeURIComponent(`/groups/${id}`)}`);

  const [{ data: group }, { data: members }, { data: events }, { data: reports }] = await Promise.all([
    supabase.from("groups").select("id, name, invite_code, timezone").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("id, display_name, user_id, away_card_path").eq("group_id", id).order("created_at"),
    supabase
      .from("event_details")
      .select("id, name, type, start_date, end_date, pace, revealed")
      .eq("group_id", id)
      .order("start_date", { ascending: false }),
    // RLS shows the host and group maker every report, and others their own.
    supabase.from("reports").select("event_id, reporter_member_id, events!inner(group_id)").eq("events.group_id", id),
  ]);
  if (!group || !members) notFound();

  const people = members as Member[];
  const me = people.find((m) => m.user_id === auth.claims.sub);
  if (!me) notFound();
  const joined = people.filter((m) => m.user_id).length;
  const reported = new Set((reports ?? []).filter((r) => r.reporter_member_id !== me.id).map((r) => r.event_id));

  const list = ((events ?? []) as EventRow[]).map((e) => ({ ...e, status: eventStatus(e, group.timezone) }));
  const sections = (["Live", "Upcoming", "Revealed"] as const)
    .map((label) => ({ label, items: list.filter((e) => e.status.label === label) }))
    .filter((s) => s.items.length);

  let invite: string | null = null;
  if (joined < 2) {
    const h = await headers();
    invite = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/join/${group.invite_code}`;
  }

  return (
    <>
      <div className="top">
        <Link className="link" href="/">← Groups</Link>
        <Link className="link" href={`/groups/${group.id}/people`}>People</Link>
      </div>

      <section className="hero">
        <h1>{group.name}</h1>
        <p className="muted">
          {people.length} {people.length === 1 ? "person" : "people"}
          {joined < people.length ? ` · ${joined} joined` : ""}
        </p>
      </section>

      {invite && (
        <section className="card t-blue">
          <h2>Invite your group</h2>
          <p className="muted small">Nobody else has joined yet. Send them this link.</p>
          <InviteLink url={invite} groupName={group.name} />
        </section>
      )}

      <section className="card">
        <h2>Events</h2>
        {sections.length ? (
          sections.map((s) => (
            <div key={s.label} className="stack">
              <span className="label">{s.label}</span>
              <div className="trips">
                {s.items.map((e) => (
                  <Link key={e.id} className="trip" href={`/events/${e.id}`}>
                    <span>
                      <strong>{e.name}</strong>
                      <span className="muted small">
                        {TYPES[e.type].label} · {formatWhen(e)}
                        {e.status.sub ? ` · ${e.status.sub}` : ""}
                      </span>
                    </span>
                    <span className="row">
                      {reported.has(e.id) && <span className="pill orange">Reported</span>}
                      <span className={`pill ${e.status.tone}`}>{e.status.label}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="empty">No events yet. Make one for the next night out.</div>
        )}
        <div className="row">
          <Link className="button shutter" href={`/groups/${group.id}/events/new`}>New event</Link>
        </div>
      </section>

      {!me.away_card_path && (
        <section className="card t-lime">
          <h2>Add your away card</h2>
          <p className="muted small">A selfie that fills your slot if you miss a Roll Call.</p>
          <div className="row">
            <Link className="button ghost" href={`/groups/${group.id}/people#away`}>Add yours</Link>
          </div>
        </section>
      )}
    </>
  );
}
