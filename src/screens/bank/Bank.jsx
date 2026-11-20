import {simNow} from '../../lib/simclock.js';
import {useEffect, useRef, useState} from 'react';
import {Button, Banner, Badge} from '@astryxdesign/core';
import {Inbox, ClipboardCheck, FileText, Store, Bell, BellOff, ArrowLeft, Play, LogOut, Share2} from 'lucide-react';
import {DeliveryCard, Receive, Receiving, useParentDelivery} from './Receiving.jsx';
import {PARENT, HUB} from '../../data/deliveries.js';
import {destPin} from '../../components/pins.js';
import MapView from '../../components/MapView.jsx';
import Ring from '../../components/Ring.jsx';
import Footage, {eventText} from '../../components/Footage.jsx';
import {Cold, Wordmark} from '../../components/Glyphs.jsx';
import Report from '../Report.jsx';
import {api} from '../../lib/api.js';
import {navigate, resetState, useAppState} from '../../lib/state.js';
import {clock, clockAmPm, day, deltaText, etaState, hms, coldState, duration} from '../../lib/format.js';
import {stores, nextWindow, BANK} from '../../data/stores.js';
import {startDrive, useDrive} from '../../lib/engine.js';

const ACTIVE_MS = 3 * 3600 * 1000;
const isActive = (d) => d.status !== 'delivered' && Date.now() - d.updated < ACTIVE_MS;
const forecastOf = (d) => d.last?.eta || d.promiseAt;
const STATE_VAR = {'on-time': 'var(--fr-sprout)', slipping: 'var(--fr-apricot)', late: 'var(--fr-tomato)', unknown: 'var(--fr-text-3)'};
const STATUS = {'en-route-pickup': 'On the way to a store', 'at-pickup': 'Loading at a store', 'en-route-bank': 'Heading back to the pantry', 'arrived-bank': 'Back at the pantry', delivered: 'Unloaded'};

function usePoll(path, ms = 5000) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let alive = true;
    const run = () => api(path).then((x) => alive && (setData(x), setErr(null))).catch((e) => alive && setErr(e));
    run();
    const t = setInterval(run, ms);
    return () => ((alive = false), clearInterval(t));
  }, [path]);
  return [data, err];
}

// The pantry's side: food arriving from the food bank and from volunteer pickup runs.
export default function Bank({path}) {
  const parts = path.split('/');
  const page = parts[2] || 'live';
  const nav = [
    ['/bank', 'live', 'Incoming', Inbox],
    ['/bank/receiving', 'receiving', 'Receiving', ClipboardCheck],
    ['/bank/reports', 'reports', 'Pickup runs', FileText],
    ['/bank/stores', 'stores', 'Stores', Store],
  ];
  const cur = page === 'truck' || page === 'receive' ? 'live' : page === 'report' ? 'reports' : page;
  return (
    <div className="shell">
      <a className="skip" href="#content">Skip to content</a>
      <nav className="side" aria-label="Pantry">
        <div style={{padding: 'var(--space-sm) var(--space-md) var(--space-xl)'}}><Wordmark size={28} /></div>
        {nav.map(([href, key, label, I]) => (
          <a key={key} href={href} aria-current={cur === key ? 'page' : undefined} onClick={(e) => (e.preventDefault(), navigate(href))}><I size={20} aria-hidden="true" />{label}</a>
        ))}
        <div className="grow" />
        <div className="muted" style={{padding: '0 var(--space-md)', fontSize: 'var(--fs-sub)'}}>{BANK.name}</div>
        <a href="/" onClick={(e) => (e.preventDefault(), confirm('Sign out of FreshRoute on this device?') && (resetState(), navigate('/', {replace: true})))}><LogOut size={20} aria-hidden="true" />Sign out</a>
      </nav>
      <main className="main" id="content" tabIndex={-1}>
        <div className="mobilehead spread">
          <Wordmark size={26} />
          <Button variant="ghost" label="Sign out" icon={<LogOut size={18} />} onClick={() => confirm('Sign out of FreshRoute on this device?') && (resetState(), navigate('/', {replace: true}))} />
        </div>
        {page === 'live' && <Live />}
        {page === 'truck' && <TruckDetail id={parts[3]} />}
        {page === 'receive' && <Receive id={parts[3]} />}
        {page === 'receiving' && <Receiving />}
        {page === 'reports' && <Reports />}
        {page === 'report' && <Report id={parts[3]} back="/bank/reports" />}
        {page === 'stores' && <Stores />}
      </main>
      <nav className="tabbar glass dense" aria-label="Pantry">
        {nav.map(([href, key, label, I]) => (
          <a key={key} href={href} aria-current={cur === key ? 'page' : undefined} onClick={(e) => (e.preventDefault(), navigate(href))}><I size={22} aria-hidden="true" />{label}</a>
        ))}
      </nav>
    </div>
  );
}

