import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertsSetup } from "@/components/alerts-setup";
import { Tally } from "@/components/tally";
import { addDays, diffDays, eventStatus, formatWhen, PACES, paceSummary, todayIn, TYPES, type EventType, type Pace } from "@/lib/events";
import {
  CAT_GLYPH,
  CAT_LABEL,
  groupFrame,
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

  let missions: Mission[] = [];
  let huntDay = "";
  if (me && ev.type === "trip") {
    const h = hunt(mev, di, i);
    const w = wild(mev, di, i, 0);
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
      },
    ];
  } else if (me) {
    missions = [{ kind: "night", label: "Your challenge", task: single(mev, i, 0), icon: { text: "!", bg: "var(--orange)" } }];
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

  if (ev.revealed) {
    const data = await buildReveal(
      supabase,
      ev,
      coming.map((m) => ({ id: m.id, display_name: m.display_name, away_card_path: m.away_card_path })),
      honoree?.display_name ?? null,
    );
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
          </p>
        </section>
        <RevealView data={data} />
        {isHost && <DeleteEvent eventId={ev.id} groupId={ev.group_id} />}
      </>
    );
  }

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

      {me ? (
        <>
        <AlertsSetup isAnonymous={!!auth.claims.is_anonymous} />
        {roll && (
          <RollCall
            eventId={ev.id}
            type={ev.type}
            timeZone={ev.timezone}
            today={today}
            me={{ id: me.id, name: me.display_name }}
            members={coming.map((m) => ({ id: m.id, name: m.display_name }))}
            honoree={honoree ? { id: honoree.id, name: honoree.display_name } : null}
            data={roll as RollData}
            shots={shots.filter((x) => x.kind === "roll")}
            nextFrame={nextFrame}
          />
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
                {day === today ? " · today" : ""}
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
            shots={shots.filter((x) => x.kind !== "roll")}
            nextFrame={nextFrame}
            disabled={ev.revealed}
          />
        </section>
        </>
      ) : (
        <section className="card">
          <h2>Not on this one</h2>
          <p className="muted">You&apos;ll see the reveal.</p>
        </section>
      )}

      <section className="card t-lime">
        <div className="top">
          <h2>Shots</h2>
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
      </section>

      <section className="card t-blue">
        <div className="top">
          <h2>Reveal</h2>
          <span className="hand ink">{reveal}</span>
        </div>
        <dl className="facts">
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
          {host && (
            <>
              <dt className="label">Host</dt>
              <dd>{host.display_name}</dd>
            </>
          )}
        </dl>
        {isHost && <RevealNow eventId={ev.id} />}
      </section>

      {isHost && <DeleteEvent eventId={ev.id} groupId={ev.group_id} />}
    </>
  );
}
