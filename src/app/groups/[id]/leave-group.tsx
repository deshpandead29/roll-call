"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sweep } from "@/lib/sweep";

export function LeaveGroup({ groupId, groupName, last }: { groupId: string; groupName: string; last: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function leave() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.rpc("leave_group", { p_group_id: groupId });
    if (error) {
      setBusy(false);
      return setError("Couldn't leave. Try again.");
    }
    await sweep(supabase).catch(() => {});
    router.replace("/");
    router.refresh();
  }

  return (
    <section className="stack">
      {confirm ? (
        <div className="confirm">
          <p>
            {last
              ? `You're the only one who's joined. Leaving deletes ${groupName} and all its events.`
              : `Leave ${groupName}? Your photos and away card are deleted. Roll Calls you started stay, and events you host pass to someone else.`}
          </p>
          <div className="row">
            <button type="button" className="danger" onClick={leave} disabled={busy}>Leave</button>
            <button type="button" className="ghost" onClick={() => setConfirm(false)} disabled={busy}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="row">
          <button type="button" className="link" onClick={() => setConfirm(true)}>Leave group</button>
        </div>
      )}
      {error && <p className="error small" role="alert">{error}</p>}
    </section>
  );
}
