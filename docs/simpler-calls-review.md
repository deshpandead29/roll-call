# Simplify Roll Call participation and recover interrupted photo uploads

Roll Call previously required guests to navigate group setup, away cards, pace and backing rules before contributing, and an interrupted upload could lose their contribution. This change saves captures on-device, preserves an event destination through joining/sign-in, replaces the call rules with a shared budget and host extras, and reduces onboarding.

**Draft for engineering review. Not deployed; neither migration has been applied to hosted Supabase.** This handoff packages the existing working-copy implementation. Packaging edits are documentation and removal of a trailing blank line in the second migration; no application, migration, test or dependency behavior was changed for the handoff.

## Base and scope

- Repository: `deshpandead29/roll-call`.
- Source branch: `codex/simpler-calls`; target: `main`.
- Starting HEAD: `1ef8a89df65cb8fbc88baf9a3c6b6d50f0d910d2`.
- `git merge-base HEAD origin/main` after fetching `origin/main`: **`1ef8a89df65cb8fbc88baf9a3c6b6d50f0d910d2`**.
- The previously uncommitted implementation is included as one new commit above that history. No rebase, squash, main push, merge or hosted migration is part of this handoff.
- Both new migrations, all four test files, test scripts/dev dependencies, `package.json`, and `package-lock.json` are included. There is no separate Playwright config file; the two browser scripts configure their own fixtures, ephemeral loopback servers and browser launch.

## Four changes and their decisions

### 1. On-device photo persistence and retry

**Behavior:** save the original selected file and its intended destination in IndexedDB before image processing/upload. The recovery panel appears throughout the signed-in app, including after leaving/deleting an event, so rejected captures can still be downloaded. Replies, challenges and recreations retry automatically while the app is open and online. Outgoing calls require manual retry to avoid starting a call unexpectedly after connectivity returns. A queued outgoing call older than five minutes is blocked locally, retaining its file. The server can accept a reply start within the existing two-/15-minute window, then give it ten minutes to finish uploading, provided the event has not revealed.

**Files:** `src/lib/photo-store.ts`, `src/lib/photo-queue.ts`, `src/components/pending-photos.tsx`, `src/components/photo-recovery.tsx`, `src/app/layout.tsx`, `src/app/events/[id]/missions.tsx`, `src/app/events/[id]/recreate.tsx`, `src/app/events/[id]/roll-call.tsx`, `src/lib/capture.ts`, `supabase/migrations/20261102010000_recoverable_answers.sql`. Recovery tests live in `tests/photo-store.test.ts`, `tests/database.test.mjs`, and `tests/browser/photo-recovery.mjs`.

**Decisions where the old brief was silent or differed:** use IndexedDB original-file persistence rather than an in-memory retry or Cache API; no background-sync worker. Choose a ten-minute server-recorded upload grace and a five-minute local age limit for unsent calls. The old deadline was evaluated only when upload finished; now a new-client attempt is timestamped by the server before processing/upload. An offline device does not reserve a timestamp and cannot backdate one using its device clock. Retain expired/rejected originals rather than silently delete them. These are implemented decisions for review, not validated product conclusions.

### 2. Event invitations through sign-in

**Behavior:** Event → Details offers `/join/<group-code>?event=<event-id>`. The server validates code/event correspondence before showing the event name, reveal time/timezone and reveal status. The join form preserves that query in its email-sign-in destination. Joining the group and event happens in one database transaction; the return through optional alert setup leads to `/events/<id>`. Existing group members do not re-enter a name. Already-enrolled guests can open the event. Existing group members can open a revealed album; new event-invite joins after reveal are refused. Group-only links continue to work.

**Files:** `src/app/events/[id]/details/page.tsx`, `src/app/events/[id]/page.tsx`, `src/app/join/[code]/page.tsx`, `src/app/join/[code]/join-form.tsx`, `src/app/welcome/page.tsx`, `supabase/migrations/20261102000000_simpler_calls_and_invites.sql`, `tests/database.test.mjs`, `tests/browser/invitations.mjs`. Existing sign-in/auth destination helpers are reused without changing their implementation.

**Decisions:** reuse the existing group invitation capability plus an event UUID rather than introduce another token/table. Event invitations therefore grant group membership, not event-only membership. Put sharing in event Details; all members who can access Details and the group invite code can share, not only the host. Expose no participant list in the new event-preview RPC. Reject new joins after reveal and direct those guests to request a group invitation. This supersedes the brief's group-only invitation flow.

