# FreshRoute deck: screenshots by step

**Source:** the live app (freshroute.pages.dev), iPad Pro 11-inch landscape at full resolution (2388 × 1668), dark mode. Captured 21 Nov 2026 by walking each flow with real taps as three people:

- **Cody Rivera**, at the pantry;
- **Dana Ruiz**, driving the food bank truck;
- **Sam Ortiz**, a volunteer driver.

Files are in `screens/`, numbered in deck order. Wireframe IDs refer to `docs/wireframes/FreshRoute-Wireframes-v1.pdf`.

## Flow 1 (main): a food bank delivery to the pantry

| # | File | Step | Wireframe |
|---|---|---|---|
| 1 | `01-welcome-which-pantry.png` | Which pantry (join code) | D1a / M0 |
| 2 | `02-who-are-you.png` | Who are you: the people at this pantry | D1a / M0 |
| 3 | `03-add-a-delivery.png` | Cody adds the order from the ordering portal | new |
| 4 | `04-incoming-two-orders-waiting.png` | Incoming: two orders waiting | M1 |
| 5 | `05-option-a-driver-called-ahead.png` | **Option A:** the driver phones ahead, Cody taps "45 min" | new |
| 6 | `06-option-b-food-bank-driver-deliveries.png` | **Option B:** Dana's Deliveries list | new |
| 7 | `07-option-b-food-bank-truck-navigation.png` | Dana drives from the Fort Worth warehouse | D8 |
| 8 | `08-option-b-pantry-sees-truck-live.png` | Cody sees the truck live | M1 |
| 9 | `09-heads-up-truck-close.png` | Heads-up: about 15 minutes out | M1 |
| 10 | `10-truck-at-the-door.png` | At your door | M1 |
| 11 | `11-food-bank-driver-delivered.png` | Dana: delivered, the pantry signs on their iPad | D11 |
| 12 | `12-receive-delivery.png` | Receive: apples damaged, 37 °F, pallet blanket | new |
| 13 | `13-credit-to-claim.png` | A credit to claim, with its deadline | new |
| 14 | `14-credit-sent.png` | Credit sent; delivery on record | new |

Options A and B are alternatives. **A** is for when the food bank's driver doesn't use FreshRoute: the pantry logs the phone call. **B** is for when the driver does use it: the truck shows up live. Present them side by side, not one after the other.

## Flow 2: a volunteer pickup run

| # | File | Step | Wireframe |
|---|---|---|---|
| 15 | `20-add-yourself.png` | A new person adds themself | D1a |
| 16 | `21-setup-vehicle-and-recording.png` | Vehicle, plate, cold storage, recording agreement | D1b |
| 17 | `22-pickups-list-and-map.png` | Pickups: stores and the map, with its key | D2 |
| 18 | `23-store-detail.png` | Store detail | D5 |
| 19 | `24-route-tray.png` | Route: 2 stops, "Back by" | D6 |
| 20 | `25-before-you-drive.png` | Pre-drive check: front and road cameras, sound, the promise | D7 |
| 21 | `26-navigation.png` | Navigation: camera (picture in picture), next turn, ETA ring | D8 |
| 22 | `27-progress-on-time.png` | Progress: on time | D10a |
| 23 | `28-pantry-sees-volunteer-run.png` | Pantry sees the run on Incoming | M1 |
| 24 | `29-volunteer-run-live-video.png` | The run live: near-live video and stops | M2 |
| 25 | `30-store-link-ready-at-dock.png` | Store link: the store taps "ready at the dock" | S1 |
| 26 | `31-at-a-pickup.png` | At the pickup: confirm what was loaded | D9 |
| 27 | `32-progress-running-late.png` | Running late: a 24-minute stop, "Loading took longer" | D10b |
| 28 | `33-drop-off-counts.png` | Drop-off counts | D11 |
| 29 | `34-what-slowed-you-down.png` | What slowed you down | D12 |
| 30 | `35-drive-report.png` | Drive report: 5 min late, and why | D13 |
| 31 | `36-drive-report-schedule-chart.png` | Schedule chart, with what moved it | D13 |
| 32 | `37-drive-report-footage.png` | Footage, timeline, counts | D13 |
| 33 | `38-preferences.png` | Preferences | D14 |
| 34 | `39-pantry-pickup-runs.png` | Pantry: every finished run | M3 |
| 35 | `40-pantry-run-report.png` | Pantry: the same report, no approval needed | M4 |
| 36 | `41-stores-driver-notes.png` | Stores: Sam's note now helps the next driver | M5 |

## What's real and what's staged

- **Real:** every screen, tap, time and number came from the live app.
  - The delivery truck and Sam's run were simulated drives at 8× speed, so the app's times (arrivals, the heads-up, the cold timer, "5 min late") are realistic drive minutes.
  - The late arrival was earned, not faked: Sam stayed 24 minutes at Walmart against the 12 planned.
- **Camera:** both camera views are your two still photos (the in-car selfie as the front camera, the road shot as the back camera), fed in where the camera would be. They went through the app normally: the preview, recording, upload, the pantry's live view and the report footage.
- **Test tools hidden** for these shots only:
  - the simulator speed bar;
  - the "Simulate the drive" panel;
  - the "Simulated at 8×" labels;
  - the "Demo store" chip;
  - "Add a practice delivery";
  - Practice area and Test mode in Preferences;
  - the "More below" hint.
- **Shot 11** comes from a second, short delivery that started at the pantry, because the arrival screen opens by itself and the main run's capture missed it. The screen is identical.
- **Not shown:**
  - Daylight mode, because your photos are at night, which is when Auto picks dark mode;
  - motion markers, because a computer has no motion sensors, so the report shows 0;
  - the phone layout (wireframe M6).

Sam, Cody, Dana and orders AI-48213 and AI-48219 are now on the shared demo pantry.
