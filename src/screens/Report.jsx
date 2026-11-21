import {simNow} from '../lib/simclock.js';
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

// D13 / M4: the drive report. Drivers see it after a drive; the pantry opens it without asking.
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

  const end = arrivedAt(d) || simNow(d);
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

  const Root = back.startsWith('/bank') ? 'div' : 'main'; // inside the pantry shell there is already a <main>
  // The report is the end of a drive: say plainly where to go next.
  const next = back === '/haul' ? 'Back to deliveries' : back === '/drive' ? 'Back to pickups' : 'Back to pickup runs';
  return (
    <Root className="overlay-inner" tabIndex={-1} style={{maxWidth: 'var(--size-content)'}}>
      <div className="spread">
        <div className="back"><Button variant="ghost" label={next} icon={<ArrowLeft size={18} />} onClick={() => navigate(back)} /></div>
        {!String(d.id).startsWith('local-') && <Button variant="ghost" label="Share with the pantry" icon={<Share2 size={18} />} onClick={share} />}
      </div>
      <header className="stack" style={{margin: 'var(--space-lg) 0 var(--space-xl)', gap: 'var(--space-sm)'}}>
        <div className="label">{day(d.startedAt)} · {d.van} · {d.driver}{d.sim > 0 ? ` · simulated drive, ${d.clock?.speed || d.sim}× speed` : ''}</div>
        <h1 style={{fontSize: 'var(--fs-numeral)'}}>Drive report</h1>
        <div className="big-delta" style={{color: `var(--fr-${st.key === 'on-time' ? 'sprout' : st.key === 'slipping' ? 'apricot' : 'tomato'})`}}>
          {d.status === 'delivered' || arrivedAt(d)
            ? `Arrived ${clockAmPm(end)}, ${st.delta > 0 ? `${st.delta} min after` : st.delta < 0 ? `${-st.delta} min before` : 'right on'} the ${clock(d.promiseAt)} promise`
            : `In progress. Promised ${clock(d.promiseAt)}.`}
        </div>
        {String(d.id).startsWith('local-') && <Banner status="info" title="Saved on this iPad only" description="This drive ran without a connection to the pantry, so they can't see it." />}
      </header>

      <div className="metrics">
        <Metric label="Back vs promised time" value={`${st.delta > 0 ? '+' : ''}${st.delta} min`} base={avgDelta == null ? 'First finished drive on record' : `Average ${avgDelta > 0 ? '+' : ''}${avgDelta} min over ${past.length} ${past.length === 1 ? 'drive' : 'drives'}`} />
        <Metric label="Drive time" value={duration(end - d.startedAt)} base={d.routeDuration ? `${duration(d.routeDuration * 1000)} driving + stops planned` : ''} />
        <Metric label="Cold food out of fridge" value={d.coldStartAt ? hms(coldMs) : 'None'} base={d.coldStartAt ? (coldMs > COLD_WARN ? 'Over the 1-hour warning' : 'Under the 1-hour warning') : 'No chilled pickups'} tone={d.coldStartAt ? coldState(coldMs) : null} />
        <Metric label="Items" value={`${totalDropped} of ${totalPicked}`} base={totalPicked === totalDropped ? 'Drop-off matches pickup' : `${totalPicked - totalDropped} not delivered`} tone={totalPicked !== totalDropped ? 'slipping' : null} />
        <Metric label="Motion markers" value={String(motion.length)} base={avgMotion == null ? 'Hard brakes, sharp turns, bumps' : `Average ${avgMotion} per drive`} />
      </div>

      <section className="stack" style={{marginTop: 'var(--space-2xl)'}} aria-labelledby="eta">
        <h2 id="eta">Did the truck stay on schedule?</h2>
        <p className="muted" style={{margin: 0, maxWidth: 'var(--size-form)'}}>
          When the drive started, FreshRoute promised the pantry a return time of {clockAmPm(d.promiseAt)} (the dashed line). The solid line is the return time FreshRoute expected at each moment of the trip. It rises when the truck falls behind (traffic, a long stop) and drops when it catches up. Finishing on or below the dashed line means it was on time.
        </p>
        <EtaChart d={d} end={end} />
      </section>

      <section className="detail" style={{marginTop: 'var(--space-2xl)'}}>
        <div className="stack">
          <h2>Footage</h2>
          <Footage segments={d.segments} events={d.events || []} start={d.startedAt} end={end} seekTo={seek} speed={d.clock?.speed || 1} />
          <p className="faint" style={{margin: 0, fontSize: 'var(--fs-sub)'}}>Ticks: apricot = motion or delay, green = stops, dashed = recording gap. Tap one to jump there.</p>
        </div>
        <div className="stack">
          <h2>Route</h2>
          <div className="mapbox"><MapView route={coords} split={coords.length - 1} trail={trail} markers={markers} fitKey={d.id} label="Map of the drive" legendAt="bl"
            legend={{title: 'Where this drive went', items: [['line trail', 'Path the truck drove'], ['stopnum', 'Pickup stops, in order'], ['marker', 'Hard brake, turn or bump: tap to watch']]}} /></div>
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
      <div className="report-done">
        <Button variant="primary" size="lg" label={next} onClick={() => navigate(back)} />
        {back !== '/bank/reports' && <p className="muted" style={{margin: 0, fontSize: 'var(--fs-sub)'}}>This report is saved. The pantry can open it any time from Pickup runs.</p>}
      </div>
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
// Where the expected return time jumped, and why: the plain-language story under the chart.
export function etaJumps(d, pts) {
  const out = [];
  const ev = (d.events || []).filter((e) => ['delay', 'arrived', 'loaded', 'skipped', 'reroute'].includes(e.kind));
  for (let i = 1; i < pts.length; i++) {
    const dm = Math.round((pts[i].eta - pts[i - 1].eta) / 60000);
    if (Math.abs(dm) < 2) continue;
    const t = pts[i].t;
    const near = ev.filter((e) => Math.abs(e.t - t) < 3 * 60000).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
    let why = '';
    if (near?.kind === 'delay') why = `${near.data?.reason || 'a delay'}`;
    else if (near?.kind === 'loaded' || near?.kind === 'skipped') {
      const s = (d.stops || []).find((x) => x.storeId === near.data?.storeId);
      const dwell = s?.arrivedAt && s?.departedAt ? Math.round((s.departedAt - s.arrivedAt) / 60000) : null;
      why = dwell != null ? `the stop at ${near.data?.name} took ${dwell} min, against the 12 planned` : `the stop at ${near.data?.name}`;
    } else if (near?.kind === 'arrived') why = `arriving at ${near.data?.name}`;
    else if (near?.kind === 'reroute') why = 'a new route after leaving the planned one';
    out.push({t, y0: pts[i - 1].eta, y1: pts[i].eta, dm, why});
  }
  return out;
}

function EtaChart({d, end}) {
  const W = 900, H = 300, L = 64, R = 16, T = 16, B = 64;
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
  // Event names under their marks, in two rows, skipping any that would overlap.
  const labelled = [];
  for (const e of events) {
    const x = X(e.t);
    const row = labelled.filter((l) => Math.abs(l.x - x) < 150).length;
    if (row < 2) labelled.push({x, row, text: eventText(e).split(',')[0].slice(0, 24), e});
  }
  const lastEta = pts.length ? pts[pts.length - 1].eta : d.promiseAt;
  const st = etaState(lastEta, d.promiseAt);
  const jumps = etaJumps(d, pts);
  const text = (x, y, s, o = {}) => <text x={x} y={y} fontSize="12" fill="var(--fr-text-3)" fontFamily="var(--fr-ui)" {...o}>{s}</text>;
  if (!pts.length) return <p className="muted">No arrival estimates recorded for this drive yet.</p>;
  const first = pts[0].eta;
  const fst = etaState(first, d.promiseAt);
  return (
    <figure className="stack" style={{margin: 0}}>
      <p style={{margin: 0, maxWidth: 'var(--size-form)'}}>
        {`It started ${fst.key === 'on-time' ? 'on time' : `${Math.abs(fst.delta)} min ${fst.delta > 0 ? 'behind' : 'ahead'}`}. `}
        {jumps.map((j) => `At ${clock(j.t)} the return time moved ${Math.abs(j.dm)} min ${j.dm > 0 ? 'later' : 'earlier'}${j.why ? `: ${j.why}` : ''}. `).join('')}
        {`It ${end && d.status === 'delivered' ? 'finished' : 'is now expected'} ${st.delta === 0 ? 'right on time' : `${Math.abs(st.delta)} min ${st.delta > 0 ? 'late' : 'early'}`}.`}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{overflow: 'hidden'}} role="img" aria-label={`Expected return time during the drive. Promised ${clock(d.promiseAt)}. Last expected ${clock(lastEta)}.`}>
        <rect x={L} y={Y(d.promiseAt + band)} width={W - L - R} height={Y(d.promiseAt - band) - Y(d.promiseAt + band)} fill="var(--fr-sprout)" opacity="0.08" />
        <line x1={L} x2={W - R} y1={Y(d.promiseAt)} y2={Y(d.promiseAt)} stroke="var(--fr-sprout)" strokeWidth="2" strokeDasharray="6 6" />
        {Y(d.promiseAt + band) - T > 20 && text(L + 8, Y(d.promiseAt + band) - 8, 'Later than promised')}
        {H - B - Y(d.promiseAt - band) > 20 && text(L + 8, Y(d.promiseAt - band) + 18, 'Earlier than promised')}
        {text(W - R - 4, Y(d.promiseAt) - 8, `Promised ${clock(d.promiseAt)}`, {textAnchor: 'end', fill: 'var(--fr-sprout)'})}
        {yTicks.map((t) => <text key={t} x={L - 10} y={Y(t) + 4} textAnchor="end" fontSize="12" fill="var(--fr-text-3)" fontFamily="var(--fr-ui)">{clock(t)}</text>)}
        {xTicks.map((t, i) => <text key={i} x={X(t)} y={H - 8} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} fontSize="12" fill="var(--fr-text-3)" fontFamily="var(--fr-ui)">{clock(t)}</text>)}
        <path d={path} fill="none" stroke={st.key === 'on-time' ? 'var(--fr-text)' : `var(--fr-${st.key === 'slipping' ? 'apricot' : 'tomato'})`} strokeWidth="3" strokeLinejoin="round" />
        {jumps.map((j, k) => text(X(j.t) + 6, (Y(j.y0) + Y(j.y1)) / 2 + 4, `${Math.abs(j.dm)} min ${j.dm > 0 ? 'later' : 'earlier'}`, {key: k, fill: j.dm > 0 ? 'var(--fr-apricot)' : 'var(--fr-sprout)', fontWeight: 600}))}
        {events.map((e, k) => <rect key={k} x={X(e.t) - 2} y={H - B} width="4" height="10" rx="2" fill={e.kind === 'motion' || e.kind === 'delay' ? 'var(--fr-apricot)' : 'var(--fr-sprout)'} />)}
        {labelled.map((l, k) => text(Math.min(W - R - 4, Math.max(L, l.x)), H - B + 24 + l.row * 14, l.text, {key: 'l' + k, textAnchor: l.x < L + 60 ? 'start' : l.x > W - R - 60 ? 'end' : 'middle', fontSize: 11}))}
      </svg>
      <figcaption className="row wrap faint" style={{fontSize: 'var(--fs-sub)', gap: 'var(--space-lg)'}}>
        <span>Higher on the chart means a later return</span><span>Left to right: time during the drive</span><span>Green band: within 3 min of the promise</span>
      </figcaption>
    </figure>
  );
}
