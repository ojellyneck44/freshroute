import {useState} from 'react';
import {Button, Banner} from '@astryxdesign/core';
import {MapPin, RotateCcw} from 'lucide-react';
import {savedArea, setAroundMe, clearArea} from '../data/area.js';

// Test anywhere: move the demo pantry and stores to where this device is.
export default function PracticeArea({compact = false}) {
  const area = savedArea();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const here = () => {
    setBusy(true);
    setErr(null);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          await setAroundMe(p.coords.latitude, p.coords.longitude);
          location.reload();
        } catch (e) {
          setErr(e.message);
          setBusy(false);
        }
      },
      (e) => (setErr(e.code === 1 ? 'Location is off for FreshRoute. Turn it on in Settings, then try again.' : "Couldn't find your location. Try again near a window."), setBusy(false)),
      {enableHighAccuracy: true, timeout: 15000},
    );
  };
  return (
    <div className="stack" style={{gap: 'var(--space-sm)'}}>
      <span className="label">Practice area</span>
      <p className="muted" style={{margin: 0, fontSize: compact ? 'var(--fs-sub)' : 'var(--fs-label)'}}>
        {area ? `Around you: the demo pantry is where you were when you set this, with ${area.real === false ? `${area.stores.length} practice spots around it (the store lookup was unavailable, so these aren't real stores)` : `${area.stores.length} real grocery stores nearby as practice stores`}.` : 'Denton: the demo pantry and stores are in Denton, TX. Testing somewhere else? Move them to where you are.'}
      </p>
      <div className="row wrap">
        <Button label={area ? 'Move to where I am now' : 'Use where I am'} icon={<MapPin size={16} />} isLoading={busy} onClick={here} size={compact ? 'sm' : 'md'} />
        {area && <Button variant="ghost" label="Back to Denton" icon={<RotateCcw size={16} />} onClick={() => (clearArea(), location.reload())} size={compact ? 'sm' : 'md'} />}
      </div>
      {busy && <p className="muted" aria-live="polite" style={{margin: 0, fontSize: 'var(--fs-sub)'}}>Finding grocery stores near you. This can take up to 20 seconds.</p>}
      {err && <Banner status="error" title={err} />}
    </div>
  );
}
