// Server-rule checks against the local Supabase dev stack, as real users.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
const U = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321", K = process.env.SUPABASE_PUBLISHABLE_KEY;
const DB = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q) => execFileSync("psql", [DB, "-Atc", q]).toString().trim();
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log(c ? "ok  " : "FAIL", m); };
async function call(tok, path, body, method = "POST") {
  const r = await fetch(U + path, { method, headers: { apikey: K, Authorization: `Bearer ${tok ?? K}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, data: j };
}
const rpc = (tok, fn, a) => call(tok, `/rest/v1/rpc/${fn}`, a);
async function user(name) {
  const r = await fetch(`${U}/auth/v1/signup`, { method: "POST", headers: { apikey: K, "content-type": "application/json" }, body: "{}" });
  const j = await r.json(); const u = { tok: j.access_token, uid: j.user.id, name };
  await rpc(u.tok, "set_my_name", { p_name: name }); return u;
}
const today = sql("select (now() at time zone 'Europe/London')::date");
const roll = async (u, eid, mid, recipients = null) => {
  const pid = randomUUID();
  const r = await rpc(u.tok, "call_roll", { p_event_id: eid, p_photo_id: pid, p_storage_path: `${eid}/${mid}/${pid}.jpg`, p_frame: 1, p_recipients: recipients });
  return { ...r, pid };
};
const ageCalls = (eid, mins) => sql(`update roll_calls set called_at = called_at - interval '${mins} minutes' where event_id = '${eid}'`);

const host = await user("Host"), guest = await user("Guest"), other = await user("Other"), outsider = await user("Outsider");
const gid = (await rpc(host.tok, "create_group", { p_name: "Dev test", p_display_name: "", p_timezone: "Europe/London", p_other_names: [] })).data;
const code = sql(`select invite_code from groups where id='${gid}'`);
await rpc(other.tok, "join_group", { p_code: code, p_display_name: null });
const memberOf = (u) => sql(`select id from group_members where group_id='${gid}' and user_id='${u.uid}'`);
const eid = (await rpc(host.tok, "create_event", { p_group_id: gid, p_type: "night", p_name: "Live", p_start_date: today, p_end_date: today, p_member_ids: [memberOf(host), memberOf(other)] })).data;
const otherGroup = (await rpc(outsider.tok, "create_group", { p_name: "Elsewhere", p_display_name: "", p_timezone: "Europe/London", p_other_names: ["Zed"] })).data;
const otherEvent = (await rpc(outsider.tok, "create_event", { p_group_id: otherGroup, p_type: "night", p_name: "Theirs", p_start_date: today, p_end_date: today, p_member_ids: sql(`select string_agg(id::text, ',') from group_members where group_id='${otherGroup}'`).split(",") })).data;
if (!/^[0-9a-f-]{36}$/.test(otherEvent)) throw new Error("setup: other event not created " + JSON.stringify(otherEvent));

console.log("-- invitations");
let r = await rpc(null, "event_invite_preview", { p_code: code, p_event_id: eid });
ok(r.status === 200 && r.data.length === 1 && r.data[0].name === "Live" && !("recipients" in r.data[0]), "signed-out preview shows the event, no participant data");
r = await rpc(null, "event_invite_preview", { p_code: code, p_event_id: otherEvent });
ok(r.status === 200 && r.data.length === 0, "a valid code can't preview another group's event");
r = await rpc(null, "event_invite_preview", { p_code: "wrongcode1", p_event_id: eid });
ok(r.data.length === 0, "wrong code previews nothing");
r = await rpc(null, "join_event_invite", { p_code: code, p_event_id: eid, p_display_name: "Anon" });
ok(r.status >= 400, `signed-out join refused (${r.status})`);
r = await rpc(guest.tok, "join_event_invite", { p_code: code, p_event_id: otherEvent, p_display_name: "Guest" });
ok(r.status >= 400 && sql(`select count(*) from group_members where user_id='${guest.uid}'`) === "0", "code for group A can't join group B's event");
r = await rpc(guest.tok, "join_event_invite", { p_code: code, p_event_id: eid, p_display_name: "Guest" });
ok(r.status === 200 && r.data === eid, "guest joins group and event in one step");
const [a, b] = await Promise.all([1, 2].map(() => rpc(guest.tok, "join_event_invite", { p_code: code, p_event_id: eid, p_display_name: "Guest" })));
ok(a.status === 200 && b.status === 200, `double-tap join is safe (${a.status}/${b.status})`);
ok(sql(`select count(*) from group_members where group_id='${gid}' and user_id='${guest.uid}'`) === "1" && sql(`select count(*) from event_members where event_id='${eid}' and member_id='${memberOf(guest)}'`) === "1", "one group row and one event row after retries");

console.log("-- calls and host extras");
const gm = memberOf(guest), hm = memberOf(host), om = memberOf(other);
r = await roll(guest, eid, gm); ok(r.status === 200, "guest starts shared call 1");
const firstCall = r.data, firstPid = r.pid;
const dup = await rpc(guest.tok, "call_roll", { p_event_id: eid, p_photo_id: firstPid, p_storage_path: `${eid}/${gm}/${firstPid}.jpg`, p_frame: 1, p_recipients: null });
ok(dup.status === 200 && dup.data === firstCall && sql(`select count(*) from roll_calls where event_id='${eid}'`) === "1", "retrying the same call photo returns the same call, budget used once");
r = await roll(other, eid, om); ok(r.status >= 400 && r.data.code === "RC429" && /just started/.test(r.data.message), `one-minute guard (${r.data.code}: ${r.data.message})`);
ageCalls(eid, 2);
const both = await Promise.all([roll(guest, eid, gm), roll(other, eid, om)]);
ok(both.filter((x) => x.status === 200).length === 1, `two people calling at once: exactly one call starts (${both.map((x) => x.status)})`);
ageCalls(eid, 2);
r = await roll(host, eid, hm); ok(r.status === 200, "shared call 3");
ageCalls(eid, 2);
r = await roll(guest, eid, gm); ok(r.status >= 400 && /All shared calls used/.test(r.data.message), "guest blocked after the shared budget");
r = await roll(host, eid, hm); ok(r.status === 200 && sql(`select extra from roll_calls where id='${r.data}'`) === "t", "host starts an extra");
r = await roll(host, eid, hm); ok(r.status >= 400 && /just started/.test(r.data.message), "host extras still respect the one-minute guard");
ageCalls(eid, 2);
r = await roll(host, eid, hm); ok(r.status === 200, "host extras have no cap (second extra)");
r = await rpc(guest.tok, "ask_extra", { p_event_id: eid });
ok(r.status >= 400, `legacy ask_extra refused: "${r.data.message}"`);

console.log("-- answers: permissions, duplicates, windows");
ageCalls(eid, 2);
const c = await roll(host, eid, hm, [gm]); // only for guest
r = await rpc(other.tok, "begin_roll_answer", { p_roll_call_id: c.data, p_photo_id: randomUUID() });
ok(r.status >= 400 && r.data.code === "42501", "someone the call wasn't for can't begin an answer");
r = await rpc(outsider.tok, "begin_roll_answer", { p_roll_call_id: c.data, p_photo_id: randomUUID() });
ok(r.status >= 400, "outsider can't begin an answer");
r = await call(guest.tok, "/rest/v1/roll_answer_attempts?select=*", null, "GET");
ok(r.status >= 400, `answer attempts table isn't exposed (${r.status})`);
const ap = randomUUID();
ok((await rpc(guest.tok, "begin_roll_answer", { p_roll_call_id: c.data, p_photo_id: ap })).status === 204, "guest begins an answer");
ok((await rpc(guest.tok, "begin_roll_answer", { p_roll_call_id: c.data, p_photo_id: ap })).status === 204, "beginning again is idempotent");
r = await rpc(host.tok, "begin_roll_answer", { p_roll_call_id: c.data, p_photo_id: ap });
ok(r.status >= 400, "someone else can't reuse the guest's attempt id");
const ans = () => rpc(guest.tok, "answer_roll", { p_roll_call_id: c.data, p_photo_id: ap, p_storage_path: `${eid}/${gm}/${ap}.jpg`, p_frame: 2 });
const [x1, x2] = await Promise.all([ans(), ans()]);
console.log("   detail:", x1.status, JSON.stringify(x1.data), x2.status, JSON.stringify(x2.data), "photos:", sql(`select count(*) from photos where roll_call_id='${c.data}' and member_id='${gm}'`));
ok([x1, x2].every((x) => x.status === 200) && sql(`select count(*) from photos where roll_call_id='${c.data}' and member_id='${gm}'`) === "1", "two simultaneous answer retries make one photo");
const second = randomUUID();
await rpc(guest.tok, "begin_roll_answer", { p_roll_call_id: c.data, p_photo_id: second });
r = await rpc(guest.tok, "answer_roll", { p_roll_call_id: c.data, p_photo_id: second, p_storage_path: `${eid}/${gm}/${second}.jpg`, p_frame: 3 });
ok(r.status >= 400 && r.data.code === "23505", "a second, different answer to the same call is refused");

ageCalls(eid, 2);
const late = await roll(host, eid, hm, [gm]);
sql(`update roll_calls set called_at = now() - interval '16 minutes' where id='${late.data}'`);
r = await rpc(guest.tok, "begin_roll_answer", { p_roll_call_id: late.data, p_photo_id: randomUUID() });
ok(r.status >= 400 && /closed/.test(r.data.message), "can't begin an answer 16 minutes after the call");
sql(`update roll_calls set called_at = now() - interval '14 minutes' where id='${late.data}'`);
const lp = randomUUID();
await rpc(guest.tok, "begin_roll_answer", { p_roll_call_id: late.data, p_photo_id: lp });
sql(`update roll_calls set called_at = called_at - interval '9 minutes' where id='${late.data}'; update private.roll_answer_attempts set started_at = started_at - interval '9 minutes' where photo_id='${lp}'`);
r = await rpc(guest.tok, "answer_roll", { p_roll_call_id: late.data, p_photo_id: lp, p_storage_path: `${eid}/${gm}/${lp}.jpg`, p_frame: 4 });
ok(r.status === 200 && r.data.late === true, "begun at 14 min, finished 9 min later (23 min after the call): accepted, tagged late");
ageCalls(eid, 2);
const exp = await roll(host, eid, hm, [gm]);
const ep = randomUUID();
await rpc(guest.tok, "begin_roll_answer", { p_roll_call_id: exp.data, p_photo_id: ep });
sql(`update private.roll_answer_attempts set started_at = started_at - interval '11 minutes' where photo_id='${ep}'`);
r = await rpc(guest.tok, "answer_roll", { p_roll_call_id: exp.data, p_photo_id: ep, p_storage_path: `${eid}/${gm}/${ep}.jpg`, p_frame: 5 });
ok(r.status >= 400 && /upload window ended/.test(r.data.message), "upload grace expires after 10 minutes");
ageCalls(eid, 2);
const early = await roll(host, eid, hm, [gm]);
const gp = randomUUID();
await rpc(guest.tok, "begin_roll_answer", { p_roll_call_id: early.data, p_photo_id: gp });
sql(`update roll_calls set called_at = called_at - interval '9 minutes' where id='${early.data}'; update private.roll_answer_attempts set started_at = started_at - interval '9 minutes' where photo_id='${gp}'`);
r = await rpc(guest.tok, "answer_roll", { p_roll_call_id: early.data, p_photo_id: gp, p_storage_path: `${eid}/${gm}/${gp}.jpg`, p_frame: 6 });
console.log(`note: begun at 0 min, finished 9 min after the call -> late=${r.data.late} (the server can't tell when the shot was taken)`);

console.log("-- reveal");
sql(`update events set revealed_at_override = now() - interval '1 minute' where id='${eid}'`);
const newbie = await user("Late");
r = await rpc(newbie.tok, "join_event_invite", { p_code: code, p_event_id: eid, p_display_name: "Late" });
ok(r.status >= 400 && /revealed/.test(r.data.message) && sql(`select count(*) from group_members where user_id='${newbie.uid}'`) === "0", "joining after the reveal is refused and leaves no group membership");
r = await rpc(newbie.tok, "event_invite_preview", { p_code: code, p_event_id: eid });
ok(r.data[0]?.revealed === true, "preview says it's revealed");
r = await rpc(guest.tok, "begin_roll_answer", { p_roll_call_id: early.data, p_photo_id: randomUUID() });
ok(r.status >= 400, "no new answers after the reveal");
r = await rpc(guest.tok, "answer_roll", { p_roll_call_id: early.data, p_photo_id: gp, p_storage_path: `${eid}/${gm}/${gp}.jpg`, p_frame: 6 });
ok(r.status >= 400, `retrying an already-saved answer after the reveal errors (${r.data.code}), client must reconcile via the photos lookup`);
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
