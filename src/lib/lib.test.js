import {test} from 'node:test';
import assert from 'node:assert/strict';
import {distance, cumulative, project, pointAt} from './geo.js';
import {sunTimes} from './sun.js';
import {etaState} from './format.js';
import {nextWindow, stores} from '../data/stores.js';

test('distance: 1 degree of latitude is about 111 km', () => {
  assert.ok(Math.abs(distance([-97, 33], [-97, 34]) - 111195) < 200);
});

test('project and pointAt agree along a line', () => {
  const line = [[-97.1, 33.2], [-97.1, 33.21], [-97.09, 33.21]];
  const cum = cumulative(line);
  const mid = pointAt(line, cum, cum[2] * 0.75);
  const back = project(line, cum, mid.p);
  assert.ok(Math.abs(back.along - cum[2] * 0.75) < 1);
  assert.ok(back.off < 1);
});

test('Denton sunrise and sunset on 19 Nov are about 7:00 and 17:25 local (UTC-6)', () => {
  const {sunrise, sunset} = sunTimes(new Date('2026-11-19T18:00:00Z'), 33.21, -97.13);
  const local = (d) => (d.getUTCHours() - 6) * 60 + d.getUTCMinutes();
  assert.ok(Math.abs(local(sunrise) - 7 * 60) < 15, `sunrise ${sunrise.toISOString()}`);
  assert.ok(Math.abs(local(sunset) - (17 * 60 + 25)) < 15, `sunset ${sunset.toISOString()}`);
});

test('ETA state thresholds', () => {
  const p = 1_000_000_000;
  assert.equal(etaState(p + 3 * 60000, p).key, 'on-time');
  assert.equal(etaState(p + 4 * 60000, p).key, 'slipping');
  assert.equal(etaState(p + 11 * 60000, p).key, 'late');
  assert.equal(etaState(p - 5 * 60000, p).key, 'on-time');
});

test('nextWindow finds the open or next donation window', () => {
  const kroger = stores[0]; // Mon/Wed/Fri 08:30 to 10:30
  const wedNine = new Date(2026, 10, 18, 9, 0); // Wed 18 Nov 2026
  const w = nextWindow(kroger, wedNine);
  assert.equal(w.isOpen, true);
  const wedNoon = new Date(2026, 10, 18, 12, 0);
  assert.equal(nextWindow(kroger, wedNoon).start.getDay(), 5);
});
