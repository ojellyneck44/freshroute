import {useState} from 'react';
import {TextInput, Switch, CheckboxInput, Button, Banner} from '@astryxdesign/core';
import {ArrowLeft} from 'lucide-react';
import {useAppState, setState, navigate, homeFor, getState} from '../../lib/state.js';
import {BANK} from '../../data/stores.js';

// D1b: your name, your vehicle, and the recording agreement (shown once, at sign-up).
export default function Setup() {
  const profile = useAppState((s) => s.profile);
  const [name, setName] = useState(profile.name);
  const [van, setVan] = useState(profile.van || '');
  const [cold, setCold] = useState(profile.cold);
  const [consent, setConsent] = useState(profile.consent);
  const [error, setError] = useState(null);

  const save = () => {
    if (!name.trim()) return setError('Add your name so the pantry knows who is driving.');
    if (!consent) return setError('Recording is part of every FreshRoute drive. Agree to the recording terms to continue.');
    setState({profile: {name: name.trim(), van: van.trim() || 'Volunteer vehicle', cold, consent: true}});
    navigate(homeFor(getState().role));
  };

  return (
    <main className="center-page" tabIndex={-1}>
      <div className="form">
        <div className="back"><Button variant="ghost" label="Back" icon={<ArrowLeft size={18} />} onClick={() => (setState({role: null}), navigate('/'))} /></div>
        <h1>{getState().role === 'hauler' ? 'Set up your deliveries' : 'Set up your pickup runs'}</h1>
        <TextInput label="Your name" value={name} onChange={setName} autoComplete="name" placeholder="First and last name" />
        <TextInput label="Your vehicle" value={van} onChange={setVan} placeholder="e.g. Silver Honda Odyssey, plate ends 4KD" description="Stores and the pantry use this to spot you at the dock." />
        <Switch label="This vehicle has cold storage" description="Pickups with chilled or frozen food are marked for you either way." value={cold} onChange={setCold} labelSpacing="spread" labelPosition="start" />
        <section className="stack" aria-labelledby="rec">
          <h2 className="as-h3" id="rec">Recording during drives</h2>
          <div className="consent" tabIndex={0} aria-label="Recording terms">
            <p>While a drive is running, FreshRoute records video from the cameras you pick (usually the front camera, facing you), sound inside the vehicle, your location, and sudden movements (hard brakes, sharp turns, bumps). You can turn sound off before each drive.</p>
            <p>{BANK.name} can watch the video live or later, and see drive reports, without asking you each time. The recording is there to show what happened to the food, and to protect you if something is damaged or goes missing.</p>
            <p>Recording only happens while a drive is running and FreshRoute is open on screen. Gaps are marked in the report. Video is kept for 90 days unless the pantry needs it for a report.</p>
            <p>Tell anyone riding with you, and store staff you talk to near the iPad, that sound is being recorded.</p>
            <p className="faint">This is a plain-language summary for the prototype, not legal advice. Texas lets one person in a conversation record it; other states can require everyone's consent. The pantry's own policy applies.</p>
          </div>
          <CheckboxInput label="I agree to drive recording on this device" value={consent} onChange={setConsent} />
        </section>
        {error && <Banner status="error" title={error} />}
        <Button variant="primary" size="lg" label="Save and plan pickups" onClick={save} />
      </div>
    </main>
  );
}
