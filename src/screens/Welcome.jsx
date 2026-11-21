import {useState} from 'react';
import {TextInput, Button, Banner} from '@astryxdesign/core';
import {Truck, Building2, Warehouse} from 'lucide-react';
import {setState, navigate} from '../lib/state.js';
import {api} from '../lib/api.js';
import {Mark, Wordmark} from '../components/Glyphs.jsx';

// D1a: who are you, and which pantry? The join code comes from the pantry.
export default function Welcome() {
  const [role, setRole] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function join(useCode = code) {
    setError(null);
    if (!role) return setError("Choose who's using this iPad.");
    const c = useCode.trim().toUpperCase();
    if (!c) return setError('Enter the join code from your pantry.');
    setBusy(true);
    try {
      await api('check', {code: c});
    } catch (e) {
      setBusy(false);
      // Offline or no server: still let people try the app on this device.
      if (e.status === 401) return setError('That join code was not recognised. Check it with your pantry.');
    }
    setBusy(false);
    setState({role, code: c});
    navigate(role === 'bank' ? '/bank' : '/setup');
  }

  return (
    <main className="center-page" tabIndex={-1}>
      <div className="welcome">
        <section>
          <Wordmark />
          <h1>Know when the food gets here.</h1>
          <p className="muted" style={{fontSize: 'var(--fs-headline)', margin: 0, maxWidth: '34ch'}}>
            Pantries see the food bank truck coming, check deliveries in at the door, and run their own grocery pickups with a live arrival time, cold-chain timer and drive footage.
          </p>
          <div className="row" style={{marginTop: 'var(--space-2xl)'}} aria-hidden="true">
            <Mark size={120} />
          </div>
        </section>
        <section className="stack" aria-labelledby="who">
          <h2 id="who">Who's using this iPad?</h2>
          <button className="role-btn" aria-pressed={role === 'driver'} onClick={() => setRole('driver')}>
            <span className="ico"><Truck size={24} aria-hidden="true" /></span>
            <span><span className="store-name">I drive pickups</span><br /><span className="muted">Volunteer runs to stores or the food bank warehouse</span></span>
          </button>
          <button className="role-btn" aria-pressed={role === 'bank'} onClick={() => setRole('bank')}>
            <span className="ico"><Building2 size={24} aria-hidden="true" /></span>
            <span><span className="store-name">I run a pantry</span><br /><span className="muted">Incoming deliveries, receiving, credits and reports</span></span>
          </button>
          <button className="role-btn" aria-pressed={role === 'hauler'} onClick={() => setRole('hauler')}>
            <span className="ico"><Warehouse size={24} aria-hidden="true" /></span>
            <span><span className="store-name">I drive for the food bank</span><br /><span className="muted">Deliver orders to pantries with a live arrival time</span></span>
          </button>
          <TextInput label="Pantry join code" value={code} onChange={setCode} placeholder="e.g. DENTON-DEMO" autoComplete="off" onEnter={() => join()} description="Your pantry gives you this code. It links this iPad to the pantry's deliveries and pickup runs." />
          {error && <Banner status="error" title={error} />}
          <Button variant="primary" size="lg" label="Continue" isLoading={busy} onClick={() => join()} />
          <Button variant="ghost" label="Try the demo pantry" onClick={() => (setCode('DENTON-DEMO'), join('DENTON-DEMO'))} />
        </section>
      </div>
    </main>
  );
}
