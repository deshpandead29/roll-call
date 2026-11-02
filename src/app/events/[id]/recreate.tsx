"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { saveCapture, sendPending } from "@/lib/photo-queue";
import { ACCENT, recreateFor, type MissionEvent } from "@/lib/missions";

const COUNTS = [1, 2, 3, 4, 5, 6, 8, 10];

// Recreate: the director picks how many people they can round up and gets a
// matching painting, film scene or meme. Everyone else just knows who's
// directing.
export function Recreate({
  mev,
  di,
  eventId,
  memberId,
  myName,
  day,
  today,
  director,
  present,
  nextFrame,
  userId,
  disabled,
  shots,
}: {
  mev: MissionEvent;
  di: number;
  eventId: string;
  memberId: string;
  myName: string;
  day: string;
  today: string;
  director: string;
  present: number;
  nextFrame: number;
  userId: string;
  disabled: boolean;
  shots: { id: string; frame: number | null; url: string | null }[];
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [count, setCount] = useState(Math.min(Math.max(present, 1), 14));
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const isDirector = director === myName;
  const r = recreateFor(mev, di, count, offset);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !r) return;
    setBusy(true);
    setError("");
    try {
      const photo = await saveCapture(file, {
        eventId, memberId, frame: nextFrame, who: myName, today,
        mission: r.title, accent: ACCENT.recreate,
      }, { type: "photo", row: { day, kind: "recreate", mission: r.title, recreate_id: r.id, starring: count } }, userId);
      setNote("Saved on this device. Uploading…");
      const sent = await sendPending(photo);
      setNote(sent ? "Added. See it next to the original at the reveal." : "Saved on this device. See waiting photos above.");
      // Refreshing offline would swap the app for the browser's error page.
      if (sent) router.refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Couldn't save it. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mission recreate">
      <span className="dot-ic lg" style={{ background: "#7A4FD0", color: "#fff" }} aria-hidden="true">art</span>
      <div className="body">
        {!isDirector ? (
          <>
            <span className="label">Recreate</span>
            <p className="task">{director}&apos;s directing</p>
            <p className="muted small">If they grab you, go with it.</p>
          </>
        ) : (
          <>
            <span className="label">You&apos;re directing</span>
            {r ? (
              <>
                <p className="task">{r.title}</p>
                {r.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="orig" src={`/prototype/art/${r.img}.jpg`} alt={`${r.title}, ${r.source}`} />
                )}
                <p className="small">{r.prompt}</p>
                <p className="muted small">
                  {r.format} · {r.source}, {r.year}
                  {r.img ? "" : " · from memory"}
                </p>
              </>
            ) : (
              <p className="muted">Nothing for that many yet.</p>
            )}
            <div className="field">
              <span className="label">People</span>
              <div className="chips">
                {COUNTS.filter((n) => n <= Math.max(mev.members.length, 1)).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="chip"
                    aria-pressed={count === n}
                    onClick={() => {
                      setCount(n);
                      setOffset(0);
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {shots.length > 0 && (
              <div className="negs">
                <div className="strip">
                  {shots.map((x) => (
                    <div key={x.id} className="neg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {x.url && <img src={x.url} alt="Your shot, as a negative" />}
                      <span className="fn">{String(x.frame ?? 0).padStart(2, "0")}</span>
                    </div>
                  ))}
                </div>
                <span className="hand ink small">develops at the reveal</span>
              </div>
            )}
            <div className="row">
              <button className="shutter" disabled={disabled || busy || !r} onClick={() => input.current?.click()}>
                {busy ? "Printing…" : "Shoot"}
              </button>
              <button className="ghost" disabled={busy} onClick={() => setOffset((o) => o + 1)}>Another</button>
            </div>
            {note && <p className="hand blue" role="status">{note}</p>}
            {error && <p className="error small" role="alert">{error}</p>}
            <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
          </>
        )}
      </div>
    </div>
  );
}
