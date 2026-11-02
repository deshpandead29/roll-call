# Instructions for Codex

Roll Call is a Next.js (App Router, TypeScript) app on Supabase (Postgres with row-level security, Auth, Storage, Realtime), deployed on Vercel, with Web Push.

Read these first:
- `CLAUDE.md`: the product brief. It has the decisions already made and why, the event and Roll Call rules, the photo look and the copy rules. Treat its rules as the spec.
- `README.md`: setup, and a map of the database functions and what each migration adds.

Layout:
- `src/app`: pages and routes. `src/app/api/push/*` sends notifications. `src/app/auth/*` handles sign-in links.
- `src/lib`: `missions.ts` (deterministic challenge assignment), `develop.ts` (the photo look), `capture.ts`, `events.ts`, `supabase/*` (clients).
- `supabase/migrations`: the schema, policies and server functions, applied in filename order. Roll Call rules live in `20261024000000_roll_call.sql`.
- `prototype/`: the original single-file prototype, kept as a design reference and served at `/prototype`. Not production code.

Commands: `npm run typecheck`, `npm run lint`, `npm run build`. A local database needs Docker (`npx supabase start`); see README.

Rules:
- Never commit secrets. `VAPID_PRIVATE_KEY`, `CRON_SECRET` and Supabase service keys belong in environment variables only.
- Copy follows the rules in CLAUDE.md: short, plain, no slang, no exclamation marks.
- When asked to review, follow `docs/code_review.md`.
