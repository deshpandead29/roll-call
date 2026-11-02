// Invitation -> email sign-in (real code from the local mail catcher) -> join event.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pw = require("@playwright/test");
const chromiumPath = process.env.CHROMIUM_PATH;
const APP = process.env.APP_URL ?? "http://127.0.0.1:3200", U = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321", K = process.env.SUPABASE_PUBLISHABLE_KEY, MAIL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const DB = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q) => execFileSync("psql", [DB, "-Atc", q]).toString().trim();
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? "ok  " : "FAIL", m); };
const rpc = async (tok, fn, a) => { const t = await (await fetch(`${U}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: K, Authorization: `Bearer ${tok}`, "content-type": "application/json" }, body: JSON.stringify(a) })).text(); try { return JSON.parse(t); } catch { return t; } };
// Host via API
const hj = await (await fetch(`${U}/auth/v1/signup`, { method: "POST", headers: { apikey: K, "content-type": "application/json" }, body: "{}" })).json();
await rpc(hj.access_token, "set_my_name", { p_name: "Host" });
const gid = await rpc(hj.access_token, "create_group", { p_name: "Email crew", p_display_name: "", p_timezone: "Europe/London", p_other_names: ["Mo"] });
const today = sql("select (now() at time zone 'Europe/London')::date");
const eid = await rpc(hj.access_token, "create_event", { p_group_id: gid, p_type: "night", p_name: "Email night", p_start_date: today, p_end_date: today, p_member_ids: sql(`select string_agg(id::text, ',') from group_members where group_id='${gid}'`).split(",") });
const code = sql(`select invite_code from groups where id='${gid}'`);
await fetch(`${MAIL}/api/v1/messages`, { method: "DELETE" });
const b = await pw.chromium.launch(chromiumPath ? { executablePath: chromiumPath } : {}); const phone = { ...pw.devices["iPhone 13"] }; delete phone.defaultBrowserType;
const G = await b.newContext(phone); const g = await G.newPage();
const email = `guest${Date.now()}@example.com`;
try {
  await g.goto(`${APP}/join/${code}?event=${eid}`);
  await g.getByRole("link", { name: "Sign in with email" }).click();
  await g.waitForURL(/sign-in/); ok(decodeURIComponent(g.url()).includes(`/join/${code}?event=${eid}`), "sign-in keeps the event invite as its destination");
  await g.getByLabel("Email").fill(email); await g.getByRole("button", { name: "Send code" }).click();
  let msg; for (let i = 0; i < 20 && !msg; i++) { await g.waitForTimeout(1000); const list = await (await fetch(`${MAIL}/api/v1/search?query=to:${encodeURIComponent(email)}`)).json(); msg = list.messages?.[0]; }
  ok(!!msg, "sign-in email arrives");
  const body = await (await fetch(`${MAIL}/api/v1/message/${msg.ID}`)).json();
  const otp = (body.Text || body.HTML).match(/\b(\d{6})\b/)?.[1];
  ok(!!otp, "email contains a 6-digit code");
  await g.getByLabel(/code/i).fill(otp); await g.getByRole("button", { name: /Sign in|Verify|Continue/ }).first().click();
  await g.waitForURL(/\/join\//, { timeout: 15000 });
  ok(g.url().includes(`?event=${eid}`), "after the code, back on the event invite");
  await g.getByLabel(/your name/i).fill("Mail Guest"); await g.getByRole("button", { name: "Join event" }).click();
  await g.waitForURL(/welcome\?step=alerts/); await g.getByRole("button", { name: "Skip for now" }).click();
  await g.waitForURL(new RegExp(`/events/${eid}$`));
  const uid = sql(`select id from auth.users where email='${email}'`);
  ok(sql(`select count(*) from event_members em join group_members m on m.id=em.member_id where em.event_id='${eid}' and m.user_id='${uid}'`) === "1", "email user is on the event");
} catch (e) { fails++; console.log("ERROR", e.message.split("\n")[0]); await g.screenshot({ path: new URL("../../test-results/dev-stack/email-err.png", import.meta.url).pathname, fullPage: true }); }
await b.close(); console.log(fails ? `${fails} FAILED` : "ALL PASSED");
