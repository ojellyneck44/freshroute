// Times are shown as local clock times ("10:11"), as the style sheet's voice rules say.
export const clock = (t) =>
  t == null ? '--:--' : new Date(t).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}).replace(/\s?[AP]M$/i, '');
export const clockAmPm = (t) => (t == null ? '' : new Date(t).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}));
export const mins = (ms) => Math.round(ms / 60000);
export const duration = (ms) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
};
export const hms = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};
export const miles = (m) => (m < 160 ? `${Math.round(m * 3.281 / 10) * 10} ft` : `${(m / 1609.34).toFixed(m < 16093 ? 1 : 0)} mi`);
export const day = (t) => new Date(t).toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'});

// ETA state against the locked promise. Thresholds are proposed values (DESIGN.md, unresolved).
export const ON_TIME_MAX = 3, SLIPPING_MAX = 10;
export function etaState(forecast, promise) {
  if (forecast == null || promise == null) return {key: 'unknown', label: 'No forecast', delta: 0};
  const delta = Math.round((forecast - promise) / 60000);
  if (delta <= ON_TIME_MAX) return {key: 'on-time', label: 'On time', delta};
  if (delta <= SLIPPING_MAX) return {key: 'slipping', label: 'Slipping', delta};
  return {key: 'late', label: 'Late', delta};
}
export function deltaText(forecast, promise) {
  const d = Math.round((forecast - promise) / 60000);
  if (Math.abs(d) <= 0) return `Right on your ${clock(promise)} promise`;
  return d > 0 ? `${d} min behind ${clock(promise)}` : `${-d} min ahead of ${clock(promise)}`;
}

// Cold-chain timer warnings (food bank can change these later): 1 h and 2 h out of the fridge.
export const COLD_WARN = 60 * 60000, COLD_LIMIT = 120 * 60000;
export const coldState = (ms) => (ms >= COLD_LIMIT ? 'late' : ms >= COLD_WARN ? 'slipping' : 'cold');
