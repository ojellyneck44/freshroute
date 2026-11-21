// Practice area: so the app can be tested anywhere, not only in Denton.
// "Around me" moves the demo pantry to where you are and swaps the Denton stores for real grocery stores
// near you (OpenStreetMap), always open, with the sample donations. Saved per device.
// shortcut: per-device only, so a second device (pantry + driver) needs the same setting; a real pantry has a fixed address.
import {BANK, stores} from './stores.js';
import {HUB, PARENT} from './deliveries.js';
import {api} from '../lib/api.js';

const KEY = 'freshroute:area';
const DENTON = stores.filter((s) => !s.warehouse); // templates for sample donations and pickup notes

export function savedArea() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

// Called once before the app renders.
export function applyArea() {
  const a = savedArea();
  if (!a) return;
  Object.assign(BANK, {lat: a.lat, lon: a.lon, address: 'Practice location near you'});
  // The shared stop sits about 40% of the way from the food bank warehouse to you.
  Object.assign(HUB, {lat: PARENT.lat + (a.lat - PARENT.lat) * 0.4, lon: PARENT.lon + (a.lon - PARENT.lon) * 0.4, name: 'Shared stop (practice)', place: 'shared stop on the way'});
  const warehouse = stores.filter((s) => s.warehouse);
  stores.splice(0, stores.length, ...a.stores, ...warehouse);
}

export function clearArea() {
  localStorage.removeItem(KEY);
}

// Real supermarkets within ~8 km (OpenStreetMap, through our API so the lookup can identify itself).
// If the lookup fails, practice stores are placed around you instead, so testing never gets stuck.
export async function setAroundMe(lat, lon) {
  const within = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
  // An Overpass mirror that answers browsers directly, then our API (other mirrors), then practice spots.
  const direct = async () => {
    const q = `[out:json][timeout:20];(node["shop"="supermarket"](around:8000,${lat.toFixed(4)},${lon.toFixed(4)});way["shop"="supermarket"](around:8000,${lat.toFixed(4)},${lon.toFixed(4)}););out center 40;`;
    const res = await fetch('https://maps.mail.ru/osm/tools/overpass/api/interpreter', {method: 'POST', body: 'data=' + encodeURIComponent(q)});
    if (!res.ok) throw new Error('lookup failed');
    const {elements = []} = await res.json();
    return elements.map((e) => ({id: e.id, lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, name: e.tags?.name || e.tags?.brand || '', street: [e.tags?.['addr:housenumber'], e.tags?.['addr:street']].filter(Boolean).join(' '), city: e.tags?.['addr:city'] || ''}));
  };
  let found = [];
  try {
    found = await within(direct(), 9000);
  } catch {
    found = await within(api(`nearby?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`), 11000).catch(() => []);
  }
  const seen = new Set();
  const near = found
    .filter((e) => e.lat && e.name)
    .map((e) => ({...e, d: Math.hypot(e.lat - lat, (e.lon - lon) * Math.cos((lat * Math.PI) / 180))}))
    .sort((x, y) => x.d - y.d)
    .filter((e) => {
      const k = `${e.name}|${e.lat.toFixed(3)}`;
      return !seen.has(k) && seen.add(k);
    })
    .slice(0, 12);
  const real = near.length >= 3;
  // Fallback: 8 spots on a ring 1.5 to 4 km around you (the router snaps them to the nearest road).
  const spots = real ? near : Array.from({length: 8}, (_, i) => {
    const a = (i / 8) * 2 * Math.PI, r = (1.5 + (i % 3)) / 111;
    return {id: `p${i}`, lat: lat + r * Math.sin(a), lon: lon + (r * Math.cos(a)) / Math.cos((lat * Math.PI) / 180), name: `Practice store ${String.fromCharCode(65 + i)}`, street: ''};
  });
  const list = spots.map((e, i) => {
    const t = DENTON[i % DENTON.length];
    return {...t, id: `osm-${e.id}`, name: e.name, address: e.street || e.city || 'Near you', lat: e.lat, lon: e.lon, demo: true,
      how: real ? "Practice store: the donations and pickup notes are sample data. Park in the lot; don't go to the receiving door." : 'Practice spot: not a real store. Drive there, park somewhere safe nearby, and do the pickup step.'};
  });
  localStorage.setItem(KEY, JSON.stringify({lat, lon, stores: list, real, at: Date.now()}));
  return {count: list.length, real};
}
