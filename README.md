# Roll Call

A shared camera for friend groups: call roll and everyone shoots the same moment, with short challenges, and it all develops the next day.

- `CLAUDE.md`: the build brief. Start here.
- `prototype/index.html`: the working prototype (design, rules, photo look, sample event). Serve the folder over HTTP to try it (`npx serve prototype`); the sample photos won't process from a `file://` URL. Outside claude.ai the prototype has no database, so creating groups is disabled; the sample event and "Try the look" still work.
- `docs/challenges.md`: every challenge.
- `docs/recreate-challenges.xlsx`: recreations with copyright notes.
- `docs/research.md`: the research behind the decisions.
- `docs/credits.md`: photo and font credits.

## Running the app

Next.js (App Router) and Supabase. Node 20 or later.

```sh
npm install
cp .env.example .env.local   # then fill in the two values
npm run dev
```

### Local Supabase

Needs Docker. `npx supabase start` applies `supabase/migrations`, uses the auth settings in `supabase/config.toml` and prints the API URL and publishable key for `.env.local`. Sign-in emails land in Inbucket at http://127.0.0.1:54324.

### Hosted Supabase

1. Create a project and run `npx supabase link --project-ref <ref>`, then `npx supabase db push`. Or paste each file in `supabase/migrations` into the SQL Editor, oldest first.
2. Authentication > Sign In / Providers: turn on anonymous sign-ins. Email stays on.
3. Authentication > URL Configuration: set the site URL to the deployed origin and add `https://<your-domain>/**` (plus Vercel preview URLs if you use them) to the redirect URLs.
4. Set up custom SMTP (Authentication > Emails > SMTP Settings; this project uses Resend: host `smtp.resend.com`, port 465, user `resend`, password a Resend API key), raise the email rate limit, then paste `supabase/templates/sign-in.html` into both "Confirm signup" and "Magic link", and `supabase/templates/email-change.html` into "Change email address". The default templates work, but only send a link. Ours add a code, because a home-screen app on iPhone doesn't share cookies with Safari, so the link alone signs people in on the wrong side.
5. Put the project URL and publishable key in Vercel's environment variables, plus a VAPID key pair for push (`npx web-push generate-vapid-keys`): `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (secret).

### What's in the database

`supabase/migrations/20261021000000_foundations.sql` has every table from the brief, plus a `timezone` on groups and `host_member_id` on events. Row-level security is on everywhere: people see only their groups, and other people's photos (rows and Storage objects) stay hidden until the reveal. Groups are made with `create_group()` and joined with `join_group()` from an invite link; `group_preview()` lets the invite page show the group before you sign in. Events are made with `create_event()`, which saves the event and its guest list together. `event_shot_counts()` gives the group each person's shot count without unsealing anything. Roll Calls go through `call_roll()` and `answer_roll()`, which enforce the current shared budget, repeat guard, host extras and answer windows transactionally. `roll_state()` returns the same check for the button, so the app and the server always agree. The older `ask_extra()` and `back_extra()` functions are retained for historical compatibility; the current client uses explicit host extras. Roll calls, asks, backs and statuses are published to Realtime. Push: devices register with `save_push_subscription()`; after a call, `/api/push/roll-call` gets the recipients once through `roll_call_push_targets()` (caller only, under a minute old, snoozed and home left out) and sends with web-push.

Profiles (`20261027000000_profile.sql`): one name and one away card per person. `set_my_name()` and `set_my_away_card()` update every group you're in; making or joining a group copies them in. Profile cards are stored at `away-cards/u/{user_id}/`.

Start-day alerts (`20261031000000_start_push.sql`): "Sam's 30th is today", once, from 09:00 local on the first day, sent the same three ways as reveal alerts.

Reveal alerts (`20261030000000_reveal_push.sql`): "Lisbon is out" goes to everyone on an event once it reveals. Whichever comes first sends it, once: the host pressing Reveal now, anyone in the group opening the app after the reveal time, or the daily Vercel cron in `vercel.json` (needs `CRON_SECRET` in Vercel and the same value in `private.secrets`).

Letter-day word (`20261029000000_hunt_word.sql`): `events.hunt_word`, set by the host when creating a trip; `event_details` is rebuilt to include it.

Negatives (`20261028000000_negatives.sql`): at capture the phone also uploads a 45×60 inverted, tinted negative to the `negatives` bucket. The group can read those before the reveal, and `event_negatives()` lists which shots exist without saying what they are.

