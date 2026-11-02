"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { autoRetry, isSending, pendingPhotos, removePending, sendPending, subscribeQueue, type PendingPhoto } from "@/lib/photo-queue";
import { createClient } from "@/lib/supabase/client";

export function PendingPhotos({ eventId, owner }: { eventId?: string; owner: string }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [storageError, setStorageError] = useState(false);
  const [discard, setDiscard] = useState<string | null>(null);
  useEffect(() => {
    let closed = false;
    let running = false;
    const refresh = async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession();
        const items = session?.user.id === owner ? await pendingPhotos(owner) : [];
        if (!closed) setPhotos(items.filter((p) => !eventId || p.options.eventId === eventId));
      } catch { if (!closed) setStorageError(true); }
    };
    const retry = async () => {
      if (running || !navigator.onLine) return;
      running = true;
      try {
        const items = await pendingPhotos(owner);
        for (const photo of items.filter((p) => (!eventId || p.options.eventId === eventId) && autoRetry(p))) {
          if (closed) break;
          if (await sendPending(photo)) router.refresh();
        }
      } catch { if (!closed) setStorageError(true); }
      finally { running = false; }
      await refresh();
    };
    const off = subscribeQueue(() => { void refresh(); });
    void refresh();
    void retry();
    const interval = setInterval(retry, 30_000);
    window.addEventListener("online", retry);
    return () => { closed = true; off(); clearInterval(interval); window.removeEventListener("online", retry); };
  }, [eventId, owner, router]);

  async function download(photo: PendingPhoto) {
    const url = URL.createObjectURL(photo.file);
    const link = document.createElement("a");
    link.href = url; link.download = photo.file.name || `roll-call-${photo.id}.jpg`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  if (storageError) return <p className="notice" role="alert">Device photo storage is unavailable. Keep photos in your camera roll until it is available again.</p>;
  if (!photos.length) return null;
  return (
    <section className="card t-blue" aria-label="Photos waiting to send">
      <h2>Saved on this device</h2>
      <p className="muted small">Keep Roll Call open to send these. Replies and challenge photos retry automatically. Unsent calls need you to retry. Don&apos;t clear this site&apos;s data before they send.</p>
      {photos.map((photo) => (
        <div className="stack" key={photo.id}>
          <strong>{photo.options.mission}</strong>
          <p className="small" role="status">{isSending(photo.id) ? "Uploading…" : photo.error || "Waiting to send"}</p>
          <div className="row">
            {!photo.blocked && <button className="sm" disabled={isSending(photo.id)} onClick={async () => { if (await sendPending(photo)) router.refresh(); }}>Retry</button>}
            <button className="ghost sm" onClick={() => download(photo)}>Keep a copy</button>
            <button className="link small" disabled={isSending(photo.id)} onClick={() => setDiscard(photo.id)}>Discard</button>
          </div>
          {discard === photo.id && <div className="confirm">
            <p>Delete this device copy? Download it first if you want to keep it. This won&apos;t remove a photo already added to the event.</p>
            <div className="row">
              <button className="danger" onClick={async () => { await removePending(photo.id); setDiscard(null); }}>Delete device copy</button>
              <button className="ghost" onClick={() => setDiscard(null)}>Keep</button>
            </div>
          </div>}
        </div>
      ))}
    </section>
  );
}
