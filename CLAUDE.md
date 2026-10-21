# Roll Call: build brief

Read this first. It records what's been decided, why, and what's left to build. The working prototype is `prototype/index.html`; when this brief and the prototype disagree on a detail, the prototype shows the intended behaviour and this brief explains it.

## What it is

A shared camera for a friend group. When someone calls roll, everyone's phone asks them to shoot the same moment from where they are. Short challenges fill the gaps. Every shot stays hidden (shown to its owner only as a film negative) until the reveal the next day, when the group sees everything side by side.

The problem it solves: the one or two people who take all the photos never appear in them, and nobody sees the night from anyone else's angle.

Closest competitors: POV and Lense (shared event cameras with delayed reveal), BeReal (timed prompts). What none of them do: friend-triggered Roll Calls, per-person challenges, recreations, the printed look with the challenge written on each photo.

## Core decisions (don't undo without a reason)

1. **Event-based, not always-on.** A permanent group holds events: night out, birthday, wedding or big day, trip. Everyday mode was rejected: it competes with BeReal and the reveal only works when people share an experience.
2. **Roll Calls come from friends, not the app.** The notification reads "Priya called roll", never an app reminder. The caller shoots first.
3. **Roll Calls are a shared, scarce budget per event**, not one each per week. Scarcity is the point (the Hinge roses logic).
4. **Users set limits up front; going over needs the group.** The host picks a pace when creating the event. Past the limit, one more needs two other people to back it. Nudges cover judgement calls. Pure nudges were rejected: the caller doesn't bear the cost, the recipients do, and they respond by muting.
5. **Never fake a photo.** No default or pre-loaded images in a Roll Call. A missed call shows the person's away card, clearly marked.
6. **The photo look is burned in at capture**, so a Roll Call photo is recognisable anywhere it's shared.

## Event rules

| Event | Roll Calls (group) | Extra (reserved) | Cooldown | Challenges | Reveal |
|---|---|---|---|---|---|
| Night out | 3 | none | 75 min | 1 each from the night deck | 11:00 next day |
| Birthday | 2 | 1 for the birthday person | 75 min | 1 each from the birthday deck | 11:00 next day |
| Wedding or big day | 3 | 1 for whoever holds the couple's extra | 120 min | 1 each from the big-day deck | 11:00 next day |
| Trip | 2 per day | 1 for the organiser | 180 min | 3 a day: shared shot, hunt, wildcard | 00:00 the day after the last day |

- **Pace** (set by the host at creation): Chill removes one Roll Call (one fewer over the whole trip for trips). Normal as above. Chaos: no limit, no one-per-person rule, 30 min cooldown.
- **One per person:** each person can call once per event (once per day on trips), except in Chaos.
- **The reserved call** can only be used by its holder, and is used first when they call.
- **Ask for one more:** when someone's out of calls, they can ask. Two other people backing it unlocks one call for them within 30 minutes. It still respects the cooldown. The ask shows in-app only, never as a push.
- **Answer window:** 2 minutes counts as on time. Up to 15 minutes still counts, tagged "late". After that the slot shows the away card.
- **Recipients:** everyone on the event except the caller, or (when half or more are snoozed or home) "just us N" for those still out.

### Nudges before calling (one at a time, first match wins)

| Condition | Copy | Buttons |
|---|---|---|
| Local time 00:00–05:59 | "It's 01:40. People are asleep." | Call anyway / Save it |
| 3+ calls in the last 2 hours | "3 calls since 23:00. Sure?" | Call anyway / Wait |
| Last open call, birthday | "Last one. Is it the cake?" | It's the cake / Save it |
| Last open call, other | "Last one. Sure?" | Yes, now / Save it |
| Half or more away | "Only 4 of you still out." | chips: Just us 4 / Everyone |
| Default | "Everyone gets: "Atharva called roll."" | Shoot / Cancel |

### Snooze and going home

- Snooze 1 hour, or snooze until 06:00. Snoozes always expire.
- "Going home" (not on trips) stops buzzes for the rest of the event; "Back out" undoes it.
- Snoozed people still receive the Roll Call silently and can answer late in the app.
- The caller sees how many will actually get a buzz before calling.

