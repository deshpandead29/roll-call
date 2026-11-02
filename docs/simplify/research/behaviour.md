# Roll Call: behavioural review (participation, enjoyment, healthy repeat use)

Reviewer role: behavioural researcher. Scope: branch `claude/simplify-roll-call`, checkout `/tmp/claude-0/-home-user-roll-call/15b9f4a8-4695-5f86-a86d-c946448b0229/scratchpad/simplify`. No repository files were edited. All sources accessed 2026-11-02 unless stated.

Labels used throughout:
- **[V] Verified**: I opened the primary source, or its abstract via PubMed/Crossref/the publisher, and it says what is stated here.
- **[T] Third-party**: I could only reach a press release, blog or secondary summary; the claim rests on that.
- **[H] Hypothesis**: my inference for Roll Call. Not tested by any study cited.

Nothing below is a benchmark for Roll Call. No figure is invented; where I couldn't open a paper I say so and use only the abstract.

---

## 1. Recheck of docs/research.md, "Interest over time"

| # | Repo claim (paraphrased) | Source opened | Status | Overstated? |
|---|---|---|---|---|
| 1 | NN/g tested tutorials with 70 users on 4 iPhone apps: success 91% with vs 94% without (n.s.); readers rated tasks harder, 4.92 vs 5.49 of 7, p=0.047; advise brief in-context help. | https://www.nngroup.com/articles/mobile-tutorials/ (Kendrick, NN/g, 8 Mar 2020) | **Verified.** 35/35 split; success p=0.443; SEQ 1=very difficult, 7=very easy; recommends contextual help and an easy UI. | No. Worth adding NN/g's own caveat: four iOS apps only, may not generalise to Android. Also note the current `how-it-works.tsx` card has **four** items, not the "three lines" the doc says. |
| 2 | NN/g empty states: communicate status, provide learning cues, direct pathways for key tasks. | https://www.nngroup.com/articles/empty-state-interface-design/ (Kaplan, NN/g, 19 Sep 2021) | **Verified** (the three headings match). | No, but it is an expert guideline about complex applications, not a study. Fine as tagged. |
| 3 | iOS web push needs iOS 16.4+, Home Screen install, permission from a direct tap. | https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ (WebKit, 16 Feb 2023) | **Verified.** "A web app that has been added to the Home Screen can request permission"; request must be "in response to direct user interaction". | No. The post is from 2023 and describes the 16.4 beta; current iOS behaviour should be rechecked on devices before the study (not done here). |
| 4 | "Anticipation is felt more strongly than memory." Five experiments. Used to justify countdowns and "Sam's 30th is today". | PubMed 17500652 (via NCBI E-utilities; the PubMed web page needed cookies). Van Boven & Ashworth, *J Exp Psychol Gen* 2007;136(2):289–300, doi:10.1037/0096-3445.136.2.289 | **Verified (abstract).** | **Partly overstated in application.** The finding covers negative and routine events too (annoying noises, menstruation): anticipation intensifies emotion in *both* directions. It compares anticipating vs recalling the same event; it did not test countdown UIs or reminders. Applying it to a pending buzz also implies anticipatory dread is possible. The link "therefore countdowns help" should be labelled inference. |
| 5 | Peak-end: Kahneman et al. 1993; Alaybek et al. 2022 meta-analysis, 174 effect sizes, large effect. Reveal ending on "Plan the next one" is inference. | https://ideas.repec.org/a/eee/jobhdp/v170y2022ics0749597822000334.html (OBHDP 170, 104149, doi:10.1016/j.obhdp.2022.104149) | **Verified (abstract summary)** for Alaybek: 174 effect sizes, strong support, peak-end effect r = 0.581 (95% CI 0.487–0.661), duration effect ~nil. **Kahneman 1993 not opened**; the repo cites it via Wikipedia, which is a secondary source. | No, and the doc already flags the app generalisation as its own. Note the meta-analysis concerns *retrospective evaluation of an experience*, not return behaviour. |
| 6 | Airship: 63 million new users; 190% higher retention for users receiving ≥1 push in first 90 days. Correlational, vendor. | Repo URL https://www.airship.com/resources/benchmark-report/how-push-notifications-impact-media-app-retention-rates/ now resolves to a resource index with no such figure. Found the original: https://www.airship.com/newsroom/new-urban-airship-mobile-app-retention-study/ (press release, 16 Feb 2017; users who first opened an app Sep 2016, tracked to Dec 2016). | **Partially verified.** Figures confirmed in Airship's 2017 press release; **repo link is dead/redirected**. | Wording is cautious, but it should give the 2017 date, the dead link, and the comparison group (users who got *zero* pushes, a self-selected group). Strength "weak" is right. |
| 7 | BeReal DAU down ~50–60% from Oct 2022 peak by early 2023 (Apptopia via NYT); BeReal disputed. | https://platformer.news/how-bereal-missed-its-moment (Newton, 25 Apr 2023). PetaPixel URL returned **HTTP 403** (could not access). | **Partially verified.** Platformer, citing NYT 13 Apr 2023 and Apptopia: down 61%, ~15M (Oct 2022) to <6M (Mar 2023). BeReal's 23 Apr 2023 post claimed ~20M daily users. | Slightly understated range ("50 to 60%" vs 61% in Platformer). More importantly, "supports keeping Roll Call event-based" is inference: a DAU decline in one app doesn't show event-based apps retain better. |
| 8 | Braze: day-30 retention mostly 1.2–5%; Photo & Video 2.3% iOS, 1.2% Android (AppsFlyer via Business of Apps). | https://www.braze.com/resources/articles/mobile-app-retention-10-tip | **Verified** (sentence and table present; table attributed to AppsFlyer via Business of Apps). No date or method on page. | No, tagged as vendor. But D30 daily-app retention is the wrong yardstick for an event product (see section 4). |

