// The sample trip from the prototype: Rome, four friends, two Roll Calls,
// a colour hunt, a ROME letter hunt with a missing M, wildcards and an
// Arnolfini recreation. Printed in the browser with the real look and shown
// through the same reveal view as real events. Photos: Unsplash (credits
// below); names are made up.

import { awayCanvas, develop, handDate, loadImage } from "@/lib/develop";
import { ACCENT, REC, type PhotoKind } from "@/lib/missions";
import type { Item, Reveal, Section, Tile } from "@/app/events/[id]/build-reveal";

export const CREDITS: Record<string, string> = {"5jySMpqi6xk":"Jennifer Bedoya","DzGCdUlNJTU":"Rebeca G. Sendroiu","TmTYtJ5RiN8":"freestocks","F2eHfMwIOxA":"Robert Bye","RPxMkJsqaUY":"Andrew Spencer","sMP1im1Jbq4":"Jase Bloor","Q34YB7yjAxA":"Erwan Hesry","v3UZKbMaTGk":"Anjana Menon","vSl1odYyd8w":"Ornella Binni","bp8Nw_Q11gI":"Will Langenberg","xRagbUZfnec":"Jon Tyson","C5mrwhFTEvY":"Florian Biedermann","Fnz4M0TkJrA":"Goh Rhy Yan","RqbB-fNP6dQ":"iMattSmart","tangfe8KQdw":"Jon Tyson","SoZ3b8LLOdo":"Steve Harvey","XvQNHn_alRA":"Ksenia Makagonova","iuqmGmst5Po":"Tobias Mrzyk","l0SMeYt0uPo":"Ales Krivec","HUywIRyF_L4":"Christoffer Engström","JnOHvMgw_Jo":"Rio Syhputra","ozVQrfENFOs":"Nathan Dumlao","QWiQ-0AAHBE":"Fernanda Nuso","9oUL0x_puck":"shche_ team","lh0mqRUCrok":"Davide Venturelli","pCYlHZAXfMI":"Jack Cohen","bxu8d8W8ee4":"Mohammed Idris Djoudi"};

type Extra = { rollId?: string; at?: [number, number, number]; late?: boolean; tag?: string; order?: number; cat?: string; recreateId?: string; starring?: number };
// [photo, member, day, kind, mission, extra]
type Spec = [string, string, number, PhotoKind, (string | null)?, Extra?];

const SPEC: Spec[] = [
 ["F2eHfMwIOxA","Priya",0,"roll",null,{rollId:"c1",at:[0,21,14]}],["RPxMkJsqaUY","Sam",0,"roll",null,{rollId:"c1",at:[0,21,15]}],
 ["sMP1im1Jbq4","Mei",0,"roll",null,{rollId:"c1",at:[0,21,16]}],["Q34YB7yjAxA","Jonno",0,"roll",null,{rollId:"c1",at:[0,21,24],late:true}],
 ["9oUL0x_puck","Priya",0,"group"],["ozVQrfENFOs","Mei",0,"group"],
 ["v3UZKbMaTGk","Priya",0,"hunt","Something red",{tag:"Red",order:0}],["vSl1odYyd8w","Sam",0,"hunt","Something yellow",{tag:"Yellow",order:1}],
 ["DzGCdUlNJTU","Mei",0,"hunt","Something pink",{tag:"Pink",order:2}],["bp8Nw_Q11gI","Jonno",0,"hunt","Something blue",{tag:"Blue",order:3}],
 ["5jySMpqi6xk","Priya",0,"wild","Mei's best portrait",{cat:"people"}],
 ["TmTYtJ5RiN8","Sam",0,"wild","Stock photo pose",{cat:"nerve"}],
 ["xRagbUZfnec","Mei",0,"wild","A great shadow",{cat:"lens"}],
 ["C5mrwhFTEvY","Jonno",0,"wild","What stopped you",{cat:"story"}],
 ["QWiQ-0AAHBE","Jonno",0,"recreate",null,{recreateId:"arnolfini",starring:2}],
 ["Fnz4M0TkJrA","Priya",1,"group"],["RqbB-fNP6dQ","Sam",1,"group"],
 ["lh0mqRUCrok","Sam",1,"roll",null,{rollId:"c2",at:[1,22,47]}],["pCYlHZAXfMI","Priya",1,"roll",null,{rollId:"c2",at:[1,22,58],late:true}],
 ["tangfe8KQdw","Priya",1,"hunt","Find the letter R",{tag:"R",order:0}],["SoZ3b8LLOdo","Sam",1,"hunt","Find the letter O",{tag:"O",order:1}],
 ["XvQNHn_alRA","Jonno",1,"hunt","Find the letter E",{tag:"E",order:3}],
 ["iuqmGmst5Po","Priya",1,"wild","A silhouette",{cat:"lens"}],
 ["l0SMeYt0uPo","Sam",1,"wild","Jonno shoots you",{cat:"people"}],
 ["HUywIRyF_L4","Mei",1,"wild","The story for home",{cat:"story"}],
 ["JnOHvMgw_Jo","Jonno",1,"wild","Mei, unaware",{cat:"people"}]];

const MEMBERS = ["Priya", "Sam", "Mei", "Jonno"];
const DAYS = ["2026-09-12", "2026-09-13"];
const FRAMES = ["Our drinks", "Best mouthful"];
const CALLS = [
  { id: "c1", caller: "Priya", at: [0, 21, 14] as const, recipients: ["Sam", "Mei", "Jonno"], reserved: true },
  { id: "c2", caller: "Sam", at: [1, 22, 47] as const, recipients: ["Priya", "Mei", "Jonno"], reserved: false },
];
const AWAY: Record<string, string> = { Mei: "JnOHvMgw_Jo", Jonno: "bxu8d8W8ee4" };
const pad = (n: number) => String(n).padStart(2, "0");
const time = (h: number, m: number) => `${pad(h)}:${pad(m)}`;

