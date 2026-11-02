"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { hhmm } from "@/lib/events";
import { saveCapture, sendPending } from "@/lib/photo-queue";
import type { EventType } from "@/lib/events";
import { ACCENT } from "@/lib/missions";
import { createClient } from "@/lib/supabase/client";
import type { Shot } from "./missions";

export type RollData = {
  now: string;
  me: string | null;
  state: null | {
    live: boolean;
    revealed: boolean;
    open: number | null;
    remaining: number | null;
    reserved_total: number;
    reserved_used: boolean;
    cooldown_left_s: number;
    ok: boolean;
    why: string | null;
    can_ask: boolean;
    reserved: boolean;
    extra: boolean;
  };
  calls: {
    id: string;
    caller_member_id: string | null;
    called_at: string;
    recipients: string[];
    answered: number;
    mine_answered: boolean;
  }[];
  asks: { id: string; requester_member_id: string; asked_at: string; backers: string[] }[];
  statuses: { member_id: string; snooze_until: string | null; home: boolean }[];
};

// joined: false for a name nobody has claimed yet. They get no buzz.
type Member = { id: string; name: string; joined?: boolean };
type Call = RollData["calls"][number];
type Job = { type: "call"; recipients: string[] | null } | { type: "answer"; call: Call };
type Sheet = { copy: string; yes: string; no: string; split: string[] | null; mode: "split" | "all" };

const MIN = 60_000;
// Wall clock for event handlers and timers, not render.
const clock = () => Date.now();
const pad = (n: number) => String(n).padStart(2, "0");
const mins = (ms: number) => Math.max(1, Math.ceil(ms / MIN));

const notNowListeners = new Set<() => void>();
const subscribeNotNow = (fn: () => void) => {
  notNowListeners.add(fn);
  return () => notNowListeners.delete(fn);
};
const readNotNow = (key: string) => {
  try {
    return sessionStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
};

// Epoch ms for `hour`:00 on `date` in `timeZone`.
function zoned(date: string, hour: number, timeZone: string) {
  const guess = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), hour);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value]),
  );
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return guess - (asUTC - guess);
}

