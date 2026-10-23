// Event rules from the prototype (TYPES, PACES, paceSummary, status).

import { hash } from "@/lib/missions";

export type EventType = "night" | "birthday" | "bigday" | "trip";
export type Pace = "chill" | "normal" | "chaos";

export const TYPES: Record<EventType, { label: string; open: number | null; cooldown: number; honoree: string | null }> = {
  night: { label: "Night out", open: 3, cooldown: 75, honoree: null },
  birthday: { label: "Birthday", open: 2, cooldown: 75, honoree: "Birthday person" },
  bigday: { label: "Wedding or big day", open: 3, cooldown: 120, honoree: "Holds the couple's extra" },
  trip: { label: "Trip", open: null, cooldown: 180, honoree: "Organiser" },
};

export const PACES: Record<Pace, string> = { chill: "Chill", normal: "Normal", chaos: "Chaos" };

export const MAX_TRIP_DAYS = 21;

export function paceSummary(type: EventType, pace: Pace): string {
  const T = TYPES[type];
  if (pace === "chaos") return "No limit · 30 min apart";
  const extra = T.honoree ? " + 1 extra" : "";
  if (type === "trip") return `2 a day${pace === "chill" ? " (1 fewer)" : ""}${extra} · ${T.cooldown / 60}h apart`;
  const open = pace === "chill" ? Math.max(1, T.open! - 1) : T.open!;
  return `${open} Roll Call${open > 1 ? "s" : ""}${extra} · ${T.cooldown} min apart`;
}

// Dates are YYYY-MM-DD strings, local to the group.
const toUTC = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

export function addDays(s: string, n: number): string {
  return new Date(toUTC(s) + n * 864e5).toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / 864e5);
}

export function todayIn(timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function hhmm(iso: string | number | Date, timeZone: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone });
}

export function formatDate(s: string): string {
  return new Date(toUTC(s)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

// What an event is called if the host leaves the name blank.
export function defaultEventName(type: EventType, start: string, end: string, honoree?: string): string {
  if (!start) return TYPES[type].label;
  const day = new Date(toUTC(start)).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  if (type === "birthday") return honoree ? `${honoree}'s birthday` : `Birthday, ${day} ${formatDate(start)}`;
  if (type === "trip") return `Trip, ${formatWhen({ type, start_date: start, end_date: end || start })}`;
  return `${type === "bigday" ? "Big day" : "Night out"}, ${day} ${formatDate(start)}`;
}

export function formatWhen(ev: { type: EventType; start_date: string; end_date: string }): string {
  return ev.type === "trip" ? `${formatDate(ev.start_date)}–${formatDate(ev.end_date)}` : formatDate(ev.start_date);
}

export type Status = { label: "Live" | "Upcoming" | "Revealed"; tone: "" | "blue" | "lime"; sub?: string };

export function eventStatus(
  ev: { type: EventType; start_date: string; end_date: string; revealed: boolean },
  timeZone: string,
): Status {
  if (ev.revealed) return { label: "Revealed", tone: "lime" };
  const today = todayIn(timeZone);
  if (today < ev.start_date) return { label: "Upcoming", tone: "blue" };
  if (ev.type === "trip") {
    const days = diffDays(ev.start_date, ev.end_date) + 1;
    const i = diffDays(ev.start_date, today);
    return { label: "Live", tone: "", sub: i < days ? `day ${i + 1} of ${days}` : undefined };
  }
  return { label: "Live", tone: "" };
}

// Same tilt as the prototype, so cards land at the same angle.
export const tilt = (id: string, amp = 3) => (((hash(id) % 1000) / 1000) * 2 - 1) * amp;