### 3. Shared call budget, one-minute guard and host extras

**Behavior:** every non-trip event has three shared calls; a trip has `2 × inclusive trip days`, pooled across the whole trip (not a daily reset). Any enrolled member can spend a shared call, including repeatedly. All calls have a one-minute repeat guard. Once the budget is exhausted, only the event's `host_member_id` can start further calls. Host extras have no separate numerical cap, but still observe the guard and require an explicit confirmation in the new UI. The backend checks host eligibility, not proof of UI confirmation.

**Files:** `supabase/migrations/20261102000000_simpler_calls_and_invites.sql`, `src/lib/events.ts`, `src/app/events/[id]/roll-call.tsx`, `src/app/groups/[id]/new-event-form.tsx`, `src/app/events/[id]/edit/edit-event-form.tsx`, `src/app/events/[id]/details/page.tsx`, `src/app/events/[id]/build-reveal.ts`, `tests/database.test.mjs`. The reveal uses the neutral label “extra call” so new host extras are not falsely labelled as backed by the group.

**Explicit departure from CLAUDE.md:** the old brief required Chill/Normal/Chaos, 75/120/180-minute cooldowns, a one-call-per-person rule, reserved honoree calls, and two backing votes for extras. The approved implementation replaced all of those gates with the shared budget, one-minute guard and host extras. It chose three shared birthday calls rather than two plus a reserved honoree call. The birthday honoree still personalises challenges; they no longer get a reserved call. New events store legacy `pace = 'normal'` because the database column is retained. The edit form no longer changes pace; the server ignores all existing pace values.

**Exactly what replaces backing votes:** `private.roll_check` no longer reads `extra_asks` or `extra_backs`; it returns `can_ask = false`, `ask_id = null`, `reserved_total = 0`, `reserved = false`. When shared calls are exhausted it returns `ok = true, extra = true` only for the host. The new client has no ask/back buttons or ask/back Realtime subscriptions. The tables, existing rows, grants and `ask_extra(uuid)` / `back_extra(uuid)` functions are **not dropped or rewritten**. Because the old `ask_extra` consults `can_ask`, it now rejects every new ask with its existing, potentially misleading “You can still call one.” error. `back_extra` can still record a vote on a valid, unexpired old ask, but that vote never unlocks a call. The retained `call_roll` ask-consumption statement matches no row for host extras because `ask_id` is null. These are legacy storage/API remnants, not a working old-client vote path.

**Existing data:** `chill`, `normal` and `chaos` remain stored without conversion, but all events immediately use the new rules after migration. The total budget counts **every existing call**, including historical reserved and backed-extra calls. Some existing events can therefore immediately have no shared calls remaining. Existing photos and call rows are retained; older reserved flags still have their historical reveal labels.

### 4. Onboarding and optional challenges

**Behavior:** onboarding is name → optional alerts, without an away-card selfie step. The profile away-card feature remains. Group/event joining skips a redundant name request when possible. Legacy `step=card` links now land in the alert flow. Introductory text makes challenges optional and explains the real response/slow-upload window. Call feedback no longer claims “N buzzed”; the pre-call count describes eligibility, not confirmed subscription, acceptance or delivery. The call dialog says “Not now” instead of “Later”. Landing copy explains the shared perspective/reveal payoff without promising everyone will respond.

**Files:** `src/app/welcome/page.tsx`, `src/app/welcome/welcome-flow.tsx`, `src/app/join/[code]/join-form.tsx`, `src/app/page.tsx`, `src/app/events/[id]/how-it-works.tsx`, `src/app/events/[id]/roll-call.tsx`; related rule/help documentation in `CLAUDE.md` and `README.md`.

**Decisions:** remove the previously specified away-card onboarding step rather than add another optional screen. Keep alert setup skippable and retain the existing iPhone home-screen instructions, rather than introduce a new installation/auth handoff. Challenges remain available and use the existing assignments/scoring; “optional” changes their presentation, not database requirements. The prototype remains a visual reference, not the authority for the new call policies. The landing headline is a proposed copy choice; it has not been user-tested.

## Migration inventory, safety and compatibility

