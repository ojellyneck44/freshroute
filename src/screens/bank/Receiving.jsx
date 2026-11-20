import {useEffect, useState} from 'react';
import {Button, Banner, Badge, SegmentedControl, SegmentedControlItem, Switch, TextInput} from '@astryxdesign/core';
import {ArrowLeft, Camera, Minus, Plus, PackageCheck, Send} from 'lucide-react';
import Ring from '../../components/Ring.jsx';
import {Cold} from '../../components/Glyphs.jsx';
import {navigate} from '../../lib/state.js';
import {route as osrmRoute} from '../../lib/osrm.js';
import {cumulative, pointAt} from '../../lib/geo.js';
import {clock, clockAmPm, day, etaState, miles} from '../../lib/format.js';
import {BANK} from '../../data/stores.js';
import {PARENT, HUB, deliveryFor, orderLb, isCold, creditDeadline, loadReceipts, saveReceipts, claimsOf} from '../../data/deliveries.js';

const STATE_VAR = {'on-time': 'var(--fr-sprout)', slipping: 'var(--fr-apricot)', late: 'var(--fr-tomato)', unknown: 'var(--fr-text-3)'};

// The food bank truck's road (warehouse, shared stop, pantry), fetched once per session.
let roadPromise = null;
const loadRoad = () =>
  (roadPromise ||= osrmRoute([PARENT, HUB, BANK]).then((r) => {
    const cum = cumulative(r.coords);
    return {...r, cum, legMs: r.legs.map((l) => l.duration * 1000), legEnd: r.legs[0].distance};
  }).catch(() => ((roadPromise = null), null)));

// Today's delivery from the food bank, ticking every 5 seconds, with the truck's place on the road.
export function useParentDelivery() {
  const [road, setRoad] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    loadRoad().then(setRoad);
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  const d = deliveryFor(now, road && {legs: road.legMs});
  const receipts = loadReceipts();
  d.receipt = receipts[d.id] || null;
  if (road) {
    const along = d.phase === 'road-hub' ? d.legFrac[0] * road.legEnd : d.phase === 'hub' ? road.legEnd : d.phase === 'road' ? road.legEnd + d.legFrac[1] * (road.distance - road.legEnd) : road.distance;
    const at = pointAt(road.coords, road.cum, along);
    d.pos = at.p;
    d.hdg = at.hdg;
    d.milesLeft = road.distance - along;
    d.coords = road.coords;
    d.split = at.i;
  }
  return d;
}

export const phaseText = (d) =>
  d.receipt ? `Received ${clockAmPm(d.receipt.at)} by ${d.receipt.receiver}`
  : d.phase === 'here' ? `At your door since ${clockAmPm(d.etaAt)}`
  : d.phase === 'hub' ? `At the ${HUB.place}, your stop is next`
  : d.phase === 'road' ? `On the way to you, ${miles(d.milesLeft ?? 0)} out`
  : `On the road from the ${PARENT.place}, ${HUB.place} first`;