// Heads-up at 15 and 5 minutes out (Cody: "oh, the truck's here"), and at 30 and 10 for the food bank truck.
function useHeadsUp(drives, parent) {
  const sent = useRef(JSON.parse(sessionStorage.getItem('freshroute:alerts') || '{}'));
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    if (!drives) return;
    const fresh = [];
    for (const d of drives.filter(isActive)) {
      const left = (forecastOf(d) - simNow(d)) / 60000;
      // Only the closest threshold fires, so opening the page late gives one alert, not two.
      for (const m of [5, 15]) {
        const key = `${d.id}:${m}`;
        if (left <= m && left > 0 && d.status === 'en-route-bank' && !sent.current[key]) {
          sent.current[`${d.id}:5`] = sent.current[`${d.id}:15`] = 1;
          const msg = `${d.van} arrives in about ${Math.max(1, Math.round(left))} min (${clockAmPm(forecastOf(d))})${d.coldStartAt ? `, cold food out ${hms(simNow(d) - d.coldStartAt)}` : ''}.`;
          fresh.push({id: key, msg});
          if (globalThis.Notification?.permission === 'granted') new globalThis.Notification('FreshRoute', {body: msg, icon: '/icons/icon-192.png', tag: key});
        }
      }
    }
    if (parent && parent.phase !== 'here' && !parent.receipt) {
      const left = (parent.etaAt - Date.now()) / 60000;
      for (const m of [10, 30]) {
        const key = `${parent.id}:${m}`;
        if (left <= m && left > 0 && !sent.current[key]) {
          sent.current[`${parent.id}:10`] = sent.current[`${parent.id}:30`] = m === 10 ? 1 : sent.current[`${parent.id}:10`];
          sent.current[key] = 1;
          const cold = parent.lines.some((l) => l.storage === 'cold' || l.storage === 'frozen');
          const msg = `The ${PARENT.name} truck arrives in about ${Math.max(1, Math.round(left))} min (${clockAmPm(parent.etaAt)}).${cold ? ' Bring the pallet blanket for the cold lines.' : ''}`;
          fresh.push({id: key, msg});
          if (globalThis.Notification?.permission === 'granted') new globalThis.Notification('FreshRoute', {body: msg, icon: '/icons/icon-192.png', tag: key});
        }
      }
    }
    sessionStorage.setItem('freshroute:alerts', JSON.stringify(sent.current));
    // One alert per truck (the newest), and only while that truck is still on its way.
    const src = (id) => id.split(':')[0];
    const onWay = new Set([...(drives || []).filter(isActive).map((d) => d.id), ...(parent && parent.phase !== 'here' && !parent.receipt ? [parent.id] : [])]);
    setAlerts((a) => {
      const next = [...fresh, ...a.filter((x) => !fresh.some((f) => src(f.id) === src(x.id)))].filter((x) => onWay.has(src(x.id)));
      return next.length === a.length && next.every((x, i) => x === a[i]) ? a : next.slice(0, 3);
    });
  }, [drives, parent?.phase, Math.floor((parent?.etaAt - Date.now()) / 60000)]);
  return [alerts, (id) => setAlerts((a) => a.filter((x) => x.id !== id))];
}

