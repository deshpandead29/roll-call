"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { diffDays, MAX_TRIP_DAYS, PACES, paceSummary, TYPES, type EventType, type Pace } from "@/lib/events";
import { createClient } from "@/lib/supabase/client";

type Ev = {
  id: string;
  name: string;
  type: EventType;
  start_date: string;
  end_date: string;
  pace: Pace;
  host_member_id: string | null;
  honoree_member_id: string | null;
  hunt_word: string | null;
  revealed: boolean;
};
type Member = { id: string; name: string; shots: number };

export function EditEventForm({ ev, members, coming: initial }: { ev: Ev; members: Member[]; coming: string[] }) {
  const router = useRouter();
  const T = TYPES[ev.type];
  const [name, setName] = useState(ev.name);
  const [start, setStart] = useState(ev.start_date);
  const [end, setEnd] = useState(ev.end_date);
  const [coming, setComing] = useState(initial);
  const [honoree, setHonoree] = useState(ev.honoree_member_id ?? "");
  const [pace, setPace] = useState(ev.pace);
  const [word, setWord] = useState(ev.hunt_word ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = ev.revealed;
  const picked = members.filter((m) => coming.includes(m.id));

  // People who've already shot stay on, so their photos keep a place in the reveal.
  function toggle(m: Member) {
    if (m.id === ev.host_member_id || (coming.includes(m.id) && m.shots > 0)) return;
    setComing((cur) => (cur.includes(m.id) ? cur.filter((x) => x !== m.id) : [...cur, m.id]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Add a name.");
    const last = ev.type === "trip" ? end : start;
    const letters = word.toUpperCase().replace(/[^A-Z]/g, "");
    if (!locked) {
      if (!start || !last) return setError("Pick a date.");
      if (last < start) return setError("End date is before the start.");
      if (diffDays(start, last) >= MAX_TRIP_DAYS) return setError(`${MAX_TRIP_DAYS} days max.`);
      if (picked.length < 2) return setError("Keep at least two people.");
      if (T.honoree && honoree && !coming.includes(honoree)) return setError(`The ${T.honoree.toLowerCase()} has to be coming.`);
      if (letters.length === 1) return setError("Make the word at least two letters.");
      if (letters.length > picked.length) return setError(`Keep the word to ${picked.length} letters, one each.`);
    }
    setBusy(true);
    setError("");
    const supabase = createClient();
    const patch = locked
      ? { name: name.trim() }
      : {
          name: name.trim(),
          start_date: start,
          end_date: last,
          pace,
          ...(T.honoree ? { honoree_member_id: honoree || null } : {}),
          ...(ev.type === "trip" ? { hunt_word: letters || null } : {}),
        };
    const { error: upd } = await supabase.from("events").update(patch).eq("id", ev.id);
    const add = coming.filter((id) => !initial.includes(id));
    const drop = initial.filter((id) => !coming.includes(id));
    const [ins, del] = await Promise.all([
      !locked && add.length ? supabase.from("event_members").insert(add.map((member_id) => ({ event_id: ev.id, member_id }))) : { error: null },
      !locked && drop.length ? supabase.from("event_members").delete().eq("event_id", ev.id).in("member_id", drop) : { error: null },
    ]);
    if (upd || ins.error || del.error) {
      setBusy(false);
      return setError("Couldn't save all of it. Try again.");
    }
    router.replace(`/events/${ev.id}/details`);
    router.refresh();
  }

  return (
    <section className="card t-lime">
      <form className="stack" onSubmit={save} noValidate>
        <label className="field">
          <span className="label">Name</span>
          <input maxLength={80} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {locked ? (
          <p className="muted small">It&apos;s revealed, so only the name can change.</p>
        ) : (
          <>
            <div className="row">
              <label className="field">
                <span className="label">{ev.type === "trip" ? "From" : "Date"}</span>
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </label>
              {ev.type === "trip" && (
                <label className="field">
                  <span className="label">To</span>
                  <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
                </label>
              )}
            </div>
            <div className="field">
              <span className="label">Who&apos;s coming</span>
              <div className="chips">
                {members.map((m) => {
                  const fixed = m.id === ev.host_member_id || (coming.includes(m.id) && m.shots > 0);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className="chip"
                      aria-pressed={coming.includes(m.id)}
                      aria-disabled={fixed || undefined}
                      onClick={() => toggle(m)}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
              <span className="muted small">You, and anyone who&apos;s already shot, stay on.</span>
            </div>
            {T.honoree && (
              <label className="field">
                <span className="label">{T.honoree}</span>
                <select className="select" value={honoree} onChange={(e) => setHonoree(e.target.value)}>
                  <option value="">Nobody</option>
                  {picked.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
            )}
            {ev.type === "trip" && (
              <label className="field">
                <span className="label">Letter day word</span>
                <input
                  placeholder="Optional"
                  maxLength={14}
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={word}
                  onChange={(e) => setWord(e.target.value.toUpperCase().replace(/[^A-Za-z]/g, ""))}
                />
                <span className="muted small">Up to {picked.length} letters, one each.</span>
              </label>
            )}
            <div className="field">
              <span className="label">Pace · {paceSummary(ev.type, pace)}</span>
              <div className="chips" role="group" aria-label="Pace">
                {(Object.keys(PACES) as Pace[]).map((k) => (
                  <button key={k} type="button" className="chip" aria-pressed={pace === k} onClick={() => setPace(k)}>
                    {PACES[k]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {error && <p className="error small" role="alert">{error}</p>}
        <div className="row">
          <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </section>
  );
}
