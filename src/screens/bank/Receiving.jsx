import {motion} from 'motion/react';
import {useEffect, useState} from 'react';
import {Button, Banner, Badge, SegmentedControl, SegmentedControlItem, Switch, TextInput, TextArea, TimeInput} from '@astryxdesign/core';
import {ArrowLeft, Camera, Minus, Plus, PackageCheck, Send, Phone, Video, Trash2} from 'lucide-react';
import Ring from '../../components/Ring.jsx';
import {Cold} from '../../components/Glyphs.jsx';
import {navigate, getState} from '../../lib/state.js';
import {api} from '../../lib/api.js';
import {simNow} from '../../lib/simclock.js';
import {route as osrmRoute} from '../../lib/osrm.js';
import {cumulative, pointAt} from '../../lib/geo.js';
import {clock, clockAmPm, day, etaState, miles} from '../../lib/format.js';
import {BANK} from '../../data/stores.js';
import {PARENT, HUB, TRUCK, ORDER_LINES, deliveryFor, orderLb, isCold, creditDeadline, loadReceipts, saveReceipts, claimsOf, parseLines, atTime} from '../../data/deliveries.js';

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

// Real deliveries the pantry entered (shared through the server), refreshed every 8 seconds.
export function useDeliveries(ms = 8000) {
  const [list, setList] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const run = () => api('deliveries').then((x) => alive && setList(x)).catch(() => alive && setList((l) => l || []));
    run();
    const t = setInterval(run, ms);
    return () => ((alive = false), clearInterval(t));
  }, [tick]);
  return [list, () => setTick((x) => x + 1)];
}

// A real delivery as the board shows it. `drive` is the food bank driver's live run, when they use FreshRoute.
export function realView(x, drive) {
  const now = drive ? simNow(drive) : Date.now();
  const done = drive && ['arrived-bank', 'delivered'].includes(drive.status);
  const eta = drive ? (done ? drive.arrivedBankAt || drive.deliveredAt || now : drive.last?.eta || drive.promiseAt) : x.calledEta || null;
  return {
    ...x, real: true, lines: x.lines || [], truck: x.truck || drive?.van || '', etaAt: eta, drive,
    receipt: x.receipt || loadReceipts()[x.id] || null,
    phase: done ? 'here' : drive ? 'road' : x.calledEta ? 'called' : 'waiting',
    pos: drive?.last ? [drive.last.lon, drive.last.lat] : null,
    progress: drive ? (done ? 1 : Math.min(0.98, Math.max(0.02, (now - drive.startedAt) / Math.max(1, eta - drive.startedAt)))) : 0,
  };
}

export const phaseText = (d) =>
  d.receipt ? `Received ${clockAmPm(d.receipt.at)} by ${d.receipt.receiver}`
  : d.phase === 'here' ? `At your door since ${clockAmPm(d.etaAt)}`
  : d.phase === 'hub' ? `At the ${HUB.place}, your stop is next`
  : d.phase === 'road' && d.real ? `On the way to you${d.drive?.driver ? ` with ${d.drive.driver}` : ''}, live from FreshRoute`
  : d.phase === 'road' ? `On the way to you, ${miles(d.milesLeft ?? 0)} out`
  : d.phase === 'called' ? `Driver called at ${clockAmPm(d.calledAt)}: about ${clockAmPm(d.calledEta)}`
  : d.phase === 'waiting' ? 'Not on the road yet'
  : `On the road from the ${PARENT.place}, ${HUB.place} first`;

