# Roll Call: design simplification (mobile UX and visual)

Labels: [O] observed in code or the states-before screenshots. [P] my opinion. No user research was run; nothing here is a user finding.

## What I checked

[O] Landing (01) is the only signed-in-or-out screen apart from /sample that loads stock images (report.json: DzGCdUlNJTU, 5jySMpqi6xk, TmTYtJ5RiN8 via `hero-collage.tsx`). They are developed into prints with invented captions ("stock photo pose", "mei's best portrait") and taped at -7, 4 and -2 degrees with lime, pink and blue tape (`.collage .pc`).
[O] Event page (10, 1914px tall at 390) stacks: header, iPhone alerts notice, How it works (4 steps, 2 of them about 2, 15 and 10 minute windows), Roll Call card, Your challenge (heading "Your challenge" plus a label "YOUR CHALLENGE" on the first mission), Recreate ("Zoe's directing" although Zoe is "not joined"), So far.
[O] Incoming call (12) is `.alert`, `position:fixed` at the bottom, 24px top radius, covering the Roll Call card and snooze chips. It carries a fourth sentence about upload windows.
[O] Failed upload (13): `PhotoRecovery` is rendered in `layout.tsx` before `{children}`, so "Saved on this device" sits above the back link and event title on every page. The item title is the raw burned caption "roll call · Hana Alexandra-Montgomery" (`roll-call.tsx`, `mission: \`roll call · ${caller}\``). Status notes appear in two places at once (panel plus blue Excalifont "Saved on this device. See waiting photos above.").
[O] Contributed (14): after answering, the only feedback is a negative and "develops at the reveal"; the disabled Call roll shows pink handwritten "A call just started. Try again in a minute.", which reads like an error.
[O] Reveal (15): both prints are still inverted negatives in the capture. The `.ph.wait` filter is applied in CSS until an IntersectionObserver swaps it to `.pop`; content is hidden behind JS and animation. Name pills overflow ("Hana Alexandra-Montgome", `.ph .tag` is `white-space:nowrap`). Zoe's away card is a full-width print tile in the masonry `.board`. Header card "It's out / 2" repeats the count twice.
[O] Six accents in use: pink, lime (shutter dot, tapes, alert, REVEALED pill), blue (tape, notes, focus), orange (challenge icon, late pill), purple (Recreate icon), plus film brown (`.strip`).

## 1. Image policy

Stay:
- Real user photos as prints (reveal `.ph`, lightbox) and the user's own negatives (`.neg`), because they are the product.
- Recreate painting references (`/prototype/art/*`), only in the director's Recreate panel and the reveal `.twoup`. They are content, not decoration.
- Away card selfies, but small (see reveal).

Go:
- `src/components/hero-collage.tsx` and its use in `src/app/page.tsx`; delete `.collage*` rules in `globals.css`. [P] Stock faces with made-up captions on the first screen read as fake, which conflicts with brief rule 5 "Never fake a photo".
- Decorative tilts on any image that is not a print: `.orig` rotate(-1.5deg), `.try-out img`, `.lightbox img` rotate.

Demo: one labelled "See an example" link on landing and on empty home, going to `/sample`, which already says "Real photos, made-up names" and credits Unsplash (`sample-view.tsx`). Stock images live only there. Remove the duplicate "See a sample" link from the signed-in home card (`page.tsx`), keep it only in the empty state. "Try the look" moves off the landing row (two secondary actions next to one primary) to the upcoming-event card, where it already exists.

Empty states: text plus one action, no images, no invented people. Home empty: "No groups yet." + New group, with "See an example" as a text link. Reveal empty: "No photos this time." Upcoming event: start time + Try the look.

## 2. Visual system

Keep (recognisable, warm): the print treatment from `develop()` on real photos; off-white `--print`; one pink accent; Bricolage for titles; the film-strip negatives before the reveal.

