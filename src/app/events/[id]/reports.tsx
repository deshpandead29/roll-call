"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tile } from "./build-reveal";
import { REASONS, type Reason } from "./photo-actions";

export type Report = { id: string; photo_id: string; reason: Reason; reporter_member_id: string };

// For the host and the group maker, only while there's something to look at.
export function Reports({ reports, photos }: { reports: (Report & { reporter: string })[]; photos: Tile[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const ids = [...new Set(reports.map((r) => r.photo_id))];

  async function act(photoId: string, remove: boolean) {
    setBusy(photoId);
    setError("");
    const supabase = createClient();
    // Removing the photo clears its reports too. Its file goes when the
    // owner next opens the app.
    const { error } = remove
      ? await supabase.from("photos").delete().eq("id", photoId)
      : await supabase.from("reports").delete().eq("photo_id", photoId);
    setBusy(null);
    if (error) return setError("Couldn't do that. Try again.");
    router.refresh();
  }

  return (
    <section className="card t-blue">
      <h2>Reported</h2>
      <p className="muted small">Only the host and the group&apos;s maker see this. Remove takes it down for everyone.</p>
      {ids.map((id) => {
        const t = photos.find((p) => p.id === id);
        const why = reports.filter((r) => r.photo_id === id);
        return (
          <div key={id} className="reported">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {t?.url ? <img src={t.url} alt={`${t.who}: ${t.mission}`} /> : <span />}
            <div className="body">
              <strong>{t ? `${t.who}'s shot` : "A shot"}</strong>
              {why.map((r) => (
                <span key={r.id} className="small">
                  {r.reporter} · {REASONS[r.reason] ?? r.reason}
                </span>
              ))}
              <div className="row">
                <button className="danger sm" onClick={() => act(id, true)} disabled={!!busy}>Remove</button>
                <button className="ghost sm" onClick={() => act(id, false)} disabled={!!busy}>Keep</button>
              </div>
            </div>
          </div>
        );
      })}
      {error && <p className="error small" role="alert">{error}</p>}
    </section>
  );
}
