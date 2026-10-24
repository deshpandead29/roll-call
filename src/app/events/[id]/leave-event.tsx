"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// For guests: off the event, and your shots from it go too. The group stays.
export function LeaveEvent({ eventId, memberId, name }: { eventId: string; memberId: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function leave() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { data: shots } = await supabase.from("photos").delete().eq("event_id", eventId).eq("member_id", memberId).select("storage_path");
    const paths = (shots ?? []).map((s) => s.storage_path);
    if (paths.length) await Promise.all([supabase.storage.from("photos").remove(paths), supabase.storage.from("negatives").remove(paths)]);
    const { error } = await supabase.from("event_members").delete().eq("event_id", eventId).eq("member_id", memberId);
    if (error) {
      setBusy(false);
      return setError("Couldn't leave. Try again.");
    }
    router.replace(`/events/${eventId}`);
    router.refresh();
  }

  return (
    <section className="stack">
      {confirm ? (
        <div className="confirm">
          <p>Leave {name}? Your shots from it are deleted. You stay in the group.</p>
          <div className="row">
            <button type="button" className="danger" onClick={leave} disabled={busy}>Leave</button>
            <button type="button" className="ghost" onClick={() => setConfirm(false)} disabled={busy}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="row">
          <button type="button" className="link" onClick={() => setConfirm(true)}>Leave this event</button>
        </div>
      )}
      {error && <p className="error small" role="alert">{error}</p>}
    </section>
  );
}