Change, in `globals.css`:
- Accent tokens: keep `--pink` as the only brand accent (Call roll, primary focus of attention). Drop `--lime` from UI: `button.shutter::before` dot becomes `var(--pink)` or is removed; `.alert .alert-go` becomes pink with `#16151A` text; `.pill.lime` (REVEALED) becomes the plain ink pill. Keep `--blue` only for `:focus-visible` outline. Keep `--orange` only for the "late" pill. Mission colours stay inside the burned-in print caption (brief rule 6) but leave the UI: replace `.dot-ic` coloured circles in `missions.tsx` and `recreate.tsx` with no icon, or a small neutral label.
- Washi tape: remove `.card::before` and the `.t-blue` / `.t-lime` variants; delete `--tape-*` tokens. If the owner wants one trace, keep tape only on the reveal header card. [P]
- Tilts: remove `transform:rotate(var(--r))` from `.ph`, `.away`, `.strip`, `.dot-ic`, and the hover rotations on `button:hover`, `.trip:hover`, `.callbtn:hover`. Prints sit straight in a grid.
- Dotted paper: keep `body` dots but quieter (`--dot` closer to `--paper`, e.g. `#E8E2D6` light, `#221F27` dark) [P], or plain paper inside event pages.
- Excalifont (`.hand`): only on the print itself (burned in) and, at most, the wordmark. Replace `.hand` in UI text ("3 left", "develops at the reveal", `note` status lines, `.nudge`, away card names) with body font. Status and errors must never be handwritten.
- Type scale: `h1` `clamp(3.1rem,14vw,5.4rem)` gives 50px at 320; event names take 2 to 3 lines (10, 14-320). Use `clamp(2rem,9vw,3rem)` on event pages; keep the large size only on landing. `h2` 1.9rem to 1.4rem. `.task` 1.6rem to 1.25rem. Body 16px, `.small` .92rem, `.label` stays.
- `.big` count numbers ("So far 0", "It's out 2"): remove; counts go in a text line.

## 3. Screen hierarchy

Invite (08, `join/[code]`). [O] Already close. Order: event name, "Priya's group · reveals Tue 3 Nov, 11:00", one line "Take a photo when a friend calls roll. See everyone's at the reveal.", primary "Join", secondary text link "Use email instead" if needed. Drop the card wrapper and "Sign in to join" heading. Show timezone only when it differs from the device.

Waiting, no call open (10). Order: back link and Details; event name; one meta line "Live · reveals Tue 11:00"; Roll Call card with primary "Call roll" and one line "3 left · anyone can call"; snooze and Going home folded into one "Snooze" control (a `details` or small menu) [P]; then "Your challenge" as a single collapsed row (task text plus Shoot); then "So far" as one line ("4 photos from 3 people") opening to the negatives. How it works: reduce to one dismissible line, "When a friend calls roll, take a photo. Nobody sees them until Tue 11:00." The iPhone alerts notice becomes a one-line link under the meta line. Remove the `rc-dots` (duplicates "3 left").

Incoming call (12). Replace the fixed `.alert` overlay with the Roll Call card itself becoming the call state, moved to the top of the page under the title, so nothing overlaps. Order: "Hana called roll", "18:49 · 1:58 left to be on time" (after 2 minutes: "Late, still counts until 19:04"), primary "Take photo" full width, "Not now" text link. Call roll is hidden while you have an unanswered call, so answering outranks starting. Remove the 15/10-minute sentence. Multiple open calls: one card per open call, newest first, each with its own Take photo (the review notes the UI picks only one today). Keep `role="alertdialog"` off; use a heading plus `role="status"` announcement so it does not trap focus.

Sending and failed (13). Move `PhotoRecovery` out of the top of `layout.tsx`: on event pages, show the pending item inline where the photo was taken (inside the call or challenge row); elsewhere, a compact bar below the page header ("1 photo not sent. Open"). Item label: "Your photo for Hana's Roll Call, 18:49", not the caption string. States: "Sending…", "Sent", "Not sent. Saved on this phone." Buttons: Retry (primary), Save copy, Discard (text, with confirm). Intro text cut to one sentence: "Keep Roll Call open and it will send." Remove the duplicate blue note in `roll-call.tsx` and `missions.tsx`.

