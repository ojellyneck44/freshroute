import {useEffect, useState} from 'react';
import {TextInput, Button, Banner} from '@astryxdesign/core';
import {Truck, Building2, Warehouse, UserPlus} from 'lucide-react';
import {setState, navigate, useAppState, signInAs, homeFor} from '../lib/state.js';
import {api} from '../lib/api.js';
import {Mark, Wordmark} from '../components/Glyphs.jsx';

const ROLES = {
  driver: {icon: Truck, title: 'I drive pickups', sub: 'Volunteer runs to stores or the food bank warehouse', label: 'Pickup driver'},
  bank: {icon: Building2, title: 'I run a pantry', sub: 'Incoming deliveries, receiving, credits and reports', label: 'Pantry'},
  hauler: {icon: Warehouse, title: 'I drive for the food bank', sub: 'Deliver orders to pantries with a live arrival time', label: 'Food bank driver'},
};

// D1a: which pantry (join code), then who you are: a person from the pantry's list, or someone new.
export default function Welcome() {
  const saved = useAppState((s) => s.code);
  const [code, setCode] = useState('');
  const [people, setPeople] = useState(null);
  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!saved) return setPeople(null);
    api('profiles').then((list) => (setPeople(list), setAdding(list.length === 0))).catch(() => (setPeople([]), setAdding(true)));
  }, [saved]);

  async function join(useCode = code) {
    setError(null);
    const c = useCode.trim().toUpperCase();
    if (!c) return setError('Enter the join code from your pantry.');
    setBusy(true);
    try {
      await api('check', {code: c});
    } catch (e) {
      setBusy(false);
      if (e.status === 401) return setError('That join code was not recognised. Check it with your pantry.');
    }
    setBusy(false);
    setState({code: c});
  }

  async function addPerson() {
    setError(null);
    if (!role) return setError("Choose what you'll do in FreshRoute.");
    if (!name.trim()) return setError('Add your name, so everyone can see who did what.');
    setBusy(true);
    try {
      const {id} = await api('profiles', {method: 'POST', body: {name: name.trim(), role}});
      signInAs({id, name: name.trim(), role});
      navigate(role === 'bank' ? '/bank' : '/setup');
    } catch (e) {
      setError(`Couldn't add you. ${e.message}.`);
      setBusy(false);
    }
  }

  const pick = (p) => (signInAs(p), navigate(p.role === 'bank' ? '/bank' : p.consentAt ? homeFor(p.role) : '/setup'));

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
          {!saved ? (
            <>
              <h2 id="who">Which pantry?</h2>
              <TextInput label="Pantry join code" value={code} onChange={setCode} placeholder="e.g. DENTON-DEMO" autoComplete="off" onEnter={() => join()} description="Your pantry gives you this code. It links this iPad to the pantry's people, deliveries and pickup runs." />
              {error && <Banner status="error" title={error} />}
              <Button variant="primary" size="lg" label="Continue" isLoading={busy} onClick={() => join()} />
              <Button variant="ghost" label="Try the demo pantry" onClick={() => join('DENTON-DEMO')} />
            </>
          ) : people === null ? (
            <p className="muted" aria-busy="true">Loading people…</p>
          ) : !adding ? (
            <>
              <h2 id="who">Who are you?</h2>
              <div className="people stack">
                {people.map((p) => {
                  const R = ROLES[p.role] || ROLES.driver;
                  return (
                    <button key={p.id} className="role-btn" onClick={() => pick(p)}>
                      <span className="ico"><R.icon size={24} aria-hidden="true" /></span>
                      <span><span className="store-name">{p.name}</span><br /><span className="muted">{R.label}{p.van ? ` · ${p.van}` : ''}</span></span>
                    </button>
                  );
                })}
              </div>
              <Button variant="secondary" size="lg" label="I'm not on the list" icon={<UserPlus size={18} />} onClick={() => setAdding(true)} />
              <Button variant="ghost" label={`Not ${saved}? Use a different pantry code`} onClick={() => setState({code: ''})} />
            </>
          ) : (
            <>
              <h2 id="who">{people.length ? 'Add yourself' : 'Be the first person here'}</h2>
              <TextInput label="Your name" value={name} onChange={setName} autoComplete="name" placeholder="First and last name" />
              <span className="label">What will you do?</span>
              {Object.entries(ROLES).map(([k, R]) => (
                <button key={k} className="role-btn" aria-pressed={role === k} onClick={() => setRole(k)}>
                  <span className="ico"><R.icon size={24} aria-hidden="true" /></span>
                  <span><span className="store-name">{R.title}</span><br /><span className="muted">{R.sub}</span></span>
                </button>
              ))}
              {error && <Banner status="error" title={error} />}
              <Button variant="primary" size="lg" label="Continue" isLoading={busy} onClick={addPerson} />
              {people.length > 0 ? <Button variant="ghost" label="Back to the list" onClick={() => setAdding(false)} /> : <Button variant="ghost" label={`Not ${saved}? Use a different pantry code`} onClick={() => setState({code: ''})} />}
              <p className="faint" style={{margin: 0, fontSize: 'var(--fs-sub)'}}>Prototype accounts: a name and a role, no password. Everyone with the pantry's code sees the list.</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
