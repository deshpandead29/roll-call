"use client";

import { useEffect, useRef, useState } from "react";
import { AwayCard } from "@/components/away-card";
import { tilt } from "@/lib/events";
import type { Item, Reveal, Tile } from "./build-reveal";

// The reveal: Moments (Roll Calls side by side, days, challenges) and People.
// Prints develop from negative to positive, staggered, on first view.

export function RevealView({ data }: { data: Reveal }) {
  const [tab, setTab] = useState<"moments" | "people">("moments");
  const [animate, setAnimate] = useState(true);
  const [open, setOpen] = useState<Tile | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // Prints wait as negatives and develop when they scroll into view, a few
  // at a time, so the ones further down aren't over before you get there.
  useEffect(() => {
    if (!animate || !root.current) return;
    const waiting = root.current.querySelectorAll<HTMLElement>(".ph.wait");
    const io = new IntersectionObserver(
      (entries) => {
        entries
          .filter((e) => e.isIntersecting)
          .forEach((e, k) => {
            const el = e.target as HTMLElement;
            el.style.setProperty("--d", `${(k * 0.12).toFixed(2)}s`);
            el.classList.replace("wait", "pop");
            io.unobserve(el);
          });
      },
      { threshold: 0.3 },
    );
    waiting.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [animate, tab]);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  const tile = (t: Tile) => {
    return (
      <button
        key={t.id}
        className={`ph${animate ? " wait" : ""}`}
        style={{ "--r": `${tilt(t.id, 2.6).toFixed(1)}deg` } as React.CSSProperties}
        aria-label={`Open ${t.who}'s shot`}
        onClick={() => setOpen(t)}
      >
        {t.tag && <span className="tag pill">{t.tag}</span>}
        {t.late && <span className="late pill orange">late</span>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={t.url} alt={`${t.who}: ${t.mission}`} />
      </button>
    );
  };
  const item = (it: Item, k: number) =>
    it.type === "photo" ? (
      tile(it.tile)
    ) : it.type === "away" ? (
      <AwayCard key={`away-${k}`} name={it.name} url={it.url} reason={it.reason} />
    ) : (
      <div key={`hole-${k}`} className="hole" role="img" aria-label={`${it.who} missed ${it.glyph}`}>
        {it.glyph}
      </div>
    );

  function switchTab(next: "moments" | "people") {
    setAnimate(false);
    setTab(next);
  }

  return (
    <div className="stack-lg" ref={root}>
      <section className="card t-lime">
        <div className="top">
          <h2>It&apos;s out</h2>
          <span className="big">{data.total}</span>
        </div>
        <p className="muted small">
          {data.total} shot{data.total === 1 ? "" : "s"} · {data.calls} Roll Call{data.calls === 1 ? "" : "s"}
        </p>
      </section>

      {data.total === 0 && data.calls === 0 ? (
        <div className="empty">No shots this time.</div>
      ) : (
        <>
          <div className="tabs" role="group" aria-label="View">
            <button className="chip" aria-pressed={tab === "moments"} onClick={() => switchTab("moments")}>Moments</button>
            <button className="chip" aria-pressed={tab === "people"} onClick={() => switchTab("people")}>People</button>
          </div>

          {tab === "moments"
            ? data.moments.map((s) => (
                <section key={s.key} className={`card ${s.tape}`}>
                  <div className="top">
                    <h2>{s.title}</h2>
                    {s.aside && <span className="hand ink">{s.aside}</span>}
                  </div>
                  {s.blocks.map((b, k) => (
                    <div key={k} className={`sect${s.key === "calls" ? " moment" : ""}`}>
                      {b.label && (s.key === "calls" || s.key === "recreate" ? <p className="task-sm">{b.label}</p> : <span className="label">{b.label}</span>)}
                      {b.sub && <p className="hand ink small">{b.sub}</p>}
                      {b.orig ? (
                        <div className="twoup">
                          <figure>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img className="orig" src={b.orig.src} alt={b.orig.alt} />
                            <figcaption className="hand small">original</figcaption>
                          </figure>
                          <figure>
                            {b.items.map(item)}
                            <figcaption className="hand small">yours</figcaption>
                          </figure>
                        </div>
                      ) : (
                        <div className={b.layout}>{b.items.map(item)}</div>
                      )}
                      {b.foot && <p className={b.layout === "spell" ? "hand small" : "muted small"}>{b.foot}</p>}
                    </div>
                  ))}
                </section>
              ))
            : data.people.map((p, i) => (
                <section key={p.name} className={`card ${["", "t-blue", "t-lime"][i % 3]}`}>
                  <div className="top">
                    <h2>{p.name}</h2>
                    <span className="hand ink">{p.tiles.length}</span>
                  </div>
                  {p.tiles.length ? <div className="board">{p.tiles.map(tile)}</div> : <p className="muted">No shots.</p>}
                </section>
              ))}
        </>
      )}

      {open && (
        <div className="lightbox" role="dialog" aria-label={`${open.who}: ${open.mission}`} onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.url} alt={`${open.who}: ${open.mission}`} />
          <div className="row">
            <a
              className="button ghost lb-save"
              href={open.url.startsWith("data:") ? open.url : `${open.url}&download=roll-call-${open.id}.jpg`}
              download={`roll-call-${open.id}.jpg`}
            >
              Save
            </a>
            <button className="lb-close" autoFocus onClick={() => setOpen(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