function Live() {
  const [drives, err] = usePoll('drives');
  const parent = useParentDelivery();
  const [alerts, dismiss] = useHeadsUp(drives, parent);
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const [starting, setStarting] = useState(false);
  const {drive: localSim} = useDrive();
  const active = (drives || []).filter(isActive).sort((a, b) => forecastOf(a) - forecastOf(b));
  const sample = async () => {
    setStarting(true);
    try {
      await startDrive({storeIds: ['kroger-loop288', 'aldi-loop288', 'target-loop288'], sim: 8, sample: true});
    } finally {
      setStarting(false);
    }
  };
  const markers = [
    destPin('pantry', 'bank', BANK.lon, BANK.lat, BANK.name),
    destPin('hub', 'hub', HUB.lon, HUB.lat, `${HUB.name}, shared stop`),
    destPin('foodbank', 'parent-wh', PARENT.lon, PARENT.lat, `${PARENT.name} warehouse`),
    ...(parent.pos && !parent.receipt ? [{id: 'parent', lon: parent.pos[0], lat: parent.pos[1], className: 'truck-dot parent', label: `${PARENT.name} truck, ${phaseLabel(parent)}`}] : []),
    ...active.filter((d) => d.last).map((d) => ({id: d.id, lon: d.last.lon, lat: d.last.lat, className: 'truck-dot', style: {background: STATE_VAR[etaState(forecastOf(d), d.promiseAt).key]}, label: `${d.van}, ${etaState(forecastOf(d), d.promiseAt).label}`, onClick: () => navigate(`/bank/truck/${d.id}`)})),
  ];
  return (
    <>
      <div className="main-head">
        <div>
          <div className="label">{new Date().toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}</div>
          <h1>Incoming today</h1>
        </div>
        <div className="row wrap">
          {perm === 'default' && <Button label="Turn on arrival alerts" icon={<Bell size={18} />} onClick={() => Notification.requestPermission().then(setPerm)} />}
          {perm === 'granted' && <Badge variant="success" label="Arrival alerts on" icon={<Bell size={14} />} />}
          {perm === 'denied' && <Badge variant="neutral" label="Alerts blocked in browser settings" icon={<BellOff size={14} />} />}
        </div>
      </div>
      <div className="stack" style={{marginBottom: 'var(--space-lg)'}} aria-live="polite">
        {alerts.map((a) => <Banner key={a.id} status="info" title="Heads-up" description={a.msg} isDismissable onDismiss={() => dismiss(a.id)} />)}
        {err && <Banner status={err.status === 401 ? 'error' : 'warning'} title={err.status === 401 ? 'Your join code is no longer valid' : 'Can\'t reach FreshRoute right now'} description={err.status === 401 ? 'Sign out and join again with the code from your pantry.' : 'Showing the last update. Retrying every few seconds.'} />}
      </div>
      <div className="trucks">
        <section className="stack" aria-label="Incoming food">
          <DeliveryCard d={parent} />
          <h2 className="as-h3" style={{marginTop: 'var(--space-lg)'}}>Volunteer pickup runs</h2>
          {drives === null && !err && <p className="muted" aria-busy="true">Loading pickup runs…</p>}
          {drives && active.length === 0 && (
            <div className="empty">
              <p style={{marginTop: 0}}>No volunteers out right now. When one starts a pickup run from stores or the food bank warehouse, it shows up here with a live arrival time.</p>
              <Button variant="primary" label={localSim ? 'Sample run going' : 'Run a sample pickup run'} icon={<Play size={18} />} isLoading={starting} isDisabled={!!localSim} onClick={sample} />
              <p className="faint" style={{fontSize: 'var(--fs-sub)'}}>The sample drives three real Denton stores at 8× speed from this browser tab.</p>
            </div>
          )}
          {active.map((d) => {
            const f = forecastOf(d);
            const st = etaState(f, d.promiseAt);
            const next = (d.stops || []).find((s) => !s.departedAt);
            const cold = d.coldStartAt ? simNow(d) - d.coldStartAt : 0;
            return (
              <a key={d.id} className="truck-card" href={`/bank/truck/${d.id}`} onClick={(e) => (e.preventDefault(), navigate(`/bank/truck/${d.id}`))}>
                <Ring forecast={f} promise={d.promiseAt} progress={progressOf(d)} size={96} stroke={8} timeSize={20} />
                <div className="stack" style={{gap: 'var(--space-2xs)'}}>
                  <div className="store-name">{d.van}<span className="sep">·</span>{d.driver}</div>
                  <div className="muted" style={{fontSize: 'var(--fs-label)'}}>{STATUS[d.status] || d.status}{next ? `: ${next.name}` : ''}</div>
                  <div style={{color: STATE_VAR[st.key], fontWeight: 600}}>{deltaText(f, d.promiseAt)}</div>
                  <div className="row wrap" style={{gap: 'var(--space-xs)'}}>
                    {d.coldStartAt && <span className={`chip ${coldState(cold) === 'cold' ? 'frost' : coldState(cold)}`}><Cold size={14} />{hms(cold)}</span>}
                    <span className="chip">Updated {clock(d.last?.t || d.updated)}</span>
                    {d.sim > 0 && <span className="chip" title="Times are drive time, which runs faster than the clock on the wall">Simulated at {d.clock?.speed || d.sim}×</span>}
                  </div>
                </div>
              </a>
            );
          })}
        </section>
        <section className="mapbox" aria-label="Map of trucks">
          <MapView markers={markers} route={parent.receipt || parent.phase === 'here' ? null : parent.coords} split={parent.split || 0} fitKey={`${active.map((d) => d.id).join(',') || 'none'}|${parent.coords ? 'road' : ''}`} label="Map of food coming to the pantry" legendAt="bl"
            legend={{title: 'Food on its way to you', items: [['truck parent', `${PARENT.name} truck`], ...(parent.phase === 'here' ? [] : [['line', 'Its road to you']]), ['dest foodbank', `${PARENT.name} warehouse`], ['dest hub', `${HUB.name} (shared stop)`], ['truck', 'Volunteer vehicle: green on time, amber slipping, red late'], ['dest pantry', 'Your pantry']]}} />
        </section>
      </div>
    </>
  );
}

