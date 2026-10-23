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
const GROUP=["Breakfast, rated out of ten","The first argument about directions","The view we paid extra for",
 "Tourists in their natural habitat","The worst souvenir for sale","Today's main character","Where the plan fell apart",
 "The group, looking lost","Something you can't get at home","The local cat","Today's snack haul","The postcard, but honest",
 "The most tourist thing we did today","Today in one blurry photo","What we spent too much on","Someone asleep in transit",
 "The best mouthful of the day","A sign that makes no sense","Last photo before bed","Golden hour, wasted on us",
 "The queue that wasn't worth it","The worst corner of where we're staying","Who's carrying the most stuff",
 "Dinner, from your seat","The highest view","Our drinks"];
const CATS: WildCategory[] = ["people","lens","nerve","story"];
export const CAT_LABEL: Record<WildCategory, string> = {people:"People",lens:"Lens",nerve:"Nerve",story:"Story"};
export const CAT_GLYPH: Record<WildCategory, string> = {people:":)",lens:"( o )",nerve:"!!",story:"..."};
// This season's trend prompts, mixed into the night-out deck and the trip
// nerve wildcards. Trends date fast: refresh every couple of months.
const SEASON=["Costume reveal, mid-drop","Pumpkin head illusion: anyone","A secret on a phone, signed -A","A Love Island-level serious debate"];
const WILD: Record<WildCategory, string[]> = {
 people:["{f}'s next profile picture","{f}, but it's a perfume ad","{f}'s villain origin story","{f}, main character, slow-mo",
  "{f} pretending to be a local","{f}'s dating app photo, by you","{f} doing the face they do","{f} confidently explaining it wrong",
  "{f} as a Renaissance painting","{f}, hounded by paparazzi","{f} in their element","You and {f}, awkward prom photo",
  "{f}, caught being nice","{f}'s \"I'm fine\" face","{f}, secret travel influencer","{f}, low angle, menacing",
  "{f}'s LinkedIn headshot","{f} if they were famous","{f} and their emotional support item","{f} shoots you, no warning"],
 lens:["A Wes Anderson film: dead centre","A crime scene photo of today","Shot like a nature documentary","A perfume ad, anywhere",
  "Through someone's sunglasses","From a dog's height","Make something tiny look huge","A face in an object","Everything one colour",
  "Your shadow, up to something","A reflection that isn't a mirror","Accidentally an album cover","Looks AI-made but isn't",
  "Like it's 2007: flash on","From the floor, looking up","Too close to tell what it is","Forced perspective: someone tiny"],
 nerve:["A local's pick, then shoot it","A stranger takes a bad photo of us","Stock photo pose, in public","Synchronised jump, everyone",
  "Your worst childhood photo, again","Order something you can't pronounce","Slow-mo walk, full commitment",
  "The group as a boy band","A statue pose until someone notices","Act out a road sign","All of us, one tiny space",
  "The most dramatic fake fall","Everyone point at one random thing","Propose to something inanimate",
  "A royal audience with a pigeon","A silent disco, no music, in public",...SEASON],
 story:["Gone by tomorrow","Not for your mum","What went wrong today","We'll laugh about this in ten years","Today's plot twist",
  "The receipt of shame","Today's most expensive mistake","A door you'd move in behind","Today's best overheard line",
  "What you'd steal (you won't)","Impossible to explain at home","Today, as a film poster","The calm before it all",
  "The thing you'll tell everyone","A moment nobody else noticed","The souvenir you actually want"]};
