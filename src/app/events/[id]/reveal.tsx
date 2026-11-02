"use client";

import { useEffect, useRef, useState } from "react";
import { AwayCard } from "@/components/away-card";
import type { Item, Reveal, Tile } from "./build-reveal";
import { PhotoActions } from "./photo-actions";

// The reveal: Moments (Roll Calls side by side, days, challenges) and People.
// Prints develop from negative to positive, staggered, on first view.

// `actions` turns on delete, remove and report (off for the sample).
export function RevealView({ data, actions = false, canModerate = false }: { data: Reveal; actions?: boolean; canModerate?: boolean }) {
  const [tab, setTab] = useState<"moments" | "people">("moments");
  const [animate, setAnimate] = useState(true);
  const [open, setOpen] = useState<Tile | null>(null);
  const [note, setNote] = useState("");
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

  // The full-size view: focus moves in, Escape closes, focus returns to the print.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const back = opener.current;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("keydown", close);
      back?.focus();
    };
  }, [open]);

  const tile = (t: Tile) => {
    return (
      <button
        key={t.id}
        className={`ph${animate ? " wait" : ""}`}
        aria-label={`Open ${t.who}'s shot`}
        onClick={(e) => {
          opener.current = e.currentTarget;
          setOpen(t);
        }}
      >
        {t.late && <span className="late pill orange">late</span>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={t.url} alt={`${t.who}: ${t.mission}`} />
        {t.tag && <span className="cap">{t.tag}</span>}
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

  // People who missed a moment: small, after the photos, never a photo-sized slot.
  const missed = (items: Item[]) => {
    const away = items.filter((it): it is Extract<Item, { type: "away" }> => it.type === "away");
    if (!away.length) return null;
    return (
      <ul className="missed" aria-label="Not in this one">
        {away.map((a) => (
          <li key={a.name}>
            <AwayCard name={a.name} url={a.url} reason={a.reason} small />
          </li>
        ))}
      </ul>
    );
  };
  const shown = (items: Item[]) => items.filter((it) => it.type !== "away");

  function switchTab(next: "moments" | "people") {
    setAnimate(false);
    setTab(next);
  }

  return (
    <div className="stack-lg" ref={root}>
      <p className="muted">
        {data.total} photo{data.total === 1 ? "" : "s"}
        {data.calls > 0 && ` · ${data.calls} Roll Call${data.calls === 1 ? "" : "s"}`}
      </p>

      {note && <p className="note" role="status">{note}</p>}

      {data.total === 0 && data.calls === 0 ? (
        <div className="empty">No photos this time.</div>
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
                    {s.aside && <span className="muted small">{s.aside}</span>}
                  </div>
                  {s.blocks.map((b, k) => (
                    <div key={k} className={`sect${s.key === "calls" ? " moment" : ""}`}>
                      {b.label && (s.key === "calls" || s.key === "recreate" ? <p className="task-sm">{b.label}</p> : <span className="label">{b.label}</span>)}
                      {b.sub && <p className="muted small">{b.sub}</p>}
                      {b.orig ? (
                        <div className="twoup">
                          <figure>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img className="orig" src={b.orig.src} alt={b.orig.alt} />
                            <figcaption className="muted small">Original</figcaption>
                          </figure>
                          <figure>
                            {shown(b.items).map(item)}
                            <figcaption className="muted small">Yours</figcaption>
                          </figure>
                        </div>
                      ) : (
                        <div className={b.layout}>{shown(b.items).map(item)}</div>
                      )}
                      {missed(b.items)}
                      {b.foot && <p className="muted small">{b.foot}</p>}
                    </div>
                  ))}
                </section>
              ))
            : data.people.map((p) => (
                <section key={p.name} className="card">
                  <div className="top">
                    <h2>{p.name}</h2>
                    <span className="muted small">{p.tiles.length}</span>
                  </div>
                  {p.tiles.length ? <div className="board">{p.tiles.map(tile)}</div> : <p className="muted">No photos.</p>}
                </section>
              ))}
        </>
      )}

      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${open.who}: ${open.mission}`} onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
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
          {actions && (
            <PhotoActions
              key={open.id}
              tile={open}
              canModerate={canModerate}
              onDone={(n) => {
                setOpen(null);
                setNote(n);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
