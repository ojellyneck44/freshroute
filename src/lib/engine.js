import {useSyncExternalStore} from 'react';
import {cumulative, project, pointAt, distance} from './geo.js';
import {api, send} from './api.js';
import {getState, setState} from './state.js';
import {storeById, BANK} from '../data/stores.js';
import {route as osrmRoute} from './osrm.js';

// The drive engine: turns GPS (or the test simulator) into progress, the next turn,
// a live forecast against the locked promise, arrival at stops, and the record the food bank sees.

export const DWELL_MS = 12 * 60000; // planned time at each pickup
const ARRIVE_M = 70; // geofence radius for "you're here"
const DKEY = 'freshroute:drive';

let drive = null; // the active drive (persisted)
let live = {}; // fast-changing values (not persisted on every tick)
const subs = new Set();
const emit = () => subs.forEach((f) => f());
let version = 0;
const bump = () => {
  version++;
  emit();
};

function persist() {
  try {
    localStorage.setItem(DKEY, JSON.stringify(drive));
  } catch {
    /* ignore */
  }
}

export function useDrive() {
  useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => version);
  return {drive, live};
}
export const getDrive = () => drive;

// ---------- Planning ----------
export async function planRoute(storeIds) {
  const stops = storeIds.map(storeById).filter(Boolean);
  const r = await osrmRoute([BANK, ...stops, BANK]);
  return {stops, route: r};
}

// Promise = start + driving time + a planned dwell at each pickup, rounded up to the minute.
// speed > 1 only for the test simulator, so a sped-up drive is measured against a sped-up promise.
export function promiseFor(route, stopsCount, start = Date.now(), speed = 1) {
  const at = [];
  let t = start;
  route.legs.forEach((leg, i) => {
    t += (leg.duration * 1000) / speed;
    if (i < stopsCount) {
      at.push(Math.ceil(t / 60000) * 60000);
      t += DWELL_MS / speed;
    }
  });
  return {stops: at, final: Math.ceil(t / 60000) * 60000};
}

// ---------- Start / stop ----------
export async function startDrive({storeIds, plan, sim = 0, camera}) {
  const {stops, route} = plan || (await planRoute(storeIds));
  const now = Date.now();
  const promise = promiseFor(route, stops.length, now, sim || 1);
  const {profile, code} = getState();
  const legEnds = [];
  let acc = 0;
  route.legs.forEach((l) => legEnds.push((acc += l.distance)));
  drive = {
    id: null,
    driver: profile.name || 'Driver',
    van: profile.van,
    cold: profile.cold,
    bankName: BANK.name,
    camera: camera || '',
    startedAt: now,
    promiseAt: promise.final,
    status: 'en-route-pickup',
    stops: stops.map((s, i) => ({
      storeId: s.id, name: s.name, address: s.address, lat: s.lat, lon: s.lon,
      items: s.items, promiseAt: promise.stops[i], etaAt: promise.stops[i],
      arrivedAt: null, departedAt: null, counts: null,
    })),
    dest: {name: BANK.name, lat: BANK.lat, lon: BANK.lon},
    route: {coords: route.coords, legs: route.legs, distance: route.distance, duration: route.duration, legEnds},
    coldStartAt: null,
    delays: [],
    sim,
  };
  try {
    const {id} = await api('drives', {method: 'POST', body: summary(), code});
    drive.id = id;
  } catch {
    drive.id = 'local-' + Math.random().toString(36).slice(2, 10); // works offline; nothing is shared
  }
  setState({driveId: drive.id});
  persist();
  begin();
  return drive;
}

// What the server stores in the drive row (no high-frequency data).
function summary() {
  const {route, ...rest} = drive;
  return {...rest, routeCoords: route.coords, legEnds: route.legEnds, routeDistance: route.distance, routeDuration: route.duration};
}
const shared = () => drive && !String(drive.id).startsWith('local-');
export function patchDrive(patch) {
  Object.assign(drive, patch);
  persist();
  if (shared()) send(`drives/${drive.id}`, patch, 'PATCH');
  bump();
}
export function logEvent(kind, data) {
  const e = {t: Date.now(), kind, data};
  (drive.events ||= []).push(e);
  persist();
  if (shared()) send(`drives/${drive.id}/events`, e);
  bump();
}

export function resumeDrive() {
  try {
    const saved = JSON.parse(localStorage.getItem(DKEY) || 'null');
    if (saved && saved.id === getState().driveId && saved.status !== 'delivered') {
      drive = saved;
      begin();
      return drive;
    }
  } catch {
    /* ignore */
  }
  return null;
}

