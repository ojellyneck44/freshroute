---
version: alpha
name: FreshRoute
description: iPad-first web app for food bank donation drivers and food bank managers, built around a locked arrival-time promise and a recorded drive.
x-zsd:
  profile: "0.1"
  kind: project
  source:
    method: authored
    paths:
      - docs/brand/style-sheet.html
      - docs/brand/type-options.html
      - docs/decisions.md
    date: 2026-11-19
  review:
    status: draft
  intent:
    audience: Food bank drivers with an iPad mounted in a van or truck, and food bank managers at a laptop or phone.
    primary-task: Drive a multi-stop pickup route and arrive when promised; for managers, see each truck's live ETA, cold-chain time and footage.
    character: Calm dispatcher. Native Apple feel, dark night-road surfaces, one green that means on time. Trustworthy, dry, precise.
    density: comfortable
    theme: dark
    references:
      - Apple Human Interface Guidelines (Liquid Glass, sheets, Dynamic Type)
      - Google Maps and Waze maneuver card conventions
      - Life360 drive report structure
      - Ring live view and event timeline
  preferences:
    must-use:
      - Overpass for headlines, store names and the wordmark.
      - System font (SF Pro on Apple devices) for all interface text and every live number, with tabular figures.
      - IBM Plex Mono only for records such as timecodes, event rows and IDs.
      - Sprout as the only brand color; it also means on time.
      - A glyph and a word with every status color.
      - Liquid Glass only on controls that float over the map or video.
      - A baseline next to every metric.
      - One status vocabulary everywhere (Scheduled, En route to pickup, Loaded, En route to food bank, Delivered).
    must-avoid:
      - Gamification, streaks, confetti, mascots, emoji.
      - Gradients in the interface (the app icon is the only exception).
      - Uppercase tracked labels repeated above every heading, and numbered section markers.
      - Colored left-border strips on ordinary panels.
      - Monospace for decoration.
      - Overshoot or bounce easing.
      - Glass on content (lists, tables, reports, forms) and glass on glass.
      - Decorative motion while the vehicle moves faster than 8 km/h.
    preserve:
      - The ETA ring as the main control, top-right in navigation.
      - Camera window top-left in navigation.
      - Store ETA link is one page with no account.
  implementation:
    token-source: DESIGN.md
    component-sources:
      - Astryx (@astryxdesign/core) with a local theme "freshroute" extending theme-neutral
    style-sources: []
    font-assets:
      - Overpass (Open Font License, self-hosted variable woff2)
      - IBM Plex Mono 500 and 600 (Open Font License, self-hosted)
    image-assets: []
    icon-assets:
      - Lucide (ISC) registered as Astryx theme icons
      - Custom glyphs for hard brake, sharp turn, bump, cold timer, recording
      - docs/brand/icon/icon.svg
  unresolved:
    - ETA state thresholds (on time up to +3 min, slipping +4 to +10, late above +10) and cold-timer warnings (1 h, 2 h) are proposed values for user testing.
    - Motion-event thresholds (0.45 g brake, 0.4 g lateral, 0.5 g vertical) are proposed values for user testing.
    - Exact Astryx token names to be confirmed against the Astryx theme template at build time.
  layout:
    content-max: 1440px
    viewport-min: 360px
    sheet-width: 400px
  breakpoints:
    phone: 360px
    tablet-portrait: 768px
    tablet-landscape: 1024px
    desktop: 1280px
  border:
    width-default: 1px
    color-default: "{colors.outline}"
  motion:
    duration-snap: 280ms
    duration-glide: 450ms
    duration-state: 800ms
    duration-reduced-max: 200ms
    easing-standard: cubic-bezier(0.2, 0.8, 0.2, 1)
    moving-threshold: 8 km/h
  glass:
    tint: "rgba(28, 35, 33, 0.56)"
    tint-daylight: "rgba(246, 248, 247, 0.72)"
    blur: 24px
    saturation: 170%
    edge: "rgba(255, 255, 255, 0.12)"
  accessibility:
    target-min: "{spacing.control-height}"
    target-moving: "{spacing.control-moving}"
    focus-width: 2px
    focus-offset: 2px
    focus-color: "{colors.primary}"
  modes:
    daylight:
      colors:
        primary: "#3C7A0C"
        primary-hover: "#33690A"
        on-primary: "#FFFFFF"
        surface: "#F6F8F7"
        surface-raised: "#FFFFFF"
        surface-muted: "#EEF2F0"
        on-surface: "#0E1412"
        on-surface-muted: "#4F5A56"
        on-surface-faint: "#5E6965"
        outline: "#C9D1CE"
        outline-strong: "#A3AEA9"
        warning: "#9A5800"
        error: "#C2341E"
        cold: "#0A6F91"
        primary-tint: "#E3F3CF"
        warning-tint: "#FBEBD3"
        error-tint: "#F9DDD8"
        cold-tint: "#D6EEF6"
