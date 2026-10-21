import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AwayCard } from "@/components/away-card";
import { eventStatus, formatWhen, TYPES, type EventType, type Pace } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { AddNamesForm } from "./add-names-form";
import { AwayUpload } from "./away-upload";
import { InviteLink } from "./invite-link";
import { NewEventForm } from "./new-event-form";

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

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect(`/sign-in?next=${encodeURIComponent(`/groups/${id}`)}`);

  const [{ data: group }, { data: members }, { data: events }] = await Promise.all([
    supabase.from("groups").select("id, name, invite_code, timezone").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("id, display_name, user_id, away_card_path").eq("group_id", id).order("created_at"),
    supabase
      .from("event_details")
      .select("id, name, type, start_date, end_date, pace, revealed")
      .eq("group_id", id)
      .order("start_date", { ascending: false }),
  ]);
  if (!group || !members) notFound();

  const people = members as Member[];
  const me = people.find((m) => m.user_id === auth.claims.sub);
  if (!me) notFound();

  const awayPaths = people.map((m) => m.away_card_path).filter((p): p is string => !!p);
  const awayUrls = new Map<string, string>();
  if (awayPaths.length) {
    const { data } = await supabase.storage.from("away-cards").createSignedUrls(awayPaths, 60 * 60);
    data?.forEach((d) => d.path && d.signedUrl && awayUrls.set(d.path, d.signedUrl));
  }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const notJoined = people.filter((m) => !m.user_id).map((m) => m.display_name);

  const list = ((events ?? []) as EventRow[]).map((e) => ({ ...e, status: eventStatus(e, group.timezone) }));
  const sections = (["Live", "Upcoming", "Revealed"] as const)
    .map((label) => ({ label, items: list.filter((e) => e.status.label === label) }))
    .filter((s) => s.items.length);

  return (
    <>
      <div className="top">
        <Link className="link" href="/">← Groups</Link>
      </div>

      <section className="hero">
        <h1>{group.name}</h1>
        <p className="muted">{people.map((m) => m.display_name).join(", ")}</p>
      </section>

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
                    <span className={`pill ${e.status.tone}`}>{e.status.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="empty">Nothing yet.</div>
        )}
      </section>

      <section className="card t-blue">
        <h2>Invite</h2>
        <p className="muted small">Anyone with this link can join {group.name}.</p>
        <InviteLink url={`${origin}/join/${group.invite_code}`} groupName={group.name} />
        {notJoined.length > 0 && <p className="muted small">Not joined yet: {notJoined.join(", ")}.</p>}
        <AddNamesForm groupId={group.id} />
      </section>

      <NewEventForm
        groupId={group.id}
        timeZone={group.timezone}
        members={people.map((m) => ({ id: m.id, name: m.display_name }))}
      />


      <section className="card">
        <h2>Away cards</h2>
        <p className="muted small">Shown when you miss a Roll Call.</p>
        <div className="aways">
          {people.map((m) => (
            <AwayCard
              key={m.id}
              name={m.display_name}
              url={m.away_card_path ? awayUrls.get(m.away_card_path) : null}
              reason={m.id === me.id ? "you" : undefined}
            />
          ))}
        </div>
        <AwayUpload groupId={group.id} memberId={me.id} oldPath={me.away_card_path} />
      </section>
    </>
  );
}
