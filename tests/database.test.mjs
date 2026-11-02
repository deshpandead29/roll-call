import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

let db;
let host, guest, group, event, hostMember, guestMember;
async function query(sql, args = []) { return (await db.query(sql, args)).rows; }
async function as(uid) { await query("select set_config('request.jwt.claim.sub', $1, false)", [uid]); }
async function scalar(sql, args = []) { return Object.values((await query(sql, args))[0])[0]; }
async function reject(sql, args, pattern) { await assert.rejects(() => query(sql, args), pattern); }
const photoPath = (eid, mid, pid) => `${eid}/${mid}/${pid}.jpg`;
const uuid = () => crypto.randomUUID();

before(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  // Supabase-provided schemas and roles; application migrations run unchanged.
  await db.exec(`
    create role anon; create role authenticated;
    create schema extensions; create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner_id text, created_at timestamptz default now());
    alter table storage.objects enable row level security;
  `);
  const root = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(root)).filter((f) => f.endsWith('.sql')).sort()) {
    try { await db.exec(await readFile(new URL(file, root), 'utf8')); }
    catch (error) { throw new Error(`Migration ${file}: ${error.message}`); }
  }
  host = uuid(); guest = uuid();
  await query('insert into auth.users values ($1), ($2)', [host, guest]);
  await as(host);
  group = await scalar("select public.create_group('Test friends', 'Host', 'Europe/London', array['Guest'])");
  hostMember = await scalar('select id from public.group_members where user_id=$1', [host]);
  event = await scalar("select public.create_event($1, 'night', 'Tonight', current_date, current_date, (select array_agg(id) from public.group_members where group_id=$1), null, 'normal')", [group]);
  guestMember = await scalar("select id from public.group_members where group_id=$1 and display_name='Guest'", [group]);
});
after(async () => { await db?.close(); });

test('event invitation validates group, preserves existing identity and joins idempotently', async () => {
  const code = await scalar('select invite_code from public.groups where id=$1', [group]);
  assert.equal((await query('select * from public.event_invite_preview($1,$2)', [code, event]))[0].name, 'Tonight');
  assert.equal((await query('select * from public.event_invite_preview($1,$2)', ['wrong-code', event])).length, 0);
  await as(guest);
  await reject('select public.join_event_invite($1,$2,$3,$4)', ['wrong-code', event, null, guestMember], /invite does not work/);
  assert.equal(await scalar('select public.join_event_invite($1,$2,$3,$4)', [code, event, null, guestMember]), event);
  assert.equal(await scalar('select public.join_event_invite($1,$2)', [code, event]), event);
  assert.equal(await scalar('select count(*)::int from public.event_members where event_id=$1 and member_id=$2', [event, guestMember]), 1);
  await as(null);
  await reject('select public.join_event_invite($1,$2)', [code, event], /Sign in first/);
});

test('shared budget allows repeat callers, blocks rapid repeats, permits only host extras', async () => {
  await as(guest);
  for (let i = 0; i < 3; i++) {
    const pid = uuid();
    const rid = await scalar('select public.call_roll($1,$2,$3,1)', [event, pid, photoPath(event, guestMember, pid)]);
    // Same request after a lost response returns the same call, even during cooldown.
    assert.equal(await scalar('select public.call_roll($1,$2,$3,1)', [event, pid, photoPath(event, guestMember, pid)]), rid);
    const st = await scalar('select private.roll_check($1,$2)', [event, guestMember]);
    assert.equal(st.ok, false);
    assert.match(st.why, /minute/);
    await query("update public.roll_calls set called_at=now()-interval '2 minutes' where event_id=$1", [event]);
  }
  assert.equal(await scalar('select count(*)::int from public.roll_calls where event_id=$1', [event]), 3);
  const guestState = await scalar('select private.roll_check($1,$2)', [event, guestMember]);
  assert.equal(guestState.ok, false); assert.equal(guestState.can_ask, false);
  await as(host);
  const hostState = await scalar('select private.roll_check($1,$2)', [event, hostMember]);
  assert.equal(hostState.ok, true); assert.equal(hostState.extra, true);
  const pid = uuid();
  await scalar('select public.call_roll($1,$2,$3,1)', [event, pid, photoPath(event, hostMember, pid)]);
});

test('answer upload grace uses server start time and retries do not duplicate photos', async () => {
  await as(guest);
  const call = await scalar('select id from public.roll_calls where event_id=$1 and caller_member_id=$2', [event, hostMember]);
  const pid = uuid();
  await query('select public.begin_roll_answer($1,$2)', [call, pid]);
  // Simulate a slow upload: call now appears older than the normal close time.
  await query("update public.roll_calls set called_at=now()-interval '16 minutes' where id=$1", [call]);
  await query("update private.roll_answer_attempts set started_at=now()-interval '3 minutes' where photo_id=$1", [pid]);
  const result = await scalar('select public.answer_roll($1,$2,$3,1)', [call, pid, photoPath(event, guestMember, pid)]);
  assert.equal(result.late, true);
  assert.deepEqual(await scalar('select public.answer_roll($1,$2,$3,1)', [call, pid, photoPath(event, guestMember, pid)]), result);
  assert.equal(await scalar('select count(*)::int from public.photos where id=$1', [pid]), 1);
  await reject('select public.begin_roll_answer($1,$2)', [call, uuid()], /closed/);
});

test('expired and unauthorised attempts cannot bypass the answer window', async () => {
  await as(host);
  const call = await scalar('select id from public.roll_calls where event_id=$1 and caller_member_id=$2 limit 1', [event, guestMember]);
  const pid = uuid();
  await query('select public.begin_roll_answer($1,$2)', [call, pid]);
  await query("update private.roll_answer_attempts set started_at=now()-interval '11 minutes' where photo_id=$1", [pid]);
  await reject('select public.answer_roll($1,$2,$3,1)', [call, pid, photoPath(event, hostMember, pid)], /upload window ended/);
  await as(guest);
  await reject('select public.begin_roll_answer($1,$2)', [call, uuid()], /not for you/);
});

test('revealed events refuse new invite membership and photo answers', async () => {
  await as(host);
  await query('update public.events set revealed_at_override=now() where id=$1', [event]);
  const code = await scalar('select invite_code from public.groups where id=$1', [group]);
  await reject('select public.join_event_invite($1,$2)', [code, event], /has revealed/);
  assert.equal((await query('select * from public.event_invite_preview($1,$2)', [code, event]))[0].revealed, true);
});
