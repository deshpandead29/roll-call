"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Mode = "loading" | "ask" | "on" | "blocked" | "install" | "old-ios" | "unsupported";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function save(sub: PushSubscription) {
  const json = sub.toJSON();
  const { error } = await createClient().rpc("save_push_subscription", { p_endpoint: json.endpoint, p_keys: json.keys });
  if (error) throw error;
}

function detect(): Mode {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  // iPhone only gets web push from the home-screen app (iOS 16.4+).
  if (ios && !standalone) return "install";
  if (!supported) return ios ? "old-ios" : "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return Notification.permission === "granted" ? "on" : "ask";
}

// Turns on Roll Call alerts for this device, or explains how on iPhone.
// The home page carries the full help (install steps, blocked, old iOS); the
// event page only offers the one-tap "Turn on", so it never nags mid-event.
export function AlertsSetup({
  isAnonymous,
  compact = false,
  onMode,
}: {
  isAnonymous: boolean;
  compact?: boolean;
  // Tells the welcome flow when there's nothing to ask (already on, or this
  // browser can't do push), so it can move on.
  onMode?: (mode: Mode) => void;
}) {
  const [mode, setMode] = useState<Mode>("loading");
  // Latest callback without re-running the setup effect.
  const report = useRef(onMode);
  useEffect(() => {
    report.current = onMode;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!KEY) return;
    let cancelled = false;
    (async () => {
      let m = detect();
      if (m === "on" || m === "ask") {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          // Keep the server copy current: subscriptions rotate, devices change hands.
          await save(sub).catch(() => {});
          m = "on";
        } else if (m === "on") {
          m = "ask";
        }
      }
      if (!cancelled) {
        setMode(m);
        report.current?.(m);
      }
    })().catch(() => {
      if (cancelled) return;
      setMode("unsupported");
      report.current?.("unsupported");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    setBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMode(permission === "denied" ? "blocked" : "ask");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(KEY!) }));
      await save(sub);
      setMode("on");
      report.current?.("on");
    } catch {
      setError("Couldn't turn alerts on. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!KEY || mode === "loading" || mode === "on" || mode === "unsupported") return null;
  if (compact) {
    // iPhone in Safari can't buzz at all until Roll Call is on the home
    // screen, so say so wherever people land, with the steps one tap away.
    if (mode === "install")
      return (
        <div className="notice row">
          <span>This iPhone won&apos;t buzz for Roll Calls until Roll Call is on your home screen.</span>
          <Link className="link small" href="/me#alerts">How</Link>
        </div>
      );
    if (mode !== "ask") return null;
    return (
      <div className="notice row">
        <span>Turn on alerts so your phone buzzes when someone calls roll.</span>
        <button className="sm" onClick={turnOn} disabled={busy}>Turn on</button>
        {error && <span className="error small" role="alert">{error}</span>}
      </div>
    );
  }

  return (
    <section className="card t-blue" id="alerts">
      <h2>Alerts</h2>
      {mode === "ask" && (
        <>
          <p className="muted">So your phone buzzes when someone calls roll.</p>
          <div className="row">
            <button className="shutter" onClick={turnOn} disabled={busy}>Turn on</button>
          </div>
        </>
      )}
      {mode === "blocked" && (
        <p className="muted">Alerts are blocked for Roll Call. Allow notifications for this site in your settings, then reload.</p>
      )}
      {mode === "old-ios" && <p className="muted">Alerts need iOS 16.4 or later. Update your iPhone to get them.</p>}
      {mode === "install" && (
        <>
          <p className="muted">On iPhone, alerts only work from the home screen.</p>
          <ol className="steps">
            <li>Tap Share, the square with an arrow.</li>
            <li>Tap Add to Home Screen.</li>
            <li>Open Roll Call from your home screen and turn on alerts there.</li>
          </ol>
          {isAnonymous && (
            <p className="muted small">You signed in without email. Add your email first, so you can sign in on the home screen too.</p>
          )}
        </>
      )}
      {error && <p className="error small" role="alert">{error}</p>}
    </section>
  );
}