const photoUrl = (id: string) => `/prototype/samples/${id}.jpg`;

async function fetchImage(id: string) {
  const res = await fetch(photoUrl(id));
  return loadImage(await res.blob());
}

export async function buildSample(onProgress?: (done: number, total: number) => void): Promise<Reveal> {
  let done = 0;
  const tick = () => onProgress?.(++done, SPEC.length + Object.keys(AWAY).length);

  type P = { k: number; id: string; who: string; di: number; kind: PhotoKind; mission: string; extra: Extra; url: string };
  const printed: P[] = [];
  await Promise.all(
    SPEC.map(async ([id, who, di, kind, mission, extra = {}], k) => {
      const call = extra.rollId ? CALLS.find((c) => c.id === extra.rollId)! : null;
      const ms =
        mission ??
        (kind === "group" ? FRAMES[di] : kind === "roll" ? `roll call · ${call!.caller.toLowerCase()}` : kind === "recreate" ? REC[extra.recreateId!].title : "");
      try {
        const c = await develop(await fetchImage(id), {
          W: 560,
          seed: k * 31 + 1,
          frame: k + 1,
          who,
          date: handDate(DAYS[di]),
          time: kind === "roll" && extra.at ? time(extra.at[1], extra.at[2]) : "",
          mission: ms,
          accent: ACCENT[kind],
        });
        printed.push({ k, id, who, di, kind, mission: ms, extra, url: c.toDataURL("image/jpeg", 0.85) });
      } catch {
        // A photo that fails to load is just left out.
      }
      tick();
    }),
  );
  printed.sort((a, b) => a.k - b.k);
  const away: Record<string, string> = {};
  for (const [who, id] of Object.entries(AWAY)) {
    try {
      away[who] = awayCanvas(await fetchImage(id)).toDataURL("image/jpeg", 0.8);
    } catch {}
    tick();
  }

  const tile = (p: P, tag?: string): Tile => ({ id: `s${p.k}`, url: p.url, who: p.who, mission: p.mission, mine: false, storage_path: "", tag, late: p.extra.late });
  const photo = (p: P, tag?: string): Item => ({ type: "photo", tile: tile(p, tag) });
  const moments: Section[] = [];

  moments.push({
    key: "calls",
    title: "Roll Calls",
    tape: "",
    blocks: CALLS.map((c, k) => {
      const answers = printed
        .filter((p) => p.extra.rollId === c.id)
        .sort((a, b) => (a.who === c.caller ? -1 : b.who === c.caller ? 1 : 0));
      const missed = c.recipients.filter((r) => !answers.some((p) => p.who === r));
      // Day 2: Mei was snoozed, Jonno went home at 22:10.
      const reason = (who: string) => (who === "Mei" ? "snoozed" : who === "Jonno" ? "home by 22:10" : "missed it");
      return {
        label: `#${k + 1} · ${c.caller} · ${time(c.at[1], c.at[2])}`,
        sub: c.reserved ? `${c.caller}'s extra` : undefined,
        layout: "board" as const,
        items: [
          ...answers.map((p) => photo(p, p.who === c.caller ? `${p.who} · called` : p.who)),
          ...missed.map((who): Item => ({ type: "away", name: who, url: away[who] ?? null, reason: reason(who) })),
        ],
      };
    }),
  });

  const recs = printed.filter((p) => p.kind === "recreate");
  moments.push({
    key: "recreate",
    title: "Recreations",
    tape: "t-blue",
    blocks: recs.map((p) => {
      const r = REC[p.extra.recreateId!];
      return {
        label: r.title,
        sub: `directed by ${p.who}`,
        layout: "board" as const,
        items: [photo(p)],
        orig: r.img ? { src: `/prototype/art/${r.img}.jpg`, alt: `${r.title}, ${r.source}` } : undefined,
      };
    }),
  });

  DAYS.forEach((d, di) => {
    const dp = printed.filter((p) => p.di === di);
    const hunt = dp.filter((p) => p.kind === "hunt");
    const wild = dp.filter((p) => p.kind === "wild");
    const blocks: Section["blocks"] = [
      { label: `Everyone · ${FRAMES[di]}`, layout: "board", items: dp.filter((p) => p.kind === "group").map((p) => photo(p, p.who)) },
    ];
    if (di === 0) {
      blocks.push({ label: "Colour day", layout: "board", items: hunt.map((p) => photo(p, p.extra.tag)) });
    } else {
      // ROME, one letter each; Mei missed the M.
      const word = "ROME";
      blocks.push({
        label: "Letter day",
        layout: "spell",
        items: word.split("").map((L, i): Item => {
          const p = hunt.find((q) => q.extra.order === i);
          return p ? photo(p, L) : { type: "hole", glyph: L, who: MEMBERS[i] };
        }),
        foot: word,
      });
    }
    blocks.push({ label: "Wildcards", layout: "board", items: wild.map((p) => photo(p, p.who)) });
    moments.push({ key: d, title: `Day ${di + 1}`, aside: handDate(d), tape: (["", "t-blue", "t-lime"] as const)[di % 3], blocks });
  });

  return {
    total: printed.length,
    calls: CALLS.length,
    moments,
    people: MEMBERS.map((name) => ({ name, tiles: printed.filter((p) => p.who === name).map((p) => tile(p)) })),
  };
}

// Photographers whose photos the sample uses, for the credit line.
export const SAMPLE_CREDITS = [...new Set([...SPEC.map((s) => s[0]), ...Object.values(AWAY)])].map((id) => ({
  id,
  name: CREDITS[id] ?? "Unsplash",
}));
