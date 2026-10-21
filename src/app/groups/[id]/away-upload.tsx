"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Square greyscale crop, as in the prototype's awayImage(). Stripes and the
// "away" pill are drawn by CSS, so the stored image stays plain.
async function awayImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const S = 360;
    const c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const x = c.getContext("2d")!;
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    const s = Math.max(S / sw, S / sh);
    x.filter = "grayscale(1) contrast(1.15)";
    x.drawImage(img, (S - sw * s) / 2, (S - sh * s) / 2, sw * s, sh * s);
    x.filter = "none";
    const d = x.getImageData(0, 0, S, S);
    const p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const L = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2];
      p[i] = p[i + 1] = p[i + 2] = L;
    }
    x.putImageData(d, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.8),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
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
