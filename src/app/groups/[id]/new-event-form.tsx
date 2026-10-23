"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDays, defaultEventName, diffDays, MAX_TRIP_DAYS, PACES, paceSummary, todayIn, TYPES, type EventType, type Pace } from "@/lib/events";
import { createClient } from "@/lib/supabase/client";

type Member = { id: string; name: string };

export function NewEventForm({ groupId, timeZone, members }: { groupId: string; timeZone: string; members: Member[] }) {
  const router = useRouter();
  const [today] = useState(() => todayIn(timeZone));
  const [type, setType] = useState<EventType>("night");
  const [name, setName] = useState("");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(() => addDays(today, 2));
  const [coming, setComing] = useState<string[]>(() => members.map((m) => m.id));
  const [honoree, setHonoree] = useState<string>("");
  const [pace, setPace] = useState<Pace>("normal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const T = TYPES[type];
  const picked = members.filter((m) => coming.includes(m.id));
  const honoreeId = picked.some((m) => m.id === honoree) ? honoree : (picked[0]?.id ?? "");

  const fallback = defaultEventName(type, start, end, T.honoree && type === "birthday" ? picked.find((m) => m.id === honoreeId)?.name : undefined);

  function toggle(id: string) {
    setComing((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const last = type === "trip" ? end : start;
    if (!start || !last) return setError("Pick a date.");
    if (last < start) return setError("End date is before the start.");
    if (diffDays(start, last) >= MAX_TRIP_DAYS) return setError(`${MAX_TRIP_DAYS} days max.`);
    if (picked.length < 2) return setError("Pick at least two people.");
    setBusy(true);
    setError("");
    const { data, error } = await createClient().rpc("create_event", {
      p_group_id: groupId,
      p_type: type,
      p_name: name.trim() || fallback,
      p_start_date: start,
      p_end_date: last,
      p_member_ids: picked.map((m) => m.id),
      p_honoree_member_id: T.honoree ? honoreeId || null : null,
      p_pace: pace,
    });
    if (error) {
      setBusy(false);
      setError(error.message || "Couldn't create the event. Try again.");
      return;
    }
    router.push(`/events/${data}`);
  }

  return (
    <section className="card t-lime">
      <form className="stack" onSubmit={submit} noValidate>
        <div className="chips" role="group" aria-label="Type">
          {(Object.keys(TYPES) as EventType[]).map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={type === k} onClick={() => setType(k)}>
              {TYPES[k].label}
            </button>
          ))}
        </div>
        <label className="field">
          <span className="label">Name</span>
          <input placeholder={fallback} maxLength={80} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="row">
          <label className="field">
            <span className="label">{type === "trip" ? "From" : "Date"}</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          {type === "trip" && (
            <label className="field">
              <span className="label">To</span>
              <input
                type="date"
                value={end}
                min={start}
                max={start ? addDays(start, MAX_TRIP_DAYS - 1) : undefined}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          )}
        </div>
        <div className="field">
          <span className="label">Who&apos;s coming</span>
          <div className="chips">
            {members.map((m) => (
              <button key={m.id} type="button" className="chip" aria-pressed={coming.includes(m.id)} onClick={() => toggle(m.id)}>
                {m.name}
              </button>
            ))}
          </div>
        </div>
        {T.honoree && picked.length > 0 && (
          <label className="field">
            <span className="label">{T.honoree}</span>
            <select className="select" value={honoreeId} onChange={(e) => setHonoree(e.target.value)}>
              {picked.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <span className="muted small">Gets one extra Roll Call.</span>
          </label>
        )}
        {/* Most hosts keep Normal, so pace stays folded until wanted. */}
        <details className="field">
          <summary className="label pace-summary">
            Pace · {PACES[pace]} <span className="hand small">{paceSummary(type, pace)}</span>
          </summary>
          <div className="chips" role="group" aria-label="Pace">
            {(Object.keys(PACES) as Pace[]).map((k) => (
              <button key={k} type="button" className="chip" aria-pressed={pace === k} onClick={() => setPace(k)}>
                {PACES[k]}
              </button>
            ))}
          </div>
          <span className="muted small">Chill has one fewer. Chaos has no limit, 30 minutes apart.</span>
        </details>
        {error && <p className="error small" role="alert">{error}</p>}
        <div className="row">
          <button type="submit" className="shutter" disabled={busy}>{busy ? "Creating…" : "Create event"}</button>
        </div>
      </form>
    </section>
  );
}
