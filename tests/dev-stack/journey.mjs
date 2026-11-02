// Guest journey on an emulated iPhone against the local Supabase dev stack and Codex's build.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const pw = require("@playwright/test");
const chromiumPath = process.env.CHROMIUM_PATH;
const APP = process.env.APP_URL ?? "http://127.0.0.1:3200", U = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321", K = process.env.SUPABASE_PUBLISHABLE_KEY;
const DB = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const OUT = new URL("../../test-results/dev-stack/", import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
const IMG = new URL("../../prototype/samples/", import.meta.url).pathname + "5jySMpqi6xk.jpg", IMG2 = new URL("../../prototype/samples/", import.meta.url).pathname + "9oUL0x_puck.jpg";
const sql = (q) => execFileSync("psql", [DB, "-Atc", q]).toString().trim();
let fails = 0, n = 0;
const ok = (c, m) => { if (!c) fails++; console.log(c ? "ok  " : "FAIL", m); };
const note = (m) => console.log("note", m);
const shot = async (p, name) => { await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}${String(n++).padStart(2, "0")}-${name}.png`, fullPage: true }); };
async function pick(page, clickable, file) { const [fc] = await Promise.all([page.waitForEvent("filechooser"), clickable.click()]); await fc.setFiles(file); }
async function token(ctx) {
  const parts = (await ctx.cookies()).filter((c) => /^sb-.*-auth-token/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name));
  let raw = decodeURIComponent(parts.map((c) => c.value).join(""));
  if (raw.startsWith("base64-")) raw = Buffer.from(raw.slice(7), "base64").toString();
  const s = JSON.parse(raw); return { tok: s.access_token, uid: s.user.id };
}
const rpc = async (tok, fn, a) => { const r = await fetch(`${U}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: K, Authorization: `Bearer ${tok}`, "content-type": "application/json" }, body: JSON.stringify(a) }); const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const panel = (p) => p.locator('section[aria-label="Photos waiting to send"]');