### Away cards

Made once per group: a selfie, shown greyscale with pink stripes and an "away" pill. In the reveal it fills a missed slot with a reason: "snoozed", "home by 22:10" or "missed it". Away cards never count as answers.

## Challenges

Full lists: `docs/challenges.md`. Recreate list with copyright notes: `docs/recreate-challenges.xlsx`.

- **Trip shared shot:** same prompt for everyone that day.
- **Trip hunt:** the theme rotates daily (colour, letter, shape, texture, number) in a per-trip shuffled order, so colour isn't every day. Everyone gets a different target. Letters spell the trip name when its letter count equals the group size, otherwise a word sized to the group. Numbers count 1 to N together. The reveal lays letters and numbers out in order, with dashed holes for misses.
- **Trip wildcard:** the category rotates by (day + person): people, lens, nerve, story. People prompts name a friend via a shuffled ring per day, so nobody targets themselves and everyone gets targeted. One swap per day.
- **Non-trip events:** one challenge each from the event's deck. `{b}` becomes the honoree's name. One swap.
- **Recreate:** on trips every other day (days 1, 3, 5…), otherwise once per event. A seeded "director" sees it; they pick how many people they can round up, and get a matching painting, film scene or meme. Paintings show the public-domain original in the app and side by side in the reveal. Films, TV, memes and album covers are words only (copyright).
- Challenge assignment is deterministic, seeded by event id, day and person, so every device computes the same missions without storing them.

## The photo look

Implemented in `develop()` in the prototype. Applied client-side at capture, before upload.

