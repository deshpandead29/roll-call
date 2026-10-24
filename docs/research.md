# Research behind the decisions

## Market
- BeReal: bought by Voodoo for €500m in 2024; daily use fell sharply after its 2022 peak; it dropped its one-post limit and tied prompts to live moments during the 2026 World Cup. [Engadget](https://engadget.com/bereal-the-buzziest-app-of-2022-has-been-bought-by-a-mobile-game-publisher-175016152.html?src=rss), [CB News](https://www.cbnews.fr/node/101664)
- BeReal users delayed posts and ignored the ping as rigid rules wore thin (Pinch et al., New Media & Society, 2024). [The Society Pages](https://thesocietypages.org/discoveries/?p=12000)
- POV: digital disposable camera for events, guests join by QR or link with no download, capped shots, reveal next day, photobooks. [App Store](https://apps.apple.com/US/app/id1636032890)
- Lense: trip-focused shared album with delayed reveal. [lense.app](https://lense.app/disposable-camera-app-for-vacations)

## Challenges
- Mix easy and bold prompts, require everyone in people shots, rotate the photographer, the slideshow at the end is the best part. [Leaderboarded](https://leaderboarded.com/blog/posts/photo-scavenger-hunt-ideas/), [TeamBuilding](https://teambuilding.com/blog/photo-scavenger-hunt)
- Constraints help creativity (practitioner view, not formal research). [The Inspired Eye](https://www.theinspiredeye.net/street-photography-tips/limitation-creativity)
- The Getty Museum's 2020 challenge to recreate artworks at home went viral; basis for Recreate.

## Visual direction
- 2026 trends: hand-drawn UI and scrapbook/sticker UI over disciplined controls. [daisyUI trends](https://trends.daisyui.com/ui-design-trends-2026/)
- Handmade, scrapbooked, tilted, tape and stickers. [Pixlr](https://pixlr.com/blog/handmade-scrapbooked-and-dopamine-bright-the-design-trend-bringing-back-the-human-touch/)
- Gen Z digicam/flash look: "airy, floaty, ethereal", real-looking versus phone processing. [Michigan Public / NPR](https://www.michiganpublic.org/2024-12-10/why-gen-z-loves-the-digital-compact-cameras-that-millennials-used-to-covet)
- Date stamp plus light leak was the 2017 Huji Cam look, so it was dropped.

## Copy, tags and inputs
- Concise text: Nielsen's test found halving the words made a page 58% more usable. [Wylie Communications](https://freewritingtips.wyliecomm.com/2018-05-29/)
- Short, scannable, goal first. [Google Material](https://codelabs.developers.google.com/codelabs/material-communication-guidance)
- A tagline should say what you do, no guessing. [Nielsen Norman Group](https://nngroup.com/articles/homepage-design-principles/)
- Taglines: 2–8 words, a benefit, distinctive, no commands. [Alphabet Creative](https://www.alphabetcreative.com/blog/how-to-write-taglines-that-dont-suck/)
- Cringe comes from forced slang, overfamiliarity and trend-chasing. [Clickbait panel](https://itsclickbait.substack.com/p/we-asked-gen-z-what-makes-brands), [LBB](https://lbbonline.com/news/Gen-Z-Rejects-Performative-Brand-Relatability)
- Badge inflation: rethink at a fourth badge on one screen; static badges are just labels. [Eleken](https://www.eleken.co/blog-posts/badge-ui-design)
- Status tags only for status, adjectives, one style. [UK IC Design System](https://design.sis.gov.uk/components/status-tag)
- Chip input: Enter adds, Backspace removes, remove buttons labelled. [Wikimedia Codex](https://doc.wikimedia.org/codex/v1.6.1/components/demos/chip-input.html)
- Offer both invite-by-name and a share link. [SaaS UI](https://www.saasui.design/blog/saas-invite-sharing-ux-patterns)

## Layout and navigation (usability pass, October 2026)
- Progressive disclosure: show what most people need now, defer rarely used features to a secondary screen, make the way there clearly labelled, and stop at two levels; deeper designs "typically have low usability". Staged disclosure (one step after another) suits tasks whose steps don't depend on each other. [Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/)
- One thing per page: GOV.UK split long forms into a page per question because it helped less confident users, worked on mobile, and made errors and branching easier. [GDS design notes](https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/)
- Hick's law: decision time grows with the number and complexity of visible choices, so trim each screen to the choices that matter there. [Laws of UX summary](https://helio.zurb.com/ux-research/laws-of-ux/hicks-law/)
- Hidden navigation costs discoverability (about 20% in NN/g's study, smaller on mobile), so anything people need often stays visible, not behind a menu. [Nielsen Norman Group](https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/)
- Bottom sheets suit short supporting tasks, not the main flow or multi-step work. [Material Design](https://material.io/components/sheets-bottom)

What changed as a result: forms (new group, new event, account) moved to their own pages; the group page is just its events, with people, invites and away cards on a People page; the invite card and away-card nudge appear on the group page only until they're done; the event page leads with Call roll and challenges, folds the call log, shot tally and who's snoozed into one "So far" card, and folds pace, host, reveal time and the host's controls into "Event details"; pace is folded inside the new-event form because most hosts keep Normal; before an event starts, challenges show as a preview and Roll Call is hidden.

## Interest over time (persona walkthrough, October 2026)

What the evidence says, and what it changed. Each finding is tagged with how strong it is.

- **Tutorials don't help simple apps.** Nielsen Norman Group tested deck-of-cards tutorials with 70 users on 4 iPhone apps: task success was 91% with the tutorial and 94% without (not significant), and people who read it rated the tasks harder (4.92 vs 5.49 of 7, p=0.047). They advise brief, in-context help instead. So the "How it works" card stays three lines and dismissible, and setup only asks for what the app needs. Source: [NN/g study of mobile tutorials](https://www.nngroup.com/articles/mobile-tutorials/). Strength: controlled study, small.
- **Empty states should explain, teach and give a next step.** NN/g's three guidelines: communicate system status, provide learning cues, provide direct pathways for key tasks. An upcoming event now says how long until it starts and offers "Try the look" while you wait. Source: [NN/g, Designing Empty States in Complex Applications](https://www.nngroup.com/articles/empty-state-interface-design/). Strength: expert guideline.
- **On iPhone, a web app can only push from the home screen.** Web Push needs iOS 16.4 or later, the app added to the Home Screen, and a permission request from a direct tap. Roll Call's loop depends on the buzz, so invited iPhone users who never saw the install steps would never get a Roll Call. Alerts are now step 3 of setup, and the group and event pages say so when this iPhone can't buzz. Source: [WebKit, Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/). Strength: platform documentation.
- **Anticipation is felt more strongly than memory.** Across five experiments, people reported more intense emotions anticipating events than recalling them. Upcoming events now count down ("in 5 days", "tomorrow") and everyone on an event gets "Sam's 30th is today" on the first day. Source: Van Boven & Ashworth (2007), *Journal of Experimental Psychology: General*, [PubMed 17500652](https://pubmed.ncbi.nlm.nih.gov/17500652/). Strength: peer-reviewed.
- **Experiences are remembered by their peak and their end.** Kahneman, Fredrickson, Schreiber & Redelmeier (1993), *Psychological Science*; a 2022 meta-analysis of 174 effect sizes (Alaybek et al., *Organizational Behavior and Human Decision Processes*) found a large effect. The reveal is the peak, so it now ends on the group's next event, or "Plan the next one", instead of stopping. That this makes people plan again is our inference, not something the studies tested. Sources: [Peak–end rule overview with citations](https://en.wikipedia.org/wiki/Peak%E2%80%93end_rule), [meta-analysis on RePEc](https://ideas.repec.org/a/eee/jobhdp/v170y2022ics0749597822000334.html). Strength: peer-reviewed; generalisation to apps is ours.
- **Push and retention go together, but the data is from vendors.** Airship's analysis of 63 million new users found 190% higher retention among users who got at least one push in their first 90 days. It's correlational and Airship sells push, so we use it only to say alerts matter, not how much. Source: [Airship benchmark report](https://www.airship.com/resources/benchmark-report/how-push-notifications-impact-media-app-retention-rates/). Strength: weak.
- **Daily-prompt apps lose interest fast.** Apptopia estimates reported by the New York Times and others put BeReal's daily users down roughly 50 to 60% from the October 2022 peak by early 2023; BeReal disputed the figures. This supports keeping Roll Call event-based. Sources: [Platformer](https://platformer.news/how-bereal-missed-its-moment), [PetaPixel](https://petapixel.com/2023/02/22/bereal-may-be-on-the-out-users-have-nearly-halved-since-peak). Strength: third-party estimates.
- **Typical app retention is low.** Vendor figures disagree widely; Braze, for one, puts day-30 retention for most app categories between 1.2% and 5%, with Photo & Video the lowest at 2.3% on iOS and 1.2% on Android (AppsFlyer data via Business of Apps). Useful as a rough bar only. Source: [Braze, mobile app retention](https://www.braze.com/resources/articles/mobile-app-retention-10-tip). Strength: vendor figure.

What we can't say yet: how long interest actually lasts for each persona. That needs usage data (who opens the app between events, who comes back for the second event). Nothing in the app measures it today.
