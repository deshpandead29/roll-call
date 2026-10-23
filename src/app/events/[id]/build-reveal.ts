import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, diffDays, hhmm, type EventType } from "@/lib/events";
import { groupFrame, HUNT_DAY, hunt, huntType, REC, type MissionEvent, type PhotoKind } from "@/lib/missions";

// Shapes the revealed event for the reveal view: Roll Calls side by side with
// away cards in missed slots, trip days with the hunt wall, challenges, and
// each person's shots. Everything here is plain data for the client view.

export type Tile = { id: string; url: string; who: string; mission: string; mine: boolean; storage_path: string; tag?: string; late?: boolean };
export type Item =
  | { type: "photo"; tile: Tile }
  | { type: "away"; name: string; url: string | null; reason: string }
  | { type: "hole"; glyph: string; who: string };
export type Block = { label?: string; sub?: string; layout: "board" | "spell"; items: Item[]; foot?: string; orig?: { src: string; alt: string } };
export type Section = { key: string; title: string; aside?: string; tape: "" | "t-blue" | "t-lime"; blocks: Block[] };
export type Person = { name: string; tiles: Tile[] };
export type Reveal = { total: number; calls: number; moments: Section[]; people: Person[] };

type Member = { id: string; display_name: string; away_card_path: string | null };
type Photo = {
  id: string;
  member_id: string;
  kind: PhotoKind;
  day: string;
  mission: string | null;
  storage_path: string;
  roll_call_id: string | null;
  late: boolean;
  hunt_tag: string | null;
  recreate_id: string | null;
  created_at: string;
};
type Call = { id: string; caller_member_id: string | null; called_at: string; reserved: boolean; extra: boolean; recipients: string[] };
type Status = { member_id: string; snooze_until: string | null; home: boolean; home_at: string | null };

