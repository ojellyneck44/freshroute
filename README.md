# FreshRoute

An iPad-first web app (PWA) for food bank donation drivers and food bank managers. A driver plans a multi-stop pickup route from real Denton grocery stores and gets a locked arrival time: the **promise**. While they drive, the food bank sees the live forecast against that promise, the cold-chain timer, and near-live video of the drive. Afterwards, both can open the drive report.

Built for an internship case study. Research, wireframes and the style sheet are in `docs/`.

## What's in it

| Who | Screens |
|---|---|
| Driver | Join, van setup and recording consent, store map and list, store details, route tray, pre-drive check (camera, location, motion), navigation, progress, pickup counts, drop-off counts, "what slowed you down", drive report, preferences |
| Food bank manager | Trucks on the road (with 15- and 5-minute heads-up), live truck view with near-live video, drive reports, stores with driver notes |
| Grocery store | One page from a text link, no account: ETA, what's being picked up, "ready at the dock" |
| Test facilitator | Add `?test=1` to any URL: task script, timer, outcomes, SUS survey, CSV export. The simulator drives the route without GPS. |

## Stack

- Vite + React 19, [Astryx](https://astryx.atmeta.com) components with FreshRoute tokens (`src/styles/tokens.css`, `DESIGN.md`)
- MapLibre GL with OpenFreeMap tiles, routing from the public OSRM server
- Cloudflare Pages + Pages Functions (`functions/api`), D1 for drives, points and events, R2 for video
- Video: a fresh `MediaRecorder` every 10 seconds, so each segment is a playable file uploaded as soon as it closes

## Run it

```bash
npm install
npm run build
npx wrangler d1 execute freshroute --local --file schema.sql
npx wrangler pages dev dist
```

Open http://localhost:8788 and use the join code `DENTON-DEMO` (or "Try the demo food bank").

Tests: `npm test`. Deploy: `npm run deploy`.

## Known limits (prototype)

- Store schedules and items are sample data in `src/data/stores.js`; replace that module with a real source (for example a food bank's agency portal).
- One shared join code per food bank, no individual accounts. Change `BANK_CODE` before real use.
- The public OSRM demo server is fine for testing but not for production.
- Safari only records while FreshRoute is on screen; background time shows as a gap in the report.
- Video segments that fail to upload are kept in memory, not on disk.
