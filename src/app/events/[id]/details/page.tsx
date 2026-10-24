import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatWhen, PACES, paceSummary, TYPES, type EventType, type Pace } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { DeleteEvent } from "../delete-event";
import { LeaveEvent } from "../leave-event";
import { RevealNow } from "../reveal-now";

export const metadata = { title: "Event details · Roll Call" };

type EventDetail = {
  id: string;
  group_id: string;
  name: string;
  type: EventType;
  start_date: string;
  end_date: string;
  pace: Pace;
  host_member_id: string | null;
  honoree_member_id: string | null;
  hunt_word: string | null;
  timezone: string;
  reveal_at: string;
  revealed: boolean;
};

// The facts and the host's controls, off the event page so it stays about
// shooting.
export default async function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect(`/sign-in?next=${encodeURIComponent(`/events/${id}/details`)}`);

  const { data: row } = await supabase.from("event_details").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  const ev = row as EventDetail;

  const [{ data: members }, { data: comingRows }] = await Promise.all([
    supabase.from("group_members").select("id, display_name, user_id").eq("group_id", ev.group_id),
    supabase.from("event_members").select("member_id, joined_at").eq("event_id", id).order("joined_at"),
  ]);
  const people = members ?? [];
  const nameOf = (mid: string | null) => people.find((m) => m.id === mid)?.display_name;
  const coming = (comingRows ?? []).map((c) => people.find((m) => m.id === c.member_id)).filter((m) => !!m);
  const host = people.find((m) => m.id === ev.host_member_id);
  const isHost = !!host && host.user_id === auth.claims.sub;
  const meOnIt = coming.find((m) => m.user_id === auth.claims.sub);
  const T = TYPES[ev.type];
  const honoree = nameOf(ev.honoree_member_id);
  const reveal = new Date(ev.reveal_at).toLocaleString("en-GB", {
    timeZone: ev.timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div className="top">
        <Link className="link" href={`/events/${ev.id}`}>← {ev.name}</Link>
      </div>
      <section className="hero">
        <h1>Details</h1>
        <p className="muted">
          {T.label} · {formatWhen(ev)}
        </p>
      </section>

      <section className="card t-blue">
        <dl className="facts">
          <dt className="label">Who&apos;s coming</dt>
          <dd>
            {coming.map((m, k) => (
              <span key={m.id}>
                {k > 0 && ", "}
                {m.display_name}
                {!m.user_id && <span className="muted small"> (not joined)</span>}
              </span>
            ))}
          </dd>
          {T.honoree && honoree && (
            <>
              <dt className="label">{T.honoree}</dt>
              <dd>{honoree}, with one extra Roll Call</dd>
            </>
          )}
          {ev.type === "trip" && ev.hunt_word && (
            <>
              <dt className="label">Letter day</dt>
              <dd>{ev.hunt_word}</dd>
            </>
          )}
          <dt className="label">Pace</dt>
          <dd>
            {PACES[ev.pace]} · {paceSummary(ev.type, ev.pace)}
          </dd>
          <dt className="label">{ev.revealed ? "Revealed" : "Reveal"}</dt>
          <dd>{reveal}</dd>
          {host && (
            <>
              <dt className="label">Host</dt>
              <dd>{host.display_name}</dd>
            </>
          )}
        </dl>
        {isHost && (
          <div className="row">
            <Link className="button ghost" href={`/events/${ev.id}/edit`}>Edit</Link>
            {!ev.revealed && <RevealNow eventId={ev.id} />}
          </div>
        )}
      </section>

      {!isHost && meOnIt && !ev.revealed && <LeaveEvent eventId={ev.id} memberId={meOnIt.id} name={ev.name} />}

      {isHost && <DeleteEvent eventId={ev.id} groupId={ev.group_id} />}
    </>
  );
}
