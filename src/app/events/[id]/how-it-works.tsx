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

export function HowItWorks({ reveal, trip }: { reveal: string; trip: boolean }) {
  const hidden = useSyncExternalStore(subscribe, seen, () => true);
  if (hidden) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    listeners.forEach((fn) => fn());
  }

  return (
    <section className="card t-lime">
      <h2>How it works</h2>
      <ol className="steps">
        <li>When someone calls roll, take a photo of what&apos;s in front of you. Alerts can notify you when enabled on your phone.</li>
        <li>Start sending within 2 minutes to answer on time, or within 15 minutes for a late answer. Once accepted, slow uploads have 10 minutes to finish.</li>
        <li>{trip ? "Three optional challenges a day" : "One optional challenge"}, below. Try {trip ? "them" : "it"} whenever you like.</li>
        <li>Nobody sees anyone&apos;s photos until the reveal, {reveal}.</li>
      </ol>
      <div className="row">
        <button className="ghost" onClick={dismiss}>Got it</button>
      </div>
    </section>
  );
}
