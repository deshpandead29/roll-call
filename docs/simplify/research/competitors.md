# Roll Call: competitor and differentiation analysis

Accessed 2026-11-02 unless stated. Read against branch `claude/simplify-roll-call` (HEAD 1aaa25c): CLAUDE.md, README.md, docs/research.md, docs/simpler-calls-review.md. No repository files were edited.

## Evidence labels

- **[P]** current primary source (company site, store listing, official help), read on 2026-11-02. Marketing and store copy are what the company *claims*, not observed usage.
- **[T]** third-party reporting or research.
- **[R]** claim already in Roll Call's `docs/research.md`; marked "rechecked" where I re-read the source today.
- **[H]** my design hypothesis. Not user research. Simulated reasoning is not evidence of what friends will do.

All web pages were read through an automated fetch-and-summarise tool, so "quotes" are short excerpts from those summaries, not hand-copied. Spot-check anything load-bearing before quoting it publicly.

## Access problems (stated, not worked around)

| Source | Result |
|---|---|
| https://help.bereal.com/ (redirects to /hc/en-us) | **HTTP 403 for both curl and the fetch tool.** Article https://help.bereal.com/hc/articles/7350386715165 also returned 403. All BeReal help-centre content below comes only from **search-engine snippets** of those articles, not from reading them. Treat as weaker than [P]. |
| App Store screenshot captions (BeReal, POV) | Not readable. The page returned placeholder images only. No screenshot claims are made. |
| WhatsApp FAQ "How to send media..." (https://faq.whatsapp.com/453914586839706/?cms_platform=iphone) | Page loaded only its title. HD details come from search snippets of WhatsApp FAQ pages. |
| https://faq.whatsapp.com/1050939995584416 | "Page not found". |
| Lense App Store listing | Not located with a verified ID, so not used. |
| POV pricing page | Not read. Prices below come from the App Store in-app purchase list only. |

**Correction to the brief:** https://apps.apple.com/US/app/id1636032890 is **POV – Disposable Camera Events (Untitled Tech, Inc.)**, not BeReal. `docs/research.md` labels it correctly as POV. BeReal's listing is https://apps.apple.com/us/app/bereal-real-moments/id1459645446.

## 1. What each product does today

### BeReal

- [P] bereal.com: "a random two-minute window" every day, "a global ritual"; "signature front-back format"; rejects "filters, staging, and uploads". No feed, groups or new features described on the homepage. https://bereal.com/
- [P] App Store (id1459645446): name "BeReal: Photos & Friends Daily", seller BeReal, free, 4.8 from 1.2M ratings, Editors' Choice, 13+, "Contains advertising". Description: one notification a day at a random time, everyone has the same two-minute window; "The camera snaps both the front and back simultaneously"; "Post on time or post late—it still counts"; comments and RealMojis; feed private by default with an option to go public. No events or groups in the description. Version 4.99.0 released ~9 hours before access; release notes for every listed version are the same boilerplate, so they reveal nothing about features. Privacy label: user content, identifiers and usage data "used to track you"; purposes include third-party advertising. https://apps.apple.com/us/app/bereal-real-moments/id1459645446
- [snippet of help centre] One "Time to BeReal" notification per day with two minutes to post; you can post later but "your friends will know you posted late"; a late post locks Bonus BeReal; Bonus BeReals are kept in Memories. https://help.bereal.com/hc/articles/7350386715165 , https://help.bereal.com/hc/articles/10388190752669 (both 403 on direct access)
- [T] American Academy of Pediatrics (page updated 2025-02-27): front and back cameras together; two minutes; late posts marked late; **users must post their own BeReal before they can view friends' posts.** https://www.aap.org/en/patient-care/media-and-children/center-of-excellence-on-social-media-and-youth-mental-health/glossary-of-digital-media-platforms/bereal-details-and-available-settings/
- [T] RealGroups (private groups, reported max two at a time) launched Dec 2023. https://techcrunch.com/2023/12/12/bereal-adds-private-groups-and-live-photo-like-features-pew-estimates-13-of-us-teens-use-app/ , https://www.engadget.com/bereal-which-still-exists-gets-tags-private-groups-and-a-2023-recap-120041785.html . A July 2024 App Store review reports group chats disappearing (one user's report). Whether RealGroups exists today is **unverified**.
- [T][R rechecked] Voodoo bought BeReal for €500m, 11 June 2024. Voodoo claimed 40M "active users" (period undefined); BeReal claimed 20M DAU in April 2023; the NYT cited an analytics firm estimating a 61% fall in daily use, from ~15M (Oct 2022) to under 6M (Mar 2023). https://engadget.com/bereal-the-buzziest-app-of-2022-has-been-bought-by-a-mobile-game-publisher-175016152.html
- [T][R rechecked] CB News, 15 June 2026: for the World Cup (11 June to 19 July 2026) BeReal lifted the daily post limit and sent personalised notifications at key moments for a user's team. https://www.cbnews.fr/node/101664 . Interpretation [H]: BeReal itself moved towards *event-triggered* prompts for a shared occasion.
- [T][R rechecked] Pinch, Fiers, Birnholtz, Fisher & Reilly, *New Media & Society* (2024), interview study of young adult users: over time people delayed posts to catch a more interesting moment and ignoring the notification became socially acceptable. Sample size not given in the summary I read. https://thesocietypages.org/discoveries/?p=12000

### POV

- [P] App Store id1636032890: "POV – Disposable Camera Events", subtitle "Guest photos: wedding & party", Untitled Tech, Inc. Host sets a photo limit per guest; photos revealed during the event or the next day; QR code and link; guests "don't have to download this app to participate". 4.9 from 16K ratings. Free with in-app purchases ("More Participants" $4.99 to $89.99). Version 5.76. https://apps.apple.com/US/app/id1636032890
- [P] pov.camera: create an event, "Choose a style, how many photos each person takes, when photos reveal to guests"; guests "scan a QR code once to get a disposable camera on their phone"; "POV uses App Clips on iOS and a web-based experience on Android"; host can "review and delete guests' photos at any time"; a 6x9" softcover photobook designed by POV; sold-separately "POV Block" (a wooden block guests tap to open the App Clip). No live slideshow mentioned. https://pov.camera/ , https://pov.camera/disposable-camera
- Unverified: "free up to 10 guests" appears only in a customer review and third-party sites.

### Lense

- [P] lense.app: positions for weddings, holidays, parties and professionals; "Used by 100.000+ happy couples, parties and event organizers" (company claim). Set up in "less than two minutes"; QR code or link; guests enter a name, no app or account; per-guest photo limit or unlimited; instant or delayed reveal, or private; host reviews and deletes before reveal; Live Photo Wall (paid add-on); optional film filter; one-click download; files kept 12 months; free trial up to 7 guests; camera on the lock screen (iPhone only). https://lense.app/
- [P] Trip page: set up with destination and dates; join once, then shoot **offline**, upload later; most popular option is keeping everything hidden until the group is home; relatives can follow live. https://lense.app/disposable-camera-app-for-vacations

### The default: phone camera + group chat + shared album

- [snippets of WhatsApp FAQ] HD is chosen per message; HD is clearer but uses more data and is slower; on iPhone "media files are usually compressed when shared". https://faq.whatsapp.com/453914586839706/ , https://faq.whatsapp.com/812276063311533/
- [P] Google Photos: shared albums by contact, link or QR code; recipients "even if they don't use the Google Photos app" can open a link; anyone with the link can view and add; push and in-app notifications for app users. https://support.google.com/photos/answer/6131416
- [P] Apple Shared Albums (support page as served today): participants can add photos and comments if allowed; in iOS 27 and later, people can join by link from Apple or non-Apple devices and contribute on the web without an Apple Account; full-resolution sharing from iOS 27; **temporary albums deleted after 30 days**; notifications when photos are added. https://support.apple.com/en-us/108314 . This means the free, built-in alternative now covers "join by link, no app" for iPhone-centred groups. [H]

## 2. Comparison by stage

| Stage | BeReal | POV | Lense | Camera + chat + shared album | Roll Call (branch today) |
|---|---|---|---|---|---|
| Entry / invite | Install app, account, add friends one by one [P] | Host buys/creates event in app; guests scan QR or tap link; App Clip/web, no install [P] | Host sets up on web in <2 min; QR/link; guest types a name [P] | Chat already exists; album via link/QR; no new install on Google Photos link or iOS 27 Apple link [P] | Group or event link → email sign-in → name → optional alerts; iPhone push needs Add to Home Screen (iOS 16.4+) [repo] |
| First useful action | Post own photo, which unlocks the feed [T AAP] | Take a shot | Take a shot | Take a photo, drop it in the chat | Shoot a challenge, or answer a call |
| Capture | Front + back simultaneously, in-app only, no uploads/filters [P] | In-app disposable camera, limited shots, no retakes per third parties [P/T] | In-app camera, optional limit, filter, offline capture [P] | Native camera, unlimited, any edit | In-app capture via file input, print look burned in, 2-min/15-min call window |
| Waiting | Feed blurred until you post [T] | Shots hidden until host's reveal time [P] | Hidden until reveal (popular: until home) [P] | None. Photos appear instantly, often buried in chat | Tiny negatives visible; reveal next day 11:00 |
| Viewing / reveal | Daily feed of friends; RealMojis, comments [P] | Gallery at reveal; host export; photobook upsell [P] | Shared album, one-click download, Live Photo Wall [P] | Chat scroll + album; no moment | Moments + people views, side-by-side, develop animation |
| Missing participation | Absent = no post; late = labelled late; can't see others until you post [P/T] | Nothing visible; photos come from whoever shot [H from listing] | Same as POV [H] | Invisible; usually the same 1–2 people shoot [R, brief's own premise] | Missed call slot shows away card or "missed"; challenges just absent |
| Reason to return | Daily random notification + social obligation [P]; weakened over time [T Pinch; T NYT/Engadget] | Next event the host pays for; photobook [P] | Next trip/event [P] | Habit already exists; nothing new needed | Next event in the group; reveal ends on "Plan the next one" [repo] |

