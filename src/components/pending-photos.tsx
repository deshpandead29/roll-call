"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { autoRetry, isSending, pendingPhotos, removePending, sendPending, subscribeQueue, type PendingPhoto } from "@/lib/photo-queue";
import { createClient } from "@/lib/supabase/client";

// What a waiting photo is, in words. The burned-in caption ("roll call · Hana")
// is for the print, not for this list.
export function describe(photo: PendingPhoto) {
  const at = photo.options.time ? `, ${photo.options.time}` : "";
  if (photo.action.type === "call") return `Your Roll Call photo${at}`;
  if (photo.action.type === "answer") {
    const caller = photo.options.mission.replace(/^roll call · /, "");
    return `Your photo for ${caller}'s Roll Call${at}`;
  }
  return `Your challenge photo: ${photo.options.mission}`;
}

// Two places: on an event page, inline under the title for that event's photos
// (`eventId`); everywhere else, a folded line for photos from other events
// (`exclude` leaves out the event whose page is open), so recovery still works
// after an event is deleted or left.
export function PendingPhotos({ eventId, exclude, owner }: { eventId?: string; exclude?: string; owner: string }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [storageError, setStorageError] = useState(false);
  const [discard, setDiscard] = useState<string | null>(null);
  const mine = useCallback(
    (p: PendingPhoto) => (eventId ? p.options.eventId === eventId : p.options.eventId !== exclude),
    [eventId, exclude],
  );
  useEffect(() => {
    let closed = false;
    let running = false;
    const refresh = async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession();
        const items = session?.user.id === owner ? await pendingPhotos(owner) : [];
        if (!closed) setPhotos(items.filter(mine));
      } catch { if (!closed) setStorageError(true); }
    };
    const retry = async () => {
      if (running || !navigator.onLine) return;
      running = true;
      try {
        const items = await pendingPhotos(owner);
        for (const photo of items.filter((p) => mine(p) && autoRetry(p))) {
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
  }, [mine, owner, router]);

  async function download(photo: PendingPhoto) {
    const url = URL.createObjectURL(photo.file);
    const link = document.createElement("a");
    link.href = url; link.download = photo.file.name || `roll-call-${photo.id}.jpg`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  if (storageError) return <p className="notice" role="alert">Can&apos;t read photos saved on this phone. Keep them in your camera roll for now.</p>;
  if (!photos.length) return null;
  const list = photos.map((photo) => (
    <div className="pending" key={photo.id}>
      <strong>{describe(photo)}</strong>
      <p className="small" role="status">{isSending(photo.id) ? "Sending…" : photo.error || "Waiting to send."}</p>
      <div className="row">
        {!photo.blocked && <button className="sm" disabled={isSending(photo.id)} onClick={async () => { if (await sendPending(photo)) router.refresh(); }}>Retry</button>}
        <button className="ghost sm" onClick={() => download(photo)}>Keep a copy</button>
        <button className="link small" disabled={isSending(photo.id)} onClick={() => setDiscard(photo.id)}>Discard</button>
      </div>
      {discard === photo.id && <div className="confirm">
        <p>Delete the copy on this phone? Keep a copy first if you want it. A photo already added to the event stays.</p>
        <div className="row">
          <button className="danger" onClick={async () => { await removePending(photo.id); setDiscard(null); }}>Delete copy</button>
          <button className="ghost" onClick={() => setDiscard(null)}>Cancel</button>
        </div>
      </div>}
    </div>
  ));
  const n = photos.length;
  if (!eventId) {
    return (
      <details className="notice" aria-label="Unsent photos">
        <summary>{n === 1 ? "1 photo" : `${n} photos`} from another event not sent yet</summary>
        <div className="stack">
          <p className="muted small">They&apos;re saved on this phone. Keep Roll Call open and they&apos;ll send.</p>
          {list}
        </div>
      </details>
    );
  }
  return (
    <section className="card pending-card" aria-label="Photos waiting to send">
      <h2>{n === 1 ? "1 photo not sent yet" : `${n} photos not sent yet`}</h2>
      <p className="muted small">
        Saved on this phone. Keep Roll Call open and {n === 1 ? "it" : "they"}&apos;ll send.
        {photos.some((p) => p.action.type === "call" && !p.blocked) ? " A Roll Call you started only sends when you press Retry." : ""}
      </p>
      {list}
    </section>
  );
}
