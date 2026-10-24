"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AlertsSetup } from "@/components/alerts-setup";
import { AwayCard } from "@/components/away-card";
import { createClient } from "@/lib/supabase/client";
import { saveAwayCard } from "../me/away-form";

// Name, away card, alerts. Roll Calls only reach people whose phone can
// buzz, and on iPhone that needs Roll Call on the home screen (WebKit), so
// alerts are part of setup rather than something to find later.
export function WelcomeFlow({
  userId,
  next,
  name: initial,
  startAt,
  isAnonymous,
}: {
  userId: string;
  next: string;
  name: string;
  startAt: "name" | "card";
  isAnonymous: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"name" | "card" | "alerts">(startAt);
  const numbered = startAt === "name";
  const [name, setName] = useState(initial);
  const [preview, setPreview] = useState<string | null>(null);
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
    setStep("card");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await saveAwayCard(userId, file);
      setPreview(URL.createObjectURL(file));
    } catch {
      setError("Couldn't save it. Try another photo.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "name") {
    return (
      <>
        <section className="hero">
          <span className="label">1 of 3</span>
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

  if (step === "alerts") {
    return (
      <>
        <section className="hero">
          {numbered && <span className="label">3 of 3</span>}
          <h1>Get the buzz</h1>
          <p className="lede muted">Roll Calls only work if your phone buzzes when a friend calls roll.</p>
        </section>
        <AlertsSetup isAnonymous={isAnonymous} onMode={(m) => (m === "on" || m === "unsupported") && go()} />
        <div className="row">
          <button className="link" onClick={go}>Skip for now</button>
        </div>
      </>
    );
  }

  return (
    <>
      <section className="hero">
        {numbered && <span className="label">2 of 3</span>}
        <h1>Add your away card</h1>
        <p className="lede muted">A selfie that fills your slot when you miss a Roll Call. Shown greyscale, marked away, in all your groups.</p>
      </section>
      <section className="card t-lime">
        <div className="aways">
          <AwayCard name={name.trim() || "You"} url={preview} reason={preview ? "you" : undefined} />
        </div>
        {error && <p className="error small" role="alert">{error}</p>}
        <div className="row">
          {preview ? (
            <button onClick={() => setStep("alerts")}>Next</button>
          ) : (
            <>
              <button className="shutter" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Saving…" : "Take a selfie"}</button>
              <button className="link" onClick={() => setStep("alerts")}>Skip for now</button>
            </>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" capture="user" hidden onChange={onFile} />
      </section>
    </>
  );
}
