"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { discard } from "@/lib/capture";
import { saveCapture, sendPending } from "@/lib/photo-queue";
import { ACCENT, type HuntType, type PhotoKind, type WildCategory } from "@/lib/missions";
import { createClient } from "@/lib/supabase/client";

export type Mission = {
  kind: Exclude<PhotoKind, "roll" | "recreate">;
  label: string;
  task: string;
  sub?: string;
  icon: { text: string; bg: string; fg?: string };
  // One swap a day (or per event) for the wildcard or the deck challenge.
  swappable?: boolean;
  meta?: { hunt_type?: HuntType; hunt_tag?: string; hunt_order?: number; wild_cat?: WildCategory };
};

export type Shot = { id: string; kind: PhotoKind; frame: number | null; storage_path: string; url: string | null };

const pad = (n: number) => String(n).padStart(2, "0");

export function Missions({
  eventId,
  memberId,
  myName,
  day,
  today,
  missions,
  shots,
  nextFrame,
  userId,
  disabled,
  swapped = false,
}: {
  eventId: string;
  memberId: string;
  myName: string;
  day: string;
  today: string;
  missions: Mission[];
  shots: Shot[];
  nextFrame: number;
  userId: string;
  disabled: boolean;
  swapped?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<Mission | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Shot | null>(null);

  function shoot(m: Mission) {
    if (busy) return;
    pending.current = m;
    setError("");
    setNote("");
    input.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const m = pending.current;
    pending.current = null;
    if (!file || !m) return;
    setBusy(m.kind);
    try {
      const photo = await saveCapture(file, {
        eventId, memberId, frame: nextFrame, who: myName, today,
        mission: m.task, accent: ACCENT[m.kind],
      }, { type: "photo", row: { day, kind: m.kind, mission: m.task, ...m.meta } }, userId);
      setNote("Saved on this phone. Sending…");
      const sent = await sendPending(photo);
      setNote(sent ? "Added. It opens with everyone else's." : "Not sent yet. It's saved on this phone and will send. See above.");
      // Refreshing offline would swap the app for the browser's error page.
      if (sent) router.refresh();
    } catch (x) {
      setError(x instanceof Error && x.message !== "encode" ? x.message : "Couldn't save it. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function swap() {
    setError("");
    const { error } = await createClient()
      .from("swaps")
      .upsert({ event_id: eventId, member_id: memberId, day, count: 1 }, { onConflict: "event_id,member_id,day" });
    if (error) return setError("Couldn't swap it. Try again.");
    setNote("Swapped");
    router.refresh();
  }

  async function remove(s: Shot) {
    setConfirmDelete(null);
    const supabase = createClient();
    const { error } = await supabase.from("photos").delete().eq("id", s.id);
    if (error) return setError("Couldn't delete it. Try again.");
    await discard(s.storage_path);
    router.refresh();
  }

  return (
    <>
      {missions.map((m) => {
        const mine = shots.filter((s) => s.kind === m.kind);
        return (
          <div key={m.kind} className="mission">
            <div className="body">
              {m.kind !== "night" && <span className="label">{m.label}</span>}
              <p className="task">{m.task}</p>
              {m.sub && <p className="muted small">{m.sub}</p>}
              {mine.length > 0 && (
                <div className="negs">
                  <div className="strip">
                    {mine.map((s) => (
                      <div key={s.id} className="neg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {s.url && <img src={s.url} alt="Your shot, as a negative" />}
                        <span className="fn">{pad(s.frame ?? 0)}</span>
                        <button className="x" aria-label={`Delete shot ${pad(s.frame ?? 0)}`} onClick={() => setConfirmDelete(s)}>
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="row">
                <button className="shutter" onClick={() => shoot(m)} disabled={disabled || !!busy}>
                  {busy === m.kind ? "Saving…" : mine.length ? "Another" : "Take photo"}
                </button>
                {m.swappable && !swapped && !mine.length && (
                  <button className="ghost" onClick={swap} disabled={disabled || !!busy}>Swap</button>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {confirmDelete && (
        <div className="confirm">
          <p>Delete this shot?</p>
          <div className="row">
            <button className="danger" onClick={() => remove(confirmDelete)}>Delete</button>
            <button className="ghost" onClick={() => setConfirmDelete(null)}>Keep</button>
          </div>
        </div>
      )}
      {note && <p className="note" role="status">{note}</p>}
      {error && <p className="error small" role="alert">{error}</p>}
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
    </>
  );
}
