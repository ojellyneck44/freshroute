# FreshRoute heuristic evaluation, 21 Nov 2026

This replaces usability testing results until the team runs sessions.

**Method:** expert review of the live app (freshroute.pages.dev) on iPad Pro 11 against Nielsen's 10 usability heuristics. The review covered all three flows: the pantry receiving a food bank delivery, a volunteer pickup run, and the food bank driver's delivery. Evidence is the screenshots in `docs/deck/screens/`.

**Severity scale** (Nielsen):

| Score | Meaning |
|---|---|
| 0 | Not a problem |
| 1 | Cosmetic |
| 2 | Minor |
| 3 | Major |
| 4 | Catastrophe |

**Limits:** this is an expert review, not user testing, so it can't say how real pantry staff behave. It complements the accessibility and typography audit of 20 Nov (`audit-2026-11-20.md`).

## Scorecard

| # | Heuristic | Worst open issue | Severity | What works |
|---|---|---|---|---|
| 1 | Visibility of system status | Food bank driver's "I'm at the pantry" button shows even 39 mi away (shot 07) | 2 | Live ETA ring, "Updated 8:16", heads-up 15 min out (09), "At your door" (10) |
| 2 | Match between system and the real world | Order IDs and "lines" are portal jargon a new volunteer may not know | 1 | Plain-language chart: "Did the truck stay on schedule?" (36); pantry vs food bank wording |
| 3 | User control and freedom | A signed receipt can't be edited or reopened (13) | 3 | Remove an order, Switch person, Back to map on every overlay |
| 4 | Consistency and standards | A pickup run's report is titled "Drive report" while the list calls it "Pickup runs" (35, 39) | 1 | One status vocabulary; same ring and colours on every screen |
| 5 | Error prevention | Driver can tap "Finish delivery" before the pantry has signed (11) | 2 | Temperature and name required to sign (12); count mismatch warning at drop-off |
| 6 | Recognition rather than recall | Typing invoice lines relies on remembering "(frozen)" / "(cold)" syntax (03) | 2 | Map keys on every map; store notes shown where the next driver needs them (41) |
| 7 | Flexibility and efficiency of use | Route order changes only with up/down arrows, no drag (24) | 1 | One-tap call-ahead chips (05); "Just mine" filter; defaults to "Received" so only exceptions need taps |
| 8 | Aesthetic and minimalist design | The Incoming card stacks up to 7 controls when the call-ahead chips show (05) | 2 | Navigation shows only the next turn and the next leg (26) |
| 9 | Help users recognise, diagnose and recover from errors | When routing is down, "Couldn't plan the route" offers no retry button | 1 | Location errors explain the exact Settings path; offline queue keeps data |
| 10 | Help and documentation | No first-run walkthrough for a new volunteer | 2 | Helper text under fields; map keys; testing guide for facilitators |

## Top findings (fix first)

1. **A signed receipt is final** (H3, severity 3). If a volunteer marks the wrong line, the credit request is wrong and there's no way back.
   - **Fix:** allow editing until the credit request is sent.
2. **The food bank driver can finish before the pantry signs** (H5, severity 2), and **"I'm at the pantry" shows from far away** (H1, severity 2). Together these let a delivery look complete when it isn't.
   - **Fix:** show the button only inside the arrival zone, and say "Waiting for the pantry to sign" until the receipt exists.
3. **Invoice entry depends on syntax** (H6, severity 2).
   - **Fix:** a storage picker per line (dry, cold, frozen) instead of typed keywords, or import from the ordering portal (next steps).
4. **The Incoming card gets crowded** (H8, severity 2).
   - **Fix:** move the call-ahead chips and Remove into an overflow menu once the driver is live.
5. **No first-run help** (H10, severity 2).
   - **Fix:** a three-step intro for each role, skippable.

## Fixed during this review cycle

These were found by heuristic and accessibility review and fixed before the screenshots were taken:

- **"Promise vs forecast" chart** (H2): renamed "Did the truck stay on schedule?". It now has a plain-language summary that names the cause, for example "the stop at Walmart took 24 min, against the 12 planned".
- **Maps had no key** (H6): every map now has a key that names its purpose.
- **"P" and "FB" map badges read as app logos** (H2): replaced with house and warehouse pins.
- **Long screens gave no hint of more content** (H1): added a "More below" cue.
- **Report had no clear next step** (H3): added a "Back to pickups" button at the end.
- **The sample delivery cluttered real boards** (H8): it now hides once real orders exist.
- **Accessibility, 20 Nov audit:** 0 contrast failures, 0 tap targets under 44 px, and no skipped heading levels across 9 screens.
