"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sweep } from "@/lib/sweep";

export function DeleteEvent({ eventId, groupId }: { eventId: string; groupId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      setBusy(false);
      setError("Couldn't delete it. Try again.");
      return;
    }
    // Your own files go now; everyone else's go when they next open the app.
    await sweep(supabase).catch(() => {});
    router.replace(`/groups/${groupId}`);
    router.refresh();
  }

  return (
    <section className="stack">
      {confirm ? (
        <div className="confirm">
          <p>Delete this event for everyone? Its photos go too.</p>
          <div className="row">
            <button type="button" className="danger" onClick={remove} disabled={busy}>Delete</button>
            <button type="button" className="ghost" onClick={() => setConfirm(false)} disabled={busy}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="row">
          <button type="button" className="link" onClick={() => setConfirm(true)}>Delete event</button>
        </div>
      )}
      {error && <p className="error small" role="alert">{error}</p>}
    </section>
  );
}
