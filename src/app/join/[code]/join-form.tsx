"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type OpenName = { id: string; name: string };

export function JoinForm({ code, signedIn, openNames }: { code: string; signedIn: boolean; openNames: OpenName[] }) {
  const router = useRouter();
  const [ready, setReady] = useState(signedIn);
  const [claim, setClaim] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const here = `/join/${encodeURIComponent(code)}`;

  async function skipEmail() {
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInAnonymously();
    setBusy(false);
    if (error) setError("Couldn't start. Try again.");
    else setReady(true);
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().rpc("join_group", {
      p_code: code,
      p_display_name: claim ? null : name.trim(),
      p_claim_member_id: claim,
    });
    setBusy(false);
    if (!error) {
      router.replace("/");
      router.refresh();
    } else if (error.code === "23505") {
      setError(claim ? "Someone already joined as that name." : "That name's taken. If it's you, pick it above.");
    } else {
      setError(error.message || "Couldn't join. Try again.");
    }
  }

  if (!ready) {
    return (
      <section className="card">
        <h2>Sign in to join</h2>
        <div className="stack">
          <Link className="button" href={`/sign-in?next=${encodeURIComponent(here)}`}>Sign in with email</Link>
          <button type="button" className="ghost" onClick={skipEmail} disabled={busy}>Continue without email</button>
          {error && <p className="error small" role="alert">{error}</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <form className="stack" onSubmit={join}>
        {openNames.length > 0 && (
          <div className="field">
            <span className="label">Are you one of these?</span>
            <div className="chips" role="group" aria-label="Names already added">
              {openNames.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="chip"
                  aria-pressed={claim === n.id}
                  onClick={() => setClaim(claim === n.id ? null : n.id)}
                >
                  {n.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {!claim && (
          <label className="field">
            <span className="label">{openNames.length ? "Or your name" : "Your name"}</span>
            <input
              autoComplete="given-name"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        )}
        {error && <p className="error small" role="alert">{error}</p>}
        <div className="row">
          <button type="submit" disabled={busy || (!claim && !name.trim())}>Join</button>
        </div>
      </form>
    </section>
  );
}
