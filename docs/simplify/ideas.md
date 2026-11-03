# Ideas for the unproven part (3 November 2026)

The open question: does a friend calling roll, with everyone shooting the same moment, beat a shared album people add to whenever they like? Three things count against it: calls depend on phones buzzing, prompts wear thin, and stopping to take photos can hurt the moment.

Each idea below says which of those it answers, what evidence bears on it, and what it would take. Labels: **[P]** primary source read directly, **[S]** search summary or secondary report I couldn't open, **[H]** my hypothesis. All sources accessed 3 November 2026. Where a source failed to load, it says so.

## What similar apps teach

- **Dispo** made photos develop at 9am the next day, the closest precedent to Roll Call's reveal. Its App Store listing shows a 3.6 rating and "6M+ downloads"; reviews complain about lost photos and later paywalls on developing [S: [App Store listing](https://apps.apple.com/cy/app/id1491684197), via search]. I found no reported usage figures for its decline.
- **Poparazzi** let only your friends post photos of you, the closest precedent to "the photographer is never in the photos". It reached No. 1 on the App Store in 2021, peaked at about 4M monthly users, fell to about 2,000 to 3,000, and shut down in 2023 after raising $17M [P: [TechCrunch, 1 May 2023](https://techcrunch.com/2023/05/01/once-hot-photo-sharing-social-app-poparazzi-is-shutting-down/), citing Apptopia]. The founders' own post returned 403.
- **Lapse** launched in 2021 as a shared disposable camera for parties. Its most active users treated it as a personal photo journal instead, so the team rebuilt it around albums and monthly dumps. It reached No. 1 in the US in September 2023 by making new users invite at least five friends, which critics called a "pyramid scheme" [P: [TechCrunch, 26 Sep 2023](https://techcrunch.com/?p=2605741)].
- **Locket** puts friends' photos on your Home Screen widget. It hit No. 1 in January 2022, caps you at 20 friends, and made a monthly recap video [S: [iPhone in Canada](https://www.iphoneincanada.ca/2022/01/14/locket-no-1-free-app-in-canada), [iMore](https://www.imore.com/locket-puts-your-friends-photos-your-home-screen-using-widgets)]. Later user figures come from third-party estimates, so I'm not quoting them.
- **BeReal** moved towards event-triggered prompts: during the 2026 World Cup it sent notifications at goals, penalties and the final whistle, and lifted its one-post daily limit [P: [BeReal announcement](https://bereal.com/news/bereal-launches-new-features-for-football’s-biggest-tournament)]. No results have been published.

Pattern [H]: novel photo mechanics reach the top of the charts quickly and fade (Poparazzi, Dispo), and people use these apps differently from how they were designed (Lapse). Roll Call is used for one evening, so a fade over months matters less than whether people answer on the night, but the Lapse lesson applies: watch what people actually do before committing to calls.

## The ideas

### 1. Send the call into the group chat itself

Answers: calls depend on phones buzzing.

When someone calls roll, their phone opens the share sheet with a ready-made message for the group chat ("Priya called roll. Take a photo: [link]"). The chat they already have does the buzzing, on every phone, with no Home Screen step.

Evidence: iPhone web push still only works after Add to Home Screen; iOS 26 made adding easier but didn't open push to Safari tabs [S: [OneSignal](https://documentation.onesignal.com/docs/en/web-push-for-ios), [Braze](https://www.braze.com/docs/developer_guide/platform_integration_guides/web/push_notifications/safari_mobile_push)]. The share sheet (Web Share API) works in Safari on iOS from 12.2 and in Chrome on Android, and needs a tap to open [P: [caniuse](https://caniuse.com/web-share), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)]. The app already uses it for group invite links (`src/app/groups/[id]/invite-link.tsx`).

Why not a bot that posts automatically: WhatsApp's Groups API is limited to Official Business Accounts, groups of up to 8 people, and groups the business creates and invites people into, so it can't post into a friend group's existing chat [P: [Meta developer docs](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups)]. A Telegram bot can be added to an existing group and post announcements [P: [Telegram bot features](https://core.telegram.org/bots/features)], but only groups that use Telegram would benefit.

Cost: small (frontend only, one extra tap for the caller). Risk [H]: it adds one more message to a busy chat, and the caller has to send it.

### 2. An iPhone App Clip for the night

Answers: calls depend on phones buzzing.

An App Clip opens from a link or QR code with no install and can receive notifications for up to 8 hours after each launch, which covers a night out. Users can switch this off from the App Clip card [P: [Apple developer docs](https://developer.apple.com/documentation/bundleresources/information-property-list/nsappclip/nsappcliprequestephemeralusernotification)]. POV already uses App Clips for guests [P, from the earlier research].

Cost: large. It needs a native iOS app, which the brief deferred. Worth knowing as the path if the web version shows calls work but don't reach iPhones.

### 3. Your person for the night

Answers: phones out hurting the moment, and the original problem directly.

When you join, you're quietly given one friend to photograph at some point tonight, and someone else has you. No buzz and no timing: it's done whenever it suits you. Everyone ends up in at least one photo, including the person who usually takes them all. At the reveal, everyone sees who had them.

Evidence: the problem is real for at least one group. A CEWE survey of more than 500 UK mothers found 58% are almost never in the frame and 88% are always or often the one behind the camera [S: commissioned by a photo-printing company, via [Digital Camera World](https://www.digitalcameraworld.com/photography/family-photography/as-a-mom-and-a-photographer-the-percentage-of-mothers-who-are-nearly-never-in-their-family-photos-is-sobering) and [PetaPixel](https://petapixel.com/2026/03/25/survey-finds-majority-of-mothers-rarely-appear-in-their-own-family-photos/), both of which blocked a full read]. Poparazzi shows people are drawn to photos taken of them by friends, and that a feed of them didn't hold attention over months [P, above]. Roll Call's trip wildcards already name a friend for "people" prompts (`src/lib/missions.ts`), so the assignment logic partly exists.

Cost: medium (an assignment rule like the existing seeded ones, plus a reveal view). Risk [H]: with uneven friendships, someone gets a person they barely know; the swap rule would need to cover it.

### 4. Name the moment when you call

Answers: prompts wearing thin.

The caller picks or types what the call is for ("Cake", "Everyone's here", "Last song"), and that becomes the heading for that moment in the reveal. A named call feels like a reason, not a random interruption, and the reveal reads like a story of the night.

Evidence: BeReal's World Cup change ties prompts to real moments (goals, penalties) rather than a random time [P, above]; whether that worked hasn't been published. Roll Call's birthday nudge already asks "Is it the cake?" [repo].

Cost: small to medium (a text field on the call, stored on `roll_calls`, shown in the reveal). Risk [H]: one more decision for the caller; it has to stay optional.

### 5. Shoot for yourself tonight, share tomorrow

Answers: phones out hurting the moment.

Make the reveal's timing the pitch, not just a mechanic: nothing anyone shoots is seen or judged until the morning, so there's no posing for an audience on the night.

Evidence: in five experiments, taking photos with the intention of sharing them lowered enjoyment and raised self-presentation anxiety; the authors suggest starting the sharing after the experience, not during it [P: [NYU Stern summary of Barasch, Zauberman and Diehl, *Journal of Consumer Research*, 2018](https://www.stern.nyu.edu/experience-stern/faculty-research/taking-photos-share-social-media-reduces-enjoyment-experiences.md)].

Cost: copy only, plus keeping anything social (counts, who's shot) out of the evening, which the simplify branch has started. Risk: the effect was measured with tourists and virtual experiences, not friend groups.

### 6. Make the morning reveal a group moment

Answers: whether anyone comes back for the reveal.

At reveal time, one person gets a share button that posts "Friday is out: [link]" into the group chat, the same way as idea 1. The reveal lands where the conversation already is, and people react there.

Evidence: Dispo's 9am reveal was its signature [S, above]; Barasch's work supports sharing after the experience [P, above]. No study I found measured return to a delayed reveal.

Cost: small. Risk [H]: if nobody taps share, it's the same as now.

### 7. Two cautions rather than ideas

- **Don't force invites.** Lapse's five-friend requirement got it to No. 1 and a "pyramid scheme" label [P, above]. Roll Call's invites should stay one link that the organiser chooses to send.
- **Never lose a photo.** Dispo's reviews single out lost photos [S, above]. The on-device save and retry on this branch is the right priority; the open item (a sent answer that still shows its call as open) is worth fixing before any test.

## What I'd test first

Ideas 1, 4, 5 and 6 are small and can go into the hand-run test from the last conversation: the caller posts a named call in the group chat, people shoot for themselves, and one person shares everything the next morning. Idea 3 can be tested the same way: before the night, the organiser privately messages each person the name of their friend to photograph.

Compare the two in real groups, one night each: did people answer named calls in the chat, did everyone end up in a photo, and which did people talk about the next day. That shows whether calls, assignments, or both are worth building into the app.

Not found: any published figures on answer rates for group photo prompts, or on how many people open a delayed photo reveal. Those numbers have to come from Roll Call's own test.
