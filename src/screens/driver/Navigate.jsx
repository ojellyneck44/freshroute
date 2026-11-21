import {motion} from 'motion/react';
import {useEffect, useRef, useState} from 'react';
import {Button, Banner, SegmentedControl, SegmentedControlItem, TextArea, Dialog} from '@astryxdesign/core';
import {ArrowUp, ArrowUpRight, ArrowUpLeft, CornerUpRight, CornerUpLeft, RotateCcw, Flag, X, Share2, WifiOff, PackageCheck, SkipForward, ChevronLeft} from 'lucide-react';
import {destPin} from '../../components/pins.js';
import MapView from '../../components/MapView.jsx';
import Ring from '../../components/Ring.jsx';
import {Cold} from '../../components/Glyphs.jsx';
import {useDrive, resumeDrive, currentTarget, arrive, loaded, skipStop, addDelay, finishDrive, setSimSpeed, logEvent, driveNow} from '../../lib/engine.js';
import {session, startCapture, stopCapture, useCamera} from '../../lib/session.js';
import {useAppState, setState, navigate, homeFor, getState} from '../../lib/state.js';
import {instruction} from '../../lib/osrm.js';
import {clock, clockAmPm, deltaText, etaState, hms, miles, coldState} from '../../lib/format.js';
import {pending} from '../../lib/api.js';
import {motionLabel} from '../../lib/motion.js';
import {useIsTest} from '../../components/TestMode.jsx';

const ARROW = {left: CornerUpLeft, right: CornerUpRight, 'slight left': ArrowUpLeft, 'slight right': ArrowUpRight, 'sharp left': CornerUpLeft, 'sharp right': CornerUpRight, uturn: RotateCcw, straight: ArrowUp};
const REASONS = ['Traffic', 'Train crossing', 'Store not ready', 'Loading took longer', 'Hard to find the dock', 'Something else'];

