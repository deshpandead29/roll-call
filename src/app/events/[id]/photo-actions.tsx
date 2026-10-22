"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tile } from "./build-reveal";

export const REASONS = { private: "Private", hurtful: "Hurtful", other: "Other" } as const;
export type Reason = keyof typeof REASONS;

// In the lightbox: delete your own shot, remove someone's (host or group
// maker), or report it to them.
export function PhotoActions({ tile, canModerate, onDone }: { tile: Tile; canModerate: boolean; onDone: (note: string) => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"" | "delete" | "report">("");
  const [reason, setReason] = useState<Reason | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const verb = tile.mine ? "Delete" : "Remove";

  async function remove() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase.from("photos").delete().eq("id", tile.id).select("id");
    if (error || !data?.length) {
      setBusy(false);
      return setError(`Couldn't ${verb.toLowerCase()} it. Try again.`);
    }
    // Someone else's file goes when they next open the app.
    if (tile.mine) await supabase.storage.from("photos").remove([tile.storage_path]);
    onDone(tile.mine ? "Deleted" : "Removed");
    router.refresh();
  }

  async function report() {
    if (!reason) return;
    setBusy(true);
    setError("");
    const { error } = await createClient().rpc("report_photo", { p_photo_id: tile.id, p_reason: reason });
    if (error) {
      setBusy(false);
      return setError("Couldn't report it. Try again.");
    }
    onDone("Reported. It's hidden for you.");
    router.refresh();
  }

  if (step === "delete") {
    return (
      <div className="lb-panel">
        <p>{tile.mine ? "Delete this shot for everyone?" : `Remove ${tile.who}'s shot for everyone?`}</p>
        <div className="row">
          <button className="danger" onClick={remove} disabled={busy}>{verb}</button>
          <button className="ghost" onClick={() => setStep("")} disabled={busy}>Keep</button>
        </div>
        {error && <p className="error small" role="alert">{error}</p>}
      </div>
    );
  }
  if (step === "report") {
    return (
      <div className="lb-panel">
        <p>What&apos;s wrong with it?</p>
        <div className="chips" role="group" aria-label="Reason">
          {(Object.keys(REASONS) as Reason[]).map((r) => (
            <button key={r} className="chip" aria-pressed={reason === r} onClick={() => setReason(r)}>
              {REASONS[r]}
            </button>
          ))}
        </div>
        <p className="muted small">The host sees it and can take it down. It&apos;s hidden for you either way.</p>
        <div className="row">
          <button className="danger" onClick={report} disabled={busy || !reason}>Report</button>
          <button className="ghost" onClick={() => setStep("")} disabled={busy}>Cancel</button>
        </div>
        {error && <p className="error small" role="alert">{error}</p>}
      </div>
    );
  }
  return tile.mine || canModerate ? (
    <button className="link lb-link" onClick={() => setStep("delete")}>{verb}</button>
  ) : (
    <button className="link lb-link" onClick={() => setStep("report")}>Report</button>
  );
}
