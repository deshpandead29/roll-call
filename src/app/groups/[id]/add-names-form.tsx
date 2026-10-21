"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChipInput, withDraft } from "@/components/chip-input";
import { createClient } from "@/lib/supabase/client";

export function AddNamesForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [names, setNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const all = withDraft(names, e.currentTarget);
    if (!all.length) return;
    setBusy(true);
    setError("");
    const { error } = await createClient()
      .from("group_members")
      .insert(all.map((display_name) => ({ group_id: groupId, display_name })));
    setBusy(false);
    if (error) {
      setError(error.code === "23505" ? "One of those names is already in the group." : "Couldn't add them. Try again.");
      return;
    }
    setNames([]);
    router.refresh();
  }

  return (
    <details className="stack">
      <summary className="link">Add names</summary>
      <form className="stack" onSubmit={submit} noValidate>
        <ChipInput label="People" placeholder="Add a name" value={names} onChange={setNames} />
        {error && <p className="error small" role="alert">{error}</p>}
        <div className="row">
          <button type="submit" className="ghost" disabled={busy}>Add</button>
        </div>
      </form>
    </details>
  );
}
