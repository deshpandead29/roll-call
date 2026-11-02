# Implementation notes: frontend simplification

Line numbers are against HEAD 1aaa25c. Note: the checkout already has uncommitted work by someone else (src/app/page.tsx, src/app/sample/*, hero-collage.tsx deleted and staged, tests/dev-stack/states.mjs untracked). Nothing here was edited.

## 1. Where state lives, and a single "event state"

Server (src/app/events/[id]/page.tsx):
- Auth redirect with next: 60. Event row incl. `revealed`, `reveal_at`: 62-64. `status` (Live/Upcoming): 99. `me` on event: 97; `meInGroup`: 98.
- Own photos (RLS returns only yours pre-reveal): 85, `allMine` 190, `shots` 183-189, signed URLs 173-176.
- `roll_state` RPC (`rd`): 86, 199. Holds `state.ok/why/extra/remaining`, `calls[]` with `mine_answered`, statuses, and server `now`.
- Branches: revealed 225-284; not on event 290-295; live with RollCall 310-322; upcoming card 323-334; challenges 336-383; So far 387-448.

Client:
- RollCall (roll-call.tsx): `now` tick 99/133, `sheet` 100, `busy` 101, `note/error` 102-103, `dismissed` 104, `answered` 106, `refreshing` transition 107, refs `input` 97 and `job` 98. Realtime channel + 30 s refresh 110-144. Incoming call derived client-side as `pending` 155-164 (needs `answered`, `now`, 15 min window); `showAlert` 254 also needs snooze/home and `dismissed`. Countdown `left` 255. The alert is `position:fixed` (globals.css:169), so its DOM position does not affect what is seen first; `.ask` (270-279) is the inline fallback after "Not now".
- Missions (missions.tsx): refs `input` 51 and `pending` 52, `busy/note/error/confirmDelete` 53-56. Recreate (recreate.tsx): `input` 43, `count/offset/busy/note/error` 44-48.
- Queue: IndexedDB in src/lib/photo-store.ts (enqueue 162-178 with atomic frame allocation; pendingPhotos 148; persist 156; `queueChanged` event 123). Sending in src/lib/photo-queue.ts (module `active` set 6, `isSending` 107).
- PendingPhotos (src/components/pending-photos.tsx) owns the panel state, the 30 s / `online` auto retry loop (19-45) and calls `router.refresh()` on success. It is mounted once, unscoped, by PhotoRecovery (photo-recovery.tsx) in layout.tsx:25, before `{children}`, which is why it sits above the event header.

Proposal (least risk):
- Put the priority rule in a pure function, e.g. `src/lib/event-stage.ts`: `stage({revealed, onEvent, live, incoming, queue: {failed, sending, waiting}, contributed})` returning `revealed > incoming > sending-failed > upcoming/waiting > contributed > idle`. Unit-testable in `npm test`.
- Inputs that are server-known (revealed, live, onEvent, contributed = `allMine.length > 0` or any `mine_answered`) come from page.tsx. Incoming must be computed client-side (it depends on the ticking clock, `answered`, `dismissed`, snooze). Queue state is client-only: extract the read half of PendingPhotos (`pendingPhotos` + `subscribeQueue` + `isSending`) into a `usePendingQueue(eventId, owner)` hook so a stage wrapper can read it without running a second retry loop.
- Do not reorder stateful client components between renders. Keep a fixed DOM order and change content inside slots: header, waiting panel, RollCall (incoming first inside it, then Call roll), a server-rendered "You're in, reveals {reveal}" line, challenges in `<details>`, So far, then HowItWorks/AlertsSetup. If order must vary, use keyed siblings or CSS `order` (.wrap is already flex column, globals.css:26), never conditional JSX at different positions.

What reordering can break:
- Remount while the camera is open. `job`/`pending` refs and the hidden `<input>` live in the component; a router.refresh (realtime, 30 s interval, another device) that changes the stage and remounts RollCall/Missions/Recreate detaches the input, so `onFile` never runs or returns early (roll-call.tsx:202, missions.tsx:71). The photo is lost before `saveCapture`, i.e. before any on-device protection exists. This is the main risk.
- Remount mid-send loses `note` ("Answer added"), `answered` (call reappears until refresh lands), `dismissed` (alert pops back after "Not now"), and resets `now` to stale `data.now`.
- Folding with conditional rendering (`open && <Missions/>`) has the same effect. Use native `<details>` (children stay mounted) and keep the shutter reachable.
- Realtime channel name `roll:${eventId}` (128) is torn down/recreated on each remount.
- Focus: the alert is `role="alertdialog"` but never takes focus; a new in-flow incoming card must not steal focus on refresh. Lightbox uses `autoFocus` (reveal.tsx:160).
- A second PendingPhotos instance on the event page would double the panel (Playwright strict-mode failures on `panel(g).getByRole("button",{name:"Retry"})`) and run two retry loops (the `active` set prevents duplicate concurrent sends in one page, but both call router.refresh). Either move the single panel visually below the header with CSS `order`, or have PhotoRecovery return null on `/events/[id]` (usePathname) and render one unscoped `<PendingPhotos owner>` in the page. Keep it unscoped so other events' photos (and deleted events') stay reachable.
- Copy "See waiting photos above" (roll-call.tsx:218, missions.tsx:80, recreate.tsx ~66) is position-dependent and asserted by journey.mjs:100,160.

## 2. Protections that must survive

- On-device persistence: saveCapture before any processing (photo-queue.ts:11-15), enqueue commit (photo-store.ts:162-178). Owner id passed from server claims (page.tsx:321,362,378) so offline/expired-token saves never wait on network. Break by: calling `auth.getSession()` before saving, or uploading before enqueue in a new "simpler" capture button.
- Recovery across routes: PhotoRecovery in layout.tsx:25, auth-scoped (photo-recovery.tsx:11-21), panel actions Retry/Keep a copy/Discard with confirm (pending-photos.tsx:61-73). Break by: scoping it to the event page only, hiding blocked items, or dropping Keep a copy for expired ones.
- Offline safety: refresh only when `navigator.onLine` (roll-call.tsx:115,136) and only after a successful send (roll-call.tsx:221, missions.tsx:82). Break by: adding `router.refresh()`/`router.push` after capture for a "contributed" screen.
- Stable IDs and duplicate-safe retries: UUID at capture (photo-queue.ts:12), deterministic path (66), reconcile existing row (46-52), accept 409 (69), 23505 verify (75-79), RC429 retryable (28), calls never auto-retry (17-19, 5 min block 53-55). Server: call_roll idempotent lookup after event lock (20261102010000_recoverable_answers.sql:63-76), answer_roll lock + existing answer (139-157). Break by: generating a new id on Retry, or a "Shoot again" that discards the queued item.
- Next param through sign-in: safeNext/unwrapNext (src/lib/next-path.ts:3-20), sign-in (sign-in/page.tsx:15-16, sign-in-form.tsx:19,29), auth/confirm/route.ts:14,30-34, join form `here` (join/[code]/join-form.tsx:31,54,68), welcome (welcome/page.tsx:12-19, welcome-flow.tsx:28), event page redirect (page.tsx:60). Break by: landing/welcome links that drop `next`, or adding a demo step to welcome.
- Transactional invite join: join_event_invite (20261102000000_simpler_calls_and_invites.sql:54-67, row lock 60, revealed refusal 62-63, `on conflict do nothing` 67). Break by: client doing join_group then a separate event_members insert.
- Budgets/host/guard: roll_check (same file 3-42, host extra 38-40); call_roll raises RC429 / P0001 (recoverable_answers.sql:74-76). UI only mirrors `st.ok/why/extra`. Break by: hiding the host-extra confirm (roll-call.tsx:175) or enabling Call roll when `!st.ok`.
- Deadlines: begin_roll_answer 15 min start / 10 min upload (recoverable_answers.sql:11-32), answer_roll (108-157). Client hides calls older than 15 min (roll-call.tsx:161).
- Sealed photos: photos RLS (20261021000000_foundations.sql:523-540), storage policies (731-739, moderation.sql:268-273), negatives via `event_negatives` RPC (page.tsx:89) and the `negatives` bucket; signed URLs 1 h (page.tsx:173-176, build-reveal.ts:66-75). Own shots shown as negatives only through CSS `.neg img` filter (globals.css:138); `.neg.baked img{filter:none}` (259) for pre-inverted ones. Break by: CSS cleanup dropping that filter (own photos show developed), or a "contributed" thumbnail using the real photo URL unfiltered.
- Owner delete / report / moderation: missions.tsx:100-107 (pre-reveal delete), photo-actions.tsx:21-45 (delete, moderator remove, report), Reports panel (page.tsx:253-258, reports.tsx), hidden reported photos (page.tsx:242,248), `actions` prop on RevealView (reveal.tsx:13,162). Moderation RLS 20261026000000_moderation.sql:150-152. Sweep of orphans (components/sweep.tsx, lib/sweep.ts; 10 min age, 20261028000000_negatives.sql:54). Break by: collapsing reveal into a non-clickable grid (no lightbox means no delete/report), or rendering RevealView without `actions`.
- Migrations: 13 files in supabase/migrations; none to change. The two 2026-11-02 files use plain `create` and must apply once.

## 3. Tests that depend on markup or copy

- `npm test` (tests/database.test.mjs, tests/photo-store.test.ts): no UI dependency.
- `npm run test:browser`: invitations.mjs:30-43 needs JoinForm link "Sign in with email", buttons "Continue without email", "Join event" (exact), label "Your name". photo-recovery.mjs uses only the photo-queue API.
- Dev-stack (journey.mjs, offline.mjs, expired.mjs, email.mjs, states.mjs):
  - `section[aria-label="Photos waiting to send"]` (journey 25; states 76-79) with buttons "Retry", "Keep a copy", `p.small[role=status]` (journey 137), text /Couldn't send yet|Waiting to send|Uploading/ (78), /closed/ (167); `panel.count() === 1` after reveal (187).
  - `.mission button.shutter` (journey 67,73; offline 28; expired 35).
  - `.callbtn` (journey 92,113,125,130,176,179; states 69), `.sheet button.shutter` (93,113,133,181; states 70).
  - `.alert` and `.alert button.shutter` (96,99,124; states 71,75), `.ask button.shutter` (158), "Not now".
  - `.rc-card` and `.rc-card p.small` text /host can start an extra/ (126,176).
  - Copy: "Got it" (64,91; offline 25; expired 23; states 35), "Added. It develops at the reveal." (68), /Saved on this device/ (74,134), /See waiting photos above/ (100,160), /Roll Call started/ (94,182), /Call status isn't confirmed/ (114), "All shared calls are used. Start an extra as the host?" (180).
  - Reveal: `.ph img` count >= 3 (188).
  - expired.mjs:38 reads `.error, [role=alert], [role=status], .hand.blue`.
  - Onboarding: "Continue without email", "Your name", "Next", "Skip for now", /home screen/, "This event has revealed".
- If folding challenges into a closed `<details>`, `.mission button.shutter` is not clickable until opened; tests need an "open challenges" step. If the alert becomes an in-flow card, either keep `.alert` on it or update five call sites. Keep `.shutter`, `.callbtn`, `.sheet`, `.rc-card` as hooks even if their visuals are simplified.

## 4. New tests

- (a) No stock images in the real journey. Two layers. Fast guard in `npm test` (node:test + tsx): a `tests/no-samples.test.mjs` that scans src/ and fails if `prototype/samples`, `@/lib/sample` or `href="/sample"`/`"/try"` appear outside src/app/sample/**, src/lib/sample.ts and the signed-out landing branch. End-to-end in dev-stack: states.mjs already records `/prototype/samples/` requests per screen (states.mjs:22, report at 26-31); turn that into assertions: zero for `/`, `/sign-in`, `/welcome`, `/join/<code>?event=`, home with no groups, group, event upcoming/live/revealed; non-zero for `/sample`. Add it to `test:dev-stack`.
- (b) State priority. Unit test the pure `stage()` function in `npm test`. Component test in the `test:browser` harness (standalone Playwright + esbuild with fixture plugins for next/navigation and @/lib/supabase/client, as in invitations.mjs:9-18): mount RollCall with a fake client (`auth.getSession`, `realtime.setAuth`, `channel().on().subscribe()`, `removeChannel`) and `data.calls` holding an unanswered call; assert the incoming Shoot is present and precedes or replaces Call roll; mount PendingPhotos with a real IndexedDB record (saveCapture with a failing fake) and assert the panel, an enabled Retry and Keep a copy. Add both scripts to `test:browser`.
- (c) Navigation: dev-stack (real routes and auth). Signed-out `/` has a link named "See an example" to /sample; /sample has a labelled back link to `/`; /try back link; signed-in home, group, event pages have no link to /sample or /try.

## 5. References to /sample, /try, HeroCollage, sample images, "Try the look" (HEAD)

- src/app/page.tsx:4,35 HeroCollage on signed-out landing; 38 "Try the look" and 39 "See a sample" on landing; 136 "See a sample" on signed-in home (journey promotion, remove). Working tree already changes these.
- src/components/hero-collage.tsx:25 fetches `/prototype/samples/*.jpg` and runs develop() client-side (deleted in working tree). CSS `.collage` globals.css:235-244 becomes dead.
- src/app/events/[id]/page.tsx:330 "Try the look" on the upcoming-event card (remove).
- src/app/sample/page.tsx, sample-view.tsx:6,29,39 the demo (uses RevealView, so reveal changes show up there too). src/lib/sample.ts:48 builds sample photo URLs, 173 credits.
- src/app/try/page.tsx:4,13, try-look.tsx: applies the look to the user's own photo; loads no sample image.
- Welcome, group, people, me, join, sign-in: no references.
- tests/dev-stack journey.mjs:11, offline.mjs:29, expired.mjs:36, states.mjs:11 use sample JPEGs as upload fixtures (fine). states.mjs visits /sample and /try.
- CLAUDE.md "Anticipation" asks upcoming events to offer Try the look; removing it departs from the brief, so note it.

## 6. Backend boundaries

- create_event: caller must be in group, at least two picked members, all from the group, honoree among them (20261022000000_create_event.sql:27,31 and following). new-event-form.tsx:40 mirrors the two-person rule. A one-person "quick event" needs backend work.
- Calls: shared budget, one-minute guard, host-only extras (roll_check). Answers: 15 min start, 10 min upload, refused after reveal. Joins refused after reveal.
- Before the reveal nobody but the owner can read photos; only negatives. Anything showing friends' real photos before reveal is impossible without changing RLS (and should not be done).
- Nothing in the plan needs backend work: the stage can be derived from existing `roll_state`, `photos` (own), `event_shot_counts`, `event_details.reveal_at`, plus the device queue. Possible exceptions: a cross-device "still uploading" state (the queue is per device), an inbox of all open calls (data exists in `rd.calls`, UI only), and the known orphan-sweep age (10 min) versus long-pending uploads, which is a backend fix if they want it.
