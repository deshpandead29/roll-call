"use client";

import { useEffect, useState } from "react";
import { RevealView } from "@/app/events/[id]/reveal";
import type { Reveal } from "@/app/events/[id]/build-reveal";
import { buildSample, SAMPLE_CREDITS } from "@/lib/sample";

export function SampleView() {
  const [data, setData] = useState<Reveal | null>(null);
  const [progress, setProgress] = useState<[number, number]>([0, 1]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    buildSample((done, total) => !cancelled && setProgress([done, total]))
      .then((r) => !cancelled && setData(r))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="notice">
        <p>A finished trip, so you can see a reveal. Real photos, made-up names.</p>
        <p className="credits">
          Photos:{" "}
          {SAMPLE_CREDITS.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ", "}
              <a href={`https://unsplash.com/photos/${c.id}`} target="_blank" rel="noopener noreferrer">{c.name}</a>
            </span>
          ))}{" "}
          (Unsplash). Paintings: public domain, Wikimedia Commons.
        </p>
      </div>
      {data ? (
        <RevealView data={data} />
      ) : failed ? (
        <div className="empty">Couldn&apos;t print the sample. Reload to try again.</div>
      ) : (
        <div className="empty" role="status">
          Printing {progress[0]} of {progress[1]}…
        </div>
      )}
    </>
  );
}