colors:
  primary: "#B8F25E"
  primary-hover: "#D6FB92"
  on-primary: "#0B0F0E"
  surface: "#0B0F0E"
  surface-raised: "#141A18"
  surface-muted: "#1C2321"
  on-surface: "#ECF0EE"
  on-surface-muted: "#A3AEA9"
  on-surface-faint: "#86928D"
  outline: "#252D2A"
  outline-strong: "#323C38"
  warning: "#FFB54A"
  error: "#FF7A66"
  cold: "#7FD6F0"
  primary-tint: "#1A2A0B"
  warning-tint: "#2E2008"
  error-tint: "#33140F"
  cold-tint: "#0C2530"
typography:
  numeral-hero:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: 64px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: -1px
  display:
    fontFamily: "Overpass, -apple-system, sans-serif"
    fontSize: 48px
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: -0.5px
  headline-lg:
    fontFamily: "Overpass, -apple-system, sans-serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: -0.3px
  maneuver:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0px
  title-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.27
    letterSpacing: 0px
  body-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.41
    letterSpacing: 0px
  label-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: 0px
  footnote:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.38
    letterSpacing: 0px
  record:
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.43
    letterSpacing: 0px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section: 56px
  control-height: 44px
  control-moving: 64px
rounded:
  none: 0px
  inner: 8px
  element: 12px
  container: 24px
  sheet: 36px
  full: 999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.element}"
    padding: "{spacing.lg}"
    height: "{spacing.control-height}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.element}"
    padding: "{spacing.lg}"
    height: "{spacing.control-height}"
  button-drive:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title-md}"
    rounded: "{rounded.element}"
    padding: "{spacing.xl}"
    height: "{spacing.control-moving}"
  button-secondary:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.element}"
    padding: "{spacing.lg}"
    height: "{spacing.control-height}"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.element}"
    padding: "{spacing.md}"
    height: "{spacing.control-height}"
  panel:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.container}"
    padding: "{spacing.xl}"
  sheet:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sheet}"
    padding: "{spacing.xl}"
  badge-on-time:
    backgroundColor: "{colors.primary-tint}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.md}"
  badge-slipping:
    backgroundColor: "{colors.warning-tint}"
    textColor: "{colors.warning}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.md}"
  badge-late:
    backgroundColor: "{colors.error-tint}"
    textColor: "{colors.error}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.md}"
  badge-cold:
    backgroundColor: "{colors.cold-tint}"
    textColor: "{colors.cold}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.md}"
  timestamp:
    textColor: "{colors.on-surface-faint}"
    typography: "{typography.footnote}"
  ring-track:
    backgroundColor: "{colors.outline-strong}"
    rounded: "{rounded.full}"
  alert-error:
    backgroundColor: "{colors.error-tint}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.element}"
    padding: "{spacing.lg}"
---

# FreshRoute

## Overview

FreshRoute locks an arrival time, the promise, when a driver starts a route. Every screen shows if the driver is keeping that promise. Drivers glance at a mounted iPad for under a second; managers watch trucks from a desk or a phone. The interface is calm when parked and quieter when moving.

### Implementation

Read `x-zsd.implementation` before UI changes. Build on Astryx components through the `freshroute` theme. Only the ETA ring, the map, the glass layer and the footage scrubber are custom.

## Colors

- `primary`: Sprout. Use for the brand, the on-time state, the primary action and the route ahead. Do not use it for decoration.
- `primary-hover`: Use for the primary action's hover and press state.
- `on-primary`: Use for text on Sprout.
- `surface`: Use for the page and map-free background.
- `surface-raised`: Use for lists, panels and inputs.
- `surface-muted`: Use for sheets, menus and secondary actions.
- `on-surface`, `on-surface-muted`, `on-surface-faint`: Use for primary, secondary and tertiary text. All pass 4.5:1 on every surface.
- `outline`, `outline-strong`: Use for hairlines, and for control boundaries and ring tracks.
- `warning`: Apricot. Use for the slipping state and motion events only.
- `error`: Tomato. Use for the late state, destructive actions and the recording dot only.
- `cold`: Frost. Use for the cold-chain timer only.
- `primary-tint`, `warning-tint`, `error-tint`, `cold-tint`: Use as the background of the matching badge or alert.

