"use client";

import { useRef, useState } from "react";
import { develop, handDate, loadImage } from "@/lib/develop";
import { todayIn } from "@/lib/events";
import { ACCENT } from "@/lib/missions";

// Prints a photo with the Roll Call look, in the browser. Nothing is uploaded.
export function TryLook() {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const c = await develop(await loadImage(file), {
        W: 1080,
        who: "you",
        date: handDate(todayIn()),
        mission: "Your photo",
        accent: ACCENT.wild,
        frame: 1,
      });
      setUrl(c.toDataURL("image/jpeg", 0.9));
    } catch {
      setError("Couldn't open that photo. Try a JPEG or PNG.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card t-lime">
      {url && (
        <figure className="try-out">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Your photo with the Roll Call look" />
          <figcaption className="hand small">check the faces</figcaption>
        </figure>
      )}
      <div className="row">
        <button className="shutter" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Printing…" : url ? "Try another" : "Choose a photo"}
        </button>
        {url && (
          <a className="button ghost" href={url} download="roll-call-look.jpg">Save</a>
        )}
      </div>
      {error && <p className="error small" role="alert">{error}</p>}
      <input ref={input} type="file" accept="image/*" hidden onChange={onFile} />
    </section>
  );
}