Contributed (14). Card shows "You answered Hana's Roll Call" plus the negative, and "Everyone's photos open Tue 3 Nov, 11:00." No progress, no counters of who has not shot. The one-minute guard message must not show to someone who did not try to call; show it only after a press, in body font, neutral colour: "Someone just called. Try again in a minute."

Reveal (15). Show positives by default: delete `.ph.wait` filter and the "wait" class; if the develop animation stays, run it once on `.pop` only when motion is allowed, and never block content. Order: event name; one line "2 photos · 1 Roll Call · revealed Tue 11:00"; Roll Calls grouped per call ("Hana's Roll Call, 18:49"), photos in a straight 2-column grid with the name as a caption below each photo (not an overlapping pill); missing people as one muted line under the group ("Zoe missed it") or 40px avatar chips, not a full `AwayCard` tile; then challenges; then Recreate side by side. Moments/People tabs: keep, [P] People could fold. Lightbox: Save, Close, and a visible "More" for Delete and Report (`photo-actions.tsx`), all at 44px. End with Next up / Plan the next one (already present).

Prompts and Recreate. Challenges are secondary: one collapsed row under Roll Call ("Your challenge: The drink that was a mistake" + Shoot), Swap inside the row. Remove the duplicate "YOUR CHALLENGE" label. Recreate shows only to the director, folded behind "You're directing a recreation"; non-directors see nothing, or one muted line. Do not choose a director who has not joined (observed: "Zoe's directing", Zoe not joined). This is logic, flag to the engineer.

Copy: no exclamation marks found [O]. Changes: "Shoot" to "Take photo" on calls; "Printing…" to "Saving…"; "N people are included for alerts. Delivery depends on their phone settings and connection." to "Alerts go to 3 people."; "It's out" to "Revealed".

## 4. Accessibility risks

- 320px: h1 size above; `.ph .tag` nowrap overflows on long names [O]; `.who` grid with long names is fine; `.alert-t` wraps to 2 lines with long caller names [O].
- 200% zoom: fixed `.alert` plus 50px titles leave the alert covering most of the viewport with no scroll inside it [P, likely]; `.lightbox img max-height:72vh` plus actions can push buttons off screen.
- Contrast: pink `#FF4F9A` on white is about 3:1, used for `.error` and `.hand` text (fails 4.5:1 for small text). Disabled `button:disabled{opacity:.45}` on the pink Call roll gives grey text on light pink [O]. Lime pill with ink text passes. Muted `#615C67` on white passes.
- Touch targets: `.neg .x` 20px, `.chipv button` 22px, `.chip` about 36px, `button.sm` about 36px, `a.link` about 36px. Raise to 44px hit areas.
- Safe areas: `viewportFit:"cover"` but `body` has no `env(safe-area-inset-top)` padding; installed PWA content can sit under the status area [risk, not device-tested]. Bottom and sides are handled.
- Reduced motion: the global rule kills animations, and `.ph.wait` filter is scoped to no-preference, so reduced-motion users get positives [O]. With motion on, prints depend on IntersectionObserver.
- Focus order: the recovery panel and the fixed alert come before or after the page in DOM in ways that do not match visual order; `role="alertdialog"` without focus management. Lightbox has `autoFocus` on Close but no focus trap or return.
- Images: `.neg baked` in So far have `alt=""` with no name association; fine if the row name precedes them.

## 5. Risks of simplifying

- Losing tape, tilt and handwriting may make it look like a generic utility; the print treatment has to carry the identity alone. [P] Test with the owner on real photos before removing everything.
- Removing the landing collage leaves new visitors with no picture of the result above the fold. Mitigation: one real-looking sample print linked to /sample, clearly labelled, or the "See an example" link only.
- Folding challenges and Recreate may cut their use; the brief calls challenges "the hook". [P] Keep them one tap away, not hidden on another page.
- Removing the develop animation removes a reveal moment people may enjoy. Keep it as enhancement only.
- Small away chips may make missing people feel erased; keep the reason text.
- Moving the recovery panel inline risks people missing unsent photos on other pages; keep a compact global bar.
