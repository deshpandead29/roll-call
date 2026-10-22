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
