"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Early reveal, for the host. Who else may do this is an open question in the
// brief; the events policy only lets the host change it for now.
export function RevealNow({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reveal() {
    setBusy(true);
    setError("");
    const { error } = await createClient()
      .from("events")
      .update({ revealed_at_override: new Date().toISOString() })
      .eq("id", eventId);
    setBusy(false);
    if (error) return setError("Couldn't reveal it. Try again.");
    fetch("/api/push/reveals", { method: "POST" }).catch(() => {});
    router.refresh();
  }

  if (!confirm) {
    return (
      <div className="row">
        <button className="ghost" onClick={() => setConfirm(true)}>Reveal now</button>
      </div>
    );
  }
  return (
    <div className="confirm">
      <p>Reveal for everyone? Shooting ends.</p>
      <div className="row">
        <button onClick={reveal} disabled={busy}>Reveal</button>
        <button className="ghost" onClick={() => setConfirm(false)} disabled={busy}>Cancel</button>
      </div>
      {error && <p className="error small" role="alert">{error}</p>}
    </div>
  );
}