// The food bank delivery on the Incoming board.
export function DeliveryCard({d, onChanged}) {
  const here = d.phase === 'here';
  const st = etaState(d.etaAt, d.windowEnd);
  const cold = d.lines.filter(isCold).length;
  const lb = orderLb(d.lines);
  const progress = d.real ? d.progress : d.phase === 'here' ? 1 : d.phase === 'road' ? 0.6 + 0.4 * d.legFrac[1] : d.phase === 'hub' ? 0.6 : 0.6 * d.legFrac[0];
  const patch = (body) => api(`deliveries/${d.id}`, {method: 'PATCH', body}).then(onChanged);
  // The driver's call before leaving the previous stop, logged with one tap.
  const called = (min) => patch({calledAt: Date.now(), calledEta: Date.now() + min * 60000});
  const remove = () => confirm(`Remove order ${d.order}? It disappears from every iPad at the pantry.`) && api(`deliveries/${d.id}`, {method: 'DELETE'}).then(onChanged);
  return (
    <motion.article layout initial={{opacity: 0, y: 14}} animate={{opacity: 1, y: 0}} className="panel delivery stack" aria-labelledby={`dl-${d.id}`}>
      <div className="row" style={{alignItems: 'flex-start', gap: 'var(--space-lg)'}}>
        <Ring forecast={d.receipt ? d.receipt.at : d.etaAt} promise={d.windowEnd} progress={d.receipt ? 1 : progress} size={112} stroke={9} timeSize={22} />
        <div className="grow stack" style={{gap: 'var(--space-2xs)'}}>
          <div className="label">From {PARENT.name}{d.real ? '' : ' · sample delivery'}</div>
          <h2 className="as-h3 nowrap" id={`dl-${d.id}`}>Order {d.order || d.id}</h2>
          <div style={{color: d.receipt ? 'var(--fr-sprout)' : here ? 'var(--fr-text)' : STATE_VAR[st.key], fontWeight: 600}}>{phaseText(d)}</div>
          {!here && !d.receipt && !d.etaAt && <div className="muted">Expected in your window. When the driver calls ahead, log it below.</div>}
          {!here && !d.receipt && d.etaAt && (
            <div className="muted">{st.delta > 0 ? `Arrives about ${clockAmPm(d.etaAt)}, after your window closes at ${clockAmPm(d.windowEnd)}` : `Arrives about ${clockAmPm(d.etaAt)}, inside your window`}{d.reason ? `. ${d.reason}.` : '.'}</div>
          )}
          <div className="row wrap" style={{gap: 'var(--space-xs)', marginTop: 'var(--space-xs)'}}>
            <span className="chip">Window {clock(d.windowStart)} to {clockAmPm(d.windowEnd)}</span>
            {d.drive?.sim > 0 && <span className="chip" title="Times are drive time, which runs faster than the clock on the wall">Simulated at {d.drive.clock?.speed || d.drive.sim}×</span>}
            {d.lines.length > 0 && <span className="chip">{d.lines.length} lines{lb ? `, ${lb.toLocaleString()} lb` : ''}</span>}
            {cold > 0 && <span className="chip frost"><Cold size={14} />{cold} cold or frozen</span>}
          </div>
        </div>
      </div>
      {d.truck && <div className="muted" style={{fontSize: 'var(--fs-sub)'}}>Look for: {d.truck}</div>}
      {d.addedBy?.name && <div className="faint" style={{fontSize: 'var(--fs-sub)'}}>Added by {d.addedBy.name}</div>}
      {d.real && !d.drive && !d.receipt && (
        <div className="row wrap" role="group" aria-label="Driver called ahead">
          <span className="muted row" style={{gap: 'var(--space-xs)'}}><Phone size={16} aria-hidden="true" />Driver called? Arriving in about</span>
          {[15, 30, 45, 60].map((m) => <button key={m} className="chip" onClick={() => called(m)}>{m} min</button>)}
        </div>
      )}
      <div className="row wrap">
        {d.receipt ? (
          <Button label="See the receipt" icon={<PackageCheck size={18} />} onClick={() => navigate('/bank/receiving')} />
        ) : (
          <Button variant={here ? 'primary' : 'secondary'} size="lg" label={here ? 'Receive delivery' : 'Open the order'} icon={<PackageCheck size={18} />} onClick={() => navigate(`/bank/receive/${d.id}`)} />
        )}
        {d.drive && <Button variant="ghost" label="Watch the truck" icon={<Video size={18} />} onClick={() => navigate(`/bank/truck/${d.drive.id}`)} />}
        {d.real && !d.receipt && <Button variant="ghost" label="Remove" icon={<Trash2 size={18} />} onClick={remove} />}
        {cold > 0 && !d.receipt && <span className="faint" style={{fontSize: 'var(--fs-sub)'}}>Bring the pallet blanket: cold lines can't be received without it.</span>}
      </div>
    </motion.article>
  );
}

// Check a delivery in against the invoice, line by line, before the driver leaves.
export function Receive({id}) {
  const d = useParentDelivery();
  const [list] = useDeliveries(30000);
  const real = list?.find((x) => x.id === id);
  if (!id.startsWith('AI-') && !real) return <p className="muted" aria-busy={list === null}>{list === null ? 'Loading the order…' : 'That order is no longer on the board.'}</p>;
  const order = real ? realView(real) : d.id === id ? d : {...d, id, phase: 'here'}; // an older sample order still waiting to be checked in
  return <ReceiveForm key={id} order={order} />;
}

function ReceiveForm({order}) {
  const id = order.id;
  const [note, setNote] = useState('');
  const [lines, setLines] = useState(() => Object.fromEntries(order.lines.map((l) => [l.name, {status: 'ok', cases: 0}])));
  const [temp, setTemp] = useState('');
  const [blanket, setBlanket] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [receiver, setReceiver] = useState(getState().profile.name || '');
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
    const receipt = {id, order: order.order || id, at: Date.now(), lines, orderLines: order.lines, temp: temp.trim(), blanket, receiver: receiver.trim(), receiverId: getState().profileId, photos: photos.length, note: note.trim(), real: !!order.real};
    all[id] = receipt;
    saveReceipts(all);
    // Real deliveries keep the receipt on the server too, so every iPad at the pantry sees it.
    (order.real ? api(`deliveries/${id}`, {method: 'PATCH', body: {receipt}}).catch(() => {}) : Promise.resolve()).then(() => navigate('/bank/receiving'));
  };

  return (
    <>
      <div className="main-head">
        <div>
          <div className="back"><Button variant="ghost" label="Incoming" icon={<ArrowLeft size={18} />} onClick={() => navigate('/bank')} /></div>
          <h1 style={{marginTop: 'var(--space-sm)'}}>Receive order {order.order || id}</h1>
          <p className="muted" style={{margin: 'var(--space-2xs) 0 0'}}>{order.phase === 'here' ? 'The truck is here.' : phaseText(order) + '.'} Check each line against the invoice, then sign before the driver leaves.</p>
        </div>
      </div>
      <div className="receive">
        <section aria-labelledby="lines-h" className="stack">
          <h2 id="lines-h" className="as-h3">Invoice lines</h2>
          {order.lines.length === 0 && <TextArea label="No invoice lines were entered for this order" description="Write down anything short, damaged or not ordered." value={note} onChange={setNote} />}
          <ul className="lines">
            {order.lines.map((l) => {
              const r = lines[l.name];
              return (
                <li key={l.name} className={r.status !== 'ok' ? 'flag' : ''}>
                  <div className="grow">
                    <div className="store-name">{l.name}</div>
                    <div className="muted" style={{fontSize: 'var(--fs-sub)'}}>{l.lb ? `${l.cases} ${l.cases === 1 ? 'case' : 'cases'} of ${l.pack} · ${l.lb} lb` : l.pack}{isCold(l) ? ` · ${l.storage}` : ''}</div>
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
  const [server] = useDeliveries(30000);
  // Receipts signed on another iPad come from the server; this iPad's own copy wins if both exist.
  const merged = {...Object.fromEntries((server || []).filter((x) => x.receipt).map((x) => [x.id, x.receipt])), ...receipts};
  const list = Object.values(merged).sort((a, b) => b.at - a.at);
  const open = list.filter((r) => (claimsOf(r).length || r.note) && !r.creditSentAt);
  const send = (r) => {
    const sent = {...r, creditSentAt: Date.now()};
    const all = {...receipts, [r.id]: sent};
    saveReceipts(all);
    setReceipts(all);
    if (r.real) api(`deliveries/${r.id}`, {method: 'PATCH', body: {receipt: sent}}).catch(() => {});
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
                  <div className="store-name">Order {r.order || r.id}</div>
                  <div className="muted">Received {day(r.at)} by {r.receiver}{r.photos ? ` · ${r.photos} photos` : ''}</div>
                </div>
                <span className={`chip ${hoursLeft < 24 ? 'late' : hoursLeft < 48 ? 'slipping' : ''}`}>{hoursLeft < 0 ? 'Past the deadline' : `Claim by ${day(due)}, 5 PM`}</span>
              </div>
              <ul className="claims">
                {r.note && <li><span>{r.note}</span></li>}
                {c.map((l) => <li key={l.name}><span>{l.name}: {l.missing} {l.missing === 1 ? 'case' : 'cases'} {l.status}{l.note ? ` (${l.note})` : ''}</span><span className="num">{l.missingLb ? `${l.missingLb} lb` : ''}</span></li>)}
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
                const lb = orderLb(r.orderLines || ORDER_LINES) - c.reduce((a, l) => a + l.missingLb, 0);
                return (
                  <tr key={r.id}>
                    <td className="num nowrap">{day(r.at)}<div className="muted">{clockAmPm(r.at)}</div></td>
                    <td>{r.order || r.id}{r.sample && <div className="muted">Sample</div>}</td>
                    <td className="num">{lb ? `${lb.toLocaleString()} lb` : 'n/a'}</td>
                    <td className="num">{r.temp ? `${r.temp} °F` : 'n/a'}{r.temp && r.blanket ? ', blanket' : ''}</td>
                    <td>{c.length === 0 && !r.note ? 'None' : r.creditSentAt ? <Badge variant="neutral" label={`Sent ${day(r.creditSentAt)}`} /> : <Badge variant="orange" label="To send" />}</td>
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


// Add a real delivery from the food bank: what the pantry knows from the ordering portal.
export function AddDelivery({onDone}) {
  const [order, setOrder] = useState('');
  const [when, setWhen] = useState('today');
  // Default window: the next 2 hours, starting on the hour.
  const next = new Date().getHours() + 1;
  const hh = (h) => `${String(h % 24).padStart(2, '0')}:00`;
  const [start, setStart] = useState(hh(next));
  const [end, setEnd] = useState(hh(next + 2));
  const [truck, setTruck] = useState('');
  const [linesMode, setLinesMode] = useState('type');
  const [text, setText] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const parsed = parseLines(text);

  const save = async () => {
    setErr(null);
    if (!order.trim()) return setErr('Add the order or invoice number from the ordering portal.');
    const dayStart = new Date();
    if (when === 'tomorrow') dayStart.setDate(dayStart.getDate() + 1);
    const windowStart = atTime(dayStart, start), windowEnd = atTime(dayStart, end);
    if (!(windowEnd > windowStart)) return setErr('The window has to end after it starts.');
    const lines = linesMode === 'sample' ? ORDER_LINES : linesMode === 'type' ? parsed : [];
    setBusy(true);
    try {
      const me = getState();
      await api('deliveries', {method: 'POST', body: {addedBy: me.profileId ? {id: me.profileId, name: me.profile.name} : null, order: order.trim(), windowStart, windowEnd, truck: truck.trim(), lines, addedAt: Date.now()}});
      navigate('/bank');
    } catch (e) {
      setErr(`Couldn't save the delivery. ${e.message}.`);
      setBusy(false);
    }
  };

  return (
    <>
      <div className="main-head">
        <div>
          <div className="back"><Button variant="ghost" label="Incoming" icon={<ArrowLeft size={18} />} onClick={() => navigate('/bank')} /></div>
          <h1 style={{marginTop: 'var(--space-sm)'}}>Add a delivery</h1>
          <p className="muted" style={{margin: 'var(--space-2xs) 0 0'}}>From your order confirmation in {PARENT.name}'s ordering portal. Every iPad at the pantry sees it.</p>
        </div>
      </div>
      <div className="form stack">
        <TextInput label="Order or invoice number" value={order} onChange={setOrder} placeholder="e.g. AI-48213" autoComplete="off" />
        <div className="stack" style={{gap: 'var(--space-sm)'}}>
          <span className="label">Delivery day</span>
          <SegmentedControl label="Delivery day" value={when} onChange={setWhen} layout="fill">
            <SegmentedControlItem value="today" label="Today" />
            <SegmentedControlItem value="tomorrow" label="Tomorrow" />
          </SegmentedControl>
        </div>
        <div className="fields2">
          <TimeInput label="Window opens" value={start} onChange={(v) => setStart(v || '')} />
          <TimeInput label="Window closes" value={end} onChange={(v) => setEnd(v || '')} />
        </div>
        <TextInput label="Truck to look for (optional)" value={truck} onChange={setTruck} placeholder={`e.g. ${TRUCK}`} />
        <div className="stack" style={{gap: 'var(--space-sm)'}}>
          <span className="label">Invoice lines</span>
          <SegmentedControl label="Invoice lines" value={linesMode} onChange={setLinesMode} layout="fill">
            <SegmentedControlItem value="type" label="Type them" />
            <SegmentedControlItem value="sample" label="Use the sample" />
            <SegmentedControlItem value="none" label="Skip" />
          </SegmentedControl>
          {linesMode === 'type' && (
            <TextArea label="One line per item" description='Start with the case count, and add "(cold)" or "(frozen)" where it applies. e.g. "4 Canned green beans" or "2 Frozen chicken (frozen)".' value={text} onChange={setText} />
          )}
          {linesMode === 'type' && parsed.length > 0 && <span className="muted" style={{fontSize: 'var(--fs-sub)'}}>{parsed.length} {parsed.length === 1 ? 'line' : 'lines'}, {parsed.reduce((a, l) => a + l.cases, 0)} cases{parsed.some(isCold) ? `, ${parsed.filter(isCold).length} cold or frozen` : ''}</span>}
          {linesMode === 'none' && <span className="muted" style={{fontSize: 'var(--fs-sub)'}}>You can still receive it, with a note for anything wrong.</span>}
        </div>
        {err && <Banner status="error" title={err} />}
        <Button variant="primary" size="lg" label="Add to Incoming" isLoading={busy} onClick={save} />
      </div>
    </>
  );
}