Apply the pre-existing migration chain first, then these files in filename order. Do not deploy the new client against a backend missing either new migration. No hosted migration or deployment has been performed here.

### `20261102000000_simpler_calls_and_invites.sql`

| Object | Exact change |
| --- | --- |
| `private.roll_check(uuid, uuid) RETURNS jsonb` | Replaced with `CREATE OR REPLACE FUNCTION`. Keeps the existing signature/grants, `STABLE`, `SECURITY DEFINER`, empty search path and JSON shape, but replaces pace/reserved/per-person/backing checks with the policy above. Counts historical calls; host extras are unlimited except for the repeat guard. |
| `public.event_invite_preview(text, uuid)` | New `STABLE SECURITY DEFINER` SQL function, empty search path. Returns `id uuid`, `name text`, `reveal_at timestamptz`, `timezone text`, `revealed boolean` for a matching group invite and event. These are result fields, **not added table columns**. Revokes PUBLIC execution; grants execution to `anon` and `authenticated`. |
| `public.join_event_invite(text, uuid, text DEFAULT NULL, uuid DEFAULT NULL) RETURNS uuid` | New `SECURITY DEFINER` PL/pgSQL function with empty search path. Locks the matching event, refuses a revealed event, invokes existing `join_group`, finds the signed-in member, inserts `event_members(event_id, member_id)` with `ON CONFLICT DO NOTHING`, returns event ID. Revokes execution from PUBLIC and `anon`; grants `authenticated`. |
| Existing tables, columns, constraints and RLS policies | **None added, altered or dropped.** No new tables, indexes, triggers, extensions, schemas or scheduled jobs. Existing function dependencies such as `join_group`, `private.reveal_at`, `private.is_revealed`, and existing RLS policies are not changed. |

**Existing-data safety:** there is no data deletion, schema rewrite or backfill, and no new requirement on old rows. Calls already stored affect the recalculated shared budget as described above. The active product policy changes immediately for all old events, including previously unlimited Chaos events. Preview/join RPCs do not change existing memberships until invoked.

**Run twice? No.** Replacing `roll_check` is repeatable by itself, but the two new functions use plain `CREATE FUNCTION`, so a second raw execution fails because they already exist. Use a migration ledger and one application, with normal transaction/backup/recovery discipline; these files do not contain an explicit transaction wrapper. Do not assume a partially executed raw SQL file can safely be retried unchanged.

**Old-client compatibility:** existing call/state RPC signatures and JSON fields remain, so many basic old call flows still execute. But old pace/one-per-person/reserved descriptions become wrong, ask creation fails, and existing backing votes have no effect. An old host client calling after exhaustion can start a host extra without the new confirmation and may misleadingly describe it as group-backed. There is no backend confirmation token. The new client on an unmigrated backend cannot preview/join event invitations and would display rules inconsistent with the old server. Coordinate backend/client rollout rather than treating the change as transparently backward compatible.

### `20261102010000_recoverable_answers.sql`

| Object | Exact change |
| --- | --- |
| `private.roll_answer_attempts` | New table. `photo_id uuid PRIMARY KEY` (no FK to photos: the attempt precedes its photo row); `roll_call_id uuid NOT NULL REFERENCES public.roll_calls(id) ON DELETE CASCADE`; `member_id uuid NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE`; `started_at timestamptz NOT NULL DEFAULT now()`. The primary key creates its backing index. No additional index. |
| Table RLS/permissions | Enables RLS on `private.roll_answer_attempts`. Adds **no RLS policies**, so clients have no direct row access. Revokes all table privileges from PUBLIC, `anon` and `authenticated`. Only security-definer functions use the table. No existing table policy is altered or dropped. |
| `public.begin_roll_answer(uuid, uuid) RETURNS void` | New `SECURITY DEFINER` function with empty search path. Checks event membership, recipient inclusion and unrevealed event. New attempts must reach the server within 15 minutes of the call. A repeated attempt must match the member and call and remain within ten minutes of its original `started_at`. Existing attempts are not refreshed. Revokes execution from PUBLIC and `anon`, grants `authenticated`. |
| `public.call_roll(uuid, uuid, text, int, uuid[] DEFAULT NULL) RETURNS uuid` | Replaced using the existing signature/security-definer/empty-search-path settings and preserved ACL. After event-row locking and membership validation, returns an already-recorded matching photo's call ID before checking cooldown/budget. Otherwise uses the updated policy and existing call/photo insertion. Prevents a retry with the same photo UUID from creating another call. |
| `public.answer_roll(uuid, uuid, text, int) RETURNS jsonb` | Replaced with its existing signature/security-definer/empty-search-path settings and preserved ACL. Checks caller/recipient/reveal, locks the call row, returns the existing matching answer for the same photo UUID, then enforces the attempt's ten-minute upload grace and uses its server `started_at` for on-time/late classification. Without an attempt, preserves the old finish-time two-/15-minute checks. A second distinct photo for the same member/call is still rejected. |
| Existing tables/columns/policies/functions | No existing table column, constraint, index or policy is changed or dropped. No other function is replaced. No scheduled attempt cleanup, Storage bucket/policy change or new extension is added. |

