// Destination pins: a map-pin shape with a place icon inside, so the pantry and the food bank read
// as places, not app badges. Icon paths are from Lucide (ISC licence): house, warehouse.
const HOUSE = '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>';
const WAREHOUSE = '<path d="M18 21V10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v11"/><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35a2 2 0 0 1 1.26-1.85l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35z"/><path d="M6 13h12"/><path d="M6 17h12"/>';

const pin = (icon) =>
  '<svg viewBox="0 0 40 48" aria-hidden="true">' +
  '<path class="pin-body" d="M20 46s16-14 16-27.5A16 16 0 0 0 4 18.5C4 32 20 46 20 46z"/>' +
  `<g class="pin-icon" transform="translate(11 9.5) scale(0.75)" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icon}</g>` +
  '</svg>';

export const PIN_HTML = {pantry: pin(HOUSE), foodbank: pin(WAREHOUSE), hub: pin(HOUSE)};

// A marker spec for MapView: kind is 'pantry' (your pantry), 'foodbank' (the food bank warehouse) or 'hub' (a shared stop).
export const destPin = (kind, id, lon, lat, label, extra = {}) => ({id, lon, lat, label, className: `dest ${kind}`, html: PIN_HTML[kind], anchor: 'bottom', ...extra});
