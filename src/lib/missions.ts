// Challenges, ported from the prototype. Assignment is deterministic, seeded
// by event id, day and person, so every device works out the same missions
// without storing them. Keep the seeds and decks in step with the prototype.

import type { EventType } from "@/lib/events";

export type HuntType = "colour" | "letter" | "shape" | "texture" | "number";
export type WildCategory = "people" | "lens" | "nerve" | "story";
export type PhotoKind = "roll" | "group" | "hunt" | "wild" | "night" | "recreate";

const COLOURS=[
 {n:"Red",h:"#D7263D"},{n:"Yellow",h:"#F2C200"},{n:"Blue",h:"#1F6FD1"},{n:"Green",h:"#2E9E57"},
 {n:"Orange",h:"#F07A1A"},{n:"Pink",h:"#E85D9A"},{n:"Purple",h:"#7A4FD0"},{n:"White",h:"#F7F7F2"},
 {n:"Black",h:"#15161A"},{n:"Turquoise",h:"#1BB3B0"},{n:"Gold",h:"#C9A227"},{n:"Brown",h:"#7B4B2A"}];
const SHAPES=[{t:"a heart, by accident",g:"<3"},{t:"a face in a thing",g:":)"},{t:"a perfect circle",g:"O"},{t:"a triangle",g:"/\\"},{t:"a star",g:"*"},
 {t:"an arrow",g:"->"},{t:"a spiral",g:"@"},{t:"a square",g:"[]"},{t:"a hidden 8",g:"8"},{t:"a cross",g:"+"},{t:"a zigzag",g:"Z"},
 {t:"a crescent moon",g:"C"},{t:"stripes",g:"="},{t:"a hexagon",g:"6"}];
const TEXTURES=["rust","peeling paint","moss","patterned tiles","neon","wicker","marble","cobbles","graffiti",
 "corrugated metal","velvet","bubbles","chipped enamel","woodgrain","condensation","lace"];
const WORDS: Record<number, string[]> = {2:["GO","YO","OK"],3:["FUN","SUN","WOW","YES","YAY"],4:["TRIP","CREW","GANG","EPIC"],
 5:["MATES","PARTY","HELLO","CHEER"],6:["CHEERS","LEGEND","SUNSET","ESCAPE"],7:["HOLIDAY","FOREVER","WEEKEND"],
 8:["ROLLCALL","SUNSHINE","ROADTRIP"],9:["ADVENTURE","GOODTIMES","WANDERING"],10:["MEMORYLANE","BESTFRIEND"]};
const HUNT_TYPES: HuntType[] = ["colour","letter","shape","texture","number"];
export const HUNT_DAY: Record<HuntType, string> = {colour:"Colour day",letter:"Letter day",shape:"Shape day",texture:"Texture day",number:"Number day"};
const GROUP=["Dinner, from your seat","First thing outside","The highest view","Our drinks","Last photo before bed","Your feet, furthest point",
 "The landmark, your angle","Today's best moment","Whoever has the map","Best mouthful","Look at that sky","Where you slept",
 "What's making us laugh","First sip","Where we're waiting","The group, ahead of you","The messiest table"];
const CATS: WildCategory[] = ["people","lens","nerve","story"];
export const CAT_LABEL: Record<WildCategory, string> = {people:"People",lens:"Lens",nerve:"Nerve",story:"Story"};
export const CAT_GLYPH: Record<WildCategory, string> = {people:":)",lens:"( o )",nerve:"!!",story:"..."};
const WILD: Record<WildCategory, string[]> = {
 people:["{f} mid-laugh","{f}, unaware","You and {f}","{f} shoots you","{f}'s hands","{f}, looking away","{f} as a statue","{f}, happiest",
  "{f} reading a menu","Back of {f}'s head","{f} and a stranger","{f} as a local","{f} mid-rant","{f}'s best portrait","{f} mid-story","{f}, off guard"],
 lens:["From the ground","Through glass","A reflection","A silhouette","A great shadow","From above","Too close to tell","Framed by a door",
  "Perfect symmetry","Motion blur","Forced perspective","Through a gap","One colour only","The postcard spot, reversed"],
 nerve:["Stock photo pose","Album cover, 3+","Slow-mo walk","A stranger shoots us","Act out a sign","Group jump","Today's film poster",
  "All of us, tiny space","A local's pick","Same face, everyone","Something unpronounceable","Recreate an old photo","Pose with a lamppost","Everyone point at one thing"],
 story:["Gone by tomorrow","One for your mum","Not for your mum","Only here","A door to live behind","Today's topic","The quietest moment",
  "What stopped you","What you'd buy","A queue","Postcard shot","Anti-postcard","Your shoes","A local's day","Smells amazing","Best bite","The story for home","What went wrong"]};