**Existing-data safety:** creates an initially empty private table, so existing photos/calls do not need a backfill or reservation. Legacy answers without an attempt keep the old timing semantics. Existing RPC ACLs are preserved by replacement. This has been executed against the full migration chain and fixture data in PGlite, not against a populated hosted Supabase instance; operational lock timing, real roles and production data volume remain unverified.

**Run twice? No.** The table and `begin_roll_answer` use plain `CREATE`, so repeat raw execution fails. The two replacement RPC definitions alone are replaceable. No destructive rollback is supplied; do not casually drop the new attempt table while clients are using it.

**Old-client compatibility:** existing call/answer RPC parameters still work. Old clients do not call `begin_roll_answer` and therefore receive no slow-upload grace. New clients require it; on an unmigrated backend replies remain queued with a server error rather than succeeding. The answer RPC still refuses operations after reveal before checking for a prior answer; the new client's preliminary photo lookup can reconcile a prior successful save if RLS still allows it. Removing membership may prevent reconciliation and leave the local file for download.

## Device storage, limits, deletion and duplicates

- **Storage:** IndexedDB only; database `roll-call-photos`, version `1`, object store `pending`, key path `id`. No Cache API or service-worker offline cache/background-sync addition.
- **Key/payload:** `id` is a generated photo UUID. A record contains the original `File`, authenticated account UUID in `owner`, capture metadata (`eventId`, `memberId`, `frame`, name/date/mission/accent/time), destination action (`photo` row metadata, call recipients or answer call ID), device `createdAt`, and optional error/blocked state. No auth token is stored in the queue. The UI filters by owner and sending verifies the active session; this is not encryption or a cryptographic account boundary against other same-origin JavaScript.
- **Allocation:** IndexedDB enqueue commits before upload/processing starts and allocates frame numbers atomically among queued photos for the same owner/event/member. The server's existing frame sequence from other devices/tabs is not globally reserved by this mechanism.
- **Size:** no app-defined item count, byte limit, retention age, storage-estimate check or `navigator.storage.persist()` request. Limits/eviction are browser-defined. Existing `photos` and `negatives` server buckets are limited to 5 MiB; original local files are not limited to that size. Decode/processing can still exhaust device memory. Original files can retain EXIF or other metadata. No application encryption is added.
- **Deletion:** successful row save or reconciliation removes the device record. Explicit confirmed “Delete device copy” also removes it and does not delete an already-saved event photo. Downloading, expiry, rejected permissions, logout, leaving an event and event deletion do not automatically delete the device copy. Logout hides it until the same account returns. Browser/site-data clearing or eviction can remove it independently.
- **Retry triggers:** foreground automatic pass on mounting recovery, browser `online`, and a 30-second interval; only unblocked replies/challenges/recreations. Outgoing calls never automatically retry after their initial send; the user retries them. A blocked item stays downloadable and cannot be retried through the UI. No guarantee of progress while the app is closed/background-suspended or the entire app cannot load offline.
- **Stable identifiers:** every retry uses the same photo UUID and storage path `<eventId>/<memberId>/<photoId>.jpg`. A preliminary `photos` lookup reconciles a previous committed save. Upload uses no overwrite; duplicate-resource/409 responses are accepted as a previous upload. Direct photo inserts reconcile a matching primary-key duplicate. The event lock + matching photo lookup makes `call_roll` idempotent for that UUID. The call lock + matching answer lookup makes `answer_roll` idempotent; the existing uniqueness rule rejects a different second answer for that member/call. An in-memory active set prevents overlapping sends in a single page; it is not a cross-tab lock.
- **Delivery is separate:** a successfully saved call attempts the existing push endpoint on a best-effort basis; no claim of notification delivery is made. A lost request response is reported as unconfirmed, not proof that no call started.

