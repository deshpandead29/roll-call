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
        <li>When someone calls roll, your phone buzzes. Shoot what&apos;s in front of you within 2 minutes.</li>
        <li>{trip ? "You get three challenges a day" : "You get one challenge"}, below. Shoot {trip ? "them" : "it"} whenever it happens.</li>
        <li>Nobody sees anyone&apos;s photos until the reveal, {reveal}.</li>
      </ol>
      <div className="row">
        <button className="ghost" onClick={dismiss}>Got it</button>
      </div>
    </section>
  );
}