const phaseLabel = (d) => ({'road-hub': 'heading to the shared stop', hub: 'at the shared stop', road: 'on the way to you', here: 'at your door'})[d.phase];

function progressOf(d) {
  if (!d.last || !d.routeDistance) return 0;
  const done = (d.stops || []).filter((s) => s.departedAt).length;
  return Math.min(0.98, (done + 0.5) / ((d.stops || []).length + 1));
}

// M2: one truck, live. The food bank sees the same progress screen as the driver, plus near-live video.
function TruckDetail({id}) {
  const [d, err] = usePoll(`drives/${id}`, 5000);
  if (err) return <Banner status="error" title="Couldn't load this truck" description={err.message} />;
  if (!d) return <p className="muted" aria-busy="true">Loading…</p>;
  const last = d.points?.[d.points.length - 1];
  const f = last?.eta || d.promiseAt;
  const st = etaState(f, d.promiseAt);
  const cold = d.coldStartAt ? (d.arrivedBankAt || simNow(d)) - d.coldStartAt : 0;
  const ready = Object.fromEntries((d.events || []).filter((e) => e.kind === 'store-ready').map((e) => [e.data.storeId, e.data.ready]));
  const reasons = (d.events || []).filter((e) => e.kind === 'reason' || e.kind === 'delay').slice(-3);
  const coords = d.routeCoords || [];
  const markers = [
    ...(d.stops || []).map((s, i) => ({id: s.storeId, lon: s.lon, lat: s.lat, className: `stopnum${s.departedAt ? ' done' : ''}`, text: String(i + 1), label: s.name})),
    destPin('pantry', 'bank', BANK.lon, BANK.lat, BANK.name),
  ];
  const copyLink = (s) => {
    const url = `${location.origin}/s/${d.id}/${s.storeId}`;
    navigator.share ? navigator.share({title: `Pickup ETA for ${s.name}`, url}).catch(() => {}) : navigator.clipboard?.writeText(url);
  };
  return (
    <>
      <div className="main-head">
        <div>
          <div className="back"><Button variant="ghost" label="Incoming" icon={<ArrowLeft size={18} />} onClick={() => navigate('/bank')} /></div>
          <h1 style={{marginTop: 'var(--space-sm)'}}>{d.van}<span className="sep">·</span>{d.driver}</h1>
          <div className="muted">{STATUS[d.status] || d.status} · started {clockAmPm(d.startedAt)}{d.sim > 0 ? ` · simulated at ${d.clock?.speed || d.sim}×, so times run on drive time (now ${clockAmPm(simNow(d))})` : ''}</div>
        </div>
        <Button label="Full report" icon={<FileText size={18} />} onClick={() => navigate(`/bank/report/${d.id}`)} />
      </div>
      <div className="detail">
        <section className="stack">
          <Footage segments={d.segments} events={d.events || []} start={d.startedAt} end={d.deliveredAt || simNow(d)} live={d.status !== 'delivered'} noCamera={d.camera === 'none'} speed={d.clock?.speed || 1} />
          {d.segments?.length > 0 && <p className="faint" style={{margin: 0, fontSize: 'var(--fs-sub)'}}>Video arrives in 10-second pieces, so it runs about 10 to 20 seconds behind. The driver agreed to recording when they signed up.</p>}
          <div className="mapbox"><MapView route={coords} trail={(d.points || []).map((p) => [p.lon, p.lat])} state={st.key} markers={markers} puck={last ? {lon: last.lon, lat: last.lat, hdg: last.hdg || 0} : null} fitKey={d.id} label="Map of this truck" legendAt="bl"
            legend={{title: 'This truck\'s trip', items: [['line', 'Road still to drive'], ['line trail', 'Where it has been'], ['stopnum', 'Pickup stops, in order'], ['dest pantry', 'Drop-off at your pantry']]}} /></div>
        </section>
        <section className="stack">
          <div className="panel stack" style={{alignItems: 'center', textAlign: 'center'}}>
            <Ring forecast={f} promise={d.promiseAt} progress={progressOf({...d, last})} size={220} stroke={14} timeSize={48} />
            <div className="big-delta" style={{color: STATE_VAR[st.key]}}>{d.status === 'delivered' ? `Delivered ${clockAmPm(d.deliveredAt)}` : deltaText(f, d.promiseAt)}</div>
            <div className="muted num">Promised back {clock(d.promiseAt)} · Now expected {clock(f)} · Updated {clock(last?.t || d.updated)}</div>
            {d.coldStartAt && <span className={`chip ${coldState(cold) === 'cold' ? 'frost' : coldState(cold)}`}><Cold size={16} />{hms(cold)} out of fridge</span>}
            {reasons.map((e, k) => <span key={k} className="chip apricot">{eventText(e)}</span>)}
          </div>
          <h2>Stops</h2>
          <ol className="timeline">
            {(d.stops || []).map((s, i) => (
              <li key={s.storeId}>
                <span className={`stopnum${s.departedAt ? ' done' : ''}`} aria-hidden="true">{i + 1}</span>
                <div>
                  <div className="store-name">{s.name}</div>
                  <div className="muted num" style={{fontSize: 'var(--fs-label)'}}>
                    {s.skipped ? `Skipped: ${s.skipped}` : s.departedAt ? `Loaded ${Object.values(s.counts || {}).reduce((a, b) => a + b, 0)} items, left ${clock(s.departedAt)}` : s.arrivedAt ? `Arrived ${clock(s.arrivedAt)}` : `Promised ${clock(s.promiseAt)} · now ${clock(s.etaAt)}`}
                    {ready[s.storeId] && !s.departedAt ? ' · store says ready' : ''}
                  </div>
                </div>
                {!s.departedAt && d.status !== 'delivered' ? <Button size="sm" variant="ghost" label="Store link" icon={<Share2 size={16} />} onClick={() => copyLink(s)} /> : <span className="chip">Done</span>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}

// M3: finished drives.
function Reports() {
  const [drives, err] = usePoll('drives', 30000);
  const done = (drives || []).filter((d) => d.status === 'delivered').sort((a, b) => b.startedAt - a.startedAt);
  return (
    <>
      <div className="main-head"><div><h1>Pickup runs</h1><p className="muted" style={{margin: 'var(--space-2xs) 0 0'}}>Every finished volunteer run: on-time return, cold food time, counts and video.</p></div></div>
      {err && <Banner status="warning" title="Can't reach FreshRoute right now" description="Retrying." />}
      {drives && done.length === 0 && <div className="empty"><h2 className="as-h3">No finished drives yet</h2><p>Reports appear here as soon as a driver taps Finish drive. You don't need the driver's approval to open them.</p></div>}
      {done.length > 0 && (
        <div style={{overflowX: 'auto'}}>
          <table className="table">
            <thead><tr><th>Date</th><th>Vehicle and driver</th><th>Stops</th><th>Back vs promised</th><th>Cold food out</th><th>Items</th><th>Motion</th></tr></thead>
            <tbody>
              {done.map((d) => {
                const end = d.arrivedBankAt || d.deliveredAt;
                const st = etaState(end, d.promiseAt);
                const picked = (d.stops || []).reduce((a, s) => a + Object.values(s.counts || {}).reduce((x, y) => x + y, 0), 0);
                const dropped = Object.values(d.dropCounts || {}).reduce((a, b) => a + b, 0);
                const cold = d.coldStartAt ? end - d.coldStartAt : 0;
                return (
                  <tr key={d.id} className="click" tabIndex={0} onClick={() => navigate(`/bank/report/${d.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/bank/report/${d.id}`)}>
                    <td className="num nowrap">{day(d.startedAt)}<div className="muted">{clockAmPm(d.startedAt)}</div></td>
                    <td><strong>{d.van}</strong><div className="muted">{d.driver}</div></td>
                    <td className="num">{(d.stops || []).length}</td>
                    <td><span className={`chip ${st.key}`}>{st.delta > 0 ? '+' : ''}{st.delta} min</span></td>
                    <td className="num">{d.coldStartAt ? hms(cold) : 'None'}</td>
                    <td className="num" style={{color: picked !== dropped ? 'var(--fr-apricot)' : undefined}}>{dropped} of {picked}</td>
                    <td className="num">{d.motionCount ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// M5: stores, with what drivers have said about them.
function Stores() {
  const [notes] = usePoll('notes', 60000);
  const byStore = {};
  (notes || []).forEach((n) => (byStore[n.store] ||= []).push(n));
  return (
    <>
      <div className="main-head">
        <div><h1>Stores</h1><p className="muted" style={{margin: 'var(--space-2xs) 0 0'}}>Donation windows and what drivers report. Notes come from the end of each drive.</p></div>
      </div>
      <div className="stack">
        {stores.map((s) => {
          const w = nextWindow(s);
          const n = byStore[s.id] || [];
          return (
            <article key={s.id} className="panel stack" style={{gap: 'var(--space-sm)'}}>
              <div className="spread wrap">
                <div><div className="store-name">{s.name}</div><div className="muted">{s.address}</div></div>
                <span className={`chip ${w?.isOpen ? 'sprout' : ''}`}>{w ? (w.isOpen ? `Open until ${clockAmPm(w.end)}` : `Next ${day(w.start)} ${clock(w.start)}`) : 'No window this week'}</span>
              </div>
              <p style={{margin: 0}}>{s.how}</p>
              {n.length > 0 ? (
                <div className="stack" style={{gap: 'var(--space-xs)'}}>
                  {n.slice(0, 3).map((x, i) => <div key={i} className="raised" style={{padding: 'var(--space-sm) var(--space-md)'}}>{x.text}<span className="faint"> · {day(x.t)}</span></div>)}
                </div>
              ) : (
                <span className="faint" style={{fontSize: 'var(--fs-sub)'}}>No driver notes yet.</span>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
