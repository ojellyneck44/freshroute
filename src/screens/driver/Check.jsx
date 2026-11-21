import {useEffect, useRef, useState} from 'react';
import {Button, Banner, SegmentedControl, SegmentedControlItem, Switch, Selector} from '@astryxdesign/core';
import {ArrowLeft, Camera, Activity, MapPin, Sun, CheckCircle2, Circle} from 'lucide-react';
import {useAppState, setState, navigate, getState} from '../../lib/state.js';
import {planRoute, planDelivery, promiseFor, startDrive} from '../../lib/engine.js';
import {api} from '../../lib/api.js';
import {listCameras} from '../../lib/recorder.js';
import {askMotionPermission} from '../../lib/motion.js';
import {session, useCamera, keepAwake} from '../../lib/session.js';
import {storeById, BANK} from '../../data/stores.js';
import {clock, clockAmPm} from '../../lib/format.js';

// D7: everything that has to work before the van moves, checked once, in one place.
export default function Check() {
  const route = useAppState((s) => s.route);
  const prefs = useAppState((s) => s.prefs);
  const [plan, setPlan] = useState(null);
  // Saved as 'front,back' or 'front,<usb deviceId>'. Front comes first: the driver's face is the main picture.
  const saved = (prefs.camera || 'front').split(',');
  const [picked, setPicked] = useState(saved.map((c) => (['front', 'back'].includes(c) ? c : 'usb')));
  const [devices, setDevices] = useState([]);
  const [usbId, setUsbId] = useState(saved.find((c) => !['front', 'back'].includes(c)) || '');
  const [sound, setSound] = useState(prefs.sound ?? true);
  const [feeds, setFeeds] = useState(null);
  const [camState, setCamState] = useState('idle'); // idle | on | error
  const [camErr, setCamErr] = useState('');
  const [motion, setMotion] = useState(session.motionOk ? 'granted' : 'unknown');
  const [gps, setGps] = useState('unknown');
  const [sim, setSim] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const video = useRef(null);

  const haul = useAppState((s) => s.haul); // a food bank delivery instead of a pickup run
  useEffect(() => {
    if (haul) planDelivery().then(setPlan).catch((e) => setErr(e.message));
    else if (!route.length) navigate('/drive', {replace: true});
    else planRoute(route.map((r) => r.storeId)).then(setPlan).catch((e) => setErr(e.message));
  }, []);

  const ORDER = ['front', 'usb', 'back'];
  const camera = ORDER.filter((c) => picked.includes(c)).map((c) => (c === 'usb' ? usbId : c)).filter(Boolean).join(',');
  const togglePick = (c) => setPicked((p) => (p.includes(c) ? (p.length > 1 ? p.filter((x) => x !== c) : p) : [...p, c]));
  useEffect(() => {
    if (!camera) return;
    let alive = true;
    setCamState('idle');
    useCamera(camera, sound)
      .then(async (f) => {
        if (!alive) return;
        video.current.srcObject = f.stream;
        setFeeds(f);
        setCamState('on');
        setDevices(await listCameras());
      })
      .catch((e) => {
        if (!alive) return;
        setCamState('error');
        setCamErr(e.name === 'NotAllowedError' ? 'Camera access is off. Allow it in Settings, then try again.' : e.name === 'NotFoundError' || e.name === 'OverconstrainedError' ? 'That camera is not connected.' : 'The camera could not start.');
      });
    return () => {
      alive = false;
    };
  }, [camera, sound]);

  const checkGps = () => {
    setGps('asking');
    navigator.geolocation?.getCurrentPosition(() => setGps('granted'), (e) => setGps(e.code === 1 ? 'denied' : 'error'), {enableHighAccuracy: true, timeout: 15000});
  };
  const askMotion = async () => {
    const r = await askMotionPermission();
    session.motionOk = r === 'granted';
    setMotion(r);
  };

  const start = async () => {
    setBusy(true);
    setErr(null);
    try {
      await keepAwake();
      setState((s) => ({prefs: {...s.prefs, camera, sound}}));
      const d = await startDrive({storeIds: route.map((r) => r.storeId), plan, sim, camera, sound, kind: haul ? 'delivery' : 'pickup', deliveryId: haul});
      // Tell the pantry's delivery card which live run is theirs.
      if (haul && !String(d.id).startsWith('local-')) await api(`deliveries/${haul}`, {method: 'PATCH', body: {driveId: d.id, truck: getState().profile.van}}).catch(() => {});
      setState(haul ? {haul: null} : {route: []});
      navigate('/drive/nav', {replace: true});
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  const promise = plan ? promiseFor(plan.route, plan.stops.length, Date.now()) : null;
  const usb = devices.filter((d) => !/front|back|face ?time|rear|integrated/i.test(d.label));
  const Item = ({ok, icon: I, title, children}) => (
    <li className="row" style={{alignItems: 'flex-start', padding: 'var(--space-lg) 0', borderBottom: '1px solid var(--fr-line)'}}>
      <span className="role-btn ico" style={{width: 'var(--size-role-icon)', height: 'var(--size-role-icon)', display: 'grid', placeItems: 'center', borderRadius: 'var(--r-card)', background: 'var(--fr-raised)', flex: 'none'}}><I size={22} aria-hidden="true" /></span>
      <div className="grow stack" style={{gap: 'var(--space-sm)'}}>
        <div className="spread"><strong>{title}</strong>{ok ? <CheckCircle2 size={22} color="var(--fr-sprout)" aria-label="Ready" /> : <Circle size={22} color="var(--fr-text-3)" aria-label="Not checked" />}</div>
        {children}
      </div>
    </li>
  );

  return (
    <main className="overlay" tabIndex={-1} style={{animation: 'none'}}>
      <div className="overlay-inner">
        <div className="back"><Button variant="ghost" label={haul ? 'Back to deliveries' : 'Back to route'} icon={<ArrowLeft size={18} />} onClick={() => navigate(haul ? '/haul' : '/drive')} /></div>
        <div className="progress-grid">
          <section className="stack" aria-labelledby="ready">
            <h1 id="ready">Before you drive</h1>
            <div className="video" style={{aspectRatio: 'auto', height: 'min(36vh, calc(var(--size-progress-col) * 0.75))'}}>
              <video ref={video} autoPlay playsInline muted aria-label="Camera preview" />
              {camState === 'on' && <span className="rec live" style={{position: 'absolute'}}><i aria-hidden="true" />Preview{feeds?.sound ? ' · sound on' : ''}</span>}
              {camState !== 'on' && <div className="cam-off muted" style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 'var(--space-lg)', textAlign: 'center'}}>{camState === 'error' ? camErr : !camera ? 'Pick your USB-C camera below.' : 'Starting camera…'}</div>}
            </div>
            <div className="stack" style={{gap: 'var(--space-sm)'}}>
              <span className="label">Cameras to record</span>
              <div className="row wrap" role="group" aria-label="Cameras to record">
                {[['front', 'Front (driver)'], ['back', 'Back (road)'], ['usb', 'USB-C']].map(([k, l]) => (
                  <button key={k} className="chip" aria-pressed={picked.includes(k)} onClick={() => togglePick(k)}>{l}</button>
                ))}
              </div>
              <p className="faint" style={{margin: 0, fontSize: 'var(--fs-sub)'}}>Pick two to record both: the front camera fills the video and the other sits in the corner.</p>
            </div>
            {picked.includes('usb') && (
              usb.length || devices.length ? (
                <Selector label="USB-C camera" value={usbId} onChange={setUsbId} width="100%" options={(usb.length ? usb : devices).map((d, i) => ({value: d.deviceId, label: d.label || `Camera ${i + 1}`}))} />
              ) : (
                <p className="muted" style={{margin: 0}}>Plug a USB-C camera into the iPad, then come back to this screen. Bluetooth dashcams can't connect to a web app.</p>
              )
            )}
            {feeds?.dropped.length > 0 && (
              <Banner status="warning" title={`Recording the ${feeds.cameras[0] === 'front' ? 'front' : feeds.cameras[0] === 'back' ? 'back' : 'USB-C'} camera only`} description="This iPad can run one camera at a time in a web app, so the second camera is off. A Mac or the future native app can record both." />
            )}
            <Switch label="Record sound" description="The microphone records inside the vehicle along with the video." value={sound} onChange={setSound} labelSpacing="spread" labelPosition="start" />
          </section>
          <section className="stack">
            <ul style={{listStyle: 'none', margin: 0, padding: 0}}>
              <Item ok={camState === 'on'} icon={Camera} title="Camera">
                <span className="muted">{camState === 'on' ? `Recording starts when you start the drive${feeds?.sound ? ', with sound' : ''}.` : 'Needed for the pantry to see the drive.'}</span>
              </Item>
              <Item ok={gps === 'granted' || sim > 0} icon={MapPin} title="Location">
                {gps === 'denied' ? <Banner status="error" title="Location is off for FreshRoute" description="On iPad: Settings > Privacy & Security > Location Services. Turn it on, then set Safari Websites (or FreshRoute, if you opened it from the Home Screen) to While Using. Then check again." />
                  : gps === 'error' ? <Banner status="warning" title="Couldn't find your location" description="Move near a window or outside and check again. Wi-Fi-only iPads have no GPS, so location drops once you leave Wi-Fi. In the iOS Simulator, pick a place in Features > Location. You can still start with the simulated drive below." />
                  : <span className="muted">Used for turn-by-turn and the live arrival time.</span>}
                {gps !== 'granted' && <div><Button label={gps === 'asking' ? 'Checking…' : 'Check location'} onClick={checkGps} /></div>}
              </Item>
              <Item ok={motion === 'granted'} icon={Activity} title="Motion sensors">
                <span className="muted">{motion === 'denied' ? 'Motion is off. Hard brakes and bumps won\'t be marked on the video.' : motion === 'unsupported' ? 'This device has no motion sensors. Markers will be skipped.' : 'Marks hard brakes, sharp turns and bumps on the video.'}</span>
                {motion === 'unknown' && <div><Button label="Allow motion" onClick={askMotion} /></div>}
              </Item>
              <Item ok icon={Sun} title="Screen stays on">
                <span className="muted">FreshRoute keeps the screen awake during the drive. Keep the iPad plugged in.</span>
              </Item>
            </ul>
            <div className="panel stack">
              <div className="label">Your promise to {BANK.name}</div>
              {promise ? (
                <>
                  <div className="big-delta num">{haul ? 'At the pantry by' : 'Back by'} {clockAmPm(promise.final)}</div>
                  <ol className="stack" style={{margin: 0, padding: 0, listStyle: 'none', gap: 'var(--space-2xs)'}}>
                    {route.map((r, i) => <li key={r.storeId} className="num">{i + 1}. {storeById(r.storeId).name}, {storeById(r.storeId).address} · {clock(promise.stops[i])}</li>)}
                  </ol>
                  <p className="muted" style={{margin: 0, fontSize: 'var(--fs-label)'}}>This time locks when you start. The pantry sees it next to your live forecast.</p>
                </>
              ) : (
                <span className="muted">Planning…</span>
              )}
            </div>
            <div className="panel stack">
              <Switch label="Simulate the drive (for testing)" description="Moves the van along the route without driving. Use it on a laptop or for user testing." value={sim > 0} onChange={(v) => setSim(v ? 4 : 0)} labelSpacing="spread" labelPosition="start" />
              {sim > 0 && (
                <SegmentedControl label="Simulation speed" value={String(sim)} onChange={(v) => setSim(Number(v))} layout="fill" size="sm">
                  {[1, 2, 4, 8].map((x) => <SegmentedControlItem key={x} value={String(x)} label={`${x}×`} />)}
                </SegmentedControl>
              )}
            </div>
            {err && <Banner status="error" title="Couldn't start the drive" description={err} />}
            <Button variant="primary" size="lg" width="100%" label="Start drive" isLoading={busy} isDisabled={!plan} onClick={start} />
          </section>
        </div>
      </div>
    </main>
  );
}
