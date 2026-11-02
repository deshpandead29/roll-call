"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const job = useRef<Job | null>(null);
  const [now, setNow] = useState(() => Date.parse(data.now));
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState<string[]>([]);
  // Calls you've just answered, hidden before the refresh lands.
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
  const pending = data.calls
    .filter(
      (c) =>
        c.caller_member_id !== me.id &&
        c.recipients.includes(me.id) &&
        !answered.includes(c.id) &&
        now - Date.parse(c.called_at) < 15 * MIN &&
        !c.mine_answered,
    )
    .pop();
  // Nudges before calling: one at a time, first match wins.
  function nudge(): Sheet {
    const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(now));
    const recent = data.calls.filter((c) => Date.parse(c.called_at) > now - 2 * 60 * MIN);
    const out = others.filter((m) => !isHome(m.id) && !isSnoozed(m.id));
    const split =
      others.length >= 2 && out.length > 0 && out.length < others.length && others.length - out.length >= others.length / 2
        ? out.map((m) => m.id)
        : null;
    const base: Sheet = { copy: "Take your photo to start this Roll Call.", yes: "Shoot", no: "Cancel", split, mode: split ? "split" : "all" };
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
      setNote("Saved on this device. Uploading…");
      const sent = await sendPending(photo);
      if (j.type === "call") setSheet(null);
      if (sent && j.type === "answer") setAnswered((a) => [...a, j.call.id]);
      setNote(sent
        ? j.type === "call" ? "Roll Call started. Responses will appear below." : "Answer added"
        : j.type === "call" ? "Photo saved on this device. Call status isn't confirmed. Retry above before starting another."
          : "Saved on this device. See waiting photos above.");
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
  const used = st.open === null ? 0 : st.open - (st.remaining ?? 0);
  const showAlert = pending && st.live && !isSnoozed(me.id) && !isHome(me.id) && !dismissed.includes(pending.id);
  const left = pending ? Date.parse(pending.called_at) + 2 * MIN - now : 0;

  return (
    <section className="card rc-card">
      <div className="top">
        <h2>Roll Call</h2>
        <span className="hand ink">{st.open === null ? "no limit" : `${st.remaining} left`}</span>
      </div>
      {st.open !== null && (
        <div className="rc-dots" aria-hidden="true">
          {Array.from({ length: st.open }, (_, k) => (
            <span key={k} className={`rc-dot${k < used ? " used" : ""}`} />
          ))}
        </div>
      )}
      {pending && !showAlert && (
        <div className="ask">
          <p>
            <strong>{name(pending.caller_member_id)} called roll</strong> · {mins(now - Date.parse(pending.called_at))} min ago
          </p>
          <button className="shutter" disabled={busy} onClick={() => openCamera({ type: "answer", call: pending })}>
            {now - Date.parse(pending.called_at) > 2 * MIN ? "Shoot (late)" : "Shoot"}
          </button>
        </div>
      )}

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
            {buzz} {buzz === 1 ? "person is" : "people are"} included for alerts. Delivery depends on their phone settings and connection.{st.extra ? " Starts an extra host call." : ""}
          </p>
          <div className="row">
            <button
              className="shutter"
              disabled={busy}
              onClick={() => openCamera({ type: "call", recipients: sheet.split && sheet.mode === "split" ? sheet.split : null })}
            >
              {busy ? "Printing…" : sheet.yes}
            </button>
            <button className="ghost" disabled={busy} onClick={() => setSheet(null)}>{sheet.no}</button>
          </div>
        </div>
      ) : (
        <>
          <button className="callbtn" disabled={!st.ok || busy || refreshing} onClick={() => setSheet(nudge())}>
            <span className="callbtn-dot" />
            Call roll
          </button>
          <p className={`${st.ok ? "muted" : "hand"} small`}>
            {st.ok
              ? st.extra ? "All shared calls used. You can start an extra as the host." : "Anyone can call. You shoot first."
              : st.why}
          </p>
        </>
      )}

      {st.live && (
        <div className="status-row">
          {isSnoozed(me.id) ? (
            <>
              <span className="hand ink">snoozed till {hhmm(statusOf(me.id)!.snooze_until!, timeZone)}</span>
              <button className="link" onClick={() => setStatus("wake")}>Undo</button>
            </>
          ) : (
            <>
              <button className="chip" onClick={() => setStatus("1h")}>Snooze 1h</button>
              <button className="chip" onClick={() => setStatus("night")}>Snooze tonight</button>
            </>
          )}
          {type !== "trip" &&
            (isHome(me.id) ? (
              <button className="chip" onClick={() => setStatus("out")}>Back out</button>
            ) : (
              <button className="chip" onClick={() => setStatus("home")}>Going home</button>
            ))}
        </div>
      )}
      {shots.length > 0 && (
        <div className="negs">
          <div className="strip">
            {shots.map((s) => (
              <div key={s.id} className="neg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.url && <img src={s.url} alt="Your shot, as a negative" />}
                <span className="fn">{pad(s.frame ?? 0)}</span>
              </div>
            ))}
          </div>
          <span className="hand ink small">develops at the reveal</span>
        </div>
      )}

      {note && <p className="hand blue" role="status">{note}</p>}
      {error && <p className="error small" role="alert">{error}</p>}
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />

      {showAlert && (
        <div className="alert" role="alertdialog" aria-label="Roll Call">
          <p className="alert-k">roll call</p>
          <p className="alert-t">{name(pending.caller_member_id)} called roll</p>
          <p className="alert-c">{left > 0 ? `${Math.floor(left / MIN)}:${pad(Math.floor((left % MIN) / 1000))} to answer on time` : "Late, still counts"}</p>
          <p className="small">Start sending within 15 minutes of the call. Once accepted, you have 10 minutes to finish uploading.</p>
          <div className="row">
            <button className="shutter alert-go" disabled={busy} onClick={() => openCamera({ type: "answer", call: pending })}>
              {busy ? "Printing…" : "Shoot"}
            </button>
            <button className="ghost alert-no" onClick={() => setDismissed((d) => [...d, pending.id])}>Not now</button>
          </div>
        </div>
      )}
    </section>
  );
}