The `daylight` mode applies to the screens for drivers between local sunrise and sunset, with a manual override. Manager screens follow the system setting.

## Typography

- `numeral-hero`: Use for the ETA ring centre. Use tabular figures.
- `display`: Overpass. Use for report and role-choice headlines.
- `headline-lg`: Overpass. Use for screen titles and store names.
- `maneuver`: Use for the next-turn instruction. This is the smallest size a driver reads while moving.
- `title-md`, `body-md`, `label-md`, `footnote`: Use for interface text in sentence case.
- `record`: IBM Plex Mono. Use for timecodes, event rows and IDs only.

Set every changing number (ETA, timers, distance) in the system font with tabular figures. Overpass separators need a wider space than its middle dot gives; use a thin divider or an en space. Respect the user's text-size setting.

## Layout

Use the 4 px spacing scale. Use `section` between page groups and `xl` inside panels. In iPad landscape, the map is full bleed with a `x-zsd.layout.sheet-width` side sheet. In portrait and on phone, use a bottom sheet with three detents. Respect safe-area insets in standalone mode.

### Responsive behavior

Below `tablet-portrait`, the ETA ring shrinks to 96 px and controls stack in the bottom sheet. Manager screens above `desktop` use a sidebar, a truck list, and a map with a detail panel.

## Elevation & Depth

Use surface steps for hierarchy, not shadows. Use glass only for controls over the map or video: the maneuver card, ETA ring, camera window, toolbar and tab bar. Apply `x-zsd.glass` values. With reduced transparency or Low Power Mode, replace glass with `surface-muted` at 96% opacity.

## Shapes

- `inner`: Use for chips inside rows.
- `element`: Use for buttons, fields and thumbnails.
- `container`: Use for panels and glass controls.
- `sheet`: Use for the top corners of sheets.
- `full`: Use for badges and the ETA ring.

Nested corners are concentric: inner radius equals outer radius minus padding.

## Components

### Button

Use `button-primary` for the one main action in a group. Use `button-drive` for actions taken in a moving vehicle; place it bottom-right. Use verbs that say what happens ("Finish drive", "Start pickup").

### Input

Use `input` with a visible label above it. For pickup counts, use a number field with large steppers sized to `target-moving`. Keep helper and error text beside the field, and keep entered values after an error.

### Timestamp and ring track

Use `timestamp` for update times and meta text; never show it to a driver in motion. Use `ring-track` for the unfilled part of the ETA ring and progress bars.

### Status badge

Use `badge-on-time`, `badge-slipping` and `badge-late` with their glyphs (check, clock, exclamation) and words. Change state over `duration-state`; never flash.

### Panel and sheet

Use `panel` for grouped content on solid surfaces. Use `sheet` for route trays and store details. Do not nest panels.

### Alert

Use `alert-error` to say what failed, keep the user's work, and offer a recovery action.

## Do's and Don'ts

- Do show a baseline with every number ("6 min behind your 10:13 promise").
- Do pair every status color with a glyph and a word.
- Do keep footage language factual: saved, marked, shared.
- Do record recording gaps; never hide them.
- Do not use gamification, emoji, exclamation marks or "Oops".
- Do not use gradients, colored shadows or colored left-border strips in the interface.
- Do not repeat uppercase tracked labels above headings.
- Do not use monospace for decoration.
- Do not put glass on content or glass on glass.

## Motion

Use `duration-snap` for buttons and toggles, `duration-glide` for sheets and page pushes, and `duration-state` with `easing-standard` for state colors. Use critically damped springs; no overshoot. Above `moving-threshold`, keep only informative motion: ring fill, truck puck, state color. With reduced motion, crossfade within `duration-reduced-max`.

## Iconography

Use Lucide at 1.75 stroke (24 px) and 2.25 stroke (32 px and up) with rounded caps. Use the custom glyphs for motion events, the cold timer and recording. Show a word next to every icon except close, back and more.

## Accessibility

Keep targets at `target-min`, and at `target-moving` with 12 px gaps for anything used in a moving vehicle. Show a focus outline with `focus-width`, `focus-offset` and `focus-color`. Test text contrast on glass over the brightest map area in each mode.
