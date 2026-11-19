# FreshRoute — research notes (from the Maroon Moose Drive folder)

Read on 2026-11-19: Master Doc, Possible Project Directions, Guidelines, Weekly Status Report,
Competitive Analysis Sheet, Food Bank persona (Maya) + anti-persona (Max), Extreme Users worksheet,
"Moving Insights to Actionable Ideas", Food Bank Manager journey map, Cody interview transcript,
discussion guides + teacher critique, screener, Cognitive Walkthrough, Careit heuristic audit (40 findings),
Anaya's perspective audit, Stevie's Too Good To Go audit, 27 Careit screenshots, whiteboard/design-studio photos.
Not readable: "Food Bank User Interview Study" (Google Form) and the workspace video (not reviewed frame by frame).

## The problem, in the team's words
- Need statement #1: "Food bank managers need a way to monitor deliveries so that they can accurately
  predict turnaround time, prepare, and ensure donations arrive reliably."
- Winning concept: **Notifications from FreshRoute** — store manager *and* food bank get live driver ETA,
  so both sides prep instead of rushing. Runner-up: **Handy Footage** (camera explains damage after the fact).
- Big Idea "Safe Transport" (who/what/wow): real-time transit + live feedback; alert the grocery store when a
  driver will arrive; secure food on rough roads; ensure food arrives in the same state it was picked up;
  catch bad actors.

## Evidence that shapes features
| Finding (source) | Feature it drives |
|---|---|
| "You could be sending an important email and then it's like, oh, the truck's here." (Cody/Maya) | Arrival heads-up to food bank at 15 min / 5 min; ETA promise vs. live forecast |
| TAFB truck arrives "usually 10 or 11, depends on traffic" (Cody) | ETA ring + adherence graph; delay reason captured |
| Can't accept perishables when nobody knows how long they've been out of the fridge (Cody, persona) | **Cold-chain timer**: starts at pickup confirmation, shown to food bank, logged in report |
| Van has no cooling; drivers say whether they have cold storage | Preference "My vehicle has cold storage"; listings needing cold storage are flagged/filtered |
| Careful braking, heavy items on bottom, items flying when turning (Cody) | Gyroscope/accelerometer events: hard brake, sharp turn, bump — marked on video |
| Only certain staff are cleared to drive; pickups depend on who is free (persona) | Rescues list: drivers can hand off pickups they can't do |
| Stores all work differently: Walmart scans each can, Kroger unbox→scan, bagged cans (Cody) | Location page "How pickup works here" + driver-reported drawbacks |
| Vague listings → popcorn incident, 19 lb sour cream (Cody) | Listing shows pack size, quantity, weight, storage type up front |
| Anti-persona Max: solo pickups, untracked donations, shrinkage | Recording + incident markers + pickup/drop-off item check (counts at both ends) |
| Careit: two status labels nobody understands; toast says "Rescued" while status says Reserved | One status vocabulary everywhere, step tracker |
| Careit: rescue can be completed with empty fields; no cancel confirmation | Confirm destructive actions; validate before finishing a drive |
| Careit: "+100%" with no baseline | Report numbers always show baseline ("3 min late vs. 9 min avg") |
| Careit: process stops at delivery, not distribution | Feedback loop: driver notes feed store descriptions |
| Design studio votes: color creates urgency (#1), user input feeds descriptions (#1), multiple destinations (#2), useful metrics (#2); gamification distracts/distresses drivers; too much info on screen while driving | Color-coded ETA state; feedback feeds store pages; multi-stop routes; no gamification; minimal in-motion UI |
| Stevie's TGTG audit: show bus/walk travel time; reminder before pickup window | Pickup window countdown on route |

## Stakeholders
1. Driver (staff/volunteer, cleared to drive) — iPad mounted in van/truck.
2. Food bank manager (Maya/Cody) — laptop at desk, phone on the floor. Needs data without driver features.
3. Grocery store manager (donor) — needs driver ETA to have donations packed. No account; SMS/link.
