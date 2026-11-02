"use client";

import { useSyncExternalStore } from "react";

// The three things a first-timer needs, once. Dismissed for good on this
// device; nothing shows before hydration, so it never flashes for others.
const KEY = "rc-how-seen";
const listeners = new Set<() => void>();
const seen = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function HowItWorks({ reveal }: { reveal: string }) {
  const hidden = useSyncExternalStore(subscribe, seen, () => true);
  if (hidden) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    listeners.forEach((fn) => fn());
  }

  return (
    <section className="card how">
      <h2>How it works</h2>
      <ol className="steps">
        <li>When a friend calls roll, take a photo of where you are. Within 2 minutes is on time; up to 15 still counts.</li>
        <li>The challenge is optional. Do it whenever you like.</li>
        <li>Nobody sees anyone&apos;s photos until {reveal}.</li>
      </ol>
      <div className="row">
        <button className="ghost sm" onClick={dismiss}>Got it</button>
      </div>
    </section>
  );
}
