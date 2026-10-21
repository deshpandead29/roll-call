"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { confirmUrl } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/client";

export function SignInForm({ next, linkFailed }: { next: string; linkFailed: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(linkFailed ? "That link has expired or was already used. Send a new one." : "");

  const done = () => {
    router.replace(next);
    router.refresh();
  };

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: confirmUrl(window.location.origin, next) },
    });
    setBusy(false);
    if (error) setError(error.status === 429 ? "Too many tries. Wait a minute." : "Couldn't send the email. Check the address.");
    else setSent(true);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError("That code didn't work. Check it, or send a new one.");
    else done();
  }

  async function skipEmail() {
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInAnonymously();
    setBusy(false);
    if (error) setError("Couldn't start. Try again.");
    else done();
  }

  if (sent) {
    return (
      <section className="card t-blue">
        <h2>Check your email</h2>
        <p className="muted">
          Sent to {email.trim()}. Open it on this device and tap the link.
        </p>
        <form className="stack" onSubmit={verifyCode}>
          <label className="field">
            <span className="label">Code, if your email has one</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
          {error && <p className="error small" role="alert">{error}</p>}
          <div className="row">
            <button type="submit" disabled={busy || !code.trim()}>Sign in</button>
            <button type="button" className="link" onClick={() => { setSent(false); setCode(""); setError(""); }}>
              Use another email
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="card">
      <form className="stack" onSubmit={sendLink}>
        <label className="field">
          <span className="label">Email</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {error && <p className="error small" role="alert">{error}</p>}
        <div className="row">
          <button type="submit" disabled={busy}>Send link</button>
        </div>
      </form>
      <div className="stack">
        <button type="button" className="ghost" onClick={skipEmail} disabled={busy}>Continue without email</button>
        <p className="muted small">You can add your email later. Without it, you can&apos;t sign back in on another phone.</p>
      </div>
    </section>
  );
}
