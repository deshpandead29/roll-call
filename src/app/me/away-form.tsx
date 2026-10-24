"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { awayCanvas, loadImage } from "@/lib/develop";
import { createClient } from "@/lib/supabase/client";

async function awayImage(file: File): Promise<Blob> {
  const c = awayCanvas(await loadImage(file));
  return new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.8));
}

// Uploads a selfie as your away card and uses it in every group.
export async function saveAwayCard(userId: string, file: File) {
  const blob = await awayImage(file);
  const supabase = createClient();
  const path = `u/${userId}/${Date.now()}.jpg`;
  const up = await supabase.storage.from("away-cards").upload(path, blob, { contentType: "image/jpeg" });
  if (up.error) throw up.error;
  const { error } = await supabase.rpc("set_my_away_card", { p_path: path });
  if (error) throw error;
}

// One away card for all your groups. The old file is cleaned up by the sweep.
export function AwayForm({ userId, hasCard }: { userId: string; hasCard: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await saveAwayCard(userId, file);
      router.refresh();
    } catch {
      setError("Couldn't save it. Try another photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="ghost" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Saving…" : hasCard ? "Change" : "Add yours"}
        </button>
        <span className="hand blue small">a selfie works</span>
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={onFile} />
      {error && <p className="error small" role="alert">{error}</p>}
    </div>
  );
}