## Environment and Supabase requirements

- No new **production** environment variables or secret values. Existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` remain required for real app operation. Existing optional push/VAPID and cron configuration is unchanged. Never commit `.env` values, `VAPID_PRIVATE_KEY`, `CRON_SECRET` or a service-role key.
- Optional new **test-only** `CHROMIUM_PATH` selects an installed browser; its non-secret value is an executable path, not an application setting.
- Apply both new migrations after the old chain to expose the three new RPCs and new private table. No additional Supabase Auth, Realtime publication, Storage bucket limit, Storage policy, extension or cron setting is introduced. Confirm real default grants/RPC exposure/RLS with a development Supabase project before release. Existing public API schemas are sufficient; do not expose `private`.
- App builds still need Google Fonts network access (`fonts.googleapis.com`, `fonts.gstatic.com`). Tests substitute fonts and service responses and do not require those hosts once dependencies/browser are installed.

## Run the tests

Validated here with Node **24.19.0**, npm **11.9.0**, and system **Chromium 154.0.8037.57** on Linux. From the repository root:

```sh
npm ci
npm test
npm run test:browser
```

`npm test` uses Node's test runner with `tsx`, a fresh in-memory PGlite PostgreSQL/WASM instance plus pgcrypto, Supabase auth/storage schema fixtures, and fake IndexedDB. It needs installed dev dependencies and enough memory/process capability, but **no external database, Docker, Supabase CLI, running app server, environment variables or credentials**. The SQL suite applies every migration in filename order. Fixture `auth.uid()` uses a test setting under the database owner; this is not a comprehensive real Supabase role/RLS integration test.

`npm run test:browser` uses two standalone Playwright/Chromium scripts, esbuild bundles, ephemeral loopback HTTP servers and real browser IndexedDB/image processing. Supabase, Next navigation and fonts are controlled fixtures. It needs permission to bind loopback/listen and launch Chromium. It needs **no database, Docker, Next server, Supabase environment variables or credentials**. It selects `CHROMIUM_PATH`, else `/usr/bin/chromium` if present, else Playwright's installed Chromium. If needed:

```sh
npx playwright install chromium
# Or select a pre-installed executable for this command:
CHROMIUM_PATH=/path/to/chromium npm run test:browser
```

Package/browser installation requires their download hosts and browser OS libraries. This managed image already has Chromium; the test scripts launch it with `--no-sandbox`. On this workspace the execution sandbox must permit child processes/browser launch (the checks ran with the supported command escalation). Test scripts do not load a real `.env` file.

Latest captured outputs follow verbatim; both commands exited 0.

### `npm test`

```text

