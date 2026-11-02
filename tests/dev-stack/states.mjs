// Each state of the guest and host journey on an emulated iPhone: screenshots
// at 390px and a 320x568 first screen, plus checks on what each state puts
// first, focus, and which stock sample images load (only the example may).
// Usage: OUT_NAME=after node tests/dev-stack/states.mjs
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const pw = require("@playwright/test");
const APP = process.env.APP_URL ?? "http://127.0.0.1:3200", U = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321", K = process.env.SUPABASE_PUBLISHABLE_KEY;
const DB = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const OUT = new URL(`../../test-results/states-${process.env.OUT_NAME ?? "now"}/`, import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
const IMG = new URL("../../prototype/samples/5jySMpqi6xk.jpg", import.meta.url).pathname;
const sql = (q) => execFileSync("psql", [DB, "-Atc", q]).toString().trim();
const rpc = async (tok, fn, a) => { const r = await fetch(`${U}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: K, Authorization: `Bearer ${tok}`, "content-type": "application/json" }, body: JSON.stringify(a) }); const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
async function token(ctx) {
  const parts = (await ctx.cookies()).filter((c) => /^sb-.*-auth-token/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name));
  let raw = decodeURIComponent(parts.map((c) => c.value).join(""));
  if (raw.startsWith("base64-")) raw = Buffer.from(raw.slice(7), "base64").toString();
  const s = JSON.parse(raw); return { tok: s.access_token, uid: s.user.id };
}
async function pick(page, clickable, file) { const [fc] = await Promise.all([page.waitForEvent("filechooser"), clickable.click()]); await fc.setFiles(file); }
const report = [];
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log(c ? "ok  " : "FAIL", m); };
const before = (p, a, b) => p.evaluate(([a, b]) => { const x = document.querySelector(a), y = document.querySelector(b); return !!x && !!y && !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING); }, [a, b]);
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
// axe (WCAG 2 A/AA), no sideways scroll at 320px or at 200% zoom (a 195px
// layout on a 390px phone), in light and dark.
async function a11y(p, name) {
  const vp = p.viewportSize();
  const sideways = async (w) => { await p.setViewportSize({ width: w, height: 600 }); await p.waitForTimeout(250); return p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); };
  const s320 = await sideways(320), s195 = await sideways(195);
  await p.setViewportSize(vp);
  ok(s320 <= 0 && s195 <= 0, `${name}: no sideways scroll at 320px (${s320}) or 200% zoom (${s195})`);
  for (const scheme of ["light", "dark"]) {
    await p.emulateMedia({ colorScheme: scheme });
    await p.addScriptTag({ content: AXE });
    const v = await p.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((x) => `${x.id} (${x.nodes.length})`));
    ok(v.length === 0, `${name}: axe ${scheme} ${v.length ? v.join(", ") : "clean"}`);
  }
  await p.emulateMedia({ colorScheme: "light" });
}
const demoLinks = (p) => p.locator('a[href="/sample"], a[href="/try"]').count();
let samples = [];
function watch(p) { p.on("request", (r) => { if (/\/prototype\/samples\//.test(r.url())) samples.push(new URL(r.url()).pathname); }); p.on("pageerror", (e) => console.log("pageerror", e.message)); }
async function shot(p, name, { fold = true } = {}) {
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}${name}.png`, fullPage: true });
  const vp = p.viewportSize();
  if (fold) { await p.setViewportSize({ width: 320, height: 568 }); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}${name}-320.png` }); await p.setViewportSize(vp); }
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  report.push({ screen: name, url: p.url().replace(APP, ""), height390: h, samples: [...new Set(samples)] });
  console.log(name, h, samples.length ? `samples: ${[...new Set(samples)].join(" ")}` : "");
  samples = [];
}
const go = async (p, path) => { samples = []; await p.goto(APP + path); await p.waitForLoadState("networkidle").catch(() => {}); };
const dismiss = async (p) => { for (const n of ["Got it", "Not now"]) { const b = p.getByRole("button", { name: n }); if (await b.count()) await b.first().click().catch(() => {}); } };

const browser = await pw.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const phone = { ...pw.devices["iPhone 13"] }; delete phone.defaultBrowserType;
const H = await browser.newContext(phone), G = await browser.newContext(phone);
const h = await H.newPage(), g = await G.newPage(); watch(h); watch(g);
try {
  await go(h, "/"); await shot(h, "01-landing");
  ok(await h.getByRole("link", { name: "See an example" }).getAttribute("href") === "/sample", "landing: the example sits behind a labelled See an example link");
  await a11y(h, "landing");
  ok(await h.locator('a[href="/try"]').count() === 0 && await h.locator("img").count() === 0, "landing: no images and no photo-look demo");
  await go(h, "/sign-in"); await shot(h, "02-sign-in");
  await h.getByRole("button", { name: "Continue without email" }).click();
  await h.waitForURL(/welcome/); samples = []; await h.waitForLoadState("networkidle").catch(() => {}); await shot(h, "03-welcome");
  await h.getByLabel("Your name").fill("Hana Alexandra-Montgomery"); await h.getByRole("button", { name: "Next" }).click();
  await h.getByRole("button", { name: "Skip for now" }).click(); await h.waitForURL(APP + "/");
  samples = []; await h.waitForLoadState("networkidle").catch(() => {}); await shot(h, "04-home-empty");
  ok(await demoLinks(h) === 0 && await h.getByRole("link", { name: "New group" }).count() === 1, "empty home: text plus one action, no example link");
  await go(h, "/groups/new"); await shot(h, "05-group-new");
  const HOST = await token(H);
  const gid = await rpc(HOST.tok, "create_group", { p_name: "The Thursday lot", p_display_name: "", p_timezone: "Europe/London", p_other_names: ["Zoe"] });
  const code = sql(`select invite_code from groups where id='${gid}'`);
  const today = sql("select (now() at time zone 'Europe/London')::date");
  const ids = sql(`select string_agg(id::text, ',') from group_members where group_id='${gid}'`).split(",");
  const eid = await rpc(HOST.tok, "create_event", { p_group_id: gid, p_type: "night", p_name: "Priya's leaving drinks at the Fox", p_start_date: today, p_end_date: today, p_member_ids: ids });
  await go(h, `/groups/${gid}`); await shot(h, "06-group");
  await go(h, `/events/${eid}`); await shot(h, "07-host-event-waiting");
  ok(await before(h, "h1", ".rc-card") && await demoLinks(h) === 0, "waiting: Roll Call follows the title; no demo links");
  await a11y(h, "waiting");

  await go(g, `/join/${code}?event=${eid}`); await shot(g, "08-invite");
  await a11y(g, "invite");
  await g.getByRole("button", { name: "Continue without email" }).click();
  await g.getByLabel(/your name/i).fill("Gus"); await g.getByRole("button", { name: "Join event" }).click();
  await g.waitForURL(/welcome\?step=alerts/); samples = []; await shot(g, "09-alerts");
  await g.getByRole("button", { name: "Skip for now" }).click(); await g.waitForURL(new RegExp(`/events/${eid}$`));
  samples = []; await g.waitForLoadState("networkidle").catch(() => {}); await shot(g, "10-guest-event-waiting");
  await dismiss(g);

  // Host calls roll; guest sees it
  await go(h, `/events/${eid}`); await dismiss(h);
  await h.locator(".callbtn").click(); await shot(h, "11-host-call-sheet", { fold: false });
  await pick(h, h.locator(".sheet button.shutter"), IMG); await h.getByText(/Roll Call started/).waitFor({ timeout: 30000 });
  await go(g, `/events/${eid}`); await g.locator(".alert").waitFor({ timeout: 15000 }); await shot(g, "12-guest-incoming-call");
  ok(await before(g, ".alert", ".rc-card") && await before(g, "h1", ".alert"), "incoming call: right after the title, before Call roll");
  ok(await g.locator(".callbtn.quiet").count() === 1, "incoming call: Call roll steps back to a secondary button");
  ok((await g.locator("main button").first().innerText()).includes("Take photo"), "incoming call: Take photo is the first button in reading order");
  ok(/called roll/.test(await g.locator(".alert h2").innerText()) && /on time until|still counts until/.test(await g.locator(".alert").innerText()), "incoming call: who called and honest timing");
  await a11y(g, "incoming call");
  await g.setViewportSize({ width: 320, height: 568 });
  const box = await g.locator(".alert button.shutter").boundingBox();
  ok(box && box.y + box.height <= 568, `320x568: Take photo is on the first screen (bottom at ${box && Math.round(box.y + box.height)}px)`);
  await g.setViewportSize({ width: 390, height: 664 });
  // Not now holds for that call through a reload; the call stays answerable in the card.
  await g.getByRole("button", { name: "Not now" }).click();
  ok(await g.locator(".alert").count() === 0 && await g.locator(".rc-card .ask button.shutter").count() === 1, "Not now: the call moves into the Roll Call card");
  await g.reload(); await g.locator(".rc-card").waitFor(); await g.waitForTimeout(800);
  ok(await g.locator(".alert").count() === 0 && await g.locator(".ask").count() === 1, "Not now survives a reload");

  // Failed upload
  await g.route("**/storage/v1/object/photos/**", (r) => r.abort("failed"));
  await pick(g, g.locator(".ask button.shutter"), IMG);
  const panel = g.locator('section[aria-label="Photos waiting to send"]');
  await panel.waitFor({ timeout: 30000 }); await shot(g, "13-guest-upload-failed");
  ok(await before(g, "h1", 'section[aria-label="Photos waiting to send"]') && await before(g, 'section[aria-label="Photos waiting to send"]', ".rc-card"), "failed upload: under the title, above the Roll Call card");
  ok(/Your photo for .+'s Roll Call/.test(await panel.innerText()) && await panel.getByRole("button", { name: "Retry" }).isVisible() && await panel.getByRole("button", { name: "Keep a copy" }).isVisible(), "failed upload: says what it is, Retry and Keep a copy");
  ok(await g.locator('details[aria-label="Unsent photos"]').count() === 0, "failed upload: listed once on its own event page");
  await a11y(g, "failed upload");
  await go(h, "/"); 
  await go(g, "/"); await g.locator('details[aria-label="Unsent photos"]').waitFor({ timeout: 10000 }).catch(() => {});
  ok(await g.locator('details[aria-label="Unsent photos"]').count() === 1, "failed upload: other pages show a folded line, so it can still be recovered");
  await shot(g, "13b-guest-home-unsent", { fold: false });
  await go(g, `/events/${eid}`); await panel.waitFor({ timeout: 10000 });
  await g.unroute("**/storage/v1/object/photos/**");
  await g.locator('section[aria-label="Photos waiting to send"]').getByRole("button", { name: "Retry" }).click().catch(() => {});
  await g.locator('section[aria-label="Photos waiting to send"]').waitFor({ state: "detached", timeout: 40000 });
  await go(g, `/events/${eid}`); await shot(g, "14-guest-contributed");
  const card = await g.locator(".rc-card").innerText();
  ok(/You answered .+'s Roll Call/.test(card) && /Everyone's photos open/.test(card), "contributed: confirmation and when photos open");
  await a11y(g, "contributed");
  ok(!/No shots yet|\d+\/\d+ shot/.test(await g.locator("main").innerText()), "contributed: no list of who hasn't shot, no tallies");

  // Reveal
  sql(`update events set revealed_at_override = now() - interval '1 minute' where id='${eid}'`);
  await go(g, `/events/${eid}`); await g.waitForTimeout(3500); await shot(g, "15-guest-revealed");
  ok(await g.locator(".ph img").count() >= 2 && await g.locator(".missed li").count() === 1 && await g.locator(".board .away").count() === 0, "reveal: friends' photos first, the missing person as a small chip");
  await a11y(g, "reveal");
  // Full-size view: focus in, Escape out, focus back on the print.
  await g.locator(".ph").first().focus(); await g.keyboard.press("Enter");
  await g.getByRole("dialog").waitFor();
  ok(await g.evaluate(() => document.activeElement?.textContent) === "Close", "lightbox: focus moves to Close");
  ok(await g.getByRole("dialog").getByRole("link", { name: "Save" }).count() === 1 && await g.getByRole("dialog").getByRole("button", { name: /Report|Delete|Remove/ }).count() > 0, "lightbox: save and delete/report are there");
  await g.keyboard.press("Escape");
  ok(await g.getByRole("dialog").count() === 0 && await g.evaluate(() => document.activeElement?.classList.contains("ph")), "lightbox: Escape closes and focus returns to the print");
  const R = await browser.newContext({ ...phone, reducedMotion: "reduce", storageState: await G.storageState() }); const r = await R.newPage();
  await r.goto(`${APP}/events/${eid}`); await r.locator(".ph img").first().waitFor();
  ok(await r.locator(".ph img").first().evaluate((e) => getComputedStyle(e).filter) === "none", "reduced motion: prints show developed straight away");
  await R.close();
  await go(g, "/"); await shot(g, "16-guest-home");
  ok(await demoLinks(g) === 0, "signed-in home: no example or demo links");
  await go(g, "/sample"); await shot(g, "17-sample");
  await go(g, "/try"); await shot(g, "18-try");
  for (const x of report) ok(x.screen === "17-sample" ? x.samples.length > 0 : x.samples.length === 0, `${x.screen}: ${x.samples.length} stock sample images`);
  console.log(JSON.stringify({ eid, gid }));
} catch (e) { fails++; console.log("ERROR", e.message.split("\n")[0]); await g.screenshot({ path: OUT + "err-g.png", fullPage: true }); await h.screenshot({ path: OUT + "err-h.png", fullPage: true }); }
fs.writeFileSync(OUT + "report.json", JSON.stringify(report, null, 2));
await browser.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