const TAPES = ["", "t-blue", "t-lime"] as const;
const handDate = (s: string) =>
  new Date(`${s}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).toLowerCase();

export async function buildReveal(
  supabase: SupabaseClient,
  ev: { id: string; name: string; type: EventType; start_date: string; end_date: string; timezone: string; hunt_word: string | null },
  members: Member[],
  honoree: string | null,
  // me: your member id. hidden: photos you reported. names: everyone in the
  // group, for callers who've since left the event.
  opts: { me: string | null; hidden: string[]; names: { id: string; display_name: string }[] },
): Promise<Reveal> {
  const [{ data: photoRows }, { data: callRows }, { data: statusRows }] = await Promise.all([
    supabase
      .from("photos")
      .select("id, member_id, kind, day, mission, storage_path, roll_call_id, late, hunt_tag, recreate_id, created_at")
      .eq("event_id", ev.id)
      .order("created_at"),
    supabase
      .from("roll_calls")
      .select("id, caller_member_id, called_at, reserved, extra, recipients")
      .eq("event_id", ev.id)
      .order("called_at"),
    supabase.from("member_status").select("member_id, snooze_until, home, home_at").eq("event_id", ev.id),
  ]);
  const photos = ((photoRows ?? []) as Photo[]).filter((p) => !opts.hidden.includes(p.id));
  const calls = (callRows ?? []) as Call[];
  const statuses = (statusRows ?? []) as Status[];

  // Signed URLs: photos are unsealed now, away cards are always group-readable.
  const urls = new Map<string, string>();
  const sign = async (bucket: string, paths: string[]) => {
    if (!paths.length) return;
    const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 60);
    data?.forEach((d) => d.path && d.signedUrl && urls.set(`${bucket}:${d.path}`, d.signedUrl));
  };
  await Promise.all([
    sign("photos", photos.map((p) => p.storage_path)),
    sign("away-cards", members.map((m) => m.away_card_path).filter((p): p is string => !!p)),
  ]);

  const name = (id: string | null) =>
    (members.find((m) => m.id === id) ?? opts.names.find((m) => m.id === id))?.display_name ?? "Someone";
  const tile = (p: Photo, tag?: string): Tile => ({
    id: p.id,
    url: urls.get(`photos:${p.storage_path}`) ?? "",
    who: name(p.member_id),
    mission: p.mission ?? "",
    mine: p.member_id === opts.me,
    storage_path: p.storage_path,
    tag,
    late: p.late,
  });
  const photo = (p: Photo, tag?: string): Item => ({ type: "photo", tile: tile(p, tag) });

  // Why someone missed a call: snoozed at the time, home already, or missed it.
  const reasonFor = (memberId: string, c: Call) => {
    const s = statuses.find((x) => x.member_id === memberId);
    if (s?.snooze_until && Date.parse(s.snooze_until) > Date.parse(c.called_at)) return "snoozed";
    if (s?.home && s.home_at && Date.parse(s.home_at) < Date.parse(c.called_at)) return `home by ${hhmm(s.home_at, ev.timezone)}`;
    return "missed it";
  };

  const moments: Section[] = [];

  if (calls.length) {
    moments.push({
      key: "calls",
      title: "Roll Calls",
      tape: "",
      blocks: calls.map((c, k) => {
        const answers = photos
          .filter((p) => p.roll_call_id === c.id)
          .sort((a, b) => (a.member_id === c.caller_member_id ? -1 : b.member_id === c.caller_member_id ? 1 : 0));
        const missed = c.recipients.filter((r) => !answers.some((p) => p.member_id === r));
        return {
          label: `#${k + 1} · ${name(c.caller_member_id)} · ${hhmm(c.called_at, ev.timezone)}`,
          sub: c.reserved ? `${name(c.caller_member_id)}'s extra` : c.extra ? "backed by the group" : undefined,
          layout: "board",
          items: [
            ...answers.map((p) => photo(p, p.member_id === c.caller_member_id ? `${name(p.member_id)} · called` : name(p.member_id))),
            ...missed.map((r): Item => {
              const m = members.find((x) => x.id === r);
              return {
                type: "away",
                name: name(r),
                url: m?.away_card_path ? (urls.get(`away-cards:${m.away_card_path}`) ?? null) : null,
                reason: reasonFor(r, c),
              };
            }),
          ],
        };
      }),
    });
  }

  if (ev.type === "trip") {
    const mev: MissionEvent = { id: ev.id, type: ev.type, name: ev.name, members: members.map((m) => m.display_name), honoree, word: ev.hunt_word };
    const days = Array.from({ length: diffDays(ev.start_date, ev.end_date) + 1 }, (_, k) => addDays(ev.start_date, k));
    days.forEach((d, di) => {
      const dp = photos.filter((p) => p.day === d);
      const grp = dp.filter((p) => p.kind === "group");
      const hp = dp.filter((p) => p.kind === "hunt");
      const wp = dp.filter((p) => p.kind === "wild");
      if (!grp.length && !hp.length && !wp.length) return;
      const type = huntType(mev, di);
      const blocks: Block[] = [];
      if (grp.length)
        blocks.push({ label: `Everyone · ${groupFrame(mev, di)}`, layout: "board", items: grp.map((p) => photo(p, name(p.member_id))) });
      if (type === "letter" || type === "number") {
        // Letters and numbers in order, with holes for whoever missed.
        const slots = members.map((m, i) => ({ h: hunt(mev, di, i), m })).sort((a, b) => a.h.order - b.h.order);
        const word = type === "letter" ? slots.filter((s) => s.h.order < 100).map((s) => s.h.glyph).join("") : `1–${members.length}`;
        blocks.push({
          label: HUNT_DAY[type],
          layout: "spell",
          items: slots.map(({ h, m }): Item => {
            const p = hp.find((q) => q.member_id === m.id);
            return p ? photo(p, h.glyph) : { type: "hole", glyph: h.glyph, who: m.display_name };
          }),
          foot: word,
        });
      } else if (hp.length) {
        blocks.push({
          label: HUNT_DAY[type],
          layout: "board",
          items: hp.map((p) => photo(p, type === "colour" ? (p.hunt_tag ?? name(p.member_id)) : name(p.member_id))),
        });
      }
      if (wp.length) {
        const skipped = members.filter((m) => !wp.some((p) => p.member_id === m.id)).map((m) => m.display_name);
        blocks.push({
          label: "Wildcards",
          layout: "board",
          items: wp.map((p) => photo(p, name(p.member_id))),
          foot: skipped.length ? `Skipped: ${skipped.join(", ")}` : undefined,
        });
      }
      moments.push({ key: d, title: `Day ${di + 1}`, aside: handDate(d), tape: TAPES[di % 3], blocks });
    });
  } else {
    const np = photos.filter((p) => p.kind === "night");
    if (np.length)
      moments.push({ key: "challenges", title: "Challenges", tape: "t-lime", blocks: [{ layout: "board", items: np.map((p) => photo(p, name(p.member_id))) }] });
  }

  const recs = photos.filter((p) => p.kind === "recreate");
  if (recs.length)
    moments.push({
      key: "recreate",
      title: "Recreations",
      tape: "t-blue",
      blocks: recs.map((p) => {
        const r = p.recreate_id ? REC[p.recreate_id] : undefined;
        return {
          label: r?.title ?? p.mission ?? "",
          sub: `directed by ${name(p.member_id)}`,
          layout: "board",
          items: [photo(p)],
          // Paintings go side by side with the public-domain original.
          orig: r?.img ? { src: `/prototype/art/${r.img}.jpg`, alt: `${r.title}, ${r.source}` } : undefined,
        };
      }),
    });

  const people: Person[] = members.map((m) => ({
    name: m.display_name,
    tiles: photos.filter((p) => p.member_id === m.id).map((p) => tile(p)),
  }));

  return { total: photos.length, calls: calls.length, moments, people };
}