> roll-call@0.1.0 test
> node --import tsx --test tests/*.test.mjs tests/*.test.ts

✔ event invitation validates group, preserves existing identity and joins idempotently (4790.326803ms)
✔ shared budget allows repeat callers, blocks rapid repeats, permits only host extras (39.952376ms)
✔ answer upload grace uses server start time and retries do not duplicate photos (15.007666ms)
✔ expired and unauthorised attempts cannot bypass the answer window (6.213534ms)
✔ revealed events refuse new invite membership and photo answers (4.033049ms)
✔ photo bytes and reply destination survive closing and reopening storage (23.318349ms)
✔ pending photos are isolated by account and retries update the same entry (4.147249ms)
✔ discard removes only the selected photo after committing storage (2.82346ms)
✔ expired replies remain downloadable until explicitly discarded (1.452681ms)
✔ offline captures receive distinct frame numbers even when saved concurrently (1.977892ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5582.424147
```

### `npm run test:browser`

```text

> roll-call@0.1.0 test:browser
> node tests/browser/photo-recovery.mjs && node tests/browser/invitations.mjs

Browser checks passed: offline retention, reload recovery, real image processing, lost-response reconciliation, no duplicate writes, expired-photo retention, account isolation, manual-only call retries.
Browser invitation checks passed: event destination survives email sign-in links, guest joining reaches the event via alert setup, existing group members join without re-entering a name.
```

Additional checks rerun during packaging: `npm run typecheck`, `npm run lint`, and `npm run build` all passed with exit status 0. Lint produced no warnings. The production build compiled successfully and generated all 16 static pages. No hosted database command is part of any listed test.

## Known gaps, uncertainties and review priorities

1. **Live integration/physical devices:** hosted Supabase migrations, real Auth/email-link round trips, actual Storage/RLS/default grants, Realtime and phone push delivery have not been verified. Earlier local Supabase startup failed while downloading its database image with `Forbidden`; do not infer live-stack readiness from PGlite. Browser offline behavior uses controlled failed service responses, not a full physical-device network cut. No Safari/iOS/Android or HEIC-device walkthrough was completed.
2. **Production migration rehearsal:** data is retained structurally, but existing production data volumes, active clients, lock contention, rollback/recovery and a mixed-version deployment have not been exercised. The new policy intentionally overrides stored pace values and existing vote entitlements; get explicit product/reviewer agreement before release.
3. **Storage durability/UX:** no app quota, storage-persistence permission, encryption, automatic retention cleanup or device-space pressure test. Site-data clearing, browser eviction and private-browsing restrictions can lose local copies. If the app cannot load offline, recovery waits until it can load again. IndexedDB entries remain on the origin after logout, though UI/sending is scoped to the signed-in owner. Cross-tab and cross-device frame numbering/concurrent sends are not fully tested.
4. **Retries and side effects:** network recovery is foreground-only. Duplicate prevention covers the stable UUID, not two separately captured files. A browser tab can close between server save and local cleanup; reconciliation requires the same account to retain read access. Storage orphan cleanup versus long pending uploads, partial negative upload failures and cross-tab races need live validation. Negatives and push remain best effort. Discard deletes only the local record; a previously uploaded orphan may remain for existing server cleanup.
5. **Answer attempts:** the new private attempt table has no age-based cleanup job or per-call attempt limit; rows persist until their referenced member/call is deleted. A new attempt can reserve time before processing, but not while disconnected. Reveal still ends shooting even if a ten-minute upload grace was previously reserved. Retrying after reveal may require the client-side existing-photo reconciliation.
6. **Call policy:** host extras are uncapped; the server does not enforce the new modal confirmation. One minute only prevents rapid repeats; simultaneous answer windows can overlap. For overlapping calls the current event UI picks one pending call at a time rather than showing an inbox of all open calls. Trip budgets are pooled, not daily. Legacy `ask_extra` errors and `back_extra` behavior are misleading, although their votes no longer affect permissions. This handoff documents those behaviors without changing them.
7. **Product validation:** no real seven-persona usability study or evidence of repeat-event retention. iPhone installation/session transfer is still the old flow. An event invite still joins a permanent group and shares its capability code. No new invite expiry/rotation/host-only sharing, event-only guest role, album export, or separation of leaving from photo deletion was implemented. Challenges are described as optional but their underlying assignment UI remains.
8. **Test boundaries:** Chromium fixture checks are not a deployed Next/Supabase end-to-end test. SQL tests run under the PGlite owner and exercise logic/auth.uid fixtures, not full production role grants and RLS. There is no separate CI workflow added. The small fixtures do not establish production load/capacity safety.

These are review notes for the existing implementation. This packaging pass intentionally does not fix them or alter behavior.

## Review and dev-stack test (Claude, 2 November 2026)

Branch `claude/review-simpler-calls`, on top of `codex/simpler-calls` (383d6c4). Nothing applied to hosted Supabase, nothing deployed, `main` untouched.

**Development project.** A local Supabase stack (Postgres 17, Auth, Storage, PostgREST, Mailpit) started with `supabase start`. All 13 migrations applied in order, cleanly, with real Supabase roles, grants and RLS. The production build of this branch ran against it. The checks are in `tests/dev-stack/` (`npm run test:dev-stack`, see its README).

**What passed (after the fixes below).** Codex's `npm test`, `npm run test:browser`, `typecheck`, `lint`, `build`. Plus, against the dev stack:
- 34 server checks as real signed-in users (`api.mjs`): invite preview needs the matching group code and shows no participants; signed-out and cross-group joins refused; double-tap join leaves one group row and one event row; a retried call photo returns the same call and spends the budget once; two people calling at once start exactly one call; one-minute guard; guests blocked after the shared budget, host extras uncapped but guarded; non-recipients and outsiders can't begin answers; the attempts table isn't exposed; simultaneous answer retries make one photo; a second distinct answer is refused; 15-minute start and 10-minute upload windows; joins and answers refused after the reveal.
- The guest journey on an emulated iPhone (`journey.mjs`, 28 checks): event invite from Details, preview before sign-in, alerts step with home-screen steps, landing on the event, capture, failed upload kept across reload, auto-retry, no duplicate files, lost answer response reconciled with one photo, unsent call never auto-retried (35 s, across reload) and sent once by Retry, call refused by the guard then retried, answer arriving after 15 minutes refused with Keep a copy working, guest told only the host can add a call, host confirms an extra, reveal shows the prints and the expired photo is still on the device, invite after the reveal shows no join form.
- Real email sign-in from an event invite (`email.mjs`): the destination survives, the 6-digit code arrives in Mailpit, the guest ends up on the event.
- Accessibility (axe, WCAG 2 A/AA): event, invite and alerts pages clean.

**Bugs found and fixed here**
1. *Offline, the app was replaced by the browser's error page.* `router.refresh()` with no connection makes Next fall back to a full page load, which fails offline; the guest saw Chrome's error page (and stayed there after the signal came back) within about 10 s of capturing. Triggered by the Roll Call card's 30-second refresh (pre-existing) and by the refresh after every capture. Now the card skips refreshes while `navigator.onLine` is false, and captures refresh only when the photo reached the server. Verified by `offline.mjs`.
2. *Offline capture with an expired access token wasn't saved to the device.* `saveCapture` called `auth.getSession()`, which tries to renew the expired token over the network before returning; the photo sat in memory with no message for 8+ seconds (until the signal came back, or the renewal gave up and the guest was told to sign in again). The page now passes the signed-in user id (`auth.claims.sub`) to `saveCapture`, so saving never waits on the network. Verified by `expired.mjs`.
3. *A call refused by the one-minute guard was locked as "blocked".* `call_roll` raised every refusal as `P0001`, which the queue treats as permanent, so the panel said "Try again in a minute" with no Retry button. `call_roll` now raises the guard refusal as `RC429` and the queue keeps that photo retryable, showing the server's message; all other refusals stay `P0001`. **This edits `20261102010000_recoverable_answers.sql` in place**, safe only because it hasn't been applied anywhere but this dev stack. Covered in `tests/database.test.mjs` and `journey.mjs`.

**Remaining gaps**
- *Orphan sweep vs long-pending uploads (untested).* `my_orphaned_files()` lets the uploader's app delete photo files over 10 minutes old with no row. If a retry accepts an earlier upload (409) and a sweep runs in another tab before the row insert, the row points at a deleted file. Narrow, but the queue makes old unrecorded uploads normal. Options: raise the sweep age (e.g. 24 h), or skip paths with a pending attempt.
- *"Lie-fi".* The refresh guard relies on `navigator.onLine`; a phone that reports online but can't reach the server can still hit the error-page fallback. Not tested on a device.
- *No offline app shell.* The service worker caches nothing, so the recovery panel needs the app to load first; reopening Roll Call with no signal shows the browser's offline page. Photos are safe in IndexedDB until it loads.
- *Timing can be gamed through the API.* `begin_roll_answer` records the start before anything is uploaded, so a hand-crafted request at 1:59 makes a photo taken at 11:00 count as on time. The real client only begins after the shot.
- *Product decisions to confirm before release* (also in Codex's notes): host extras are uncapped and confirmed only in the UI; existing events count all historical calls (some will have none left after migrating, and Chaos events become limited); legacy `ask_extra` now fails with "You can still call one."
- *Copy (not changed, judgement calls):* the waiting-photos panel sits above the page header on every page; its intro is four sentences; a waiting answer is labelled with the raw caption "roll call · Hana"; an expired answer says "Download your saved photo" but the button is "Keep a copy"; the alert adds a technical sentence about 15- and 10-minute windows; the call sheet's "N person is included for alerts. Delivery depends on their phone settings and connection." is long.
- *Not covered:* real iPhone Safari and Android devices, HEIC files, real push delivery, the hosted project's own grants and data volume, a mixed old/new client rollout.
- *Applying to hosted:* both migrations use plain `create`, so each must run exactly once, in order, before the new client deploys.