// D8 navigation, with D9 pickup, D10 progress and D11/D12 end of drive as overlays.
export default function Navigate() {
  const driveId = useAppState((s) => s.driveId);
  const {drive, live} = useDrive();
  const [overlay, setOverlay] = useState(null); // 'progress' | 'pickup' | 'end'
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(() => driveNow());
  const isTest = useIsTest();
  const camRef = useRef(null);

  const finishing = useRef(false); // set while handing over to the report, so we don't bounce to /drive
  useEffect(() => {
    if (finishing.current) return;
    // No saved drive to resume (cleared storage, finished elsewhere): drop the stale id, or App sends us straight back here.
    if (!drive && driveId && !resumeDrive()) (setState({driveId: null}), navigate(homeFor(getState().role), {replace: true}));
    if (!drive && !driveId) navigate(homeFor(getState().role), {replace: true});
  }, [drive, driveId]);

  // Camera, recording and motion markers run for the whole drive.
  useEffect(() => {
    if (!drive) return;
    let alive = true;
    (async () => {
      if (!session.stream && drive.camera !== undefined && drive.camera !== 'none') {
        try {
          await useCamera(drive.camera || 'front', drive.sound !== false);
        } catch {
          /* camera unavailable: drive continues, report shows no video */
        }
      }
      if (!alive) return;
      if (camRef.current && session.stream) camRef.current.srcObject = session.stream;
      startCapture(
        drive,
        (e) => {
          logEvent('motion', e);
          setToast(`${motionLabel[e.kind]} marked on the video`);
        },
        () => live.hdgRate || 0,
      );
    })();
    const onVis = () => logEvent(document.visibilityState === 'hidden' ? 'gap-start' : 'gap-end', {});
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(() => setNow(driveNow()), 1000); // drive time: runs faster in the simulator
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(t);
    };
  }, [drive?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Open the right overlay when the van gets somewhere.
  const target = drive ? currentTarget() : null;
  const atStop = target?.kind === 'stop' && drive.stops[target.i].arrivedAt;
  useEffect(() => {
    if (atStop && overlay !== 'pickup') setOverlay('pickup');
  }, [atStop]);
  useEffect(() => {
    if (drive?.status === 'arrived-bank' && overlay !== 'end') setOverlay('end');
  }, [drive?.status]);

  if (!drive || !target) return <main className="center-page muted" aria-busy="true">Loading your drive…</main>;

  const st = etaState(live.forecast, drive.promiseAt);
  const progress = live.cum ? live.along / live.cum[live.cum.length - 1] : 0;
  const step = live.step;
  const Arrow = step?.type === 'arrive' ? Flag : ARROW[step?.modifier] || ArrowUp;
  const coldMs = drive.coldStartAt ? now - drive.coldStartAt : 0;
  const markers = [
    ...drive.stops.map((s, i) => ({id: s.storeId, lon: s.lon, lat: s.lat, className: `stopnum${s.departedAt ? ' done' : ''}`, text: String(i + 1), label: `Stop ${i + 1}: ${s.name}`})),
    destPin('pantry', 'bank', drive.dest.lon, drive.dest.lat, drive.dest.name),
  ];
  const offline = !navigator.onLine || pending() > 20;
  // Only the road to the next stop: the whole multi-stop route doubles back on itself and gets hard to read.
  const leg = (() => {
    const {coords, legEnds} = drive.route;
    const cum = live.cum || [];
    const from = target.i > 0 ? legEnds[target.i - 1] : 0;
    const to = legEnds[target.i] ?? cum[cum.length - 1];
    let a = cum.findIndex((c) => c >= from);
    let z = cum.findIndex((c) => c >= to - 1);
    if (a < 0) a = 0;
    if (z < 0) z = coords.length - 1;
    a = Math.max(0, a - 1);
    return {coords: coords.slice(a, z + 1), split: Math.max(0, Math.min(z - a, (live.idx ?? 0) - a))};
  })();

  return (
    <main className="mapshell" data-screen tabIndex={-1}>
      <h1 className="sr-only">Navigation to {target.kind === 'bank' ? drive.dest.name : target.name}</h1>
      <MapView route={leg.coords} split={leg.split} state={st.key} markers={markers} puck={live.pos ? {lon: live.pos[0], lat: live.pos[1], hdg: live.hdg} : null} follow="nav" label="Navigation map" legendAt="nav"
        legend={{title: drive.kind === 'delivery' ? 'Your delivery' : 'Your drive', items: [['puck', 'You'], ['line', 'Road to your next stop (amber or red if running late)'], ['line done', 'Already driven'], ...(drive.stops.length ? [['stopnum', 'Pickup stops']] : []), ['dest pantry', drive.kind === 'delivery' ? `Deliver to ${drive.dest.name}` : 'Drop-off at your pantry']]}} />
      <div className="nav-cam glass" aria-label="Drive camera">
        <video ref={camRef} autoPlay playsInline muted style={{padding: 'var(--space-xs)'}} />
        {session.stream ? <span className="rec"><i aria-hidden="true" />Recording</span> : <div className="cam-off">Camera off</div>}
      </div>
      <div className="maneuver glass" aria-live="polite">
        <Arrow size={52} strokeWidth={2.5} aria-hidden="true" />
        <div>
          <div className="dist">{live.offRoute ? 'Off route' : miles(live.stepDist ?? 0)}</div>
          <div className="what">{live.offRoute ? 'Finding a new route…' : instruction(step) || 'Follow the route'}</div>
        </div>
      </div>
      <button className="ringbtn glass" onClick={() => setOverlay('progress')} aria-label="Open progress">
        <Ring forecast={live.forecast} promise={drive.promiseAt} progress={progress} size={innerWidth > 900 ? 164 : 108} timeSize={innerWidth > 900 ? 38 : 24} />
      </button>
      {drive.coldStartAt && (
        <div className="coldchip glass" style={{color: `var(--fr-${coldState(coldMs) === 'cold' ? 'frost' : coldState(coldMs) === 'slipping' ? 'apricot' : 'tomato'})`}} role="timer" aria-label={`Cold items out of the fridge for ${hms(coldMs)}`}>
          <Cold size={22} /> {hms(coldMs)} out of fridge
        </div>
      )}
      {live.gpsError && <div className="banner-float glass dense">{live.gpsError}</div>}
      {offline && !live.gpsError && <div className="banner-float glass dense row"><WifiOff size={18} aria-hidden="true" />No signal. Your trip is saved and will sync when you're back online.</div>}
      {toast && <div className="banner-float glass dense" role="status">{toast}</div>}

      <div className="navbar glass dense">
        <div className="grow">
          <div className="target">{target.kind === 'bank' ? drive.dest.name : `${target.name}`}</div>
          <div className="muted num" style={{fontSize: 'var(--fs-callout)'}}>
            {target.kind === 'bank' ? 'Drop-off' : `Stop ${target.i + 1} of ${drive.stops.length}`} · {miles(live.legLeft ?? 0)} · {deltaText(live.forecast, drive.promiseAt)}
          </div>
        </div>
        <div className="stopdots" aria-hidden="true">
          {drive.stops.map((s, i) => (
            <span key={s.storeId} className="row" style={{gap: 'var(--space-xs)'}}>
              {i > 0 && <b />}
              <i className={s.departedAt ? 'done' : i === target.i ? 'now' : ''} />
            </span>
          ))}
          <b /><i className={target.kind === 'bank' ? 'now' : ''} />
        </div>
        {target.kind === 'stop' ? (
          atStop ? (
            <button className="btn primary drive" onClick={() => setOverlay('pickup')}><PackageCheck size={22} aria-hidden="true" />Record pickup</button>
          ) : (
            <button className="btn primary drive" onClick={() => arrive(target.i)}>I've arrived</button>
          )
        ) : (
          <button className="btn primary drive" onClick={() => setOverlay('end')}>{drive.kind === 'delivery' ? "I'm at the pantry" : "I'm back at the pantry"}</button>
        )}
      </div>

      {(drive.sim > 0 || isTest) && (
        <div className="glass dense" style={{position: 'absolute', zIndex: 6, left: 'var(--space-lg)', bottom: 'calc(var(--size-count) + var(--space-3xl) + var(--space-lg))', borderRadius: 'var(--r-panel)', padding: 'var(--space-sm) var(--space-md)'}} aria-label="Simulator">
          <div className="row">
            <span className="label">Simulator</span>
            <span className="num muted" style={{fontSize: 'var(--fs-sub)'}} title="All times on this drive run on this clock">Drive time {clockAmPm(now)}</span>
            <SegmentedControl label="Simulation speed" value={String(drive.sim || 0)} onChange={(v) => setSimSpeed(Number(v))} size="sm">
              {[0, 1, 4, 8].map((x) => <SegmentedControlItem key={x} value={String(x)} label={x ? `${x}×` : 'GPS'} />)}
            </SegmentedControl>
            <Button size="sm" label="Train: +7 min" onClick={() => addDelay('Train crossing', 7)} />
          </div>
        </div>
      )}

      {overlay === 'progress' && <Progress drive={drive} live={live} now={now} onClose={() => setOverlay(null)} />}
      {overlay === 'pickup' && target.kind === 'stop' && <Pickup drive={drive} i={target.i} onClose={() => setOverlay(null)} />}
      {overlay === 'end' && <EndDrive drive={drive} onClose={() => setOverlay(null)} onFinishing={() => (finishing.current = true)} />}
    </main>
  );
}

function shareLink(drive, s) {
  const url = `${location.origin}/s/${drive.id}/${s.storeId}`;
  const text = `FreshRoute: ${drive.van} is on the way to pick up donations. Live arrival time:`;
  if (navigator.share) navigator.share({title: 'Pickup ETA', text, url}).catch(() => {});
  else navigator.clipboard?.writeText(`${text} ${url}`);
  return url;
}

// D10: the progress screen. Opens any time, including while driving; the pantry sees the same view.
function Progress({drive, live, now, onClose}) {
  const st = etaState(live.forecast, drive.promiseAt);
  const progress = live.cum ? live.along / live.cum[live.cum.length - 1] : 0;
  const [copied, setCopied] = useState(null);
  const shared = !String(drive.id).startsWith('local-');
  const coldMs = drive.coldStartAt ? now - drive.coldStartAt : 0;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Drive progress">
      <div className="overlay-inner">
        <div className="spread">
          <Button variant="ghost" label="Back to map" icon={<ChevronLeft size={20} />} onClick={onClose} />
          <span className="label">{drive.van} · {drive.driver}</span>
        </div>
        <div className="progress-grid">
          <section className="stack" style={{alignItems: 'center', textAlign: 'center'}}>
            <Ring forecast={live.forecast} promise={drive.promiseAt} progress={progress} size={300} stroke={18} timeSize={64} />
            <div className="big-delta" style={{color: `var(--fr-${st.key === 'on-time' ? 'sprout' : st.key === 'slipping' ? 'apricot' : 'tomato'})`}}>{deltaText(live.forecast, drive.promiseAt)}</div>
            <div className="muted num">Promised {clock(drive.promiseAt)} · Forecast {clock(live.forecast)}</div>
            {drive.coldStartAt && <span className={`chip ${coldState(coldMs) === 'cold' ? 'frost' : coldState(coldMs)}`}><Cold size={16} />{hms(coldMs)} out of fridge</span>}
          </section>
          <section className="stack">
            <h2>Stops</h2>
            <ol className="timeline">
              {drive.stops.map((s, i) => {
                const late = s.etaAt - s.promiseAt > 3 * 60000;
                return (
                  <li key={s.storeId}>
                    <span className={`stopnum${s.departedAt ? ' done' : ''}`} aria-hidden="true">{i + 1}</span>
                    <div>
                      <div className="store-name">{s.name}</div>
                      <div className="muted num" style={{fontSize: 'var(--fs-label)'}}>
                        {s.skipped ? `Skipped: ${s.skipped}` : s.departedAt ? `Picked up, left ${clock(s.departedAt)}` : s.arrivedAt ? `Here since ${clock(s.arrivedAt)}` : `Promised ${clock(s.promiseAt)} · now ${clock(s.etaAt)}`}
                      </div>
                    </div>
                    {!s.departedAt && shared ? (
                      <Button size="sm" variant="ghost" label={copied === i ? 'Link copied' : 'Send ETA to store'} icon={<Share2 size={16} />} onClick={() => (shareLink(drive, s), setCopied(i))} />
                    ) : (
                      <span className={`chip ${s.departedAt ? '' : late ? 'apricot' : 'sprout'}`}>{s.departedAt ? 'Done' : clock(s.etaAt)}</span>
                    )}
                  </li>
                );
              })}
              <li>
                <span className="stopnum done" aria-hidden="true">FB</span>
                <div><div className="store-name">{drive.dest.name}</div><div className="muted num" style={{fontSize: 'var(--fs-label)'}}>Promised {clock(drive.promiseAt)} · now {clock(live.forecast)}</div></div>
                <span className={`chip ${st.key}`}>{st.label}</span>
              </li>
            </ol>
            <h3 style={{marginTop: 'var(--space-lg)'}}>Anything slowing you down?</h3>
            <p className="muted" style={{margin: 0}}>Optional. The pantry sees the reason next to your arrival time.</p>
            <div className="row wrap">
              {REASONS.map((r) => (
                <button key={r} className="chip" aria-pressed={(drive.events || []).some((e) => e.kind === 'reason' && e.data?.reason === r)} onClick={() => logEvent('reason', {reason: r})}>{r}</button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// D9: at the pickup. Count what was loaded; the cold timer starts with the first chilled item.
function Pickup({drive, i, onClose}) {
  const s = drive.stops[i];
  const [counts, setCounts] = useState(() => Object.fromEntries(s.items.map((it) => [it.name, it.qty])));
  const [skip, setSkip] = useState(false);
  const [why, setWhy] = useState('');
  const hasCold = s.items.some((it) => it.storage === 'cold' || it.storage === 'frozen');
  const set = (k, v) => setCounts((c) => ({...c, [k]: Math.max(0, Math.min(999, v))}));
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="pk">
      <div className="overlay-inner" style={{maxWidth: 'var(--size-content)'}}>
        <div className="spread">
          <Button variant="ghost" label="Back to map" icon={<ChevronLeft size={20} />} onClick={onClose} />
          <span className="label">Stop {i + 1} of {drive.stops.length}</span>
        </div>
        <h1 id="pk" style={{marginTop: 'var(--space-lg)'}}>{s.name}</h1>
        <p className="muted" style={{margin: 'var(--space-2xs) 0 var(--space-xl)'}}>Count what you load. The pantry checks these against what arrives.</p>
        <div className="counts">
          {s.items.map((it) => (
            <div key={it.name} className="count-row">
              <div>
                <div className="store-name">{it.name}</div>
                <div className="muted" style={{fontSize: 'var(--fs-label)'}}>Expected {it.qty} · {it.pack}{it.storage === 'cold' || it.storage === 'frozen' ? ' · keep cold' : ''}</div>
                {counts[it.name] !== it.qty && <div style={{fontSize: 'var(--fs-label)', color: 'var(--fr-apricot)', marginTop: 'var(--space-3xs)'}}>{Math.abs(counts[it.name] - it.qty)} {counts[it.name] < it.qty ? 'fewer' : 'more'} than expected</div>}
              </div>
              <div className="stepper">
                <button onClick={() => set(it.name, counts[it.name] - 1)} aria-label={`One fewer ${it.name}`}>−</button>
                <output aria-live="polite" aria-label={`${it.name} count`}><motion.span key={counts[it.name]} initial={{scale: 1.4, opacity: 0.6}} animate={{scale: 1, opacity: 1}} style={{display: 'inline-block'}}>{counts[it.name]}</motion.span></output>
                <button onClick={() => set(it.name, counts[it.name] + 1)} aria-label={`One more ${it.name}`}>+</button>
              </div>
            </div>
          ))}
        </div>
        {hasCold && !drive.coldStartAt && <div style={{marginTop: 'var(--space-lg)'}}><Banner status="info" title="The cold-chain timer starts when you tap Loaded" description="The pantry sees how long chilled food has been out of the fridge." /></div>}
        <div className="row wrap" style={{marginTop: 'var(--space-xl)'}}>
          <button className="btn primary drive grow" onClick={() => (loaded(i, counts), onClose())}><PackageCheck size={22} aria-hidden="true" />Loaded</button>
          <button className="btn drive" onClick={() => setSkip(true)}><SkipForward size={20} aria-hidden="true" />Nothing to pick up</button>
        </div>
      </div>
      <Dialog isOpen={skip} onOpenChange={setSkip} purpose="form">
        <div className="stack" style={{padding: 'var(--space-xl)'}}>
          <h2>Skip {s.name}?</h2>
          <p className="muted" style={{margin: 0}}>The pantry and the next driver will see why.</p>
          <TextArea label="What happened" value={why} onChange={setWhy} placeholder="e.g. No donations today, store closed early" />
          <div className="row" style={{justifyContent: 'flex-end'}}>
            <Button label="Cancel" onClick={() => setSkip(false)} />
            <Button variant="destructive" label="Skip this stop" onClick={() => (skipStop(i, why || 'Nothing to pick up'), setSkip(false), onClose())} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// D11 + D12: drop-off counts, what got in the way, finish.
function EndDrive({drive, onClose, onFinishing}) {
  if (drive.kind === 'delivery') return <EndDelivery drive={drive} onClose={onClose} onFinishing={onFinishing} />;
  const picked = {};
  drive.stops.forEach((s) => s.counts && Object.entries(s.counts).forEach(([k, v]) => (picked[k] = (picked[k] || 0) + v)));
  const [drop, setDrop] = useState(picked);
  const [tags, setTags] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const missing = Object.keys(picked).filter((k) => (drop[k] ?? 0) !== picked[k]);
  const finish = () => {
    setBusy(true);
    onFinishing();
    stopCapture();
    const id = finishDrive({dropCounts: drop, feedback: {tags, text}});
    navigate(`/drive/report/${id}`, {replace: true});
  };
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="end">
      <div className="overlay-inner" style={{maxWidth: 'var(--size-content)'}}>
        <Button variant="ghost" label="Back to map" icon={<ChevronLeft size={20} />} onClick={onClose} />
        <h1 id="end" style={{marginTop: 'var(--space-lg)'}}>Drop-off at {drive.dest.name}</h1>
        <p className="muted" style={{margin: 'var(--space-2xs) 0 var(--space-xl)'}}>Count what you unload. It should match what you picked up.</p>
        {Object.keys(picked).length === 0 ? (
          <p className="muted">No pickups were recorded on this drive.</p>
        ) : (
          <div className="counts">
            {Object.entries(picked).map(([k, v]) => (
              <div key={k} className="count-row">
                <div><div className="store-name">{k}</div><div className="muted" style={{fontSize: 'var(--fs-label)'}}>Picked up {v}</div></div>
                <div className="stepper">
                  <button onClick={() => setDrop((d) => ({...d, [k]: Math.max(0, (d[k] ?? 0) - 1)}))} aria-label={`One fewer ${k}`}>−</button>
                  <output aria-live="polite" aria-label={`${k} unloaded`}><motion.span key={drop[k] ?? 0} initial={{scale: 1.4, opacity: 0.6}} animate={{scale: 1, opacity: 1}} style={{display: 'inline-block'}}>{drop[k] ?? 0}</motion.span></output>
                  <button onClick={() => setDrop((d) => ({...d, [k]: (d[k] ?? 0) + 1}))} aria-label={`One more ${k}`}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {missing.length > 0 && <div style={{marginTop: 'var(--space-lg)'}}><Banner status="warning" title={`${missing.length} item${missing.length > 1 ? 's don\'t' : ' doesn\'t'} match the pickup count`} description="That's fine if something was damaged or refused. Say what happened below so the report explains it." /></div>}
        <h2 style={{marginTop: 'var(--space-2xl)'}}>Anything slow you down today?</h2>
        <p className="muted" style={{margin: 'var(--space-2xs) 0 var(--space-md)'}}>Optional. Notes about a store show up on that store's page for the next driver.</p>
        <div className="row wrap">
          {REASONS.map((r) => <button key={r} className="chip" aria-pressed={tags.includes(r)} onClick={() => setTags((t) => (t.includes(r) ? t.filter((x) => x !== r) : [...t, r]))}>{r}</button>)}
        </div>
        <div style={{marginTop: 'var(--space-md)'}}><TextArea label="Tell us more" isOptional value={text} onChange={setText} placeholder="e.g. Kroger's dock was blocked by a delivery truck" /></div>
        <button className="btn primary drive" style={{marginTop: 'var(--space-xl)', width: '100%'}} onClick={finish} aria-disabled={busy}>Finish drive</button>
      </div>
    </div>
  );
}

// A food bank delivery ends at the pantry's door: the pantry checks the order in on their own iPad.
function EndDelivery({drive, onClose, onFinishing}) {
  const [text, setText] = useState('');
  const finish = () => {
    onFinishing();
    stopCapture();
    const id = finishDrive({dropCounts: {}, feedback: {tags: [], text}});
    navigate(`/drive/report/${id}`, {replace: true});
  };
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="end">
      <div className="overlay-inner" style={{maxWidth: 'var(--size-form)'}}>
        <Button variant="ghost" label="Back to map" icon={<ChevronLeft size={20} />} onClick={onClose} />
        <h1 id="end" style={{marginTop: 'var(--space-lg)'}}>Delivered to {drive.dest.name}</h1>
        <p className="muted" style={{margin: 'var(--space-2xs) 0 var(--space-xl)'}}>The pantry checks the order in, line by line, on their iPad and signs for it there. Finish once they've signed.</p>
        <TextArea label="Anything the pantry or the food bank should know?" isOptional value={text} onChange={setText} placeholder="e.g. Dock was blocked, unloaded at the front door" />
        <button className="btn primary drive" style={{marginTop: 'var(--space-xl)', width: '100%'}} onClick={finish}>Finish delivery</button>
      </div>
    </div>
  );
}
