# FreshRoute deck: screenshots by step

Live app (freshroute.pages.dev), iPad Pro 11-inch landscape, 2388 × 1668 (full Retina resolution), dark mode. Captured 21 Nov 2026 by walking each flow in the real app with real taps. Drives ran in the built-in simulator at 8× speed, so every time and metric on screen is still realistic. The files are in `screens/` and are numbered in deck order.

Wireframe IDs match `docs/wireframes/FreshRoute-Wireframes-v1.pdf`.

## Flow 1: volunteer driver (pickup run)

| # | Wireframe | File | What it shows |
|---|---|---|---|
| 1 | D1a | `01-D1a-welcome-pantry-code.png` | Welcome: which pantry (join code) |
| 2 | D1a | `02-D1a-who-are-you.png` | Add yourself: name and role |
| 3 | D1b | `03-D1b-setup-vehicle-and-recording.png` | Vehicle, plate, cold storage, recording agreement |
| 4 | D2 | `04-D2-pickups-list-and-map.png` | Pickups: store list beside the live map, with its key |
| 5 | D5 | `05-D5-store-detail.png` | Store detail: window, typical donations, Add to route |
| 6 | D6 | `06-D6-route-tray.png` | Route tray: 2 stops, arrival at each, "Back by" estimate |
| 7 | D7 | `07-D7-before-you-drive.png` | Pre-drive check: cameras, location, motion, the promise |
| 8 | D8 | `08-D8-navigation.png` | Navigation: camera top left, next turn, ETA ring top right |
| 9 | D10a | `09-D10a-progress.png` | Progress (tap the ring): on time |
| 10 | D10b | `10-D10b-progress-running-late.png` | Progress: slipping after a 7-minute train delay |
| 11 | D9 | `11-D9-at-a-pickup.png` | At a pickup: confirm what was loaded |
| 12 | D11 | `12-D11-drop-off-counts.png` | Back at the pantry: drop-off counts |
| 13 | D12 | `13-D12-what-slowed-you-down.png` | What slowed you down: chips and a note |
| 14 | D13 | `14-D13-drive-report-top.png` | Drive report: headline and metrics |
| 15 | D13 | `15-D13-drive-report-schedule-chart.png` | "Did the truck stay on schedule?" chart with its story |
| 16 | D13 | `16-D13-drive-report-footage.png` | Footage with markers, route map, timeline, counts |
| 17 | D14 | `17-D14-preferences.png` | Preferences |

## Flow 2: pantry (was "food bank manager" in the wireframes)

| # | Wireframe | File | What it shows |
|---|---|---|---|
| 18 | M1 | `20-M1-incoming-today.png` | Incoming: the food bank delivery and a live volunteer run |
| 19 | M2 | `21-M2-volunteer-run-live.png` | One run live: near-live video, ring, stops, store links |
| 20 | M3 | `22-M3-pickup-runs.png` | Pickup runs: every finished run |
| 21 | M4 | `23-M4-run-report.png` | A run's report from the pantry side |
| 22 | M5 | `24-M5-stores.png` | Stores: windows and driver notes (shows Sam's dock note) |
| 23 | S1 | `30-S1-store-link.png` | Store link: what the store sees, no account (light on purpose) |

## Flow 3: food bank delivery (new since the wireframes)

| # | File | What it shows |
|---|---|---|
| 24 | `40-L1-add-a-delivery.png` | Pantry adds an order from the ordering portal |
| 25 | `41-L2-driver-called-ahead.png` | Driver's call logged: "about 7:38 PM" |
| 26 | `42-L3-food-bank-driver-deliveries.png` | Food bank driver's Deliveries list |
| 27 | `43-L4-food-bank-truck-navigation.png` | Food bank truck navigating to the pantry |
| 28 | `44-L5-pantry-sees-truck-live.png` | Pantry card goes live: "On the way to you with Dana Ruiz" |
| 29 | `45-L7-receive-delivery.png` | Receiving line by line: apples damaged, 37 °F, blanket |
| 30 | `46-L8-receiving-and-credits.png` | Credit to claim, with the 3-business-day deadline |

## Wireframe screens with no screenshot

- **D3 and D4** (full-screen map, pin preview) were merged into D2 and D5 during the build.
- **M0** (manager sign-in) is now the shared Welcome ("Which pantry?", "Who are you?"): shots 1 and 2.
- **M6** (phone view on the floor) wasn't captured. The app works at phone size; ask if you want phone shots.
- **T1** (testing kit): hold the logo to show it. It isn't captured, because it would sit over the screens.

## Retake on a real iPad before presenting

- **Camera views** (shots 7, 8, 16, 19, 27) show the browser's fake test camera, a green pattern, because these were captured on a computer. On your iPad they'd show the real front camera.
- **Motion markers** read 0, because a computer has no motion sensors. A real drive on the iPad will mark hard brakes and bumps.

The people (Sam Ortiz, Cody Rivera, Dana Ruiz), runs and order AI-48213 in these shots are on the shared demo pantry. They're now real demo data your group will see.
