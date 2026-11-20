# FreshRoute: decisions log

## 2026-11-19, answers to the wireframe open questions

1. **Bluetooth dashcams: dropped.** Driver cameras are the iPad's front or back camera, or a USB-C camera.
2. **The progress screen can be opened while driving.** It is optional and one tap away from navigation. The food bank sees the same screen live for each truck: the M2 truck detail shows the ETA ring, the promise vs. forecast, stops and the cold timer, and updates in real time. This replaces the wireframe's "only when stopped" rule.
3. **Store link (S1): one page, no account** (confirmed 2026-11-19). The store gets a text with a link to a single page: driver ETA, what's being picked up, and a "Ready at the dock" button. No store login and no store-side posting.
4. **Listings come from real Denton grocery stores on the map,** each with a made-up donation schedule (days, window, typical items). Later the schedules would come from a real system such as Tarrant Area Food Bank's agency portal, so the schedule must live behind a single data source the app reads.
5. **Recording-policy text: draft it.** Plain language, marked "not legal advice".
6. **The name is "FreshRoute",** one word with a capital R.

## Brand

The style sheet in `docs/brand/` must be approved before any web development starts.
7. **Display typeface: Overpass** (chosen 2026-11-19). Interface text stays in the system font, and records in IBM Plex Mono.
8. **App icon: direction A, ring and leaf** (chosen 2026-11-19). `docs/brand/icon/icon.svg` is the full icon; `icon-small.svg` is used at 64 px and below.
9. **Friendlier dark mode** (2026-11-19, Stevie: "feels like a computer terminal"). The green-black Asphalt neutrals became soft charcoal (#1A1C20 page, #23262B surface), Sprout softened to #B4EC6A, and monospace left the product UI (timecodes now use the system font with tabular figures). DESIGN.md holds the new values; the style sheet (v4 PDF) and the app icon use the new palette too.