Moderation and cleanup (`20261026000000_moderation.sql`): `report_photo()` reports a revealed photo; the event's host and the group's maker see reports (`reports` table) and can remove any revealed photo, and owners can always delete their own. `leave_group()` deletes your photos and event places, keeps Roll Calls you started, hands events you host (and the group, if you made it) to whoever joined first, and leaves your name unclaimed so you can rejoin as yourself; the last person out deletes the group. Anyone in the group can join an event until its reveal; late joiners sort last so nobody else's challenge moves. Photo files are cleaned up by their uploader: Storage only deletes what you can read, so `my_orphaned_files()` lists your files that no row points at any more and the app removes them on load. Until then nobody else can read them, because reading a photo or away card now needs a live row.

## Current call and recovery workflow

Events use three shared calls, or a pooled trip budget of two times the number of trip days. Anyone on the event can call, with a one-minute repeat guard. The host can explicitly start extras. Historical pace, reserved-call and backing data is retained but no longer affects the active rules.

Share an event-specific invite from **Event → Details → Invite to this event**. Friends see the event and reveal time, join the group and event in one transaction, and return directly to the event after sign-in/setup. Group-only invite links still work.

Photos are stored on the current device before upload. The recovery panel is available throughout the app for the signed-in account. Replies and challenge photos retry when online while Roll Call is open. Outgoing calls require manual retry and expire after five minutes. Rejected photos can still be downloaded. Do not clear site data before keeping or sending pending photos. An answer accepted by the server within the response window has ten minutes to finish uploading; an offline device cannot extend the response window using its own clock.

Apply both `20261102` migrations before running this client against a hosted project. They update call enforcement, add atomic event invitations, and add server-recorded answer attempts. Existing photos and calls are retained. No hosted migrations are applied by this source change. Apply them once, in filename order, after the prior migration chain; neither file is safe to execute twice as raw SQL. Existing pace values stay stored but are ignored, and historical reserved/extra calls also count against the new budget. Update clients with the backend: old backing-vote flows no longer unlock calls, and the new client requires the new invite/answer-start RPCs.

### Validation

`npm test` executes the complete migration chain in PGlite PostgreSQL with Supabase auth/storage schema fixtures, then tests invitation retries, budgets, upload deadlines, duplicate response recovery, and IndexedDB persistence/account isolation. It does not replace live Supabase or physical-device push testing. `npm run typecheck`, `npm run lint`, and `npm run build` cover the application.

`npm run test:browser` runs Chromium regression checks for offline/reload recovery, lost-response reconciliation, expired-photo retention, account isolation, and invitation navigation. These use the actual client modules with controlled service responses and substitute fonts. Use the system Chromium on this cloud image, set `CHROMIUM_PATH`, or install Playwright Chromium with `npx playwright install chromium`. They do not test real push delivery or a hosted backend.

## Engineer handoff

Read [the review package](docs/simpler-calls-review.md) before deploying. It lists every migration object and permission change, implementation decisions, data/old-client compatibility, known gaps, and the latest verbatim test results. Packaging changes documentation and removes a trailing blank line in one migration; implementation behavior has not been changed during handoff.

### Reproduce the review checks

Validated with Node 24.19.0, npm 11.9.0, and system Chromium 154.0.8037.57 on Linux. From the repository root:

```sh
npm ci
npm test
npm run test:browser
```

`npm test` needs installed dev dependencies and enough memory for embedded PostgreSQL/WASM. It starts a fresh in-memory PGlite database and uses fake IndexedDB; no external database, Docker, Supabase CLI, app server, `.env` file or credentials are needed. Its Supabase auth/storage scaffolding is a fixture, not a live integration or comprehensive RLS test.

`npm run test:browser` needs a runnable Chromium and permission to launch it and bind a loopback port. The scripts use `CHROMIUM_PATH` when set, otherwise `/usr/bin/chromium` when present, otherwise Playwright's installed Chromium. On another machine, install a browser first if needed:

```sh
npx playwright install chromium
# Or use an existing executable for this command only:
CHROMIUM_PATH=/path/to/chromium npm run test:browser
```

No database, Docker, running Next.js server, Supabase environment variables or network API credentials are required for the browser fixtures. Dependency/browser installation requires the relevant package/download hosts. Browser launches currently use `--no-sandbox` for the managed-container test environment. Application builds separately fetch Google Fonts and require access to `fonts.googleapis.com` and `fonts.gstatic.com`.

No production environment-variable names or values were added. Existing Supabase URL/publishable key bindings and optional VAPID/cron settings remain as before; do not commit their values. Both new migrations must exist in the backend before the new client's invitations and reply uploads work.