Also checked from docs/research.md "Market": "BeReal users delayed posts and ignored the ping as rigid rules wore thin (Pinch et al., NM&S 2024)". The paper is real: Pinch, Fiers, Birnholtz, Fisher & Reilly, *New Media & Society*, 2024, doi:10.1177/14614448241267731 (Crossref abstract opened). **Partially verified**: abstract says 25 interviewees "resist BeReal's prompts" and "branding themselves and others as fake when they ignore BeReal's prompts"; the blog summary (Goldstein, The Society Pages, 10 Apr 2025, https://thesocietypages.org/discoveries/?p=12000) says ignoring the notification "became more socially acceptable". "As rigid rules wore thin" is the blog's framing, not in the abstract.

---

## 2. Evidence by theme

### (a) Notification interruption costs, receptivity, batching

- **[V] Pielot, Church & de Oliveira (2014)**, MobileHCI, doi:10.1145/2628363.2628364 (abstract from author PDF https://ic.unicamp.br/~oliveira/doc/MHCI2014_An-in-situ-study-of-mobile-phone-notifications.pdf). 15 users, one week: 63.5 notifications/day on average; typically viewed within minutes even in silent mode; **social pressure in personal communication** was among the main reasons; more notifications associated with more negative emotion, but more messages/social updates also made people feel more connected. Suggests personal-communication approaches should "focus on managing expectations".
- **[V] Mehrotra et al. (2016)**, CHI, "My Phone and Me", doi:10.1145/2858036.2858566 (UCL accepted PDF https://discovery.ucl.ac.uk/1502364/1/CHI16.pdf). 20 users, 10,372 notifications, 474 ESM responses. Response time and perceived disruption depend on presentation, alert type, **sender–recipient relationship**, and the user's current task; "even a notification that contains important or useful content can cause disruption".
- **[V] Stothart, Mitchum & Yehnert (2015)**, *J Exp Psychol Hum Percept Perform* 41(4):893–897, PMID 26121498. Merely receiving a notification (without interacting) disrupted an attention-demanding task, comparable to active phone use. Lab task, not social settings.
- **[T] Fitz, Kushlev, Jagannathan, Lewis, Paliwal & Ariely (2019)**, "Batching smartphone notifications can improve well-being", *Computers in Human Behavior* 101, doi:10.1016/j.chb.2019.07.016. **Could not access** paper or abstract (ScienceDirect 403; Crossref/OpenAlex have no abstract). Per co-author Kushlev's summary (Springer Nature Research Communities, 1 Aug 2019, https://communities.springernature.com/posts/batching-notifications-can-improve-attention-well-being-and-productivity): >200 people in India, 2 weeks, four arms; 3×/day batching improved attention, productivity, stress, mood vs control; hourly batching few benefits; **no notifications increased anxiety**. Treat as third-party until the paper is read.
- **[T] Dwyer, Kushlev & Dunn (2018)**, *J Exp Soc Psychol* 78:233–239, doi:10.1016/j.jesp.2017.10.007. Abstract not retrievable. Press/secondary summaries: restaurant field experiment (~300 people) where phones present lowered enjoyment of a meal with friends/family, plus experience sampling linking phone use during in-person interactions to more distraction and less enjoyment. **Most directly relevant to a Roll Call buzz at a dinner or party**, but third-party here.

### (b) Anticipation, delay, disposable-camera style reveal

- **[V] Van Boven & Ashworth (2007)**, above: anticipation more emotionally evocative than retrospection, for positive and negative events.
- **[V] Kumar, Killingsworth & Gilovich (2014)**, *Psychol Sci* 25(10):1924–31, PMID 25147143. Waiting for experiences is more pleasurable and exciting than waiting for material goods; people derive value from anticipation. Supports a next-day reveal as something to look forward to; it does not test photo reveals.
- **[V] Odom et al. (2014)**, CHI, "Designing for Slowness, Anticipation and Re-visitation: A Long Term Field Study of the Photobox" (PDF https://www.dourish.com/classes/infx161f14/readings/Odom-DesigningForSlowness-CHI2014.pdf). Three homes, 14 months; attitudes moved "from frustration to eventual acceptance"; photos prompted reflection and renewed interest in the collection. Tiny sample, different product, but a direct caution: **delay can frustrate at first**.
- **[V] Alaybek et al. (2022)**, above: retrospective evaluations weight peak and end; duration ~nil. Weingarten, Zauberman & Diehl (2021), *Cognition* 214:104750, PMID 33965783 **[V]**: temporal location of key moments affects how peaks and ends are evaluated (duration matters indirectly).
- No peer-reviewed study found of disposable-camera *apps* (POV, Lense, Dispo) and enjoyment. Evidence on those is press/vendor only.

### (c) Social pressure, obligation, FOMO in prompt-based photo sharing

- **[V] Pinch et al. (2024)**, above: users resist BeReal prompts to regain self-presentation control, yet label posts that ignore prompts as "fake" — the prompt becomes a social norm used to judge each other.
- **[V] Kim, Wolfe, Chordia, Davis & Hiniker (2024)**, PACM HCI, doi:10.1145/3686909 (Crossref abstract; arXiv 2408.02883). 29 users aged 13–18. Random daily notifications plus reciprocal posting discouraged staging and *reduced* self-presentation pressure; some found it limited, unappealing or "at times, even toxic". Adolescent sample.
- **[V] Barasch, Zauberman & Diehl (2018)**, *J Consumer Research* 44(6):1220–1237 (RePEc summary https://ideas.repec.org/a/oup/jconrs/v44y2018i6p1220-1237..html; full text paywalled). Taking photos **to share** lowered enjoyment relative to taking them for oneself, via self-presentational concern; moderated by how much people care about others' views and by **closeness of the intended audience** (direction not stated in what I could read).
- **[V] Pielot et al. (2014)**: social pressure drives fast responses in personal communication.
- FOMO: Przybylski et al. (2013), *Computers in Human Behavior*, doi:10.1016/j.chb.2013.02.014 exists (Crossref); **abstract not retrieved**, so I don't use its findings.

### (d) Participation inequality, partial participation

- **[T/expert] Nielsen (2006)**, "Participation Inequality", NN/g, https://www.nngroup.com/articles/participation-inequality/. 90-9-1 heuristic from Usenet/Wikipedia/Amazon data; recommends lowering the barrier, making participation a side effect, not over-rewarding the most active. Large open communities, not friend groups.
- **[V] van Mierlo (2014)**, *JMIR* 16(2):e33, PMID 24496109. In four health forums, <25% of actors posted; superusers produced ~75% of content. Author owns the sites (declared COI). Again open communities.
- **[T] Karau & Williams (1993)**, *JPSP* 65(4):681–706, doi:10.1037/0022-3514.65.4.681. Meta-analysis of 78 studies; social loafing robust; moderators include evaluation potential, task valence, group size (secondary summaries; abstract not opened). Relevance: in a group camera, people may assume someone else is shooting.
- No study found that measures how many contributors a shared photo album needs to feel worthwhile. **That is an open question for the field study.**

### (e) Photo-taking, enjoyment and memory

- **[V] Diehl, Zauberman & Barasch (2016)**, *JPSP* 111(2):119–40, PMID 27267324. 3 field + 6 lab experiments: photo-taking increases enjoyment of positive experiences **when it increases engagement**; less so when the experience is already highly engaging or when photo-taking **interferes** with it; negative experiences get worse.
- **[V] Henkel (2014)**, *Psychol Sci* 25(2):396–402, PMID 24311477. Photographing whole objects on a museum tour impaired memory for them; zooming in on a detail removed the impairment.
- **[V] Soares & Storm (2022)**, *Psychon Bull Rev* 29(6):2211–18, PMID 35854206. Impairment effect robust with multiple photos.
- **[V] Barasch, Diehl, Silverman & Zauberman (2017)**, *Psychol Sci* 28(8):1056–66, PMID 28650721. Freely taking photos improved visual recognition and reduced memory for what was heard; attention shifts to the visual.
- **[V] Barasch et al. (2018)**, above: sharing intention reduces enjoyment.

### (f) Dark patterns to avoid

- **[T] Gray et al. (2018)**, CHI, doi:10.1145/3173574.3174108 (exists per Crossref; content via secondary summaries): categories include **nagging**, obstruction, sneaking, interface interference, forced action.
- **[T] Mathur, Kshirsagar & Mayer (2021)**, CHI, doi:10.1145/3411764.3445610 (exists; not opened).
- **[T] Mildner et al. (2023)**, CHI, doi:10.1145/3544548.3580695: >16 h of screen recordings from Facebook, Instagram, TikTok, Twitter; "engaging" strategies (e.g. interactive hooks, social brokering) to keep people on the service (secondary summary only).
- Streaks: I found no peer-reviewed study I could verify on streak pressure (one 2025 Egyptian journal article on Snapchat streaks and teens surfaced in search, unverified). Treat streak harms as **plausible but not evidenced here**.

---

## 3. Applied to Roll Call

### Is the reveal worthwhile with half participation? [H, partly grounded]
- Participation inequality is the norm in shared content [T Nielsen; V van Mierlo], and diffusion of effort in groups is robust [T Karau & Williams]. Expect a few people to shoot most frames.
- The reveal's value depends more on **angle diversity** (≥2 distinct contributors per moment) than total count. Peak-end [V] suggests a short reveal with one strong moment is judged as well as a long one; duration barely counts. So a half-participation reveal can still be a good "peak" **if** it is not padded with gaps.
- Risk: build-reveal fills each missed call with an away card labelled "missed it" / "snoozed" / "home by 22:10" (`src/app/events/[id]/build-reveal.ts` lines 92–98, rendered in `reveal.tsx`), and hunt "holes" (`reveal.tsx` ~line 71). At 50% participation, half the Roll Call grid becomes absence markers. That makes the peak about who didn't show up. Hypothesis: collapse misses to a single line per call ("4 of 7"), and show away cards only when the person opted in.

### Do coordinated calls risk feeling like an interruption at a social occasion? [V evidence, H application]
- Yes, plausibly. Notifications disrupt attention even unanswered [V Stothart]; disruption depends on the current task and sender relationship and persists for useful content [V Mehrotra]; phones at a meal reduce enjoyment [T Dwyer]; photo-taking that interferes with an experience doesn't add enjoyment [V Diehl 2016].
- The *friend* as sender cuts both ways: higher social pressure to respond [V Pielot], and that is what the design leans on ("Priya called roll").
- Roll Call specifics that raise the cost:
  - Push is `urgency: "high"`, TTL 15 min, `renotify` (`src/app/api/push/roll-call/route.ts` line 41; `public/sw.js`).
  - In-app overlay is `role="alertdialog"` with a live countdown "m:ss to answer on time" (`roll-call.tsx` lines 362–374). "Not now" is stored only in component state (`dismissed`, line 104), so a reload within 15 minutes re-shows the modal.
  - Host extras are uncapped after the shared budget; only a one-minute guard (docs/simpler-calls-review.md §3; `roll-call.tsx` line 175). The recipients bear the cost of a host who keeps calling. The CLAUDE.md rationale ("the caller doesn't bear the cost, the recipients do, and they respond by muting") applies directly and the branch removed the counterweights (cooldowns, one-per-person, backing).
  - Calls can overlap (one-minute guard < 15-minute window).
  - Mitigation already present: snooze, "Going home", snoozed/home excluded from push, night nudge (hour < 6).

### Are optional prompts more enjoyable than coordinated calls? [H]
- No direct study. Evidence leans toward self-paced prompts being lower-cost: they don't interrupt [V Stothart/Mehrotra], they are taken when the person is already engaged (the enjoyment condition in [V Diehl 2016]), and batching beats constant interruption [T Fitz]. Coordinated calls carry the social-obligation load seen with BeReal [V Pinch].
- But a captioned challenge is a "shot for an audience", and sharing intent lowers enjoyment via self-presentation [V Barasch 2018]. The close-friend audience may soften this (moderator in that paper; direction not verified).
- Test both: the field study should log enjoyment per shot type.

### What does simultaneous capture add psychologically? [H]
- Plausible gains: a shared moment that is visibly co-constructed; perspectives of people who are usually behind the camera; a joint "peak" for the reveal. BeReal's reciprocal posting reduced self-presentation pressure in teens [V Kim 2024]; simultaneity may do the same.
- No study isolates simultaneity from the reveal itself. It is the most expensive mechanic (push, iOS install, timing) and its added value is unproven. **Measure it**: in the reveal, do people dwell on/keep/share Roll Call sets more than single challenge shots?

### Healthy, voluntary repeat use for an event product [H, grounded in V anticipation/peak-end]
- The right unit is **the next suitable occasion**, not D1/D30 opens. Braze-style D30 [vendor] is not a fit.
- Healthy loop: invite → contribute at least once without help → look forward to the reveal [V Kumar; V Van Boven] → reveal ends well [V Alaybek] → someone plans the next event voluntarily. Countdown and "X is today" are reasonable; keep them to one push each.
- Avoid: streaks, per-person counts, completion meters, re-engagement pushes between events.

### Features that risk pressure or guilt (file references)
1. **Public non-contributor list during the event**: "No shots yet: …names" and per-person shot counts in "So far" (`src/app/events/[id]/page.tsx` ~lines 394–428). Works like a leaderboard plus a shame list. [H; cf. evaluation potential in T Karau & Williams, social judgement in V Pinch]
2. **Per-call tallies** "N/M shot" (`page.tsx` ~line 442) and the "late" pill in the reveal (`reveal.tsx` line 59).
3. **Away-card "missed it"** labels in the reveal (`build-reveal.ts` 92–98). CLAUDE.md core decision 5 (never fake a photo) is sound; the reason label is the guilt surface.
4. **Countdown modal** "m:ss to answer on time", "Late, still counts", plus a technical line about 15- and 10-minute windows (`roll-call.tsx` 366–367). Time pressure + jargon.
5. **"Not now" not remembered** across reloads (`roll-call.tsx` 104, 372).
6. **Uncapped host extras** (`roll-call.tsx` 175, 316; migration `20261102000000_simpler_calls_and_invites.sql`). Escalation risk; nothing limits how often a host can buzz everyone.
7. **Start push copy** "X is today" / "Your challenge is ready." (`src/app/api/push/reveals/route.ts` line 19). Challenges are now "optional" (`how-it-works.tsx` item 3) but the push frames one as waiting for you. Minor obligation framing.
8. **Remaining-calls dots and "N left"** (`roll-call.tsx` 261–269): fine for scarcity, but "Last one. Sure?" nudges are caller-side and benign.
9. **How it works** has four items incl. upload-grace mechanics (`how-it-works.tsx` 36–39); NN/g [V] suggests less is better. Not pressure, but complexity.
10. Reasonable already: night nudge, snooze 1h / tonight, Going home, "Skip for now" on alerts (`welcome-flow.tsx`), push excludes snoozed/home, Recreate copy "If they grab you, go with it." is light.

### Owner feedback: "images feel arbitrary and plastered everywhere" [H]
- Diehl 2016 [V] and Henkel 2014 [V] suggest photos help when they focus attention on what matters to the person; arbitrary imagery is the opposite. Practical reading: show photos where they carry meaning (negatives you made, the reveal) and nowhere else.

---

## 4. Evaluation plan for a small real-world study

Context: mixed iPhone/Android friend groups, invited by messaging app; some decline notifications, some on slow connections, some miss calls. Report each metric as **count / denominator**, per group and per platform (iOS installed PWA, iOS Safari tab, Android). No targets are proposed; there are no published benchmarks for this product, so the first study sets the baseline.

Instrumentation needed (none exists today, per docs/research.md "What we can't say yet"): event logging for invite open, join, push permission prompt shown/granted/denied, call sent, push sent/failed (route already returns counts), call answered (on time/late), dismiss "Not now", snooze/home, capture saved locally, upload retried/succeeded, reveal opened, photo saved/shared, next event created. Plus a 3-question post-event survey and a short exit interview.

| Metric | Numerator | Denominator | Notes |
|---|---|---|---|
| Unassisted joining | Invitees who reach the event page signed in, without asking anyone for help | Invitees who opened the invite link | Ask "did anyone help you?" in survey; split by platform and sign-in route (email code vs anonymous). |
| First contribution | Invitees with ≥1 accepted photo of any kind | Invitees who joined | Also report by type of first photo (Roll Call answer, own call, challenge, recreate). |
| Time / taps to first contribution | Median seconds and taps from invite open to first accepted photo | Joiners who contributed | Report distribution, not just median; separate failed-network sessions. |
| Host help requests | Help requests to host (self-report + observer log) | Invitees (and per event) | Code reason: install, alerts, sign-in, camera, upload. |
| Alert reach | Invitees with an active push subscription at event start | Joined invitees | Split: declined prompt, never shown (iOS not installed), granted. |
| Events with ≥2 distinct contributors | Events where ≥2 different people have accepted photos | Events run | Also per Roll Call: calls with ≥2 photos (caller + ≥1 answer) / calls made. |
| Answer rate by delivery | Answers on time / late | Recipients per call, split by push delivered vs not subscribed vs snoozed/home | Separates willingness from reachability. |
| Recovery without retake | Captures that failed first upload and later succeeded from the device copy, without the person retaking | Captures whose first upload failed | Also count photos discarded or left stranded on device. |
| Unwanted interruptions | Survey: calls rated "came at a bad moment" | Calls received (per person) | Pair with in-the-moment one-tap rating if feasible. |
| Felt pressure / guilt | Persons agreeing "I felt I had to answer" / "I felt bad when I missed one" (5-point) | Respondents | Ask separately for Roll Calls, challenges, and the reveal's "missed it" labels. |
| Opt-outs | Snooze, Going home, push revoked, left event, muted the app in OS | Joined invitees (and per call for snoozes) | Report timing relative to the nth call and to host extras. |
| Host extras | Extras started; recipients' bad-moment ratings for extras vs shared calls | Events where the budget was exhausted | Tests the escalation concern. |
| Return to reveal | Invitees who open the reveal within 48 h | Invitees on the event | Split by contributors vs non-contributors; by "X is out" push received or not. |
| Keep / share | Photos saved or shared out, and stated reason (survey, open text) | Invitees who opened the reveal | Code reasons: me in it, friend's angle, caption joke, recreation, nostalgia. |
| Simultaneity value | Share/keep rate for Roll Call photos | Same for challenge photos | Within-person comparison. |
| Voluntary participation next occasion | Groups where any member (not the researcher) creates or joins the next event | Groups that had a suitable next occasion during follow-up | Ask at follow-up whether an occasion existed; do not count researcher prompts. |
| Wellbeing check | "Using Roll Call made the event better / worse / no different" | Respondents | Per persona. |

Design notes: pre-register the definitions; collect both platforms in every group; record network conditions (lie-fi cases); keep the researcher from prompting between events. With small n, report counts and qualitative reasons; avoid percentages for tiny denominators.

---

## 5. Key recommendations (all [H], to test)
1. Cap host extras (or count them against a visible per-event ceiling) and keep a cooldown longer than one minute; this restores the brief's "recipients bear the cost" protection.
2. Remove the public "No shots yet" list and per-person counts during the event; show only that shots exist.
3. In the reveal, summarise misses ("4 of 7") instead of filling slots with "missed it" cards; let away cards be opt-in.
4. Make "Not now" persistent per call; soften the countdown modal (no seconds, drop the upload-grace sentence).
5. Change "Your challenge is ready." to neutral copy that doesn't imply a task.
6. Treat simultaneous Roll Call as a hypothesis: measure whether its photos are kept/shared more than self-paced challenge shots before investing more in it.
7. Fix docs/research.md: dead Airship link (cite the 2017 press release), BeReal figure (61% per Platformer/NYT), anticipation finding is bidirectional, "three lines" vs four items.

## Sources (accessed 2026-11-02)
- NN/g mobile tutorials: https://www.nngroup.com/articles/mobile-tutorials/
- NN/g empty states: https://www.nngroup.com/articles/empty-state-interface-design/
- NN/g participation inequality: https://www.nngroup.com/articles/participation-inequality/
- WebKit web push: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- Van Boven & Ashworth 2007: https://pubmed.ncbi.nlm.nih.gov/17500652/ (abstract via NCBI E-utilities)
- Alaybek et al. 2022: https://ideas.repec.org/a/eee/jobhdp/v170y2022ics0749597822000334.html
- Airship (repo link, now index): https://www.airship.com/resources/benchmark-report/how-push-notifications-impact-media-app-retention-rates/ ; original 2017 release: https://www.airship.com/newsroom/new-urban-airship-mobile-app-retention-study/
- Platformer: https://platformer.news/how-bereal-missed-its-moment ; PetaPixel (403): https://petapixel.com/2023/02/22/bereal-may-be-on-the-out-users-have-nearly-halved-since-peak
- Braze: https://www.braze.com/resources/articles/mobile-app-retention-10-tip
- Pinch et al. 2024: https://doi.org/10.1177/14614448241267731 ; blog: https://thesocietypages.org/discoveries/?p=12000
- Kim et al. 2024: https://doi.org/10.1145/3686909 ; https://arxiv.org/abs/2408.02883
- Pielot et al. 2014: https://ic.unicamp.br/~oliveira/doc/MHCI2014_An-in-situ-study-of-mobile-phone-notifications.pdf
- Mehrotra et al. 2016: https://discovery.ucl.ac.uk/1502364/1/CHI16.pdf
- Stothart et al. 2015: https://pubmed.ncbi.nlm.nih.gov/26121498/
- Fitz et al. 2019 (paper not accessed): https://doi.org/10.1016/j.chb.2019.07.016 ; summary: https://communities.springernature.com/posts/batching-notifications-can-improve-attention-well-being-and-productivity
- Dwyer et al. 2018 (abstract not accessed): https://doi.org/10.1016/j.jesp.2017.10.007
- Kumar et al. 2014: https://pubmed.ncbi.nlm.nih.gov/25147143/
- Odom et al. 2014: https://www.dourish.com/classes/infx161f14/readings/Odom-DesigningForSlowness-CHI2014.pdf
- Weingarten et al. 2021: https://pubmed.ncbi.nlm.nih.gov/33965783/
- Diehl et al. 2016: https://pubmed.ncbi.nlm.nih.gov/27267324/
- Henkel 2014: https://pubmed.ncbi.nlm.nih.gov/24311477/
- Soares & Storm 2022: https://pubmed.ncbi.nlm.nih.gov/35854206/
- Barasch et al. 2017: https://pubmed.ncbi.nlm.nih.gov/28650721/
- Barasch et al. 2018: https://ideas.repec.org/a/oup/jconrs/v44y2018i6p1220-1237..html
- van Mierlo 2014: https://pubmed.ncbi.nlm.nih.gov/24496109/
- Karau & Williams 1993 (not opened): https://doi.org/10.1037/0022-3514.65.4.681
- Gray et al. 2018 (not opened): https://doi.org/10.1145/3173574.3174108 ; Mathur et al. 2021: https://doi.org/10.1145/3411764.3445610 ; Mildner et al. 2023: https://arxiv.org/abs/2303.00476
