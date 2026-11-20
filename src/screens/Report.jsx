import {useEffect, useMemo, useState} from 'react';
import {Button, Banner} from '@astryxdesign/core';
import {ArrowLeft, Share2} from 'lucide-react';
import MapView from '../components/MapView.jsx';
import Footage, {eventText} from '../components/Footage.jsx';
import {MOTION_GLYPH, Cold} from '../components/Glyphs.jsx';
import {api} from '../lib/api.js';
import {navigate} from '../lib/state.js';
import {clock, clockAmPm, day, duration, etaState, hms, coldState, COLD_WARN} from '../lib/format.js';

export async function loadDrive(id) {
  try {
    return await api(`drives/${id}`);
  } catch (e) {
    const local = localStorage.getItem('freshroute:report:' + id);
    if (local) {
      const d = JSON.parse(local);
      return {...d, points: d.trail || [], segments: [], events: d.events || []};
    }
    throw e;
  }
}

const arrivedAt = (d) => d.arrivedBankAt || d.deliveredAt;

// D13 / M4: the drive report. Drivers see it after a drive; the food bank opens it without asking.
export default function Report({id, back}) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [history, setHistory] = useState([]);
  const [seek, setSeek] = useState(null);
  useEffect(() => {
    loadDrive(id).then(setD).catch((e) => setErr(e.message));
    api('drives').then(setHistory).catch(() => setHistory([]));
  }, [id]);

  if (err) return <main className="center-page" tabIndex={-1}><div className="form"><Banner status="error" title="Couldn't open this report" description={err} /><Button label="Back" onClick={() => navigate(back)} /></div></main>;
  if (!d) return <main className="center-page muted" aria-busy="true">Loading report…</main>;

  const end = arrivedAt(d) || d.updated || Date.now();
  const st = etaState(end, d.promiseAt);
  const coldMs = d.coldStartAt ? end - d.coldStartAt : 0;
  const motion = (d.events || []).filter((e) => e.kind === 'motion');
  const gaps = (d.events || []).filter((e) => e.kind === 'gap-start').length;
  const picked = {}, dropped = d.dropCounts || {};
  (d.stops || []).forEach((s) => s.counts && Object.entries(s.counts).forEach(([k, v]) => (picked[k] = (picked[k] || 0) + v)));
  const totalPicked = Object.values(picked).reduce((a, b) => a + b, 0);
  const totalDropped = Object.values(dropped).reduce((a, b) => a + b, 0);
  // Baseline: earlier finished drives from the same food bank.
  const past = history.filter((h) => h.id !== d.id && h.status === 'delivered' && h.promiseAt && arrivedAt(h));
  const avgDelta = past.length ? Math.round(past.reduce((a, h) => a + (arrivedAt(h) - h.promiseAt), 0) / past.length / 60000) : null;
  const avgMotion = past.length ? (past.reduce((a, h) => a + (h.motionCount || 0), 0) / past.length).toFixed(1) : null;
  const coords = d.routeCoords || d.route?.coords || [];
  const trail = (d.points || []).map((p) => [p.lon, p.lat]);
  const markers = [
    ...(d.stops || []).map((s, i) => ({id: s.storeId, lon: s.lon, lat: s.lat, className: 'stopnum', text: String(i + 1), label: s.name})),
    ...motion.map((e, k) => {
      const p = nearest(d.points || [], e.t);
      return p && {id: 'm' + k, lon: p.lon, lat: p.lat, className: 'pin', style: {background: 'var(--fr-apricot)', width: 'var(--size-pin-small)', height: 'var(--size-pin-small)'}, label: `${eventText(e)} at ${clock(e.t)}`, onClick: () => setSeek({t: e.t - 3000})};
    }).filter(Boolean),
  ];
  const share = () => {
    const url = `${location.origin}/bank/report/${d.id}`;
    navigator.share ? navigator.share({title: 'Drive report', url}).catch(() => {}) : navigator.clipboard?.writeText(url);
  };

  const Root = back === '/drive' ? 'main' : 'div'; // inside the food bank shell there is already a <main>
  return (
    <Root className="overlay-inner" tabIndex={-1} style={{maxWidth: 'var(--size-content)'}}>
      <div className="spread">
        <div className="back"><Button variant="ghost" label="Back" icon={<ArrowLeft size={18} />} onClick={() => navigate(back)} /></div>
        {!String(d.id).startsWith('local-') && <Button variant="ghost" label="Share with the food bank" icon={<Share2 size={18} />} onClick={share} />}
      </div>
      <header className="stack" style={{margin: 'var(--space-lg) 0 var(--space-xl)', gap: 'var(--space-sm)'}}>
        <div className="label">{day(d.startedAt)} · {d.van} · {d.driver}</div>
        <h1 style={{fontSize: 'var(--fs-numeral)'}}>Drive report</h1>
        <div className="big-delta" style={{color: `var(--fr-${st.key === 'on-time' ? 'sprout' : st.key === 'slipping' ? 'apricot' : 'tomato'})`}}>
          {d.status === 'delivered' || arrivedAt(d)
            ? `Arrived ${clockAmPm(end)}, ${st.delta > 0 ? `${st.delta} min after` : st.delta < 0 ? `${-st.delta} min before` : 'right on'} the ${clock(d.promiseAt)} promise`
            : `In progress. Promised ${clock(d.promiseAt)}.`}
        </div>
        {String(d.id).startsWith('local-') && <Banner status="info" title="Saved on this iPad only" description="This drive ran without a connection to the food bank, so they can't see it." />}
      </header>

      <div className="metrics">
        <Metric label="Arrival vs promise" value={`${st.delta > 0 ? '+' : ''}${st.delta} min`} base={avgDelta == null ? 'First finished drive on record' : `Average ${avgDelta > 0 ? '+' : ''}${avgDelta} min over ${past.length} ${past.length === 1 ? 'drive' : 'drives'}`} />
        <Metric label="Drive time" value={duration(end - d.startedAt)} base={d.routeDuration ? `${duration(d.routeDuration * 1000)} driving + stops planned` : ''} />
        <Metric label="Cold food out of fridge" value={d.coldStartAt ? hms(coldMs) : 'None'} base={d.coldStartAt ? (coldMs > COLD_WARN ? 'Over the 1-hour warning' : 'Under the 1-hour warning') : 'No chilled pickups'} tone={d.coldStartAt ? coldState(coldMs) : null} />
        <Metric label="Items" value={`${totalDropped} of ${totalPicked}`} base={totalPicked === totalDropped ? 'Drop-off matches pickup' : `${totalPicked - totalDropped} not delivered`} tone={totalPicked !== totalDropped ? 'slipping' : null} />
        <Metric label="Motion markers" value={String(motion.length)} base={avgMotion == null ? 'Hard brakes, sharp turns, bumps' : `Average ${avgMotion} per drive`} />
      </div>

      <section className="stack" style={{marginTop: 'var(--space-2xl)'}} aria-labelledby="eta">
        <h2 id="eta">Promise vs forecast</h2>
        <EtaChart d={d} end={end} />
      </section>

      <section className="detail" style={{marginTop: 'var(--space-2xl)'}}>
        <div className="stack">
          <h2>Footage</h2>
          <Footage segments={d.segments} events={d.events || []} start={d.startedAt} end={end} seekTo={seek} />
          <p className="faint" style={{margin: 0, fontSize: 'var(--fs-sub)'}}>Ticks: apricot = motion or delay, green = stops, dashed = recording gap. Tap one to jump there.</p>
        </div>
        <div className="stack">
          <h2>Route</h2>
          <div className="mapbox"><MapView route={coords} split={coords.length - 1} trail={trail} markers={markers} fitKey={d.id} label="Map of the drive" /></div>
        </div>
      </section>

      <section className="detail" style={{marginTop: 'var(--space-2xl)'}}>
        <div className="stack">
          <h2>What happened</h2>
          <ol className="timeline" aria-label="Drive events">
            {withGaps(d.events || []).map((e, k) => {
              const G = e.kind === 'motion' ? MOTION_GLYPH[e.data?.kind] : e.kind === 'loaded' && e.data?.cold ? Cold : null;
              return (
                <li key={k} style={{gridTemplateColumns: 'var(--size-stopnum) 1fr auto'}}>
                  <span aria-hidden="true">{G ? <G size={24} /> : null}</span>
                  <button className="btn ghost" style={{justifyContent: 'flex-start', padding: 0, minHeight: 'var(--fr-target)'}} onClick={() => setSeek({t: e.t - 3000})}>{eventText(e)}</button>
                  <span className="faint num">{new Date(e.t).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})}</span>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="stack">
          <h2>Counts</h2>
          {totalPicked === 0 ? <p className="muted">No pickups recorded.</p> : (
            <table className="table">
              <thead><tr><th>Item</th><th>Picked up</th><th>Dropped off</th></tr></thead>
              <tbody>
                {Object.keys(picked).map((k) => (
                  <tr key={k}><td>{k}</td><td className="num">{picked[k]}</td><td className="num" style={{color: (dropped[k] ?? 0) !== picked[k] ? 'var(--fr-apricot)' : undefined}}>{dropped[k] ?? 'n/a'}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {(d.feedback?.tags?.length || d.feedback?.text) && (
            <>
              <h3 style={{marginTop: 'var(--space-lg)'}}>Driver's note</h3>
              <div className="row wrap">{d.feedback.tags.map((t) => <span key={t} className="chip apricot">{t}</span>)}</div>
              {d.feedback.text && <p style={{margin: 0}}>{d.feedback.text}</p>}
            </>
          )}
        </div>
      </section>
    </Root>
  );
}

// Pair each 'app in background' with its return so the list shows one row with how long it lasted.
function withGaps(events) {
  const out = [];
  for (const e of events) {
    if (e.kind === 'gap-end') {
      const start = [...out].reverse().find((x) => x.kind === 'gap-start' && !x.ended);
      if (start) start.ended = e.t;
      continue;
    }
    out.push({...e});
  }
  return out.map((e) => (e.kind === 'gap-start' ? {...e, kind: 'gap', data: {ms: (e.ended || e.t) - e.t}} : e));
}

function nearest(points, t) {
  let best = null;
  for (const p of points) if (!best || Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
  return best;
}

function Metric({label, value, base, tone}) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="v" style={tone ? {color: `var(--fr-${tone === 'cold' ? 'frost' : tone === 'slipping' ? 'apricot' : 'tomato'})`} : undefined}>{value}</div>
      {base && <div className="b">{base}</div>}
    </div>
  );
}

// Clock time on the y-axis, so managers read it like a schedule. Promise is dashed with a ±3 min band.
function EtaChart({d, end}) {
  const W = 900, H = 260, L = 64, R = 16, T = 16, B = 32;
  const pts = (d.points || []).filter((p) => p.eta && p.t <= Math.max(end, d.startedAt + 60000));
  const x0 = d.startedAt, x1 = Math.max(end, x0 + 60000);
  const ys = [d.promiseAt, ...pts.map((p) => p.eta)];
  const y0 = Math.min(...ys) - 6 * 60000, y1 = Math.max(...ys) + 6 * 60000;
  const X = (t) => L + ((t - x0) / (x1 - x0)) * (W - L - R);
  const Y = (t) => T + (1 - (t - y0) / (y1 - y0)) * (H - T - B);
  const band = 3 * 60000;
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.eta).toFixed(1)}`).join(' ');
  // Promise plus the top and bottom of the range, dropping any label closer than 18 px to another.
  const yTicks = [d.promiseAt, y1 - 6 * 60000, y0 + 6 * 60000].filter((v, i, a) => a.slice(0, i).every((u) => Math.abs(Y(u) - Y(v)) >= 18));
  const xTicks = [x0, x0 + (x1 - x0) / 2, x1];
  const events = (d.events || []).filter((e) => ['motion', 'delay', 'arrived', 'loaded'].includes(e.kind));
  const lastEta = pts.length ? pts[pts.length - 1].eta : d.promiseAt;
  const st = etaState(lastEta, d.promiseAt);
  if (!pts.length) return <p className="muted">No forecast data for this drive yet.</p>;
  return (
    <figure style={{margin: 0}}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{overflow: 'hidden'}} role="img" aria-label={`Forecast arrival over the drive. Promise ${clock(d.promiseAt)}. Final forecast ${clock(lastEta)}.`}>
        <rect x={L} y={Y(d.promiseAt + band)} width={W - L - R} height={Y(d.promiseAt - band) - Y(d.promiseAt + band)} fill="var(--fr-sprout)" opacity="0.08" />
        <line x1={L} x2={W - R} y1={Y(d.promiseAt)} y2={Y(d.promiseAt)} stroke="var(--fr-sprout)" strokeWidth="2" strokeDasharray="6 6" />
        {yTicks.map((t) => <text key={t} x={L - 10} y={Y(t) + 4} textAnchor="end" fontSize="12" fill="var(--fr-text-3)" fontFamily="var(--fr-ui)">{clock(t)}</text>)}
        {xTicks.map((t, i) => <text key={i} x={X(t)} y={H - 8} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} fontSize="12" fill="var(--fr-text-3)" fontFamily="var(--fr-ui)">{clock(t)}</text>)}
        <path d={path} fill="none" stroke={st.key === 'on-time' ? 'var(--fr-text)' : `var(--fr-${st.key === 'slipping' ? 'apricot' : 'tomato'})`} strokeWidth="3" strokeLinejoin="round" />
        {events.map((e, k) => <rect key={k} x={X(e.t) - 2} y={H - B - 10} width="4" height="10" rx="2" fill={e.kind === 'motion' || e.kind === 'delay' ? 'var(--fr-apricot)' : 'var(--fr-sprout)'} />)}
      </svg>
      <figcaption className="row wrap faint" style={{fontSize: 'var(--fs-sub)', gap: 'var(--space-lg)'}}>
        <span>Dashed: promise {clock(d.promiseAt)} with a 3-minute band</span><span>Line: live forecast</span><span>Ticks: stops and motion</span>
      </figcaption>
    </figure>
  );
}
