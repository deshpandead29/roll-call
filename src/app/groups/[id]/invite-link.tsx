"use client";

import { useState, useSyncExternalStore } from "react";

const noop = () => () => {};

export function InviteLink({ url, groupName }: { url: string; groupName: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(
    noop,
    () => "share" in navigator,
    () => false,
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the link is on screen to copy by hand.
    }
  }

  async function share() {
    try {
      await navigator.share({ title: `Join ${groupName} on Roll Call`, url });
    } catch {
      // Dismissed.
    }
  }

  return (
    <div className="stack">
      <input readOnly value={url} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
      <div className="row">
        {canShare && <button type="button" onClick={share}>Share</button>}
        <button type="button" className={canShare ? "ghost" : ""} onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
      </div>
    </div>
  );
}
