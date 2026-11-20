import {useEffect, useMemo, useState} from 'react';
import {Button, Banner, SegmentedControl, SegmentedControlItem, Badge} from '@astryxdesign/core';
import {ArrowLeft, Plus, Check, ChevronUp, ChevronDown, X, Settings, Snowflake, FileText, MapPin} from 'lucide-react';
import MapView from '../../components/MapView.jsx';
import {stores, storeById, nextWindow, totalLb, needsCold, isDemoOpen, BANK} from '../../data/stores.js';
import {useAppState, setState, navigate} from '../../lib/state.js';
import {planRoute, promiseFor} from '../../lib/engine.js';
import {clock, clockAmPm, day, duration, miles} from '../../lib/format.js';
import {api} from '../../lib/api.js';

const windowText = (w, now = new Date()) => {
  if (!w) return 'No pickups this week';
  if (w.isOpen) return `Open now until ${clockAmPm(w.end)}`;
  const sameDay = w.start.toDateString() === now.toDateString();
  return `${sameDay ? 'Today' : day(w.start)} ${clock(w.start)} to ${clockAmPm(w.end)}`;
};
const pinClass = (w, now = new Date()) => (!w ? 'later' : w.isOpen ? 'open' : w.start.toDateString() === now.toDateString() ? 'today' : 'later');
// '07:30' -> '7:30 AM', to match the rest of the app.
const hm = (t) => clockAmPm(new Date(2000, 0, 1, ...t.split(':').map(Number)));
const STORAGE = {cold: 'Chilled', frozen: 'Frozen', cool: 'Cool, dry', dry: 'Dry'};