- Output: a print 1080 px wide. The photo is 3:4 (portrait source) or 4:3 (landscape), cover-cropped, rounded corners, on an off-white card (#FBF8F2) with a caption area below.
- Grade (per pixel): centre-weighted flash gain (1.12 − 0.36·d²), saturation ×1.1–1.16, contrast ×1.13, cooler shadows and slightly neutral highlights, a small black crush, red/blue channel offset growing to the edges (chromatic aberration), and digital luma and chroma noise. Then a soft bloom: a 1/16-size copy screened on top at 20%.
- Caption: the challenge text, lowercase, in Excalifont, with a rough.js underline in the mission colour. Meta line: "name · date · time · #frame". A small pink "roll call" sticker bottom right.
- Mission colours: shared shot #3A57FF, hunt #FF7A1F, wildcard #FF4F9A, night/birthday/big-day challenge #FF7A1F, recreate #7A4FD0, Roll Call #16151A.
- Until the reveal, your own shots appear only as orange negatives (CSS invert + sepia + hue-rotate) on a film strip. The reveal plays a staggered negative-to-positive develop animation, respecting reduced motion.

Test it on real faces before shipping. The flash grade has only been checked on stock photos.

## Copy rules

Research behind these is in `docs/research.md`.

- Short and plain. Buttons are one or two words: Shoot, Swap, Snooze 1h, Going home, Reveal now, Back it.
- No slang, no jokes that have to land, no exclamation marks, no talking like the user's best friend.
- Status tags only for real status, as short adjectives in one style: Live, Upcoming, Revealed, plus "late" and "away" in the reveal. No decorative stickers.
- Names are added as chips (type, Enter; Backspace removes the last; pasted comma lists split). People can also join a group from its link.
- Current headline: "Every angle, all at once." Subline: "Call roll and everyone shoots the same moment. You see it all the next day." This is a placeholder. The owner isn't sold on it; earlier candidates were "Every angle of the night" (rejected: excludes daytime events) and "The group camera" (rejected: says nothing).

## Design

Scrapbook UI over a clean base: a dotted notebook page, white cards held on with washi tape, hand-drawn marks used sparingly for emphasis (rough-notation circles and underlines, tally marks), one bold pink Call roll button.

- Tokens: copy the `:root` block from the prototype. It defines light and dark themes (dark mode is required).
- Fonts: Bricolage Grotesque (display, variable width 78–85), Instrument Sans (body), Excalifont (handwriting, OFL; taken from the `@excalidraw/excalidraw` package, Latin subset).
- Libraries: roughjs 4.6.6, rough-notation 0.5.1.
- Phone first, single column, max width 560 px, safe-area insets respected.

## Build plan

Recommended stack: Next.js (App Router) + TypeScript, Supabase (Postgres, Auth, Storage, Realtime), deployed on Vercel. Installable web app (PWA) first; native later only if groups keep using it.

1. **Foundations.** Supabase project, schema, row-level security, auth. Sign-in by magic link or anonymous session upgraded later; a group invite link adds you to the group.
2. **Groups and events.** Create group (chip input), join by link, create event (type, dates, who's coming, honoree, pace), away cards.
3. **Capture.** Camera via `<input capture>`, `develop()` ported to a module (consider a Web Worker), upload to Storage, negatives strip.
4. **Roll Call.** Server-side rules (below), realtime alert, answer and late logic, snooze, going home, ask and back, nudges.
5. **Push.** Web Push with VAPID keys; service worker; subscription per device. iPhone only receives web push when the app is added to the home screen (iOS 16.4+), so onboarding must walk people through installing it.
6. **Challenges and recreate.** Port the deterministic assignment functions and the decks.
7. **Reveal.** Scheduled reveal (cron or `revealed_at` check on read), moments view, people view, recreations side by side, develop animation.
8. **Polish.** Sample event, try-the-look, empty states, dark mode, accessibility pass.

### Things the prototype fakes that production must do properly

- **Sealing is UI-only in the prototype.** Production must not serve other people's photos before the reveal: Storage access through signed URLs or RLS that checks `now() >= reveal_at` for anyone but the photo's owner.
- **Roll Call rules must be enforced on the server**, in one transaction (a Postgres function): budget, reserved call, one per person, cooldown, backed extras. Two people pressing at once must not both succeed.
- **Photos are stored as base64 in documents in the prototype.** Use Storage objects and keep only paths in rows.
- **HEIC and EXIF orientation:** iPhones can hand over HEIC; make sure decoding and orientation work before grading.
- **Timezones:** event dates are local. Store the group's timezone and compute reveal times from it.
- **Privacy:** no face recognition (deliberately avoided; biometric data). Let people delete their own photos, and an event. Add reporting and removal for anything posted in a group.

## Suggested schema

```
groups(id, name, created_by, created_at, invite_code)
group_members(group_id, user_id, display_name, joined_at, away_card_path)
events(id, group_id, type, name, start_date, end_date, honoree_member_id, pace, revealed_at_override, created_at)
event_members(event_id, member_id)
photos(id, event_id, member_id, day, kind, mission, frame, storage_path, roll_call_id, late, recreate_id, starring, hunt_tag, hunt_order, wild_cat, created_at)
roll_calls(id, event_id, caller_member_id, called_at, reserved, extra, recipients uuid[], day)
member_status(event_id, member_id, snooze_until, home, home_at)
extra_asks(id, event_id, requester_member_id, asked_at, used)
extra_backs(ask_id, member_id, backed_at)
swaps(event_id, member_id, day, count)
push_subscriptions(user_id, endpoint, keys, created_at)
```

## Open questions for the owner

- Headline (see Copy rules).
- Who can trigger an early reveal: anyone, the host, or a majority?
- Keep Matisse's Dance? It breaks the clothed-paintings rule.
- Business model: printed photobook after the reveal is the obvious one (POV already sells these), or paid larger groups.

## Assets and licences

- `prototype/samples/`: photos from Unsplash under the Unsplash License, used for the sample event and hero. Credits in `docs/credits.md`. Names in the sample are invented.
- `prototype/art/`: public-domain paintings via Wikimedia Commons. American Gothic (US public domain from 2026) and Matisse's Dance (UK and EU public domain from 2025) are recent; confirm before launch. The Creation of Adam is cropped to the hands.
- Excalifont: SIL Open Font License.