const browser = await pw.chromium.launch(chromiumPath ? { executablePath: chromiumPath } : {});
const phone = { ...pw.devices["iPhone 13"] }; delete phone.defaultBrowserType;
const H = await browser.newContext({ viewport: { width: 390, height: 844 } });
const G = await browser.newContext(phone);
const h = await H.newPage(), g = await G.newPage();
for (const p of [h, g]) p.on("pageerror", (e) => console.log("pageerror", e.message));
try {
  // Host signs up in a browser so we can use the host UI later.
  await h.goto(APP + "/sign-in"); await h.getByRole("button", { name: "Continue without email" }).click();
  await h.waitForURL(/welcome/); await h.getByLabel("Your name").fill("Hana"); await h.getByRole("button", { name: "Next" }).click();
  await h.getByRole("button", { name: "Skip for now" }).click(); await h.waitForURL(APP + "/");
  const HOST = await token(H);
  const gid = await rpc(HOST.tok, "create_group", { p_name: "Journey crew", p_display_name: "", p_timezone: "Europe/London", p_other_names: ["Zoe"] });
  const code = sql(`select invite_code from groups where id='${gid}'`);
  const today = sql("select (now() at time zone 'Europe/London')::date");
  const eid = await rpc(HOST.tok, "create_event", { p_group_id: gid, p_type: "night", p_name: "Friday", p_start_date: today, p_end_date: today, p_member_ids: sql(`select string_agg(id::text, ',') from group_members where group_id='${gid}'`).split(",") });
  ok(/^[0-9a-f-]{36}$/.test(eid), "host made a group and a live night out");

  // 1. Invitation, as the host would share it from Details
  await h.goto(`${APP}/events/${eid}/details`);
  const link = await h.locator("input[readonly], input[type=url], .invite input").first().inputValue().catch(() => "");
  ok(link.endsWith(`/join/${code}?event=${eid}`), `Details shows the event invite link (${link.replace(APP, "")})`);
  await shot(h, "host-details-invite");

  // 2. Guest opens it on a phone, signed out
  await g.goto(`${APP}/join/${code}?event=${eid}`); await shot(g, "guest-invite");
  ok(await g.getByRole("heading", { name: "Friday" }).count() === 1, "invite shows the event name before sign-in");
  await g.getByRole("button", { name: "Continue without email" }).click();
  await g.getByLabel(/your name/i).fill("Gus"); await shot(g, "guest-name");
  await g.getByRole("button", { name: "Join event" }).click();
  await g.waitForURL(/welcome\?step=alerts/); await shot(g, "guest-alerts");
  ok(await g.getByText(/home screen/i).count() > 0, "iPhone guest is told alerts need the home screen");
  await g.getByRole("button", { name: "Skip for now" }).click();
  await g.waitForURL(new RegExp(`/events/${eid}$`)); await shot(g, "guest-event");
  const GUEST = await token(G);
  const gm = sql(`select id from group_members where group_id='${gid}' and user_id='${GUEST.uid}'`);
  ok(sql(`select count(*) from event_members where event_id='${eid}' and member_id='${gm}'`) === "1", "guest landed on the event and is on it");
  if (await g.getByRole("button", { name: "Got it" }).count()) await g.getByRole("button", { name: "Got it" }).click();

  // 3. Capture, online
  await pick(g, g.locator(".mission button.shutter").first(), IMG);
  await g.getByText("Added. It develops at the reveal.").waitFor({ timeout: 30000 });
  ok(sql(`select count(*) from photos where member_id='${gm}'`) === "1", "challenge photo saved online");

  // 4. Failed upload, reload, recovery
  await g.route("**/storage/v1/object/photos/**", (r) => r.abort("failed"));
  await pick(g, g.locator(".mission button.shutter").first(), IMG2);
  await g.getByText(/Saved on this device/).first().waitFor({ timeout: 30000 });
  await panel(g).waitFor(); await shot(g, "guest-upload-failed");
  ok(sql(`select count(*) from photos where member_id='${gm}'`) === "1", "failed upload: nothing saved on the server yet");
  await g.reload(); await panel(g).waitFor({ timeout: 15000 });
  ok(await panel(g).getByText(/Couldn't send yet|Waiting to send|Uploading/).count() > 0, "after reload the photo is still waiting on the device");
  await g.waitForTimeout(2000);
  ok(sql(`select count(*) from photos where member_id='${gm}'`) === "1", "automatic retry while still offline doesn't save anything");
  await g.unroute("**/storage/v1/object/photos/**");
  const retry = panel(g).getByRole("button", { name: "Retry" });
  if (await retry.isEnabled().catch(() => false)) await retry.click().catch(() => {});
  await panel(g).waitFor({ state: "detached", timeout: 40000 });
  ok(sql(`select count(*) from photos where member_id='${gm}'`) === "2", "Retry sends it: 2 photos");
  ok(sql(`select count(*) from storage.objects where bucket_id='photos' and name like '${eid}/${gm}/%'`) === "2", "no duplicate files in Storage");

  // 5. Roll Call answer whose response is lost
  const HM = sql(`select id from group_members where group_id='${gid}' and user_id='${HOST.uid}'`);
  await h.goto(`${APP}/events/${eid}`);
  if (await h.getByRole("button", { name: "Got it" }).count()) await h.getByRole("button", { name: "Got it" }).click();
  await h.locator(".callbtn").click(); await shot(h, "host-call-sheet");
  await pick(h, h.locator(".sheet button.shutter"), IMG);
  await h.getByText(/Roll Call started/).waitFor({ timeout: 30000 });
  const call1 = sql(`select id from roll_calls where event_id='${eid}' order by called_at desc limit 1`);
  await g.reload(); await g.locator(".alert").waitFor({ timeout: 15000 }); await shot(g, "guest-alert");
  let lost = 0;
  await g.route("**/rest/v1/rpc/answer_roll", async (r) => { if (lost++ === 0) { await r.fetch(); await r.abort("failed"); } else await r.continue(); });
  await pick(g, g.locator(".alert button.shutter"), IMG2);
  await g.getByText(/See waiting photos above/).first().waitFor({ timeout: 30000 });
  ok(sql(`select count(*) from photos where roll_call_id='${call1}' and member_id='${gm}'`) === "1", "lost response: the server did save the answer");
  await shot(g, "guest-answer-lost-response");
  // Auto-retry runs on load and every 30s; reload to trigger it.
  await g.reload(); await g.waitForTimeout(6000);
  ok(await panel(g).count() === 0, "reconciled on reload: the waiting photo clears");
  ok(sql(`select count(*) from photos where roll_call_id='${call1}' and member_id='${gm}'`) === "1", "still one answer, no duplicate");
  await g.unroute("**/rest/v1/rpc/answer_roll");

  // 6. Guest's own call fails to send: manual retry only
  sql(`update roll_calls set called_at = called_at - interval '2 minutes' where event_id='${eid}'`);
  await g.reload();
  await g.route("**/rest/v1/rpc/call_roll", (r) => r.abort("failed"));
  await g.locator(".callbtn").click(); await pick(g, g.locator(".sheet button.shutter"), IMG);
  await g.getByText(/Call status isn't confirmed/).waitFor({ timeout: 30000 }); await shot(g, "guest-call-unsent");
  await g.unroute("**/rest/v1/rpc/call_roll");
  const before = sql(`select count(*) from roll_calls where event_id='${eid}'`);
  await g.reload(); await g.waitForTimeout(35000);
  ok(sql(`select count(*) from roll_calls where event_id='${eid}'`) === before, "an unsent call is never retried automatically (35s, after reload)");
  await panel(g).getByRole("button", { name: "Retry" }).click();
  await panel(g).waitFor({ state: "detached", timeout: 30000 });
  ok(Number(sql(`select count(*) from roll_calls where event_id='${eid}'`)) === Number(before) + 1, "manual Retry starts the call once");

  // 7. A call refused by the one-minute guard
  await g.reload(); if (await g.locator(".alert").count()) await g.getByRole("button", { name: "Not now" }).click();
  const callBtn = g.locator(".callbtn");
  note(`straight after a call, guest's Call roll button is ${await callBtn.isDisabled() ? "disabled" : "enabled"}: "${await g.locator(".rc-card p.small").first().innerText()}"`);
  // Simulate a race: the page thinks calling is allowed, the server refuses (another call landed first).
  sql(`update roll_calls set called_at = called_at - interval '2 minutes' where event_id='${eid}'`);
  await g.reload(); if (await g.locator(".alert").count()) await g.getByRole("button", { name: "Not now" }).click();
  await g.locator(".callbtn").click();
  const racePid = crypto.randomUUID();
  const raceCall = await rpc(HOST.tok, "call_roll", { p_event_id: eid, p_photo_id: racePid, p_storage_path: `${eid}/${HM}/${racePid}.jpg`, p_frame: 9, p_recipients: null });
  await pick(g, g.locator(".sheet button.shutter"), IMG);
  await g.getByText(/Call status isn't confirmed|Saved on this device/).first().waitFor({ timeout: 30000 });
  await panel(g).waitFor(); await shot(g, "guest-call-guarded");
  const guardedRetry = await panel(g).getByRole("button", { name: "Retry" }).count();
  const guardedMsg = await panel(g).locator("p.small[role=status]").first().innerText();
  note(`call refused by the 1-minute guard -> panel says "${guardedMsg}", Retry button: ${guardedRetry ? "yes" : "NO"}`);
  ok(guardedRetry > 0, "a call refused only by the one-minute guard can be retried");
  globalThis.guardBug = guardedRetry === 0;
  // A minute later the same photo goes through as one call. (Drop the host's
  // race call first so the shared budget isn't what stops it.)
  sql(`delete from roll_calls where id='${raceCall}'`);
  sql(`update roll_calls set called_at = called_at - interval '2 minutes' where event_id='${eid}'`);
  const beforeGuard = Number(sql(`select count(*) from roll_calls where event_id='${eid}'`));
  if (guardedRetry) { await panel(g).getByRole("button", { name: "Retry" }).click(); await panel(g).waitFor({ state: "detached", timeout: 30000 }); }
  ok(Number(sql(`select count(*) from roll_calls where event_id='${eid}'`)) === beforeGuard + 1, "after the minute, Retry starts that call once");

  // 8. Expired: queued answer that reaches the server after the window
  sql(`update roll_calls set called_at = called_at - interval '2 minutes' where event_id='${eid}'`);
  const hp = crypto.randomUUID();
  const made = await rpc(HOST.tok, "call_roll", { p_event_id: eid, p_photo_id: hp, p_storage_path: `${eid}/${HM}/${hp}.jpg`, p_frame: 10, p_recipients: null });
  ok(/^[0-9a-f-]{36}$/.test(made), "host starts a call for the expiry test");
  const call2 = sql(`select id from roll_calls where event_id='${eid}' order by called_at desc limit 1`);
  sql(`update roll_calls set called_at = now() - interval '14 minutes' where id='${call2}'`);
  await g.reload(); await g.locator(".alert, .ask").first().waitFor({ timeout: 15000 });
  await G.setOffline(true);
  const shootBtn = (await g.locator(".alert").count()) ? g.locator(".alert button.shutter") : g.locator(".ask button.shutter");
  await pick(g, shootBtn, IMG2);
  await g.getByText(/See waiting photos above/).first().waitFor({ timeout: 30000 });
  sql(`update roll_calls set called_at = now() - interval '16 minutes' where id='${call2}'`);
  await G.setOffline(false);
  // Coming back online retries replies automatically; click Retry only if it hasn't yet.
  await g.waitForTimeout(3000);
  const r8 = panel(g).getByRole("button", { name: "Retry" });
  if (await r8.count()) await r8.click().catch(() => {});
  await panel(g).getByText(/closed/i).waitFor({ timeout: 30000 }); await shot(g, "guest-answer-expired");
  const expiredMsg = await panel(g).innerText();
  ok(/closed/i.test(expiredMsg) && await panel(g).getByRole("button", { name: "Retry" }).count() === 0, "answer that arrives after 15 min is refused, Retry hidden");
  const [dl] = await Promise.all([g.waitForEvent("download"), panel(g).getByRole("button", { name: "Keep a copy" }).first().click()]);
  ok(!!dl, `"Keep a copy" downloads the original (${dl.suggestedFilename()})`);

  // 9. Host extras
  sql(`update roll_calls set called_at = called_at - interval '2 minutes' where event_id='${eid}'`);
  await g.reload(); if (await g.locator(".alert").count()) await g.getByRole("button", { name: "Not now" }).click();
  ok(await g.locator(".callbtn").isDisabled() && /host can start an extra/i.test(await g.locator(".rc-card").innerText()), "guest: shared calls used up, says only the host can add one");
  await shot(g, "guest-budget-used");
  await h.reload(); if (await h.locator(".alert").count()) await h.getByRole("button", { name: "Not now" }).click();
  await h.locator(".callbtn").click(); await shot(h, "host-extra-confirm");
  ok(await h.getByText("All shared calls are used. Start an extra as the host?").count() === 1, "host is asked to confirm an extra");
  await pick(h, h.locator(".sheet button.shutter"), IMG);
  await h.getByText(/Roll Call started/).waitFor({ timeout: 30000 });
  ok(sql(`select extra from roll_calls where event_id='${eid}' order by called_at desc limit 1`) === "t", "host extra recorded as extra");

  // 10. Reveal
  sql(`update events set revealed_at_override = now() - interval '1 minute' where id='${eid}'`);
  await g.reload(); await g.waitForTimeout(3500); await shot(g, "guest-reveal");
  const imgs = await g.locator(".ph img").count();
  ok(imgs >= 3, `guest sees the reveal (${imgs} prints)`);
  ok(await panel(g).count() === 1, "the expired photo is still offered on the device after the reveal");
  // Late joiner after reveal
  const L = await browser.newContext(phone); const l = await L.newPage();
  await l.goto(`${APP}/join/${code}?event=${eid}`); await shot(l, "late-invite-revealed");
  ok(await l.getByText("This event has revealed").count() === 1, "invite after the reveal says so, no join form");
  console.log(JSON.stringify({ eid, gid, host: HOST.uid, guest: GUEST.uid }));
} catch (e) { fails++; console.log("ERROR", e.message.split("\n")[0]); await shot(g, "err-guest"); await shot(h, "err-host"); }
await browser.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
