import {useSyncExternalStore} from 'react';

// Small persisted app state. Everything a driver or manager sets up lives here.
const KEY = 'freshroute:v1';
const initial = {
  role: null, // 'driver' (pantry volunteer) | 'hauler' (food bank truck driver) | 'bank' (the pantry)
  code: '', // food bank join code
  profile: {name: '', van: '', plate: '', cold: false, consent: false},

  prefs: {theme: 'auto', camera: '', headsUp: true},
  route: [], // [{storeId}] being planned
  haul: null, // delivery id a food bank driver is about to start
  profileId: null, // who is using this device (a person at the pantry, see /api/profiles)
  driveId: null, // active drive on this device
  lastReport: null,
};

let state = load();
const subs = new Set();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    return saved ? {...initial, ...saved, profile: {...initial.profile, ...saved.profile}, prefs: {...initial.prefs, ...saved.prefs}} : initial;
  } catch {
    return initial;
  }
}

export const getState = () => state;
export function setState(patch) {
  state = {...state, ...(typeof patch === 'function' ? patch(state) : patch)};
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or full storage: the app still works for this session.
  }
  subs.forEach((f) => f());
}
export const resetState = () => setState({...initial});
const subscribe = (f) => (subs.add(f), () => subs.delete(f));
export const useAppState = (sel = (s) => s) => useSyncExternalStore(subscribe, () => sel(state));

// --- Router: path-based, with the View Transitions API when the browser has it.
const routeSubs = new Set();
export function navigate(path, {replace = false} = {}) {
  const go = () => {
    history[replace ? 'replaceState' : 'pushState'](null, '', path);
    routeSubs.forEach((f) => f());
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && !reduce) {
    const vt = document.startViewTransition(go);
    vt.ready.catch(() => {}); // a newer navigation skipped this transition: fine
    vt.finished.catch(() => {});
  }
  else go();
}
addEventListener('popstate', () => routeSubs.forEach((f) => f()));
export const usePath = () =>
  useSyncExternalStore((f) => (routeSubs.add(f), () => routeSubs.delete(f)), () => location.pathname + location.search);

// Each role's home screen.
export const homeFor = (role) => (role === 'hauler' ? '/haul' : role === 'bank' ? '/bank' : '/drive');
export const drives = (role) => role === 'driver' || role === 'hauler';
// How a pantry or store recognises the vehicle: description plus plate.
export const vehicleText = (van, plate) => [van, plate && `plate ${plate}`].filter(Boolean).join(', ');

// Sign in as a person from the pantry's list.
export function signInAs(p) {
  setState({role: p.role, profileId: p.id, profile: {name: p.name, van: p.van || '', plate: p.plate || '', cold: !!p.cold, consent: !!p.consentAt}, route: [], haul: null, driveId: null, lastReport: null});
}
// Hand the device to someone else at the same pantry: keep the join code, forget the person.
export function switchPerson() {
  setState({role: null, profileId: null, profile: {...initial.profile}, route: [], haul: null, driveId: null, lastReport: null});
}
// Save profile edits on this device and for the person on the server.
export function saveProfile(patch) {
  setState((s) => ({profile: {...s.profile, ...patch}}));
  const id = getState().profileId;
  if (id) import('./api.js').then(({send}) => send(`profiles/${id}`, patch, 'PATCH'));
}
