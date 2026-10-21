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
4. Optional, once custom SMTP is set up (Authentication > Emails > SMTP Settings; new free projects can't edit templates without it): paste `supabase/templates/sign-in.html` into both "Confirm signup" and "Magic link", and `supabase/templates/email-change.html` into "Change email address". The default templates work, but only send a link. Ours add a code, because a home-screen app on iPhone doesn't share cookies with Safari, so the link alone signs people in on the wrong side.
5. Put the project URL and publishable key in Vercel's environment variables.

### What's in the database

`supabase/migrations/20261021000000_foundations.sql` has every table from the brief, plus a `timezone` on groups and `host_member_id` on events. Row-level security is on everywhere: people see only their groups, and other people's photos (rows and Storage objects) stay hidden until the reveal. Groups are made with `create_group()` and joined with `join_group()` from an invite link; `group_preview()` lets the invite page show the group before you sign in. Events are made with `create_event()`, which saves the event and its guest list together. Roll Call writes go through a single function in step 4, so those tables are read-only for now.
