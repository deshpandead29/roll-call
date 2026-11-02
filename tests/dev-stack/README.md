# Dev-stack checks

End-to-end checks against a real local Supabase (Auth, Storage, Postgres with real roles and RLS) and a production build of the app. Unlike `npm test` and `npm run test:browser`, nothing here is faked.

They create users, groups and events in the local database, and use `psql` to move the clock (age calls and answer attempts). Never point them at a hosted project.

```sh
npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,postgres-meta
export SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY from supabase status>
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY \
  NEXT_PUBLIC_VAPID_PUBLIC_KEY=<any VAPID public key> npm run build
npx next start -p 3200 &
npm run test:dev-stack
```

Needs `psql` on the PATH and Chromium (`CHROMIUM_PATH` to pick one). Optional: `APP_URL`, `SUPABASE_URL`, `DB_URL`, `MAILPIT_URL`.

- `api.mjs`: server rules as real users: invite preview/join, shared budget, one-minute guard (RC429), host extras, concurrent calls, answer permissions, duplicate and simultaneous retries, 15-minute and 10-minute windows, reveal.
- `journey.mjs`: the guest journey on an emulated iPhone: event invite, sign-in, alerts step, capture, failed upload and reload, lost response, unsent call (manual retry only), call refused by the guard then retried, expired answer, host extra, reveal, invite after reveal.
- `email.mjs`: event invite through a real emailed sign-in code (Mailpit).
- `offline.mjs`: capture with no connection keeps the app on screen and sends when back online.
- `states.mjs`: each state of the journey (landing, sign-in, welcome, empty home, invite, waiting, incoming call, failed upload, contributed, revealed, example) at 390px plus a 320x568 first screen, saved to `test-results/states-$OUT_NAME/`. Checks what each state puts first (an incoming call before Call roll, unsent photos under the title), that "Not now" survives a reload, lightbox focus, reduced motion, axe in light and dark, no sideways scroll at 320px and 200% zoom, and that only the labelled example loads stock sample photos.
- `expired.mjs`: offline capture with an expired access token still saves to the device; accessibility on the event, invite and alerts pages.
