"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { confirmUrl } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/client";

// Turns an anonymous session into an email account. The user id stays the
// same, so groups and photos come along.
export function AddEmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: confirmUrl(window.location.origin, "/") },
    );
    setBusy(false);
    if (!error) setSent(true);
    else if (error.code === "email_exists") setError("That email already has an account.");
    else if (error.status === 429) setError("Too many tries. Wait a minute.");
    else setError("Couldn't send the email. Check the address.");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email_change" });
    setBusy(false);
    if (error) setError("That code didn't work. Check it, or send a new one.");
    else router.refresh();
  }

  if (sent) {
    return (
      <form className="stack" onSubmit={verify}>
        <p className="muted small">Sent to {email.trim()}. Open it on this device and tap the link.</p>
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
          <button type="submit" disabled={busy || !code.trim()}>Confirm</button>
        </div>
      </form>
    );
  }

  return (
    <form className="stack" onSubmit={send}>
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
        <button type="submit" disabled={busy}>Add email</button>
      </div>
    </form>
  );
}