const NIGHT=["The reason we're not allowed back","Exhibit A","A red flag, spotted in the wild","Who's getting the 3am chips",
 "The group chat's next profile picture","Proof we were here","The drink that was a mistake","Main character, right now",
 "Your toilet queue best friend","Whoever said \"just one drink\"","Someone who just checked their bank app",
 "Your best bouncer face","The exact moment it got out of hand","The smoking area philosopher","Your dating app opener",
 "A LinkedIn headshot, at 1am","Something you'll deny tomorrow","The last sensible decision of the night",
 "This table is a crime scene","The most chaotic handbag on the table","Someone's \"one more\" face",
 "Evidence for the group chat trial","Things that should not be on this table","Most likely to go viral tonight",
 "Tonight's album cover","Someone mid-story they shouldn't tell","Tonight's reality show: the villain",
 "Tonight's reality show: the narrator","Lost property, before it's lost","A soul leaving a body","The food that saved the night",
 "The worst decision on the way home","Someone dancing like no one's filming","Your face when the DJ played that",
 "A hug that lasted too long","Someone ordering for the whole table","The friend who knows the bartender",
 "Your outfit, from the floor"];
const BIRTHDAY=["{b}, seconds before seeing the cake","{b} hearing their real age out loud","{b}'s villain origin story",
 "{b}'s next profile picture","{b} with whoever gave the worst present","{b} pretending to love a present",
 "The candles: a fire hazard","Proof {b} has friends","One for {b}'s mum","{b} giving a speech nobody asked for",
 "{b}, one year older, in real time","{b} as a Wikipedia photo","{b}'s \"I'm fine\" face","{b}'s ex would hate this",
 "{b} in their natural habitat","Someone singing happy birthday badly","The cake, after the vultures",
 "{b} taking birthday tax off a plate","{b}'s face when the bill comes","Tomorrow's hangover, forecast","{b}, crowned",
 "{b}, chased by paparazzi (us)","The last photo before the chaos","{b} as an album cover","{b} on a throne (any chair)",
 "{b} and their oldest friend, unchanged","{b} trying to blow out a trick candle","{b}'s birthday dance, judged"];
const BIGDAY=["The couple, unaware they're watched","Someone crying who swore they wouldn't","Who's already lost a shoe",
 "The uncle on his fourth trip to the bar","The aunt asking who's next","The kids' table, plotting",
 "A dance move that should be retired","Someone pretending to know the words","The moment the speech went too far",
 "The photographer, photographed","A toast to {b}","The plus-one nobody knows","Someone asleep before ten",
 "The cake, the before shot","The tie that came off first","The real wedding planner","{b} as a film poster",
 "Proof of the open bar","The first dance, from the floor","Someone sweating through a speech","A guest definitely on their phone",
 "Dad dancing, any age, any dad","Your table's best gossip, in one photo","Someone eyeing up a centrepiece",
 "The last ones standing","Shoes off, dignity off","The bouquet's next victim","{b}, five years from now"];

export const ACCENT: Record<PhotoKind, string> = {
  group: "#3A57FF",
  hunt: "#FF7A1F",
  wild: "#FF4F9A",
  night: "#FF7A1F",
  recreate: "#7A4FD0",
  roll: "#16151A",
};

const DECKS: Record<Exclude<EventType, "trip">, string[]> = { night: [...NIGHT, ...SEASON], birthday: BIRTHDAY, bigday: BIGDAY };

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
// `word`: the letter-day word the trip's maker typed, if any.
export type MissionEvent = { id: string; type: EventType; name: string; members: string[]; honoree: string | null; word?: string | null };

export type Hunt = { type: HuntType; text: string; sub: string; tag: string; glyph: string; bg?: string; order: number };

export function huntType(ev: MissionEvent, di: number): HuntType {
  const o = shuffled(HUNT_TYPES, ev.id + ":h");
  return o[di % o.length];
}

