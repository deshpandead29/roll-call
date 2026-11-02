# Code review guide

Review the app (`src/`, `supabase/migrations/`) against the spec in `CLAUDE.md`. Ignore `prototype/` except as a reference for intended behaviour.

## Not bugs (deliberate)
- Anonymous sign-in that's upgraded with an email later.
- Sign-in emails carry a code as well as a link, because an iPhone home-screen app doesn't share cookies with Safari.
- Other people's photos are visible to the group as small negatives (45×60, inverted) before the reveal. That's intended; check only that the negatives can't be turned back into the real image.
- No face recognition, by design.

## Check, most important first

1. **Sealing.** Before an event's reveal, nobody may read another person's photo rows or Storage objects: not by querying tables, calling functions, guessing Storage paths, using signed URLs, or through Realtime. Check `private.can_read_photo_object`, `private.is_revealed`, `private.reveal_at`, the Storage policies, and anything that returns photo data (`event_shot_counts`, `event_negatives`, `build-reveal.ts`). Check reveal times in the group's timezone, including daylight-saving changes.
2. **Roll Call rules match the spec.** Compare `call_roll`, `answer_roll`, `roll_check`, `roll_state`, `ask_extra` and `back_extra` with the tables in CLAUDE.md: budgets per event type and pace, the reserved call, one per person (per day on trips), cooldowns, backed extras (two distinct backers, not the asker, 30 minutes, still subject to cooldown), and answer windows (2 minutes on time, 15 late). Look for race conditions: two people calling at once, double answers, a backer counted twice.
3. **Security-definer functions.** Each must pin `search_path`, check `auth.uid()`, and refuse to act for a member the caller doesn't own or on a group they aren't in. Look at invite codes (guessability), `group_preview` (what it reveals before sign-in), `join_group`, `leave_group` and `create_event`.
4. **API routes and auth.** `/api/push/roll-call` and `/api/push/reveals`: who can trigger them, whether they can be used to spam people, whether `CRON_SECRET` is checked properly, and that the VAPID private key never reaches the browser. `src/app/auth/*` and `src/lib/next-path.ts`: open redirects and redirect-URL handling.
5. **Data integrity.** `leave_group`, photo deletion, moderation (`report_photo`, moderator removal) and `my_orphaned_files`: nothing left readable that shouldn't be, nothing deleted that shouldn't be.
6. **Deterministic challenges.** `src/lib/missions.ts` must give every device the same result for the same event, day and person, with late joiners never moving anyone else's challenge. People prompts must never target the person themselves.
7. **Capture and the photo look.** `src/lib/capture.ts` and `src/lib/develop.ts`: HEIC input, EXIF orientation, memory and speed on older phones (it processes about a million pixels), upload size limits, failures mid-upload.
8. **Push and the installed app.** Expired subscriptions (HTTP 404 or 410) get removed; nobody gets duplicate alerts; snoozed and home people are skipped; iPhone users are told to add the app to their home screen first.
9. **Accessibility and mobile.** Labels, keyboard use, focus, contrast in light and dark themes, reduced motion, layouts at 375–430 px, touch targets of at least 44 px.
10. **Tests.** There's no automated test suite yet. Suggest the few tests that would catch the most damaging failures, starting with sealing and Roll Call rules.

## Output
List findings most severe first. For each: file and line, what's wrong, a concrete way to trigger it, and a suggested fix. Separate confirmed issues from suspicions you couldn't verify. Don't change code during a review unless asked.
