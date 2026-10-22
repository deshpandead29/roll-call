"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { discard, printAndUpload } from "@/lib/capture";
import { ACCENT, type HuntType, type PhotoKind, type WildCategory } from "@/lib/missions";
import { createClient } from "@/lib/supabase/client";

export type Mission = {
  kind: Exclude<PhotoKind, "roll" | "recreate">;
  label: string;
  task: string;
  sub?: string;
  icon: { text: string; bg: string; fg?: string };
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
  disabled,
}: {
  eventId: string;
  memberId: string;
  myName: string;
  day: string;
  today: string;
  missions: Mission[];
  shots: Shot[];
  nextFrame: number;
  disabled: boolean;
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
      const frame = nextFrame;
      const { id, path } = await printAndUpload(file, {
        eventId,
        memberId,
        frame,
        who: myName,
        today,
        mission: m.task,
        accent: ACCENT[m.kind],
      });
      const row = await createClient().from("photos").insert({
        id,
        event_id: eventId,
        member_id: memberId,
        day,
        kind: m.kind,
        mission: m.task,
        frame,
        storage_path: path,
        ...m.meta,
      });
      if (row.error) {
        await discard(path);
        throw new Error("Couldn't save it. Try again.");
      }
      setNote("Saved. It develops at the reveal.");
      router.refresh();
    } catch (x) {
      setError(x instanceof Error && x.message !== "encode" ? x.message : "Couldn't save it. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(s: Shot) {
    setConfirmDelete(null);
    const supabase = createClient();
    const { error } = await supabase.from("photos").delete().eq("id", s.id);
    if (error) return setError("Couldn't delete it. Try again.");
    await supabase.storage.from("photos").remove([s.storage_path]);
    router.refresh();
  }

  return (
    <>
      {missions.map((m) => {
        const mine = shots.filter((s) => s.kind === m.kind);
        return (
          <div key={m.kind} className="mission">
            <span
              className="dot-ic lg"
              style={{ background: m.icon.bg, color: m.icon.fg ?? "#16151A" }}
              aria-hidden="true"
            >
              {m.icon.text}
            </span>
            <div className="body">
              <span className="label">{m.label}</span>
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
                  <span className="hand ink small">develops at the reveal</span>
                </div>
              )}
              <div className="row">
                <button className="shutter" onClick={() => shoot(m)} disabled={disabled || !!busy}>
                  {busy === m.kind ? "Printing…" : "Shoot"}
                </button>
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
      {note && <p className="hand blue" role="status">{note}</p>}
      {error && <p className="error small" role="alert">{error}</p>}
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
    </>
  );
}
