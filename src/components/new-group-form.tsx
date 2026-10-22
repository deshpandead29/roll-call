"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChipInput, withDraft } from "@/components/chip-input";
import { createClient } from "@/lib/supabase/client";

export function NewGroupForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [me, setMe] = useState(defaultName);
  const [people, setPeople] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const others = withDraft(people, e.currentTarget);
    if (!name.trim()) return setError("Add a name for the group.");
    if (!me.trim()) return setError("Add your name.");
    setBusy(true);
    setError("");
    const { data, error } = await createClient().rpc("create_group", {
      p_name: name.trim(),
      p_display_name: me.trim(),
      p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London",
      p_other_names: others,
    });
    if (error) {
      setBusy(false);
      setError("Couldn't create the group. Try again.");
      return;
    }
    router.push(`/groups/${data}`);
  }

  return (
    <section className="card t-lime">
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          <span className="label">Name</span>
          <input placeholder="Uni lot" maxLength={60} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Your name</span>
          <input autoComplete="given-name" maxLength={40} value={me} onChange={(e) => setMe(e.target.value)} />
        </label>
        <ChipInput label="People" placeholder="Add a name" value={people} onChange={setPeople} />
        {error && <p className="error small" role="alert">{error}</p>}
        <div className="row">
          <button type="submit" className="shutter" disabled={busy}>{busy ? "Creating…" : "Create group"}</button>
        </div>
        <p className="muted small">You&apos;ll get a link to send them. They can add themselves too.</p>
      </form>
    </section>
  );
}
