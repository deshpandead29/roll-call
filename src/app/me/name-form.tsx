"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function NameForm({ current }: { current: string }) {
  const router = useRouter();
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    const { error } = await createClient().rpc("set_my_name", { p_name: name.trim() });
    setBusy(false);
    if (error) return setError(error.code === "23505" ? error.message : "Couldn't save it. Try again.");
    setNote("Saved");
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={save}>
      <label className="field">
        <span className="label">Name</span>
        <input autoComplete="given-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      {error && <p className="error small" role="alert">{error}</p>}
      <div className="row">
        <button type="submit" disabled={busy || !name.trim() || name.trim() === current}>Save</button>
        {note && <span className="hand blue" role="status">{note}</span>}
      </div>
    </form>
  );
}