// The maker's word if they typed one. Otherwise the trip name when it has a
// letter per person, else a word sized to the group.
function letterWord(ev: MissionEvent): string {
  if (ev.word) return ev.word;
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

// Recreate: a seeded director gets a painting, film scene or meme sized to
// how many people they can round up. Paintings are public domain and shown
// (art in prototype/art, served at /prototype/art); films, TV, memes and
// album covers are words only, for copyright.
export type Recreation = {
  id: string;
  min: number;
  max: number;
  format: string;
  title: string;
  source: string;
  year: string;
  img: string | null;
  prompt: string;
};

export const RECREATE: Recreation[] = [
 {id:"pearl",min:1,max:1,format:"Painting",title:"Girl with a Pearl Earring",source:"Vermeer",year:"c. 1665",img:"pearl",prompt:"Over the shoulder. Lips parted."},
 {id:"scream",min:1,max:1,format:"Painting",title:"The Scream",source:"Munch",year:"1893",img:"scream",prompt:"Hands on cheeks. Mouth open."},
 {id:"whistler",min:1,max:1,format:"Painting",title:"Whistler's Mother",source:"Whistler",year:"1871",img:"whistler",prompt:"Side-on in a chair. Hands folded."},
 {id:"leo",min:1,max:1,format:"Meme",title:"Leo pointing",source:"Once Upon a Time in Hollywood",year:"2019",img:null,prompt:"Point at a screen. You know them."},
 {id:"gothic",min:2,max:2,format:"Painting",title:"American Gothic",source:"Grant Wood",year:"1930",img:"gothic",prompt:"Side by side. Deadpan. Hold a fork."},
 {id:"adam",min:2,max:2,format:"Painting",title:"The Creation of Adam",source:"Michelangelo",year:"c. 1512",img:"adam",prompt:"Fingers almost touching."},
 {id:"arnolfini",min:2,max:2,format:"Painting",title:"The Arnolfini Portrait",source:"Van Eyck",year:"1434",img:"arnolfini",prompt:"Hold hands. One palm up."},
 {id:"titanic",min:2,max:2,format:"Film",title:"Titanic, the bow",source:"Titanic",year:"1997",img:null,prompt:"Arms out at the front."},
 {id:"spidey",min:2,max:3,format:"Meme",title:"Spider-Man pointing",source:"Spider-Man",year:"1967",img:null,prompt:"Point at each other."},
 {id:"horatii",min:3,max:3,format:"Painting",title:"The Oath of the Horatii",source:"David",year:"1784",img:"horatii",prompt:"In a line. Arms out."},
 {id:"distracted",min:3,max:3,format:"Meme",title:"Distracted boyfriend",source:"Stock photo",year:"2015",img:null,prompt:"Walk, turn, outrage."},
 {id:"angels",min:3,max:3,format:"TV",title:"Charlie's Angels",source:"Charlie's Angels",year:"1976",img:null,prompt:"Back to back. Finger guns."},
 {id:"abbey",min:4,max:4,format:"Album",title:"Abbey Road",source:"The Beatles",year:"1969",img:null,prompt:"Single file over a crossing."},
 {id:"dogs",min:4,max:8,format:"Film",title:"Reservoir Dogs walk",source:"Reservoir Dogs",year:"1992",img:null,prompt:"Slow walk to camera."},
 {id:"dance",min:5,max:5,format:"Painting",title:"Dance",source:"Matisse",year:"1910",img:"dance",prompt:"A ring, mid-leap."},
 {id:"avengers",min:5,max:6,format:"Film",title:"Avengers circle",source:"The Avengers",year:"2012",img:null,prompt:"Back to back in a circle."},
 {id:"boating",min:6,max:14,format:"Painting",title:"Luncheon of the Boating Party",source:"Renoir",year:"1881",img:"boating",prompt:"Lounge round a table."},
 {id:"supper",min:6,max:13,format:"Painting",title:"The Last Supper",source:"Leonardo",year:"c. 1495",img:"supper",prompt:"One side of a table. Drama."},
 {id:"mona",min:1,max:1,format:"Painting",title:"Mona Lisa",source:"Leonardo",year:"c. 1503",img:"mona",prompt:"Hands folded. The smile. Give nothing away."},
 {id:"wanderer",min:1,max:1,format:"Painting",title:"Wanderer above the Sea of Fog",source:"Friedrich",year:"1818",img:"wanderer",prompt:"Back to camera. Highest point. Brooding."},
 {id:"napoleon",min:1,max:1,format:"Painting",title:"Napoleon Crossing the Alps",source:"David",year:"1801",img:"napoleon",prompt:"On a chair. One arm up. Coat flying."},
 {id:"milkmaid",min:1,max:1,format:"Painting",title:"The Milkmaid",source:"Vermeer",year:"c. 1658",img:"milkmaid",prompt:"Pour a drink very slowly. Eyes down."},
 {id:"folies",min:1,max:1,format:"Painting",title:"A Bar at the Folies-Bergère",source:"Manet",year:"1882",img:"folies",prompt:"Behind a bar, hands on the counter, dead-eyed."},
 {id:"cavalier",min:1,max:1,format:"Painting",title:"The Laughing Cavalier",source:"Frans Hals",year:"1624",img:"cavalier",prompt:"Hand on hip. Smug. Very smug."},
 {id:"blueboy",min:1,max:1,format:"Painting",title:"The Blue Boy",source:"Gainsborough",year:"c. 1770",img:"blueboy",prompt:"Hand on hip, something blue, chin up."},
 {id:"bernie",min:1,max:1,format:"Meme",title:"Bernie's mittens",source:"Inauguration photo",year:"2021",img:null,prompt:"Sit cross-legged, arms folded, unbothered."},
 {id:"disaster",min:1,max:1,format:"Meme",title:"Disaster Girl",source:"Viral photo",year:"2004",img:null,prompt:"Small smile. Chaos behind you."},
 {id:"harold",min:1,max:1,format:"Meme",title:"Hide the Pain Harold",source:"Stock photo",year:"2011",img:null,prompt:"Mug in hand. Smile through it."},
 {id:"thisisfine",min:1,max:1,format:"Meme",title:"This is fine",source:"KC Green comic",year:"2013",img:null,prompt:"Sit calmly with a drink. Chaos all round."},
 {id:"gatsby",min:1,max:1,format:"Film",title:"The Gatsby toast",source:"The Great Gatsby",year:"2013",img:null,prompt:"Raise a glass. Fireworks optional."},
 {id:"jim",min:1,max:1,format:"TV",title:"Jim's look to camera",source:"The Office",year:"2005",img:null,prompt:"Look straight down the lens. Say nothing."},
 {id:"rocky",min:1,max:1,format:"Film",title:"Rocky on the steps",source:"Rocky",year:"1976",img:null,prompt:"Top of any stairs. Both arms up."},
 {id:"penguin",min:1,max:1,format:"Meme",title:"The nihilist penguin",source:"Encounters at the End of the World",year:"2007",img:null,prompt:"Walk away from the group, towards nothing."},
 {id:"wednesday",min:1,max:1,format:"TV",title:"The Wednesday dance",source:"Wednesday",year:"2022",img:null,prompt:"Mid-dance. Arms stiff. Dead stare."},
 {id:"brat",min:1,max:3,format:"Album",title:"brat",source:"Charli XCX",year:"2024",img:null,prompt:"Something lime green. One blurry word."},
 {id:"kiss",min:2,max:2,format:"Painting",title:"The Kiss",source:"Klimt",year:"1908",img:"kiss",prompt:"One leans in, one tilts away. Gold if you've got it."},
 {id:"cardplayers",min:2,max:2,format:"Painting",title:"The Card Players",source:"Cézanne",year:"c. 1893",img:"cardplayers",prompt:"Across a table. Cards up. Zero trust."},
 {id:"yellingcat",min:2,max:2,format:"Meme",title:"Woman yelling at a cat",source:"Two screenshots",year:"2019",img:null,prompt:"One furious and pointing. One baffled, with food."},
 {id:"spaghetti",min:2,max:2,format:"Film",title:"The spaghetti kiss",source:"Lady and the Tramp",year:"1955",img:null,prompt:"Share one strand of anything."},
 {id:"cuecards",min:2,max:2,format:"Film",title:"The cue cards",source:"Love Actually",year:"2003",img:null,prompt:"Silent cue cards at a door."},
 {id:"shining",min:2,max:2,format:"Film",title:"The twins",source:"The Shining",year:"1980",img:null,prompt:"Side by side in a corridor. Hold hands. Stare."},
 {id:"barbenheimer",min:2,max:2,format:"Film",title:"Barbenheimer",source:"Barbie and Oppenheimer",year:"2023",img:null,prompt:"One in pink, one in a hat. Opposite moods."},
 {id:"thelma",min:2,max:2,format:"Film",title:"Thelma & Louise",source:"Thelma & Louise",year:"1991",img:null,prompt:"In a parked car. Scarves. Hands up."},
 {id:"simba",min:2,max:3,format:"Film",title:"Simba held up",source:"The Lion King",year:"1994",img:null,prompt:"Hold something up to the sky. Everyone bows."},
 {id:"swing",min:2,max:3,format:"Painting",title:"The Swing",source:"Fragonard",year:"1767",img:"swing",prompt:"One on a swing (or a chair), one below in awe."},
 {id:"gleaners",min:3,max:3,format:"Painting",title:"The Gleaners",source:"Millet",year:"1857",img:"gleaners",prompt:"Three, bent over, picking something up."},
 {id:"pivot",min:3,max:3,format:"TV",title:"Pivot!",source:"Friends",year:"1999",img:null,prompt:"Carry something big up the stairs. One shouting."},
 {id:"wave",min:3,max:6,format:"Painting",title:"The Great Wave",source:"Hokusai",year:"c. 1831",img:"wave",prompt:"Be the wave. Arms curling over someone."},
 {id:"meangirls",min:4,max:4,format:"Film",title:"Jingle Bell Rock",source:"Mean Girls",year:"2004",img:null,prompt:"Four in a row. Matching. Hip out."},
 {id:"spice",min:5,max:5,format:"Album",title:"Spice",source:"Spice Girls",year:"1996",img:null,prompt:"Five, each a different attitude."},
 {id:"suspects",min:5,max:5,format:"Film",title:"The line-up",source:"The Usual Suspects",year:"1995",img:null,prompt:"In a line against a wall. Hold a number."},
 {id:"delaware",min:4,max:10,format:"Painting",title:"Washington Crossing the Delaware",source:"Leutze",year:"1851",img:"delaware",prompt:"Crammed in a boat (any). One standing, heroic."},
 {id:"traitors",min:5,max:10,format:"TV",title:"The round table",source:"The Traitors",year:"2022",img:null,prompt:"Round a table. Everyone points at one person."},
 {id:"loveisland",min:4,max:10,format:"TV",title:"The recoupling",source:"Love Island",year:"2015",img:null,prompt:"In pairs by the fire pit. One left out."},
 {id:"jatte",min:5,max:10,format:"Painting",title:"A Sunday on La Grande Jatte",source:"Seurat",year:"1884",img:"jatte",prompt:"Everyone side-on, still, ignoring each other."},
 {id:"nightwatch",min:6,max:14,format:"Painting",title:"The Night Watch",source:"Rembrandt",year:"1642",img:"nightwatch",prompt:"Everyone mid-march, one pointing the way."},
 {id:"fountain",min:6,max:6,format:"TV",title:"The opening titles",source:"Friends",year:"1994",img:null,prompt:"Six, a fountain or a sofa, arms out."}];

export const REC: Record<string, Recreation> = Object.fromEntries(RECREATE.map((r) => [r.id, r]));

// Trips: days 1, 3, 5… Otherwise once, on the day.
export const isRecreateDay = (ev: MissionEvent, di: number) => (ev.type === "trip" ? di % 2 === 0 : di === 0);

export const director = (ev: MissionEvent, di: number): string | null =>
  ev.members.length ? shuffled(ev.members, ev.id + ":dir:" + di)[0] : null;

export function recreateFor(ev: MissionEvent, di: number, count: number, offset: number): Recreation | null {
  const opts = RECREATE.filter((r) => r.min <= count && count <= r.max);
  if (!opts.length) return null;
  return shuffled(opts, ev.id + ":rc:" + di + ":" + count)[(offset || 0) % opts.length];
}