// D2 to D6: map of donation stores, store details, and the route tray.
export default function Plan() {
  const route = useAppState((s) => s.route);
  const profile = useAppState((s) => s.profile);
  const lastReport = useAppState((s) => s.lastReport);
  const [tab, setTab] = useState('pickups');
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(null);
  const [plan, setPlan] = useState(null);
  const [planErr, setPlanErr] = useState(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const ids = route.map((r) => r.storeId);
  const inRoute = (id) => ids.includes(id);
  const toggle = (id) => setState({route: inRoute(id) ? route.filter((r) => r.storeId !== id) : [...route, {storeId: id}]});
  const move = (i, d) => {
    const r = [...route];
    [r[i], r[i + d]] = [r[i + d], r[i]];
    setState({route: r});
  };

  useEffect(() => {
    if (!ids.length) return setPlan(null);
    let alive = true;
    setPlanErr(null);
    const t = setTimeout(() => {
      planRoute(ids).then((p) => alive && setPlan(p)).catch((e) => alive && setPlanErr(e.message));
    }, 300);
    return () => ((alive = false), clearTimeout(t));
  }, [ids.join(',')]);

  const list = useMemo(() => {
    const withW = stores.map((s) => ({s, w: nextWindow(s, now)}));
    const filtered = withW.filter(({s, w}) => {
      if (filter === 'open') return w?.isOpen;
      if (filter === 'today') return w && w.start.toDateString() === now.toDateString();
      if (filter === 'cold') return needsCold(s.items);
      return true;
    });
    return filtered.sort((a, b) => (a.w?.start ?? Infinity) - (b.w?.start ?? Infinity));
  }, [filter, now]);

  const promise = plan ? promiseFor(plan.route, plan.stops.length, now.getTime()) : null;
  const markers = [
    {id: 'bank', lon: BANK.lon, lat: BANK.lat, className: 'pin bank', text: 'FB', label: BANK.name},
    ...stores.map((s) => {
      const i = ids.indexOf(s.id);
      return {
        id: s.id, lon: s.lon, lat: s.lat,
        className: i >= 0 ? `stopnum${sel === s.id ? ' pin sel' : ''}` : `pin ${pinClass(nextWindow(s, now), now)}${sel === s.id ? ' sel' : ''}`,
        text: i >= 0 ? String(i + 1) : '',
        label: `${s.name}, ${s.address}. ${windowText(nextWindow(s, now), now)}`,
        onClick: () => (setSel(s.id), setTab('pickups')),
      };
    }),
  ];

  const selStore = sel && storeById(sel);
  return (
    <main className="mapshell" tabIndex={-1}>
      <MapView route={plan?.route.coords} markers={markers} fitKey={`${ids.join(',') || 'all'}|${plan ? 'planned' : ''}`} padding={{top: 60, bottom: 60, left: innerWidth > 820 ? 440 : 40, right: 60}} focus={sel ? storeById(sel) : null} label="Map of donation stores"
        legend={{title: 'Stores donating food', items: [
          ['pin open', 'Open now: ready for pickup'],
          ['pin today', 'Opens later today'],
          ['pin later', 'Not today'],
          ...(ids.length ? [['stopnum', 'Your stops, in order'], ['line', 'Your planned route']] : []),
          ['pin bank', 'Your food bank: start and finish'],
        ]}} />
      <aside className={`sheet${selStore ? ' tall' : ''}`} aria-label="Plan pickups">
        {selStore ? (
          <StoreDetail store={selStore} now={now} added={inRoute(selStore.id)} onToggle={() => (inRoute(selStore.id) || setSel(null), toggle(selStore.id))} onBack={() => setSel(null)} vanCold={profile.cold} />
        ) : (
          <>
            <div className="sheet-head">
              <div className="spread">
                <div>
                  <div className="label">{profile.name ? `${profile.name.split(' ')[0]} · ${profile.van}` : profile.van}</div>
                  <h1 style={{fontSize: 'var(--fs-title1)'}}>{tab === 'route' ? 'Your route' : 'Pickups'}</h1>
                </div>
                <Button variant="ghost" isIconOnly label="Preferences" icon={<Settings size={20} />} onClick={() => navigate('/drive/prefs')} />
              </div>
              <SegmentedControl label="Show" value={tab} onChange={setTab} layout="fill" size="lg">
                <SegmentedControlItem value="pickups" label="Pickups" />
                <SegmentedControlItem value="route" label={`Route${ids.length ? ` (${ids.length})` : ''}`} />
              </SegmentedControl>
            </div>
            {tab === 'pickups' ? (
              <>
                <div className="row wrap" style={{padding: '0 var(--space-lg2) var(--space-sm)'}} role="group" aria-label="Filter stores">
                  {[['open', 'Open now'], ['today', 'Today'], ['cold', 'Cold items'], ['all', 'All']].map(([k, l]) => (
                    <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
                  ))}
                </div>
                <div className="sheet-body">
                  {list.length === 0 && (
                    <div className="empty"><h2 className="as-h3">No pickups {filter === 'open' ? 'open right now' : 'today'}</h2><p>Try “All” to see the next donation windows this week.</p></div>
                  )}
                  {list.map(({s, w}) => (
                    <button key={s.id} className="listbtn" onClick={() => setSel(s.id)} aria-label={`${s.name}, ${s.address}`}>
                      <span className={`pin ${pinClass(w, now)}`} aria-hidden="true" style={{flex: 'none', marginTop: 'var(--space-2xs)'}} />
                      <span className="grow stack" style={{gap: 'var(--space-2xs)'}}>
                        <span className="store-name">{s.name}</span>
                        <span className="muted" style={{fontSize: 'var(--fs-label)'}}>{s.address}</span>
                        <span className="row wrap" style={{gap: 'var(--space-xs)'}}>
                          <span className={`chip ${w?.isOpen ? 'sprout' : ''}`}>{windowText(w, now)}</span>
                          {needsCold(s.items) && <span className="chip frost"><Snowflake size={14} aria-hidden="true" />Cold</span>}
                          <span className="chip">{totalLb(s.items)} lb</span>
                        </span>
                      </span>
                      {inRoute(s.id) && <Check size={20} color="var(--fr-sprout)" aria-label="In your route" />}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <RouteTray route={route} plan={plan} planErr={planErr} promise={promise} now={now} move={move} remove={toggle} vanCold={profile.cold} onAdd={() => setTab('pickups')} />
            )}
            {lastReport && tab === 'pickups' && (
              <div className="sheet-foot"><Button variant="ghost" label="Last drive report" icon={<FileText size={18} />} onClick={() => navigate(`/drive/report/${lastReport}`)} /></div>
            )}
          </>
        )}
      </aside>
    </main>
  );
}

function StoreDetail({store, now, added, onToggle, onBack, vanCold}) {
  const w = nextWindow(store, now);
  const [notes, setNotes] = useState(null);
  useEffect(() => {
    api(`notes?store=${store.id}`).then(setNotes).catch(() => setNotes([]));
  }, [store.id]);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <>
      <div className="sheet-head">
        <div className="back"><Button variant="ghost" label="All pickups" icon={<ArrowLeft size={18} />} onClick={onBack} /></div>
        <div>
          <h1 style={{fontSize: 'var(--fs-title1)'}}>{store.name}</h1>
          <div className="muted">{store.address}, Denton</div>
        </div>
        <div className="row wrap" style={{gap: 'var(--space-xs)'}}>
          <span className={`chip ${w?.isOpen ? 'sprout' : ''}`}>{windowText(w, now)}</span>
          {isDemoOpen(store) ? <span className="chip">Demo store: always open for test drives</span> : store.schedule.map((s, i) => <span key={i} className="chip">Every {s.days.map((d) => days[d]).join(', ')}, {hm(s.start)} to {hm(s.end)}</span>)}
        </div>
      </div>
      <div className="sheet-body stack" style={{gap: 'var(--space-xl)'}}>
        {needsCold(store.items) && !vanCold && (
          <Banner status="warning" title="This pickup has chilled food" description="Your van has no cold storage. Bring insulated totes, and plan this stop last so the cold timer stays short." />
        )}
        <section className="stack" aria-labelledby="items">
          <h2 className="as-h3" id="items">What they usually donate</h2>
          <table className="table">
            <thead><tr><th>Item</th><th>Amount</th><th>Weight</th><th>Storage</th></tr></thead>
            <tbody>
              {store.items.map((it) => (
                <tr key={it.name}>
                  <td><strong>{it.name}</strong><div className="muted" style={{fontSize: 'var(--fs-sub)'}}>{it.pack}</div></td>
                  <td className="num">{it.qty}</td>
                  <td className="num">{it.lb} lb</td>
                  <td><span className={`chip ${it.storage === 'cold' || it.storage === 'frozen' ? 'frost' : ''}`}>{STORAGE[it.storage]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="faint" style={{margin: 0, fontSize: 'var(--fs-sub)'}}>Sample schedule and items for the prototype.</p>
        </section>
        <section className="stack" aria-labelledby="how">
          <h2 className="as-h3" id="how">How pickup works here</h2>
          <p style={{margin: 0}}>{store.how}</p>
        </section>
        <section className="stack" aria-labelledby="say">
          <h2 className="as-h3" id="say">What drivers said</h2>
          {notes === null && <p className="muted" style={{margin: 0}}>Loading notes…</p>}
          {notes?.length === 0 && <p className="muted" style={{margin: 0}}>No notes yet. After a drive, what you share about this store shows up here for the next driver.</p>}
          {notes?.slice(0, 5).map((n, i) => (
            <div key={i} className="raised" style={{padding: 'var(--space-md) var(--space-lg)'}}>
              <div>{n.text}</div>
              <div className="faint" style={{fontSize: 'var(--fs-sub)', marginTop: 'var(--space-2xs)'}}>{day(n.t)}{n.tags?.length ? ` · ${n.tags.join(', ')}` : ''}</div>
            </div>
          ))}
        </section>
      </div>
      <div className="sheet-foot">
        <Button variant={added ? 'secondary' : 'primary'} size="lg" width="100%" label={added ? 'Remove from route' : 'Add to route'} icon={added ? <X size={18} /> : <Plus size={18} />} onClick={onToggle} />
      </div>
    </>
  );
}

function RouteTray({route, plan, planErr, promise, now, move, remove, vanCold, onAdd}) {
  if (!route.length)
    return (
      <div className="sheet-body">
        <div className="empty">
          <h2 className="as-h3">No stops yet</h2>
          <p>Add stores from the list or tap pins on the map. FreshRoute orders the trip from the food bank and back.</p>
          <Button variant="primary" label="Find pickups" icon={<MapPin size={18} />} onClick={onAdd} />
        </div>
      </div>
    );
  return (
    <>
      <div className="sheet-body">
        <ol className="timeline" aria-label="Stops in order">
          {route.map((r, i) => {
            const s = storeById(r.storeId);
            const w = nextWindow(s, now);
            const at = promise?.stops[i];
            const outside = at && w && (at < w.start.getTime() || at > w.end.getTime());
            return (
              <li key={r.storeId}>
                <span className="stopnum" aria-hidden="true">{i + 1}</span>
                <div>
                  <div className="store-name">{s.name}</div>
                  <div className="muted" style={{fontSize: 'var(--fs-label)'}}>{s.address}</div>
                  <div className="row wrap" style={{gap: 'var(--space-xs)', marginTop: 'var(--space-xs)'}}>
                    {at && <span className={`chip ${outside ? 'apricot' : 'sprout'}`}>Arrive {clock(at)}</span>}
                    <span className="chip">{windowText(w, now)}</span>
                    {needsCold(s.items) && <span className="chip frost"><Snowflake size={14} aria-hidden="true" />Cold</span>}
                  </div>
                  {outside && <div style={{color: 'var(--fr-apricot)', fontSize: 'var(--fs-sub)', marginTop: 'var(--space-2xs)'}}>Arrives outside the donation window. Try another order or day.</div>}
                </div>
                <div className="stack" style={{gap: 'var(--space-2xs)'}}>
                  <Button variant="ghost" isIconOnly size="sm" label={`Move ${s.name} up`} icon={<ChevronUp size={18} />} isDisabled={i === 0} onClick={() => move(i, -1)} />
                  <Button variant="ghost" isIconOnly size="sm" label={`Move ${s.name} down`} icon={<ChevronDown size={18} />} isDisabled={i === route.length - 1} onClick={() => move(i, 1)} />
                  <Button variant="ghost" isIconOnly size="sm" label={`Remove ${s.name}`} icon={<X size={18} />} onClick={() => remove(r.storeId)} />
                </div>
              </li>
            );
          })}
          <li>
            <span className="stopnum done" aria-hidden="true">FB</span>
            <div><div className="store-name">{BANK.name}</div><div className="muted" style={{fontSize: 'var(--fs-label)'}}>Drop-off</div></div>
            <span />
          </li>
        </ol>
        {!vanCold && route.some((r) => needsCold(storeById(r.storeId).items)) && (
          <div style={{marginTop: 'var(--space-lg)'}}><Banner status="warning" title="Cold items on a van without cold storage" description="Put chilled pickups last so they spend the least time out of the fridge." /></div>
        )}
        {planErr && <div style={{marginTop: 'var(--space-lg)'}}><Banner status="error" title="Couldn't plan the route" description={`${planErr}. Check your connection and try again.`} /></div>}
      </div>
      <div className="sheet-foot stack">
        {plan && promise ? (
          <div className="spread">
            <div>
              <div className="label">If you leave now</div>
              <div className="big-delta num">Back by {clockAmPm(promise.final)}</div>
              <div className="muted num" style={{fontSize: 'var(--fs-label)'}}>{miles(plan.route.distance)} · {duration(plan.route.duration * 1000)} driving · {route.length} {route.length === 1 ? 'stop' : 'stops'}</div>
            </div>
            <Badge variant="neutral" label="Estimate" />
          </div>
        ) : (
          !planErr && <div className="muted" aria-live="polite">Planning the route…</div>
        )}
        <Button variant="primary" size="lg" width="100%" label="Check and start" isDisabled={!plan} onClick={() => navigate('/drive/check')} />
      </div>
    </>
  );
}