## 3. Patterns worth borrowing (job → does Roll Call have it → simpler version)

1. **Join with no install (POV App Clip, Lense web, Google/Apple album links).** Job: zero friction for guests who will use it once. Roll Call has this job more than POV does, because a call depends on *every* guest being reachable. Simplest fit [H]: let an event link open straight to a camera with a typed name (anonymous session, already in Roll Call's auth plan), and defer email and home-screen install until *after* the first photo. Roll Call cannot match App Clips as a web app, and push on iPhone still needs the home-screen step; that gap is structural.
2. **Reciprocity gate (BeReal: post to see).** Job: turn lurkers into posters. Roll Call has the same job at the reveal. Simpler version [H]: none needed before the reveal (everything is already sealed). An option worth testing: at reveal, people who contributed nothing see the album too (a friend group shouldn't be punished), but the *order* of the reveal leads with moments where most people shot. Do not add a hard gate without testing; a missing guest at a birthday is a friend, not a lurker.
3. **Shared time window with a "late" label (BeReal).** Job: synchronise a moment and make lateness acceptable rather than failure. Roll Call already has 2 min / 15 min late. Keep it. Pinch et al. suggest windows soften socially over time, so don't add more rules to defend it.
4. **Host-set shot limit (POV, Lense).** Job: scarcity, so each shot matters and the album is small enough to enjoy. Roll Call's equivalent is the call budget. The simpler move [H] is to make the budget the only number guests see ("2 calls left"), and drop any other counters.
5. **Reveal at a set time (POV next day, Lense "when home").** Job: anticipation and a single shared viewing moment. Roll Call has it. Lense's evidence that "hidden until home" is its most popular trip setting is a company claim but supports the delayed reveal for trips.
6. **Host review/delete before reveal (POV, Lense).** Job: weddings and paid events need a curator. Roll Call's friend groups have weaker need; owners deleting their own photos plus report/remove is probably enough [H].
7. **Physical/shared surface (POV photobook, Lense Live Photo Wall).** Job: monetisation and a group viewing ritual. Roll Call's brief already lists a photobook as the obvious business model. Not a launch priority.
8. **Offline capture with later upload (Lense).** Job: trips and venues with bad signal. Roll Call's branch just added on-device persistence and retry, which matches.

### Not relevant, or only partly

- **BeReal's daily feed: not relevant.** Its job is a daily check-in with your wider friend graph; Roll Call's decision 1 (event-based, not everyday) rejects that job, and third-party data shows daily usage fell sharply after the 2022 peak [T]. BeReal's own 2026 World Cup change (more posts, notifications tied to live moments) moves *towards* Roll Call's event model, not away from it [T].
- **Dual camera: partly relevant, as a job not a feature.** Its job on BeReal is proof of context and putting the poster in their own picture. Roll Call's founding problem is "the person taking photos never appears in them". But a web app can't reliably capture both cameras at once (the platform offers the file input the branch uses), and copying it would look like a BeReal clone. Simpler versions [H]: a selfie *option* when answering a call, or a recurring challenge that puts the shooter in frame. Not recommended for v1.
- **RealMojis, friends-of-friends, public feed, ads**: not relevant to a private, occasion-scoped album.
- **Branding, copy, visual identity**: do not borrow. The "Time to BeReal" alert pattern is BeReal's; Roll Call's "Priya called roll" (a friend, not the app) is already distinct and better suited to small groups [H].

## 4. Evaluating the job and loop

Proposed job: *"Get your friends' perspectives from an occasion, then enjoy them together."* Loop: event invite → easy contribution → shared anticipation → enjoyable reveal → voluntary use at another suitable occasion.

The job is plausible and matches what POV and Lense already sell (company claims of 16K App Store ratings at 4.9, and "100.000+" users). So the category is real [P, marketing]. Roll Call's job is not new. Its differentiator has to be *how* the perspectives are gathered and revealed.

**Why use this instead of a group chat?** Evidence is indirect. Chat photos arrive instantly and are compressed by default on WhatsApp [snippet]; there is no moment, no sealed reveal, and no prompt for the non-photographer. [H] The reasons that could be strong enough: (a) a prompt *from a friend* makes the quiet people shoot; (b) the delayed, collective reveal is a second event; (c) the album stays small and ordered by moment instead of 400 chat images. Against: the chat is already installed and Apple/Google albums now join by link with no app [P]. Roll Call must cost less effort per photo than a chat, or it loses.

**What does simultaneous capture add?** [H] One scene from several angles, side by side, which neither POV/Lense nor chat produce (they collect shots spread over the evening). It also puts the usual photographer in someone else's frame. No evidence yet that people value this enough. This is the claim to test first.

**Will photos be repetitive when everyone is together?** [H] Likely, in a small room: five near-identical shots of one table. Mitigations: the reveal shows a moment as one grid (repetition becomes the point: "everyone, same second"), and the call works best at moments with motion or spread (a toast, a dance floor, arriving at a viewpoint). Untested.

**Better when friends are at the same occasion but dispersed?** [H] Probably yes: a festival, a big party across rooms, a wedding with separate tables, a trip day where the group splits. That is where "from where you are" produces different pictures and where a chat feels intrusive. Fully remote friendships are a different product (BeReal's) and should not be optimised now.

**Is the reveal worthwhile at half participation?** [H] For a group of 6–10, three or four angles per moment is still something chat doesn't give. Two angles is weak. The branch's away card / "missed" slot makes absence visible; for friends that may read as shaming. Suggest: show only who shot, and drop missing-slot placeholders unless testing shows people like them. Lense's and POV's albums also simply omit non-shooters [H from their listings].

**Optional prompts vs coordinated calls?** [H] Prompts are lower-pressure and can be done any time, which suits Pinch et al.'s finding that people prefer choosing their moment. Calls are the differentiator but carry social cost and depend on push (fragile on iPhone web). A reasonable test: ship calls as the single core mechanic, keep at most one optional prompt per person per event, and measure which one gets answered. Don't carry decks, hunts, wildcards, recreations and seasons into v1.

**First audience.** [H] One existing friend group of roughly 5–12 people, aged ~20–35, already in a group chat, at an evening occasion where they spread out: a house party, a night out across venues, or a birthday party. One person (the organiser) is motivated enough to share the link.

### Recommendation: one focused initial use case

**A friend's party or night out (one evening, 5–12 friends, reveal next morning).**

- Not weddings (POV/Lense own the host-pays, QR-on-the-table market, guests are strangers to each other, and hosts want curation).
- Not long trips (multi-day budgets, offline, timezone and daily-reset complexity; Lense targets this directly).
- Not remote friendships (that is BeReal's daily job).
- Birthdays fit inside "party" without special rules (the branch already removed the reserved honoree call).

**Differentiation to state:**

- vs **POV / Lense**: they are disposable cameras that a *host* sets up for *guests*; the shots are spread over the event. Roll Call is for a *friend group*, where *any friend* can call a moment and everyone shoots it at once; the reveal is organised by moment, side by side. No host curation step, and the same group carries over to the next occasion.
- vs **group chat / shared album**: the chat gets the photographer's photos, instantly and unordered. Roll Call gets *everyone's* angle on the same few moments and saves them for one reveal the next morning.

### What to measure in a first test (not yet measured anywhere)

Share of guests who answer at least one call; median answers per call; % of shots that are calls vs prompts; % of guests who open the reveal; whether the same group starts a second event within 30 days. `docs/research.md` notes that nothing in the app measures these today.

## 5. Simplifications this research supports (hypotheses for the owner)

- Lead with one mechanic (the call) and one payoff (moment grid at the reveal). Fold challenges to one optional prompt; park Recreate, hunts and wildcards.
- Let a guest shoot before creating an account (POV/Lense pattern).
- Show only real photos from this group in the app. The sample-photo hero collage (`src/components/hero-collage.tsx`, used on `src/app/page.tsx`) and painting art are where "images plastered everywhere" probably comes from [H, repo inspection only]. Competitors' value is the guests' own photos.
- Do not adopt BeReal's daily feed, dual camera, branding or copy.
