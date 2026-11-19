import {useEffect, useState} from 'react';
import {useAppState} from './state.js';
import {isDaytime} from './sun.js';
import {BANK} from '../data/stores.js';
import tokens from '../tokens/map.json';

// Theme rule (style sheet, Daylight page): driving screens are dark by default and switch to
// Daylight between local sunrise and sunset; managers follow the system. Preferences can pin either.
export function resolveTheme(pref, role, now = new Date(), systemDark = true) {
  if (pref === 'dark' || pref === 'light') return pref;
  if (role === 'driver') return isDaytime(now, BANK.lat, BANK.lon) ? 'light' : 'dark';
  return systemDark ? 'dark' : 'light';
}

export function useTheme() {
  const pref = useAppState((s) => s.prefs.theme);
  const role = useAppState((s) => s.role);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => setTick((x) => x + 1);
    mq.addEventListener('change', on);
    return () => (clearInterval(t), mq.removeEventListener('change', on));
  }, []);
  // The store link is read in a bright store office or on a dock: always Daylight.
  const mode = location.pathname.startsWith('/s/') ? 'light' : resolveTheme(pref, role, new Date(), matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokens.chrome[mode]);
  }, [mode, tick]);
  return mode;
}