// The food bank delivery on the Incoming board.
export function DeliveryCard({d}) {
  const here = d.phase === 'here';
  const st = etaState(d.etaAt, d.windowEnd);
  const cold = d.lines.filter(isCold).length;
  const progress = d.phase === 'here' ? 1 : d.phase === 'road' ? 0.6 + 0.4 * d.legFrac[1] : d.phase === 'hub' ? 0.6 : 0.6 * d.legFrac[0];
  return (
    <article className="panel delivery stack" aria-labelledby={`dl-${d.id}`}>
      <div className="row" style={{alignItems: 'flex-start', gap: 'var(--space-lg)'}}>
        <Ring forecast={d.receipt ? d.receipt.at : d.etaAt} promise={d.windowEnd} progress={d.receipt ? 1 : progress} size={112} stroke={9} timeSize={22} />
        <div className="grow stack" style={{gap: 'var(--space-2xs)'}}>
          <div className="label">From {PARENT.name}</div>
          <h2 className="as-h3 nowrap" id={`dl-${d.id}`}>Order {d.id}</h2>
          <div style={{color: d.receipt ? 'var(--fr-sprout)' : here ? 'var(--fr-text)' : STATE_VAR[st.key], fontWeight: 600}}>{phaseText(d)}</div>
          {!here && !d.receipt && (
            <div className="muted">{st.delta > 0 ? `Arrives about ${clockAmPm(d.etaAt)}, after your window closes at ${clockAmPm(d.windowEnd)}` : `Arrives about ${clockAmPm(d.etaAt)}, inside your window`}{d.reason ? `. ${d.reason}.` : '.'}</div>
          )}
          <div className="row wrap" style={{gap: 'var(--space-xs)', marginTop: 'var(--space-xs)'}}>
            <span className="chip">Window {clock(d.windowStart)} to {clockAmPm(d.windowEnd)}</span>
            <span className="chip">{d.lines.length} lines, {orderLb(d.lines).toLocaleString()} lb</span>
            {cold > 0 && <span className="chip frost"><Cold size={14} />{cold} cold or frozen</span>}
          </div>
        </div>
      </div>
      <div className="muted" style={{fontSize: 'var(--fs-sub)'}}>Look for: {d.truck}</div>
      <div className="row wrap">
        {d.receipt ? (
          <Button label="See the receipt" icon={<PackageCheck size={18} />} onClick={() => navigate('/bank/receiving')} />
        ) : (
          <Button variant={here ? 'primary' : 'secondary'} size="lg" label={here ? 'Receive delivery' : 'Open the order'} icon={<PackageCheck size={18} />} onClick={() => navigate(`/bank/receive/${d.id}`)} />
        )}
        {cold > 0 && !d.receipt && <span className="faint" style={{fontSize: 'var(--fs-sub)'}}>Bring the pallet blanket: cold lines can't be received without it.</span>}
      </div>
    </article>
  );
}

// Check a delivery in against the invoice, line by line, before the driver leaves.
export function Receive({id}) {
  const d = useParentDelivery();
  const order = d.id === id ? d : {...d, id, phase: 'here'}; // an older order still waiting to be checked in
  const [lines, setLines] = useState(() => Object.fromEntries(order.lines.map((l) => [l.name, {status: 'ok', cases: 0}])));
  const [temp, setTemp] = useState('');
  const [blanket, setBlanket] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [receiver, setReceiver] = useState('');
  const [err, setErr] = useState(null);
  const coldLines = order.lines.filter(isCold);
  const set = (name, patch) => setLines((x) => ({...x, [name]: {...x[name], ...patch}}));
  const issues = Object.values(lines).filter((l) => l.status !== 'ok').length;
  const tempN = parseFloat(temp);
  useEffect(() => setErr(null), [temp, receiver]);

  const finish = () => {
    if (coldLines.length && temp.trim() === '') return setErr('Take the temperature of a cold case and enter it. The food bank asks for it at every drop-off.');
    if (!receiver.trim()) return setErr('Add your name. It signs the invoice for the pantry.');
    const all = loadReceipts();
    all[id] = {id, at: Date.now(), lines, temp: temp.trim(), blanket, receiver: receiver.trim(), photos: photos.length};
    saveReceipts(all);
    navigate('/bank/receiving');
  };

  return (
    <>
      <div className="main-head">
        <div>
          <div className="back"><Button variant="ghost" label="Incoming" icon={<ArrowLeft size={18} />} onClick={() => navigate('/bank')} /></div>
          <h1 style={{marginTop: 'var(--space-sm)'}}>Receive order {id}</h1>
          <p className="muted" style={{margin: 'var(--space-2xs) 0 0'}}>{order.phase === 'here' ? 'The truck is here.' : phaseText(order) + '.'} Check each line against the invoice, then sign before the driver leaves.</p>
        </div>
      </div>
      <div className="receive">
        <section aria-labelledby="lines-h" className="stack">
          <h2 id="lines-h" className="as-h3">Invoice lines</h2>
          <ul className="lines">
            {order.lines.map((l) => {
              const r = lines[l.name];
              return (
                <li key={l.name} className={r.status !== 'ok' ? 'flag' : ''}>
                  <div className="grow">
                    <div className="store-name">{l.name}</div>
                    <div className="muted" style={{fontSize: 'var(--fs-sub)'}}>{l.cases} {l.cases === 1 ? 'case' : 'cases'} of {l.pack} · {l.lb} lb{isCold(l) ? ` · ${l.storage}` : ''}</div>
                  </div>
                  <SegmentedControl label={`${l.name} status`} value={r.status} onChange={(status) => set(l.name, {status, cases: status === 'ok' ? 0 : Math.max(1, r.cases)})} size="sm">
                    <SegmentedControlItem value="ok" label="Received" />
                    <SegmentedControlItem value="short" label="Short" />
                    <SegmentedControlItem value="damaged" label="Damaged" />
                  </SegmentedControl>
                  {r.status !== 'ok' && (
                    <div className="row lines-qty">
                      <span className="muted">{r.status === 'short' ? 'Cases missing' : 'Cases damaged'}</span>
                      <Button variant="secondary" isIconOnly size="sm" label="One fewer" icon={<Minus size={16} />} isDisabled={r.cases <= 1} onClick={() => set(l.name, {cases: r.cases - 1})} />
                      <strong className="num" aria-live="polite">{r.cases}</strong>
                      <Button variant="secondary" isIconOnly size="sm" label="One more" icon={<Plus size={16} />} isDisabled={r.cases >= l.cases} onClick={() => set(l.name, {cases: r.cases + 1})} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <section className="stack receive-side" aria-labelledby="sign-h">
          <h2 id="sign-h" className="as-h3">Sign for it</h2>
          {coldLines.length > 0 && (
            <div className="panel stack">
              <TextInput label="Temperature of a cold case (°F)" value={temp} onChange={setTemp} inputMode="decimal" placeholder="e.g. 38" description={`${coldLines.length} cold or frozen lines. Chilled food should be 41 °F or colder.`} />
              {tempN > 41 && <Banner status="warning" title={`${tempN} °F is above 41 °F`} description="Note it on the invoice and mark the warm lines as damaged so the credit request includes them." />}
              <Switch label="Pallet blanket used" value={blanket} onChange={setBlanket} labelSpacing="spread" labelPosition="start" />
            </div>
          )}
          <div className="panel stack">
            <span className="label">Photos of anything short or damaged</span>
            <label className="photo-btn">
              <Camera size={18} aria-hidden="true" />{photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'} added` : 'Take or add photos'}
              <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => setPhotos([...photos, ...e.target.files])} />
            </label>
            <span className="faint" style={{fontSize: 'var(--fs-sub)'}}>Photos go with the credit request.</span>
          </div>
          <TextInput label="Received by" value={receiver} onChange={setReceiver} autoComplete="name" placeholder="Your name" />
          {err && <Banner status="error" title={err} />}
          <div className="panel stack" style={{gap: 'var(--space-2xs)'}}>
            <strong>{issues === 0 ? 'Everything received' : `${issues} ${issues === 1 ? 'line' : 'lines'} to claim`}</strong>
            <span className="muted" style={{fontSize: 'var(--fs-sub)'}}>{issues === 0 ? 'Nothing to claim.' : `A credit request is ready to send. ${PARENT.name} accepts claims until ${day(creditDeadline(Date.now()))}, 5 PM.`}</span>
          </div>
          <Button variant="primary" size="lg" width="100%" label="Sign and finish" onClick={finish} />
        </section>
      </div>
    </>
  );
}

// Credits to claim and every delivery checked in.
export function Receiving() {
  const [receipts, setReceipts] = useState(loadReceipts);
  const list = Object.values(receipts).sort((a, b) => b.at - a.at);
  const open = list.filter((r) => claimsOf(r).length && !r.creditSentAt);
  const send = (r) => {
    const all = {...receipts, [r.id]: {...r, creditSentAt: Date.now()}};
    saveReceipts(all);
    setReceipts(all);
  };
  return (
    <>
      <div className="main-head">
        <div>
          <h1>Receiving</h1>
          <p className="muted" style={{margin: 'var(--space-2xs) 0 0'}}>Deliveries from {PARENT.name}, and credits for anything short or damaged.</p>
        </div>
      </div>
      <section className="stack" aria-labelledby="credits-h">
        <h2 id="credits-h" className="as-h3">Credits to claim</h2>
        {open.length === 0 && <p className="muted" style={{margin: 0}}>Nothing to claim. Short or damaged lines from a delivery show up here.</p>}
        {open.map((r) => {
          const c = claimsOf(r);
          const due = creditDeadline(r.at);
          const hoursLeft = (due - Date.now()) / 3600000;
          return (
            <article key={r.id} className="panel stack">
              <div className="spread wrap">
                <div>
                  <div className="store-name">Order {r.id}</div>
                  <div className="muted">Received {day(r.at)} by {r.receiver}{r.photos ? ` · ${r.photos} photos` : ''}</div>
                </div>
                <span className={`chip ${hoursLeft < 24 ? 'late' : hoursLeft < 48 ? 'slipping' : ''}`}>{hoursLeft < 0 ? 'Past the deadline' : `Claim by ${day(due)}, 5 PM`}</span>
              </div>
              <ul className="claims">
                {c.map((l) => <li key={l.name}><span>{l.name}: {l.missing} {l.missing === 1 ? 'case' : 'cases'} {l.status}{l.note ? ` (${l.note})` : ''}</span><span className="num">{l.missingLb} lb</span></li>)}
              </ul>
              <div className="row wrap">
                <Button variant="primary" label="Send credit request" icon={<Send size={18} />} onClick={() => send(r)} />
                <span className="faint" style={{fontSize: 'var(--fs-sub)'}}>Prototype: marks it sent. The real version files it with {PARENT.name}'s partner services.</span>
              </div>
            </article>
          );
        })}
      </section>
      <section className="stack" style={{marginTop: 'var(--space-2xl)'}} aria-labelledby="hist-h">
        <h2 id="hist-h" className="as-h3">Received deliveries</h2>
        <div style={{overflowX: 'auto'}}>
          <table className="table">
            <thead><tr><th>Received</th><th>Order</th><th>Weight</th><th>Cold case</th><th>Claims</th><th>Signed by</th></tr></thead>
            <tbody>
              {list.map((r) => {
                const c = claimsOf(r);
                const lb = orderLb(deliveryFor(r.at).lines) - c.reduce((a, l) => a + l.missingLb, 0);
                return (
                  <tr key={r.id}>
                    <td className="num nowrap">{day(r.at)}<div className="muted">{clockAmPm(r.at)}</div></td>
                    <td>{r.id}{r.sample && <div className="muted">Sample</div>}</td>
                    <td className="num">{lb.toLocaleString()} lb</td>
                    <td className="num">{r.temp ? `${r.temp} °F` : 'n/a'}{r.temp && r.blanket ? ', blanket' : ''}</td>
                    <td>{c.length === 0 ? 'None' : r.creditSentAt ? <Badge variant="neutral" label={`${c.length} sent ${day(r.creditSentAt)}`} /> : <Badge variant="orange" label={`${c.length} to send`} />}</td>
                    <td>{r.receiver}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

