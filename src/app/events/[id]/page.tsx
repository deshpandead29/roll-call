import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eventStatus, formatWhen, PACES, paceSummary, TYPES, type EventType, type Pace } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { DeleteEvent } from "./delete-event";

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
  timezone: string;
  reveal_at: string;
  revealed: boolean;
};

type Coming = { member_id: string; group_members: { display_name: string; user_id: string | null } };

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect(`/sign-in?next=${encodeURIComponent(`/events/${id}`)}`);

  const { data: row } = await supabase.from("event_details").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  const ev = row as EventDetail;

  const [{ data: group }, { data: comingRows }, { data: host }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", ev.group_id).single(),
    supabase.from("event_members").select("member_id, group_members(display_name, user_id)").eq("event_id", id),
    ev.host_member_id
      ? supabase.from("group_members").select("display_name, user_id").eq("id", ev.host_member_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const coming = ((comingRows ?? []) as unknown as Coming[])
    .map((c) => ({ id: c.member_id, ...c.group_members }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
  const status = eventStatus(ev, ev.timezone);
  const T = TYPES[ev.type];
  const honoree = coming.find((m) => m.id === ev.honoree_member_id);
  const isHost = host?.user_id === auth.claims.sub;
  const onIt = coming.some((m) => m.user_id === auth.claims.sub);
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
        <Link className="link" href={`/groups/${ev.group_id}`}>← {group?.name ?? "Back"}</Link>
        <span className={`pill ${status.tone}`}>{status.label}</span>
      </div>

      <section className="hero">
        <h1>{ev.name}</h1>
        <p className="muted">
          {T.label} · {formatWhen(ev)}
          {ev.pace !== "normal" ? ` · ${PACES[ev.pace]}` : ""}
          {status.sub ? ` · ${status.sub}` : ""}
        </p>
      </section>

      <section className="card">
        <h2>Who&apos;s coming</h2>
        <div className="chips">
          {coming.map((m) => (
            <span key={m.id} className="chip">{m.display_name}</span>
          ))}
        </div>
        {!onIt && <p className="muted small">You&apos;re not on this one. You&apos;ll see the reveal.</p>}
        <dl className="facts">
          {T.honoree && honoree && (
            <>
              <dt className="label">{T.honoree}</dt>
              <dd>{honoree.display_name}, with one extra Roll Call</dd>
            </>
          )}
          <dt className="label">Pace</dt>
          <dd>{PACES[ev.pace]} · {paceSummary(ev.type, ev.pace)}</dd>
          <dt className="label">Reveal</dt>
          <dd>{reveal}</dd>
          {host && (
            <>
              <dt className="label">Host</dt>
              <dd>{host.display_name}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="card t-blue">
        <h2>Shooting</h2>
        <p className="muted">The camera, Roll Calls and challenges aren&apos;t built yet. Try them in the prototype for now.</p>
        <div className="row">
          <a className="button ghost" href="/prototype">Try the prototype</a>
        </div>
      </section>

      {isHost && <DeleteEvent eventId={ev.id} groupId={ev.group_id} />}
    </>
  );
}