export function RollCall({
  eventId,
  type,
  timeZone,
  today,
  me,
  members,
  data,
  shots,
  nextFrame,
  userId,
  reveal,
}: {
  eventId: string;
  type: EventType;
  timeZone: string;
  today: string;
  me: Member;
  members: Member[];
  data: RollData;
  shots: Shot[];
  nextFrame: number;
  userId: string;
  reveal: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const job = useRef<Job | null>(null);
  const [now, setNow] = useState(() => Date.parse(data.now));
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  // "Not now" sticks for that call on this device, so a reload doesn't bring it back.
  const notNowKey = `rc-not-now:${eventId}`;
  const dismissedRaw = useSyncExternalStore(subscribeNotNow, () => readNotNow(notNowKey), () => "[]");
  const dismissed = JSON.parse(dismissedRaw) as string[];
  function notNow(id: string) {
    try {
      sessionStorage.setItem(notNowKey, JSON.stringify([...dismissed, id]));
    } catch {}
    notNowListeners.forEach((fn) => fn());
  }
  const [answered, setAnswered] = useState<string[]>([]);
  const [refreshing, startRefresh] = useTransition();

  // Live: refresh when a call, ask, back or status changes; tick the clock.
  useEffect(() => {
    const supabase = createClient();
    let t: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(() => navigator.onLine && router.refresh(), 250);
    };
    const filter = `event_id=eq.${eventId}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let closed = false;
    // Hand Realtime the session before joining. On a fresh page load the
    // client hasn't read it yet, and a join without it counts as signed out,
    // which can't read these tables: filters fail ("invalid column") and
    // changes arrive empty ("401 Unauthorized").
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (closed) return;
      if (session) supabase.realtime.setAuth(session.access_token);
      channel = supabase
        .channel(`roll:${eventId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "roll_calls", filter }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "member_status", filter }, refresh)
        .subscribe();
    });
    const tick = setInterval(() => setNow(clock()), 1000);
    // Offline, a refresh fails and Next falls back to a full page load, which
    // swaps the app for the browser's error page. Skip it until we're back.
    const slow = setInterval(() => navigator.onLine && router.refresh(), 30_000);
    return () => {
      clearTimeout(t);
      clearInterval(tick);
      clearInterval(slow);
      closed = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [eventId, router]);

  const st = data.state;
  const name = (id: string | null) => members.find((m) => m.id === id)?.name ?? "Someone";
  const statusOf = (id: string) => data.statuses.find((s) => s.member_id === id);
  const isSnoozed = (id: string) => {
    const s = statusOf(id)?.snooze_until;
    return !!s && Date.parse(s) > now;
  };
  const isHome = (id: string) => !!statusOf(id)?.home;
  const others = members.filter((m) => m.id !== me.id);
  const open = data.calls
    .filter(
      (c) =>
        c.caller_member_id !== me.id &&
        c.recipients.includes(me.id) &&
        !answered.includes(c.id) &&
        now - Date.parse(c.called_at) < 15 * MIN &&
        !c.mine_answered,
    )
    .reverse();
  // Nudges before calling: one at a time, first match wins.
  function nudge(): Sheet {
    const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(now));
    const recent = data.calls.filter((c) => Date.parse(c.called_at) > now - 2 * 60 * MIN);
    const out = others.filter((m) => !isHome(m.id) && !isSnoozed(m.id));
    const split =
      others.length >= 2 && out.length > 0 && out.length < others.length && others.length - out.length >= others.length / 2
        ? out.map((m) => m.id)
        : null;
    const base: Sheet = { copy: "Take your photo to start the Roll Call.", yes: "Take photo", no: "Cancel", split, mode: split ? "split" : "all" };
    if (st?.extra) return { ...base, copy: "All shared calls are used. Start an extra as the host?", yes: "Start extra", no: "Cancel" };
    if (hour < 6) return { ...base, copy: `It's ${hhmm(now, timeZone)}. People are asleep.`, yes: "Call anyway", no: "Save it" };
    if (recent.length >= 3)
      return { ...base, copy: `${recent.length} calls since ${hhmm(recent[0].called_at, timeZone)}. Sure?`, yes: "Call anyway", no: "Wait" };
    if (st && !st.extra && !st.reserved && st.remaining === 1)
      return type === "birthday"
        ? { ...base, copy: "Last one. Is it the cake?", yes: "It's the cake", no: "Save it" }
        : { ...base, copy: "Last one. Sure?", yes: "Yes, now", no: "Save it" };
    if (split) return { ...base, copy: `Only ${split.length + 1} of you still out.` };
    return base;
  }

  const recipients = sheet?.split && sheet.mode === "split" ? sheet.split : others.map((m) => m.id);
  const buzz = recipients.filter((id) => members.find((m) => m.id === id)?.joined !== false && !isSnoozed(id) && !isHome(id)).length;

  function openCamera(j: Job) {
    job.current = j;
    setError("");
    setNote("");
    input.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const j = job.current;
    job.current = null;
    if (!file || !j) return;
    setBusy(true);
    const t = clock();
    const caller = j.type === "call" ? me.name : name(j.call.caller_member_id);
    try {
      const photo = await saveCapture(file, {
        eventId, memberId: me.id, frame: nextFrame, who: me.name, today,
        mission: `roll call · ${caller}`, accent: ACCENT.roll, time: hhmm(t, timeZone),
      }, j.type === "call" ? { type: "call", recipients: j.recipients } : { type: "answer", callId: j.call.id }, userId);
      setNote("Saved on this phone. Sending…");
      const sent = await sendPending(photo);
      if (j.type === "call") setSheet(null);
      if (sent && j.type === "answer") setAnswered((a) => [...a, j.call.id]);
      setNote(sent
        ? j.type === "call" ? "Roll Call started." : `Added to ${caller}'s Roll Call.`
        : j.type === "call" ? "Not sent yet. Your call hasn't started. Use Retry above before calling again."
          : "Not sent yet. It's saved on this phone and will send. See above.");
      // Only a photo that reached the server changes the page; the waiting
      // panel updates itself, and refreshing offline would lose the app.
      if (sent) startRefresh(() => router.refresh());
    } catch (x) {
      setError(x instanceof Error ? x.message : "Couldn't save it. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(what: "1h" | "night" | "wake" | "home" | "out") {
    const t = clock();
    const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(t));
    const date = new Intl.DateTimeFormat("en-CA", { timeZone }).format(t);
    const sixAm = zoned(date, 6, timeZone) + (hour >= 6 ? 24 * 60 * MIN : 0);
    const patch =
      what === "1h"
        ? { snooze_until: new Date(t + 60 * MIN).toISOString() }
        : what === "night"
          ? { snooze_until: new Date(sixAm).toISOString() }
          : what === "wake"
            ? { snooze_until: null }
            : what === "home"
              ? { home: true, home_at: new Date(t).toISOString() }
              : { home: false, home_at: null };
    const { error } = await createClient()
      .from("member_status")
      .upsert({ event_id: eventId, member_id: me.id, ...patch }, { onConflict: "event_id,member_id" });
    if (error) return setError("Couldn't save that. Try again.");
    setNote({ "1h": "Snoozed 1 hour", night: "Snoozed till morning", home: "Home. No more buzzes.", out: "Back out", wake: "Unsnoozed" }[what]);
    router.refresh();
  }

  if (!st) return null;
  const live = st.live && !isSnoozed(me.id) && !isHome(me.id);
  const incoming = live ? open.filter((c) => !dismissed.includes(c.id)) : [];
  const waiting = open.filter((c) => !incoming.includes(c));
  const lastAnswered = data.calls.filter((c) => c.mine_answered || answered.includes(c.id)).pop();
  const timing = (c: Call) => {
    const at = Date.parse(c.called_at);
    // Clock times, not a ticking countdown: honest, without the pressure.
    return at + 2 * MIN > now
      ? `Called ${hhmm(at, timeZone)} · on time until ${hhmm(at + 2 * MIN, timeZone)}, still counts until ${hhmm(at + 15 * MIN, timeZone)}`
      : `Called ${hhmm(at, timeZone)} · late now, still counts until ${hhmm(at + 15 * MIN, timeZone)}`;
  };

  return (
    <>
      {/* Answering outranks calling: an open call for you comes first. */}
      {incoming.map((c) => (
        <section key={c.id} className="alert" aria-labelledby={`call-${c.id}`}>
          <p className="alert-k">Roll Call</p>
          <h2 id={`call-${c.id}`} className="alert-t">{name(c.caller_member_id)} called roll</h2>
          <p className="alert-c">{timing(c)}</p>
          <div className="row">
            <button className="shutter alert-go" disabled={busy} onClick={() => openCamera({ type: "answer", call: c })}>
              {busy ? "Saving…" : "Take photo"}
            </button>
            <button className="link alert-no" onClick={() => notNow(c.id)}>Not now</button>
          </div>
        </section>
      ))}

      <section className="card rc-card">
        <div className="top">
          <h2>Roll Call</h2>
          <span className="muted small">{st.open === null ? "No limit" : `${st.remaining} left`}</span>
        </div>
        {waiting.map((c) => (
          <div key={c.id} className="ask">
            <p>
              <strong>{name(c.caller_member_id)} called roll</strong> · {mins(now - Date.parse(c.called_at))} min ago
            </p>
            <button className="shutter" disabled={busy} onClick={() => openCamera({ type: "answer", call: c })}>
              {now - Date.parse(c.called_at) > 2 * MIN ? "Take photo (late)" : "Take photo"}
            </button>
          </div>
        ))}

        {sheet ? (
          <div className="sheet">
            <p className="nudge">{sheet.copy}</p>
            {sheet.split && (
              <div className="chips">
                <button type="button" className="chip" aria-pressed={sheet.mode === "split"} onClick={() => setSheet({ ...sheet, mode: "split" })}>
                  Just us {sheet.split.length + 1}
                </button>
                <button type="button" className="chip" aria-pressed={sheet.mode === "all"} onClick={() => setSheet({ ...sheet, mode: "all" })}>
                  Everyone
                </button>
              </div>
            )}
            <p className="muted small">
              Alerts go to {buzz} {buzz === 1 ? "person" : "people"}, if their phones allow it.{st.extra ? " This is an extra host call." : ""}
            </p>
            <div className="row">
              <button
                className="shutter"
                disabled={busy}
                onClick={() => openCamera({ type: "call", recipients: sheet.split && sheet.mode === "split" ? sheet.split : null })}
              >
                {busy ? "Saving…" : sheet.yes}
              </button>
              <button className="ghost" disabled={busy} onClick={() => setSheet(null)}>{sheet.no}</button>
            </div>
          </div>
        ) : (
          <>
            <button
              className={`callbtn${incoming.length || waiting.length ? " quiet" : ""}`}
              disabled={!st.ok || busy || refreshing}
              onClick={() => setSheet(nudge())}
            >
              Call roll
            </button>
            {/* With a call waiting for you, answering is the job; why you can't call can wait. */}
            {!(incoming.length || waiting.length) && <p className="muted small">
              {st.ok
                ? st.extra ? "Shared calls are used up. As the host you can start an extra." : "Anyone can call. You take the first photo."
                : st.why}
            </p>}
          </>
        )}

        {(lastAnswered || shots.length > 0) && (
          <div className="done">
            {lastAnswered && <p>You answered {name(lastAnswered.caller_member_id)}&apos;s Roll Call.</p>}
            {shots.length > 0 && (
              <div className="strip" aria-label={`Your Roll Call photos, ${shots.length}, shown as negatives`}>
                {shots.map((s) => (
                  <div key={s.id} className="neg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {s.url && <img src={s.url} alt="" />}
                    <span className="fn">{pad(s.frame ?? 0)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="muted small">Everyone&apos;s photos open {reveal}.</p>
          </div>
        )}

        {note && <p className="note" role="status">{note}</p>}
        {error && <p className="error small" role="alert">{error}</p>}

        {st.live &&
          (isSnoozed(me.id) || isHome(me.id) ? (
            <div className="status-row">
              {isSnoozed(me.id) && (
                <>
                  <span className="small">Alerts paused until {hhmm(statusOf(me.id)!.snooze_until!, timeZone)}.</span>
                  <button className="link" onClick={() => setStatus("wake")}>Undo</button>
                </>
              )}
              {isHome(me.id) && (
                <>
                  <span className="small">You&apos;re home. No more alerts.</span>
                  <button className="link" onClick={() => setStatus("out")}>Back out</button>
                </>
              )}
            </div>
          ) : (
            <details className="pause">
              <summary className="small">Pause alerts</summary>
              <div className="status-row">
                <button className="chip" onClick={() => setStatus("1h")}>Snooze 1h</button>
                <button className="chip" onClick={() => setStatus("night")}>Snooze tonight</button>
                {type !== "trip" && <button className="chip" onClick={() => setStatus("home")}>Going home</button>}
              </div>
            </details>
          ))}
        <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      </section>
    </>
  );
}
