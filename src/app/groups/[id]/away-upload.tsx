"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { awayCanvas, loadImage } from "@/lib/develop";
import { createClient } from "@/lib/supabase/client";

async function awayImage(file: File): Promise<Blob> {
  const c = awayCanvas(await loadImage(file));
  return new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.8));
}

export function AwayUpload({ groupId, memberId, oldPath }: { groupId: string; memberId: string; oldPath: string | null }) {
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
      const blob = await awayImage(file);
      const supabase = createClient();
      const path = `${groupId}/${memberId}/${Date.now()}.jpg`;
      const up = await supabase.storage.from("away-cards").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const row = await supabase.from("group_members").update({ away_card_path: path }).eq("id", memberId);
      if (row.error) throw row.error;
      if (oldPath) await supabase.storage.from("away-cards").remove([oldPath]);
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
          {busy ? "Saving…" : oldPath ? "Change yours" : "Add yours"}
        </button>
        <span className="hand blue small">a selfie works</span>
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={onFile} />
      {error && <p className="error small" role="alert">{error}</p>}
    </div>
  );
}