let watchId = null, simTimer = null, postTimer = null, patchTimer = null, buffer = [];
function begin() {
  const cum = cumulative(drive.route.coords);
  live = {cum, along: live.along ?? 0, idx: 0, pos: null, spd: 0, hdg: 0, hdgRate: 0, forecast: drive.promiseAt, stepI: 0, offRoute: false};
  if (drive.sim) startSim();
  else if ('geolocation' in navigator) {
    watchId = navigator.geolocation.watchPosition(
      (p) => onPosition({lat: p.coords.latitude, lon: p.coords.longitude, spd: p.coords.speed, hdg: p.coords.heading, t: p.timestamp}),
      (err) => {
        live.gpsError = err.code === 1 ? 'Location is off for FreshRoute. Turn it on in Settings to navigate.' : 'Waiting for GPS…';
        bump();
      },
      {enableHighAccuracy: true, maximumAge: 2000, timeout: 20000},
    );
  }
  postTimer = setInterval(() => {
    if (buffer.length && shared()) send(`drives/${drive.id}/points`, buffer.splice(0));
    else buffer = [];
  }, 5000);
  patchTimer = setInterval(() => {
    if (shared()) send(`drives/${drive.id}`, {stops: drive.stops, status: drive.status, coldStartAt: drive.coldStartAt, delays: drive.delays}, 'PATCH');
  }, 30000);
}

export function endEngine() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  clearInterval(simTimer);
  clearInterval(postTimer);
  clearInterval(patchTimer);
  if (buffer.length && shared()) send(`drives/${drive.id}/points`, buffer.splice(0));
  watchId = simTimer = postTimer = patchTimer = null;
}

// ---------- Progress ----------
const nextStopIndex = () => drive.stops.findIndex((s) => !s.departedAt);
export const currentTarget = () => {
  const i = nextStopIndex();
  return i === -1 ? {kind: 'bank', ...drive.dest, i: drive.stops.length} : {kind: 'stop', ...drive.stops[i], i};
};

function onPosition({lat, lon, spd, hdg, t}) {
  const p = [lon, lat];
  const {coords} = drive.route;
  const pr = project(coords, live.cum, p, Math.max(0, live.idx - 5));
  const prevHdg = live.hdg;
  const prevT = live.t || t;
  live.pos = p;
  live.t = t;
  live.spd = spd ?? live.spd;
  live.hdg = hdg ?? live.hdg;
  live.hdgRate = ((((live.hdg - prevHdg + 540) % 360) - 180) / Math.max(0.5, (t - prevT) / 1000));
  live.offRoute = pr.off > 120;
  if (!live.offRoute && pr.along >= live.along - 30) {
    live.along = pr.along;
    live.idx = pr.i;
  }
  update(t);
}

function update(t = Date.now()) {
  const target = currentTarget();
  const legI = target.i;
  const {legs, legEnds} = drive.route;
  // Remaining time: rest of this leg (scaled by distance), later legs, plus dwell at stops still ahead.
  const legStart = legI ? legEnds[legI - 1] : 0;
  const legLeft = Math.max(0, legEnds[legI] - Math.max(live.along, legStart));
  const legFrac = legEnds[legI] - legStart ? legLeft / (legEnds[legI] - legStart) : 0;
  const atStop = target.kind === 'stop' && target.arrivedAt;
  const k1 = 1 / (drive.sim || 1);
  const dwell = DWELL_MS * k1;
  let remain = atStop ? Math.max(0, dwell - (t - target.arrivedAt)) : legs[legI].duration * 1000 * legFrac * k1;
  for (let k = legI + 1; k < legs.length; k++) remain += legs[k].duration * 1000 * k1;
  const stopsAhead = drive.stops.filter((s, k) => k > legI || (k === legI && !s.arrivedAt)).length;
  remain += stopsAhead * dwell;
  const extra = drive.delays.reduce((a, d) => a + (d.active ? Math.max(0, d.until - t) : 0), 0);
  live.forecast = t + remain + extra;
  live.legLeft = legLeft;

  // Per-stop ETA for the store link: time to reach that stop.
  let acc = t + (atStop ? 0 : legs[legI].duration * 1000 * legFrac * k1) + extra;
  drive.stops.forEach((s, k) => {
    if (k < legI || s.arrivedAt) return;
    if (k > legI) acc += dwell + legs[k].duration * 1000 * k1;
    s.etaAt = Math.round(acc);
  });

  // Next maneuver in this leg.
  const steps = legs[legI].steps;
  const stepAlong = (s) => {
    const pr = project(drive.route.coords, live.cum, s.at, Math.max(0, live.idx - 50));
    return pr.along;
  };
  let si = live.stepI && live.stepLeg === legI ? live.stepI : 1;
  while (si < steps.length - 1 && stepAlong(steps[si]) < live.along + 5) si++;
  live.stepI = si;
  live.stepLeg = legI;
  live.step = steps[si];
  live.stepDist = Math.max(0, stepAlong(steps[si]) - live.along);

  // Arrival geofence.
  if (live.pos && distance(live.pos, [target.lon, target.lat]) < ARRIVE_M) {
    if (target.kind === 'stop' && !drive.stops[target.i].arrivedAt) arrive(target.i);
    if (target.kind === 'bank' && drive.status !== 'arrived-bank' && drive.status !== 'delivered') {
      drive.status = 'arrived-bank';
      drive.arrivedBankAt = t;
      logEvent('arrived-bank', {});
      patchDrive({status: drive.status, arrivedBankAt: t});
    }
  }
  if (live.pos) {
    const pt = {t, lat: live.pos[1], lon: live.pos[0], spd: live.spd, hdg: live.hdg, eta: Math.round(live.forecast)};
    buffer.push(pt);
    // A light local copy (every 10 s) so this device can draw the report even without the server.
    const tr = (drive.trail ||= []);
    if (!tr.length || t - tr[tr.length - 1].t >= 10000) {
      tr.push(pt);
      persist();
    }
  }
  bump();
}

