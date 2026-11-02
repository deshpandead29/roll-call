"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertsSetup } from "@/components/alerts-setup";
import { createClient } from "@/lib/supabase/client";

// Ask for a name and offer alerts. Away cards remain optional in the profile.
export function WelcomeFlow({
  next,
  name: initial,
  startAt,
  isAnonymous,
}: {
  next: string;
  name: string;
  startAt: "name" | "alerts";
  isAnonymous: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"name" | "alerts">(startAt);
  const numbered = startAt === "name";
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const go = () => {
    router.replace(next);
    router.refresh();
  };

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().rpc("set_my_name", { p_name: name.trim() });
    setBusy(false);
    if (error) return setError(error.code === "23505" ? error.message : "Couldn't save it. Try again.");
    setStep("alerts");
  }

  if (step === "name") {
    return (
      <>
        <section className="hero">
          <span className="label">1 of 2</span>
          <h1>What do your friends call you?</h1>
          <p className="lede muted">It&apos;s what your groups see on your shots. You can change it later.</p>
        </section>
        <section className="card">
          <form className="stack" onSubmit={saveName}>
            <label className="field">
              <span className="label">Your name</span>
              <input autoComplete="given-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>
            {error && <p className="error small" role="alert">{error}</p>}
            <div className="row">
              <button type="submit" disabled={busy || !name.trim()}>Next</button>
            </div>
          </form>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="hero">
        {numbered && <span className="label">2 of 2</span>}
        <h1>Get the buzz</h1>
        <p className="lede muted">Turn on alerts to hear when a friend calls roll. You can also answer from the event while it is open.</p>
      </section>
      <AlertsSetup isAnonymous={isAnonymous} onMode={(m) => (m === "on" || m === "unsupported") && go()} />
      <div className="row">
        <button className="link" onClick={go}>Skip for now</button>
      </div>
    </>
  );
}
