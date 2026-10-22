# Roll Call

Every angle, all at once. A shared camera for friend groups: call roll and everyone shoots the same moment, with short challenges, and it all develops the next day.

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

`supabase/migrations/20261021000000_foundations.sql` has every table from the brief, plus a `timezone` on groups and `host_member_id` on events. Row-level security is on everywhere: people see only their groups, and other people's photos (rows and Storage objects) stay hidden until the reveal. Groups are made with `create_group()` and joined with `join_group()` from an invite link; `group_preview()` lets the invite page show the group before you sign in. Events are made with `create_event()`, which saves the event and its guest list together. `event_shot_counts()` gives the group each person's shot count without unsealing anything. Roll Calls go through `call_roll()` and `answer_roll()`, which apply the budget, reserved call, one-per-person rule, cooldown, backed extras and answer windows in one transaction. `roll_state()` returns the same check for the button, so the app and the server always agree. `ask_extra()` and `back_extra()` handle asking for one more. Roll calls, asks, backs and statuses are published to Realtime. Push: devices register with `save_push_subscription()`; after a call, `/api/push/roll-call` gets the recipients once through `roll_call_push_targets()` (caller only, under a minute old, snoozed and home left out) and sends with web-push.

Profiles (`20261027000000_profile.sql`): one name and one away card per person. `set_my_name()` and `set_my_away_card()` update every group you're in; making or joining a group copies them in. Profile cards are stored at `away-cards/u/{user_id}/`.

Moderation and cleanup (`20261026000000_moderation.sql`): `report_photo()` reports a revealed photo; the event's host and the group's maker see reports (`reports` table) and can remove any revealed photo, and owners can always delete their own. `leave_group()` deletes your photos and event places, keeps Roll Calls you started, hands events you host (and the group, if you made it) to whoever joined first, and leaves your name unclaimed so you can rejoin as yourself; the last person out deletes the group. Anyone in the group can join an event until its reveal; late joiners sort last so nobody else's challenge moves. Photo files are cleaned up by their uploader: Storage only deletes what you can read, so `my_orphaned_files()` lists your files that no row points at any more and the app removes them on load. Until then nobody else can read them, because reading a photo or away card now needs a live row.
