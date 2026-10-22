"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function JoinEvent({ eventId, memberId }: { eventId: string; memberId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function join() {
    setBusy(true);
    setError("");
    const { error } = await createClient().from("event_members").insert({ event_id: eventId, member_id: memberId });
    if (error) {
      setBusy(false);
      return setError("Couldn't join. Try again.");
    }
    router.refresh();
  }

  return (
    <>
      <div className="row">
        <button onClick={join} disabled={busy}>{busy ? "Joining…" : "Join"}</button>
      </div>
      {error && <p className="error small" role="alert">{error}</p>}
    </>
  );
}