export function arrive(i) {
  const s = drive.stops[i];
  s.arrivedAt = Date.now();
  logEvent('arrived', {storeId: s.storeId, name: s.name});
  patchDrive({stops: drive.stops, status: 'at-pickup'});
}

// Driver taps "Loaded": counts recorded, cold timer starts on the first cold pickup.
export function loaded(i, counts) {
  const s = drive.stops[i];
  s.counts = counts;
  s.departedAt = Date.now();
  const hasCold = s.items.some((it) => it.storage === 'cold' || it.storage === 'frozen');
  if (hasCold && !drive.coldStartAt) drive.coldStartAt = Date.now();
  logEvent('loaded', {storeId: s.storeId, name: s.name, counts, cold: hasCold});
  const next = drive.stops.find((x) => !x.departedAt);
  patchDrive({stops: drive.stops, coldStartAt: drive.coldStartAt, status: next ? 'en-route-pickup' : 'en-route-bank'});
}

export function skipStop(i, reason) {
  const s = drive.stops[i];
  s.skipped = reason || 'Skipped';
  s.departedAt = Date.now();
  s.arrivedAt ||= Date.now();
  logEvent('skipped', {storeId: s.storeId, name: s.name, reason});
  const next = drive.stops.find((x) => !x.departedAt);
  patchDrive({stops: drive.stops, status: next ? 'en-route-pickup' : 'en-route-bank'});
}

export function addDelay(reason, minutes) {
  const t = Date.now();
  drive.delays.push({t, reason, minutes, until: t + (minutes * 60000) / (drive.sim || 1), active: true});
  logEvent('delay', {reason, minutes});
  patchDrive({delays: drive.delays});
}

export function finishDrive({dropCounts, feedback}) {
  endEngine();
  const t = Date.now();
  drive.status = 'delivered';
  drive.deliveredAt = t;
  drive.arrivedBankAt ||= t;
  drive.dropCounts = dropCounts;
  drive.feedback = feedback;
  logEvent('delivered', {dropCounts});
  const motionCount = (drive.events || []).filter((e) => e.kind === 'motion').length;
  patchDrive({status: 'delivered', deliveredAt: t, arrivedBankAt: drive.arrivedBankAt, dropCounts, feedback, stops: drive.stops, motionCount});
  if (feedback?.text || feedback?.tags?.length) {
    for (const s of drive.stops) if (shared()) send('notes', {store: s.storeId, drive: drive.id, text: feedback.text || feedback.tags.join(', '), tags: feedback.tags});
  }
  const id = drive.id;
  setState({driveId: null, lastReport: id});
  try {
    localStorage.setItem('freshroute:report:' + id, JSON.stringify({...drive, events: drive.events || []}));
    localStorage.removeItem(DKEY);
  } catch {
    /* ignore */
  }
  drive = null;
  bump();
  return id;
}

// ---------- Test simulator ----------
// Moves along the route at the routed speed × multiplier and waits at each stop until "Loaded".
export function setSimSpeed(x) {
  drive.sim = x;
  persist();
  if (x && !simTimer) startSim();
  bump();
}
function startSim() {
  clearInterval(simTimer);
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  let lastT = Date.now();
  simTimer = setInterval(() => {
    const t = Date.now();
    const dt = (t - lastT) / 1000;
    lastT = t;
    const target = currentTarget();
    const waiting = (target.kind === 'stop' && drive.stops[target.i].arrivedAt) || drive.status === 'arrived-bank' || drive.status === 'delivered';
    const delayed = drive.delays.some((d) => d.active && d.until > t);
    const leg = drive.route.legs[Math.min(target.i, drive.route.legs.length - 1)];
    const mps = leg.distance / Math.max(1, leg.duration);
    if (!waiting && !delayed) {
      const stopAt = drive.route.legEnds[target.i];
      live.along = Math.min(stopAt, (live.along || 0) + mps * dt * (drive.sim || 1));
    }
    const at = pointAt(drive.route.coords, live.cum, live.along);
    live.idx = at.i;
    const prev = live.hdg;
    live.pos = at.p;
    live.hdg = at.hdg;
    live.hdgRate = (((at.hdg - prev + 540) % 360) - 180) / Math.max(0.2, dt);
    live.spd = waiting || delayed ? 0 : mps;
    live.t = t;
    update(t);
  }, 1000);
}