const NIGHT=["Best-dressed stranger","Whoever's laughing hardest","The first drink","Bathroom mirror selfie","Someone mid-dance","The queue",
 "The worst snack","Two people, no photo yet","Your view right now","A story told with hands","The sign over the door","The messiest table",
 "On to the next place","Your shoes, end of night","The way home","Someone who hasn't noticed","The loudest moment"];
const BIRTHDAY=["{b} mid-laugh","{b} and their oldest friend","{b} and someone new","The candles","{b} opening a present","The cake, untouched",
 "The cake, after","{b}'s \"how old?!\" face","Everyone singing","{b}, off guard","A toast to {b}","{b} and the organiser",
 "{b}, tomorrow's regret","{b}'s drink","{b} dancing","Best-dressed guest"];
const BIGDAY=["The couple, off guard","The first dance","Happy tears","Best-dressed guest","Your table, messy","The speeches","Peak dance floor",
 "A grandparent dancing","The vows","First shoes off","The bouquet","A toast to {b}","The cake","Last ones standing"];

export const ACCENT: Record<PhotoKind, string> = {
  group: "#3A57FF",
  hunt: "#FF7A1F",
  wild: "#FF4F9A",
  night: "#FF7A1F",
  recreate: "#7A4FD0",
  roll: "#16151A",
};

const DECKS: Record<Exclude<EventType, "trip">, string[]> = { night: NIGHT, birthday: BIRTHDAY, bigday: BIGDAY };

export function hash(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(arr: readonly T[], seed: string): T[] {
  const r = rng(hash(seed));
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// What the assignment needs to know about an event. `members` are names in
// a fixed order (group join order), the same on every device.
export type MissionEvent = { id: string; type: EventType; name: string; members: string[]; honoree: string | null };

export type Hunt = { type: HuntType; text: string; sub: string; tag: string; glyph: string; bg?: string; order: number };

export function huntType(ev: MissionEvent, di: number): HuntType {
  const o = shuffled(HUNT_TYPES, ev.id + ":h");
  return o[di % o.length];
}

function letterWord(ev: MissionEvent): string {
  const n = ev.members.length;
  const nm = (ev.name || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (nm.length === n) return nm;
  return shuffled(WORDS[Math.min(Math.max(n, 2), 10)], ev.id + ":word")[0];
}

export function groupFrame(ev: MissionEvent, di: number): string {
  const g = shuffled(GROUP, ev.id + ":g");
  return g[di % g.length];
}

export function hunt(ev: MissionEvent, di: number, i: number): Hunt {
  const type = huntType(ev, di);
  const n = ev.members.length;
  const seed = ev.id + ":" + type + ":" + di;
  if (type === "colour") {
    const c = shuffled(COLOURS, seed)[i % COLOURS.length];
    return { type, text: `Something ${c.n.toLowerCase()}`, sub: "", tag: c.n, glyph: "", bg: c.h, order: i };
  }
  if (type === "letter") {
    const w = letterWord(ev);
    if (i < w.length) return { type, text: `Find the letter ${w[i]}`, sub: `Spelling ${w} together`, tag: w[i], glyph: w[i], order: i };
    const L = (ev.members[i][0] || "?").toUpperCase();
    return { type, text: `Find the letter ${L}`, sub: "Your initial", tag: L, glyph: L, order: 100 + i };
  }
  if (type === "number") {
    const k = shuffled(Array.from({ length: n }, (_, j) => j + 1), seed)[i];
    return { type, text: `Find the number ${k}`, sub: `Counting 1–${n} together`, tag: String(k), glyph: String(k), order: k };
  }
  if (type === "shape") {
    const s = shuffled(SHAPES, seed)[i % SHAPES.length];
    return { type, text: `Find ${s.t}`, sub: "", tag: s.t, glyph: s.g, order: i };
  }
  const x = shuffled(TEXTURES, seed)[i % TEXTURES.length];
  return { type, text: `Close-up: ${x}`, sub: "", tag: x, glyph: "~~", order: i };
}

export function wild(ev: MissionEvent, di: number, i: number, sw: number): { cat: WildCategory; text: string } {
  const n = ev.members.length;
  const cat = CATS[(di + i) % CATS.length];
  const pool = shuffled(WILD[cat], ev.id + ":w:" + cat);
  let text = pool[(di * n + i + sw * (n * 7 + 1)) % pool.length];
  if (cat === "people") {
    const ring = shuffled(ev.members.map((_, j) => j), ev.id + ":ring:" + di + ":" + sw);
    const pos = ring.indexOf(i);
    const f = ev.members[ring[(pos + 1) % n]];
    text = text.replace(/\{f\}/g, f);
  }
  return { cat, text };
}

export function single(ev: MissionEvent, i: number, sw: number): string {
  if (ev.type === "trip") return "";
  const pool = shuffled(DECKS[ev.type], ev.id + ":deck");
  const b = ev.honoree || (ev.type === "birthday" ? "the birthday person" : "the couple");
  return pool[(i + sw * 5) % pool.length].replace(/\{b\}/g, b);
}
