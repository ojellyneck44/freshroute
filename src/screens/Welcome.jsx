import {useState} from 'react';
import {TextInput, Button, Banner} from '@astryxdesign/core';
import {Truck, Building2} from 'lucide-react';
import {setState, navigate} from '../lib/state.js';
import {api} from '../lib/api.js';
import {Mark, Wordmark} from '../components/Glyphs.jsx';

// D1a: who are you, and which food bank? The join code comes from the food bank.
export default function Welcome() {
  const [role, setRole] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function join(useCode = code) {
    setError(null);
    if (!role) return setError('Choose whether you drive pickups or run a food bank.');
    const c = useCode.trim().toUpperCase();
    if (!c) return setError('Enter the join code from your food bank.');
    setBusy(true);
    try {
      await api('check', {code: c});
    } catch (e) {
      setBusy(false);
      // Offline or no server: still let people try the app on this device.
      if (e.status === 401) return setError('That join code was not recognised. Check it with your food bank.');
    }
    setBusy(false);
    setState({role, code: c});
    navigate(role === 'driver' ? '/setup' : '/bank');
  }

  return (
    <main className="center-page" tabIndex={-1}>
      <div className="welcome">
        <section>
          <Wordmark />
          <h1>Pickups that arrive when you said they would.</h1>
          <p className="muted" style={{fontSize: 'var(--fs-headline)', margin: 0, maxWidth: '34ch'}}>
            Drivers plan grocery pickups and keep a live arrival time. The food bank sees it, along with the cold-chain timer and footage of the drive.
          </p>
          <div className="row" style={{marginTop: 'var(--space-2xl)'}} aria-hidden="true">
            <Mark size={120} />
          </div>
        </section>
        <section className="stack" aria-labelledby="who">
          <h2 id="who">Who's using this iPad?</h2>
          <button className="role-btn" aria-pressed={role === 'driver'} onClick={() => setRole('driver')}>
            <span className="ico"><Truck size={24} aria-hidden="true" /></span>
            <span><span className="store-name">I drive pickups</span><br /><span className="muted">Plan a route, navigate, record counts</span></span>
          </button>
          <button className="role-btn" aria-pressed={role === 'bank'} onClick={() => setRole('bank')}>
            <span className="ico"><Building2 size={24} aria-hidden="true" /></span>
            <span><span className="store-name">I run a food bank</span><br /><span className="muted">See trucks, ETAs, footage and reports</span></span>
          </button>
          <TextInput label="Food bank join code" value={code} onChange={setCode} placeholder="e.g. DENTON-DEMO" autoComplete="off" onEnter={() => join()} description="Your food bank gives you this code. It links you to their trucks." />
          {error && <Banner status="error" title={error} />}
          <Button variant="primary" size="lg" label="Continue" isLoading={busy} onClick={() => join()} />
          <Button variant="ghost" label="Try the demo food bank" onClick={() => (setCode('DENTON-DEMO'), join('DENTON-DEMO'))} />
        </section>
      </div>
    </main>
  );
}
