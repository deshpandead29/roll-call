// The Roll Call print, ported from develop() in the prototype. Runs in the
// browser at capture, before upload, so the look is burned into the file.

import rough from "roughjs";
import { display, hand } from "@/app/fonts";

export type DevelopOptions = {
  W?: number;
  mission?: string;
  who?: string;
  date?: string;
  time?: string;
  frame?: number;
  accent?: string;
  seed?: number;
};

const HAND = `${hand.style.fontFamily}, "Comic Sans MS", cursive`;
const DISPLAY = `${display.style.fontFamily}, sans-serif`;

let fontsReady: Promise<unknown> | null = null;
function loadFonts() {
  fontsReady ??= Promise.all([document.fonts.load(`40px ${HAND}`), document.fonts.load(`800 40px ${DISPLAY}`)]).catch(() => {});
  return fontsReady;
}

const pad = (n: number) => String(n).padStart(2, "0");

export const handDate = (s: string) =>
  new Date(`${s}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).toLowerCase();

function wrapLines(x: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = String(text).split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (x.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let l = lines[maxLines - 1];
    while (x.measureText(l + "…").width > maxW && l.length) l = l.slice(0, -1);
    lines[maxLines - 1] = l + "…";
  }
  return lines;
}

// Decodes a picked file. Browsers apply EXIF orientation when drawing an
// <img>, and Safari decodes HEIC, so both come out upright.
export async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function develop(src: HTMLImageElement, o: DevelopOptions = {}): Promise<HTMLCanvasElement> {
  await loadFonts();
  const W = o.W || 1080;
  const sw = src.naturalWidth;
  const sh = src.naturalHeight;
  const portrait = sh >= sw;
  const padX = Math.round(W * 0.045);
  const pw = W - padX * 2;
  const ph = Math.round(portrait ? (pw * 4) / 3 : (pw * 3) / 4);
  const capH = Math.round(W * 0.25);
  const H = padX + ph + capH;

  // Photo, cover-cropped, then graded per pixel.
  const pc = document.createElement("canvas");
  pc.width = pw;
  pc.height = ph;
  const px = pc.getContext("2d", { willReadFrequently: true })!;
  const s = Math.max(pw / sw, ph / sh);
  px.imageSmoothingQuality = "high";
  px.drawImage(src, (pw - sw * s) / 2, (ph - sh * s) / 2, sw * s, sh * s);
  const im = px.getImageData(0, 0, pw, ph);
  const p = im.data;
  const src0 = new Uint8ClampedArray(p);
  const cx = pw / 2;
  const cy = ph / 2;
  const maxd = Math.hypot(cx, cy);
  for (let y = 0; y < ph; y++)
    for (let x = 0; x < pw; x++) {
      const i = (y * pw + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy) / maxd;
      const ca = 0.0045 * d;
      const rx = Math.min(pw - 1, Math.max(0, Math.round(cx + dx * (1 + ca))));
      const ry = Math.min(ph - 1, Math.max(0, Math.round(cy + dy * (1 + ca))));
      const bx = Math.min(pw - 1, Math.max(0, Math.round(cx + dx * (1 - ca))));
      const by = Math.min(ph - 1, Math.max(0, Math.round(cy + dy * (1 - ca))));
      let r = src0[(ry * pw + rx) * 4] / 255;
      let g = src0[i + 1] / 255;
      let b = src0[(by * pw + bx) * 4 + 2] / 255;
      const gain = 1.12 - 0.36 * d * d;
      r *= gain;
      g *= gain;
      b *= gain;
      let L = 0.299 * r + 0.587 * g + 0.114 * b;
      r = L + (r - L) * 1.16;
      g = L + (g - L) * 1.12;
      b = L + (b - L) * 1.1;
      r = (r - 0.5) * 1.13 + 0.5;
      g = (g - 0.5) * 1.13 + 0.5;
      b = (b - 0.5) * 1.13 + 0.5;
      L = Math.min(1, Math.max(0, L));
      b += 0.06 * (1 - L) * (1 - L);
      g += 0.012 * (1 - L);
      r -= 0.012 * L;
      b += 0.012 * L;
      r = (r - 0.025) / 0.975;
      g = (g - 0.025) / 0.975;
      b = (b - 0.025) / 0.975;
      const n = (Math.random() - 0.5) * 0.055;
      p[i] = Math.max(0, Math.min(255, (r + n + (Math.random() - 0.5) * 0.018) * 255));
      p[i + 1] = Math.max(0, Math.min(255, (g + n) * 255));
      p[i + 2] = Math.max(0, Math.min(255, (b + n + (Math.random() - 0.5) * 0.022) * 255));
    }
  px.putImageData(im, 0, 0);

  // Soft bloom: a 1/16 copy screened on top.
  const tiny = document.createElement("canvas");
  tiny.width = Math.max(8, Math.round(pw / 16));
  tiny.height = Math.max(8, Math.round(ph / 16));
  const tx = tiny.getContext("2d")!;
  tx.imageSmoothingQuality = "high";
  tx.drawImage(pc, 0, 0, tiny.width, tiny.height);
  px.globalCompositeOperation = "screen";
  px.globalAlpha = 0.2;
  px.drawImage(tiny, 0, 0, pw, ph);
  px.globalAlpha = 1;
  px.globalCompositeOperation = "source-over";

  // The print.
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = "#FBF8F2";
  x.fillRect(0, 0, W, H);
  x.save();
  x.beginPath();
  x.roundRect(padX, padX, pw, ph, W * 0.012);
  x.clip();
  x.drawImage(pc, padX, padX);
  x.restore();

  // Caption: the challenge, underlined in the mission colour.
  const top = padX + ph;
  const fs = Math.round(W * 0.05);
  x.fillStyle = "#1D1B20";
  x.textBaseline = "alphabetic";
  x.textAlign = "left";
  x.font = `${fs}px ${HAND}`;
  const lines = wrapLines(x, (o.mission || "").toLowerCase(), pw * 0.74, 2);
  lines.forEach((l, k) => x.fillText(l, padX + W * 0.008, top + W * 0.085 + k * fs * 1.12));
  const lastW = Math.min(pw * 0.74, x.measureText(lines[lines.length - 1] || "").width);
  const uy = top + W * 0.085 + (lines.length - 1) * fs * 1.12 + W * 0.022;
  rough.canvas(c).curve(
    [
      [padX, uy],
      [padX + lastW * 0.35, uy + W * 0.006],
      [padX + lastW * 0.7, uy - W * 0.004],
      [padX + lastW + W * 0.01, uy + W * 0.003],
    ],
    { stroke: o.accent || "#FF4F9A", strokeWidth: W * 0.0065, roughness: 1.6, seed: o.seed || 7 },
  );

  // Meta line: name · date · time · #frame
  x.fillStyle = "#6B6570";
  x.font = `${Math.round(W * 0.034)}px ${HAND}`;
  x.fillText(
    `${String(o.who || "").toLowerCase()} · ${o.date || ""}${o.time ? ` · ${o.time}` : ""}${o.frame ? ` · #${pad(o.frame)}` : ""}`,
    padX + W * 0.008,
    H - padX * 1.15,
  );

  // Pink "roll call" sticker.
  x.save();
  x.translate(W - padX - W * 0.12, H - capH * 0.42);
  x.rotate(-0.12);
  const lw = W * 0.215;
  const lh = W * 0.072;
  x.fillStyle = "#FFFFFF";
  x.beginPath();
  x.roundRect(-lw / 2 - W * 0.01, -lh / 2 - W * 0.01, lw + W * 0.02, lh + W * 0.02, lh);
  x.fill();
  x.fillStyle = "#FF4F9A";
  x.beginPath();
  x.roundRect(-lw / 2, -lh / 2, lw, lh, lh / 2);
  x.fill();
  x.fillStyle = "#16151A";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = `800 ${Math.round(W * 0.04)}px ${DISPLAY}`;
  x.fillText("roll call", 0, W * 0.003);
  x.restore();
  return c;
}

// JPEG under ~600 KB, stepping quality down if needed.
export async function toJpeg(c: HTMLCanvasElement): Promise<Blob> {
  const encode = (q: number) =>
    new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", q));
  let q = 0.86;
  let blob = await encode(q);
  while (blob.size > 600_000 && q > 0.5) {
    q -= 0.08;
    blob = await encode(q);
  }
  return blob;
}

// Away card: a square greyscale crop, as in the prototype's awayImage().
// Stripes and the "away" pill are drawn by CSS, so the stored image stays plain.
export function awayCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const S = 360;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const s = Math.max(S / sw, S / sh);
  x.filter = "grayscale(1) contrast(1.15)";
  x.drawImage(img, (S - sw * s) / 2, (S - sh * s) / 2, sw * s, sh * s);
  x.filter = "none";
  const d = x.getImageData(0, 0, S, S);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const L = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2];
    p[i] = p[i + 1] = p[i + 2] = L;
  }
  x.putImageData(d, 0, 0);
  return c;
}
