// Repro: capture while the phone has no signal. What does the guest see?
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pw = require("@playwright/test");
const chromiumPath = process.env.CHROMIUM_PATH;
const APP = process.env.APP_URL ?? "http://127.0.0.1:3200", U = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321", K = process.env.SUPABASE_PUBLISHABLE_KEY;
const DB = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q) => execFileSync("psql", [DB, "-Atc", q]).toString().trim();
const OUT = new URL("../../test-results/dev-stack/", import.meta.url).pathname;
async function token(ctx) { const parts = (await ctx.cookies()).filter((c) => /^sb-.*-auth-token/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name)); let raw = decodeURIComponent(parts.map((c) => c.value).join("")); if (raw.startsWith("base64-")) raw = Buffer.from(raw.slice(7), "base64").toString(); const s = JSON.parse(raw); return { tok: s.access_token, uid: s.user.id }; }
const rpc = async (tok, fn, a) => (await fetch(`${U}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: K, Authorization: `Bearer ${tok}`, "content-type": "application/json" }, body: JSON.stringify(a) })).json();
const b = await pw.chromium.launch(chromiumPath ? { executablePath: chromiumPath } : {});
const phone = { ...pw.devices["iPhone 13"] }; delete phone.defaultBrowserType;
const G = await b.newContext(phone); const g = await G.newPage();
g.on("framenavigated", (f) => { if (f === g.mainFrame()) console.log("navigated:", f.url().replace(APP, "")); });
g.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text().slice(0, 140)); });
await g.goto(APP + "/sign-in"); await g.getByRole("button", { name: "Continue without email" }).click();
await g.waitForURL(/welcome/); await g.getByLabel("Your name").fill("Off"); await g.getByRole("button", { name: "Next" }).click();
await g.getByRole("button", { name: "Skip for now" }).click(); await g.waitForURL(APP + "/");
const T = await token(G);
const gid = await rpc(T.tok, "create_group", { p_name: "Offline", p_display_name: "", p_timezone: "Europe/London", p_other_names: ["Pal"] });
const today = sql("select (now() at time zone 'Europe/London')::date");
const eid = await rpc(T.tok, "create_event", { p_group_id: gid, p_type: "night", p_name: "No signal", p_start_date: today, p_end_date: today, p_member_ids: sql(`select string_agg(id::text, ',') from group_members where group_id='${gid}'`).split(",") });
await g.goto(`${APP}/events/${eid}`); if (await g.getByRole("button", { name: "Got it" }).count()) await g.getByRole("button", { name: "Got it" }).click();
console.log("-- going offline, then shooting the challenge");
await G.setOffline(true);
const [fc] = await Promise.all([g.waitForEvent("filechooser"), g.locator(".mission button.shutter").first().click()]);
await fc.setFiles(new URL("../../prototype/samples/", import.meta.url).pathname + "5jySMpqi6xk.jpg");
for (const t of [1, 3, 6, 10]) { await g.waitForTimeout(t === 1 ? 1000 : (t - [1, 3, 6, 10][[1, 3, 6, 10].indexOf(t) - 1]) * 1000); const txt = (await g.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 160); console.log(`${t}s url=${g.url().replace(APP, "")} text="${txt}"`); }
await g.screenshot({ path: OUT + "offline-after-capture.png" });
const errorPage = g.url().startsWith("chrome-error");
console.log(errorPage ? "FAIL offline: the app was replaced by the browser error page" : "ok   offline: the app stays on screen with the photo waiting");
console.log("-- back online");
await G.setOffline(false); await g.waitForTimeout(6000);
const saved = sql(`select count(*) from photos where event_id='${eid}'`);
console.log(saved === "1" ? "ok   back online: the waiting photo sent itself" : `FAIL back online: ${saved} photos saved`);
console.log(`url=${g.url().replace(APP, "")} text="${(await g.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 160)}"`);
await b.close();
