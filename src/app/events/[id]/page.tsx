import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertsSetup } from "@/components/alerts-setup";
import { Tally } from "@/components/tally";
import { addDays, diffDays, eventStatus, formatDate, formatWhen, hhmm, PACES, paceSummary, todayIn, TYPES, type EventType, type Pace } from "@/lib/events";
import {
  CAT_GLYPH,
  CAT_LABEL,
  director,
  groupFrame,
  isRecreateDay,
  hash,
  HUNT_DAY,
  hunt,
  single,
  wild,
  type MissionEvent,
} from "@/lib/missions";
import { createClient } from "@/lib/supabase/server";
import { buildReveal } from "./build-reveal";
import { DeleteEvent } from "./delete-event";
import { RevealNow } from "./reveal-now";
import { RevealView } from "./reveal";
import { Missions, type Mission, type Shot } from "./missions";
import { Recreate } from "./recreate";
import { RollCall, type RollData } from "./roll-call";

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

type Coming = {
  member_id: string;
  group_members: { display_name: string; user_id: string | null; created_at: string; away_card_path: string | null };
};

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { id } = await params;
  const { day: dayParam } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect(`/sign-in?next=${encodeURIComponent(`/events/${id}`)}`);

  const { data: row } = await supabase.from("event_details").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  const ev = row as EventDetail;

  const [{ data: group }, { data: comingRows }, { data: host }, { data: counts }, { data: photoRows }, { data: roll }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", ev.group_id).single(),
    supabase.from("event_members").select("member_id, group_members(display_name, user_id, created_at, away_card_path)").eq("event_id", id),
    ev.host_member_id
      ? supabase.from("group_members").select("display_name, user_id").eq("id", ev.host_member_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.rpc("event_shot_counts", { p_event_id: id }),
    // Before the reveal, RLS returns only your own.
    supabase.from("photos").select("id, kind, day, frame, storage_path, member_id").eq("event_id", id).order("created_at"),
    supabase.rpc("roll_state", { p_event_id: id }),
  ]);

  // Join order, the same on every device, so missions match.
  const coming = ((comingRows ?? []) as unknown as Coming[])
    .map((c) => ({ id: c.member_id, ...c.group_members }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const me = coming.find((m) => m.user_id === auth.claims.sub);
  const status = eventStatus(ev, ev.timezone);
  const T = TYPES[ev.type];
  const honoree = coming.find((m) => m.id === ev.honoree_member_id);
  const isHost = host?.user_id === auth.claims.sub;
  const today = todayIn(ev.timezone);
  const reveal = new Date(ev.reveal_at).toLocaleString("en-GB", {
    timeZone: ev.timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Trips have a day each; everything else is one day.
  const days =
    ev.type === "trip"
      ? Array.from({ length: diffDays(ev.start_date, ev.end_date) + 1 }, (_, k) => addDays(ev.start_date, k))
      : [ev.start_date];
  const fallback = today < days[0] ? days[0] : today > days[days.length - 1] ? days[days.length - 1] : today;
  const day = dayParam && days.includes(dayParam) ? dayParam : fallback;
  const di = days.indexOf(day);

  const mev: MissionEvent = {
    id: ev.id,
    type: ev.type,
    name: ev.name,
    members: coming.map((m) => m.display_name),
    honoree: honoree?.display_name ?? null,
  };
  const i = me ? coming.indexOf(me) : -1;

  // One swap a day on trips, one per event otherwise (stored against the day).
  const { data: swapRow } = me
    ? await supabase.from("swaps").select("*").eq("event_id", ev.id).eq("member_id", me.id).eq("day", day).maybeSingle()
    : { data: null };
  const sw = Math.min(swapRow?.count ?? 0, 1);

  let missions: Mission[] = [];
  let huntDay = "";
  if (me && ev.type === "trip") {
    const h = hunt(mev, di, i);
    const w = wild(mev, di, i, sw);
    huntDay = HUNT_DAY[h.type].toLowerCase();
    missions = [
      { kind: "group", label: "Everyone", task: groupFrame(mev, di), icon: { text: "all", bg: "var(--blue)", fg: "var(--on-blue)" } },
      {
        kind: "hunt",
        label: "Hunt",
        task: h.text,
        sub: h.sub,
        icon: h.type === "colour" ? { text: "", bg: h.bg! } : { text: h.glyph, bg: "var(--orange)" },
        meta: { hunt_type: h.type, hunt_tag: h.tag, hunt_order: h.order },
      },
      {
        kind: "wild",
        label: `Wildcard · ${CAT_LABEL[w.cat]}`,
        task: w.text,
        icon: { text: CAT_GLYPH[w.cat], bg: "var(--pink)" },
        meta: { wild_cat: w.cat },
        swappable: true,
      },
    ];
  } else if (me) {
    missions = [{ kind: "night", label: "Your challenge", task: single(mev, i, sw), icon: { text: "!", bg: "var(--orange)" }, swappable: true }];
  }

  // My shots for this day, shown as negatives.
  const mine = (photoRows ?? []).filter((p) => p.member_id === me?.id && (p.day === day || p.kind === "roll"));
  const urls = new Map<string, string>();
  if (mine.length) {
    const { data } = await supabase.storage.from("photos").createSignedUrls(
      mine.map((p) => p.storage_path),
      60 * 60,
    );
    data?.forEach((d) => d.path && d.signedUrl && urls.set(d.path, d.signedUrl));
  }
  const shots: Shot[] = mine.map((p) => ({
    id: p.id,
    kind: p.kind,
    frame: p.frame,
    storage_path: p.storage_path,
    url: urls.get(p.storage_path) ?? null,
  }));
  const allMine = (photoRows ?? []).filter((p) => p.member_id === me?.id);
  const nextFrame = Math.max(0, ...allMine.map((p) => p.frame ?? 0)) + 1;

  const countOf = new Map(((counts ?? []) as { member_id: string; shots: number }[]).map((c) => [c.member_id, c.shots]));
  const total = coming.reduce((n, m) => n + (countOf.get(m.id) ?? 0), 0);

  // What happened so far, from roll_state: calls with answer counts, and
  // who's snoozed or home right now.
  const rd = roll as RollData | null;
  const nameOf = (mid: string) => coming.find((m) => m.id === mid)?.display_name ?? "Someone";
  const nowMs = rd ? Date.parse(rd.now) : 0;
  const snoozed = (rd?.statuses ?? []).filter((x) => x.snooze_until && Date.parse(x.snooze_until) > nowMs).map((x) => nameOf(x.member_id));
  const gone = (rd?.statuses ?? []).filter((x) => x.home).map((x) => nameOf(x.member_id));
  const live = status.label === "Live";

  // Folded by default: the facts and the host's controls.
  const details = (
    <details className="card t-blue">
      <summary>Event details</summary>
      <dl className="facts">
        <dt className="label">Who&apos;s coming</dt>
        <dd>{coming.map((m) => m.display_name).join(", ")}</dd>
        {T.honoree && honoree && (
          <>
            <dt className="label">{T.honoree}</dt>
            <dd>{honoree.display_name}, with one extra Roll Call</dd>
          </>
        )}
        <dt className="label">Pace</dt>
        <dd>
          {PACES[ev.pace]} · {paceSummary(ev.type, ev.pace)}
        </dd>
        <dt className="label">Reveal</dt>
        <dd>{reveal}</dd>
        {host && (
          <>
            <dt className="label">Host</dt>
            <dd>{host.display_name}</dd>
          </>
        )}
      </dl>
      {isHost && !ev.revealed && <RevealNow eventId={ev.id} />}
      {isHost && <DeleteEvent eventId={ev.id} groupId={ev.group_id} />}
    </details>
  );

  const header = (
    <>
      <div className="top">
        <Link className="link" href={`/groups/${ev.group_id}`}>← {group?.name ?? "Back"}</Link>
        <span className={`pill ${status.tone}`}>{status.label}</span>
      </div>
      <section className="hero">
        <h1>{ev.name}</h1>
        <p className="muted">
          {T.label} · {formatWhen(ev)}
          {status.sub ? ` · ${status.sub}` : ""}
          {!ev.revealed ? ` · reveals ${reveal}` : ""}
        </p>
      </section>
    </>
  );

  if (ev.revealed) {
    const data = await buildReveal(
      supabase,
      ev,
      coming.map((m) => ({ id: m.id, display_name: m.display_name, away_card_path: m.away_card_path })),
      honoree?.display_name ?? null,
    );
    return (
      <>
        {header}
        <RevealView data={data} />
        {details}
      </>
    );
  }

  return (
    <>
      {header}

      {!me ? (
        <section className="card">
          <h2>Not on this one</h2>
          <p className="muted">You&apos;ll see the reveal.</p>
        </section>
      ) : (
        <>
          <AlertsSetup isAnonymous={!!auth.claims.is_anonymous} compact />

          {live && rd ? (
            <RollCall
              eventId={ev.id}
              type={ev.type}
              timeZone={ev.timezone}
              today={today}
              me={{ id: me.id, name: me.display_name }}
              members={coming.map((m) => ({ id: m.id, name: m.display_name }))}
              honoree={honoree ? { id: honoree.id, name: honoree.display_name } : null}
              data={rd}
              shots={shots.filter((x) => x.kind === "roll")}
              nextFrame={nextFrame}
            />
          ) : (
            <section className="card">
              <h2>Starts {formatDate(ev.start_date)}</h2>
              <p className="muted">Roll Calls and challenges open on the day. Here&apos;s a preview.</p>
            </section>
          )}

          <section className="card">
            <h2>Your challenge{ev.type === "trip" ? "s" : ""}</h2>
            {ev.type === "trip" && (
              <>
                <div className="days" role="group" aria-label="Day">
                  {days.map((d, k) => (
                    <Link key={d} className="chip" aria-current={d === day ? "page" : undefined} href={`/events/${ev.id}?day=${d}`} scroll={false}>
                      Day {k + 1}
                    </Link>
                  ))}
                </div>
                <p className="hand">
                  {huntDay}
                  {day === today ? " · today" : day > today ? " · opens on the day" : ""}
                </p>
              </>
            )}
            <Missions
              eventId={ev.id}
              memberId={me.id}
              myName={me.display_name}
              day={day}
              today={today}
              missions={missions}
              shots={shots.filter((x) => x.kind !== "roll" && x.kind !== "recreate")}
              nextFrame={nextFrame}
              disabled={!live || day > today}
              swapped={sw > 0}
            />
            {isRecreateDay(mev, di) && director(mev, di) && (
              <Recreate
                mev={mev}
                di={di}
                eventId={ev.id}
                memberId={me.id}
                myName={me.display_name}
                day={day}
                today={today}
                director={director(mev, di)!}
                present={coming.length - gone.length}
                nextFrame={nextFrame}
                disabled={!live || day > today}
                shots={shots.filter((x) => x.kind === "recreate")}
              />
            )}
          </section>
        </>
      )}

      {live && (
        <section className="card t-lime">
          <div className="top">
            <h2>So far</h2>
            <span className="big">{total}</span>
          </div>
          <p className="muted small">Who&apos;s shooting, not what.</p>
          {coming.map((m) => {
            const n = countOf.get(m.id) ?? 0;
            return (
              <div key={m.id} className="who">
                <span>
                  {m.display_name}
                  {m.id === me?.id ? " (you)" : ""}
                </span>
                <Tally n={Math.min(n, 60)} seed={hash(m.display_name)} />
                <span className="num">{n}</span>
              </div>
            );
          })}
          {(snoozed.length > 0 || gone.length > 0) && (
            <p className="muted small">
              {snoozed.length > 0 && `Snoozed: ${snoozed.join(", ")}`}
              {snoozed.length > 0 && gone.length > 0 && " · "}
              {gone.length > 0 && `Home: ${gone.join(", ")}`}
            </p>
          )}
          {rd && rd.calls.length > 0 && (
            <div className="calls">
              {rd.calls.map((c, k) => (
                <p key={c.id} className="small">
                  <span className="hand ink">#{k + 1}</span> {nameOf(c.caller_member_id)} called · {hhmm(c.called_at, ev.timezone)} ·{" "}
                  {c.answered}/{c.recipients.length + 1} shot
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      {details}
    </>
  );
}
