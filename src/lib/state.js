import {useSyncExternalStore} from 'react';

// Small persisted app state. Everything a driver or manager sets up lives here.
const KEY = 'freshroute:v1';
const initial = {
  role: null, // 'driver' | 'bank'
  code: '', // food bank join code
  profile: {name: '', van: '', cold: false, consent: false},
  prefs: {theme: 'auto', camera: '', headsUp: true},
  route: [], // [{storeId}] being planned
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
