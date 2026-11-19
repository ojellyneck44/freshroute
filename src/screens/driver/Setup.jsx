import {useState} from 'react';
import {TextInput, SegmentedControl, SegmentedControlItem, Switch, CheckboxInput, Button, Banner} from '@astryxdesign/core';
import {ArrowLeft} from 'lucide-react';
import {useAppState, setState, navigate} from '../../lib/state.js';
import {BANK} from '../../data/stores.js';

// D1b: your name, your vehicle, and the recording agreement (shown once, at sign-up).
export default function Setup() {
  const profile = useAppState((s) => s.profile);
  const [name, setName] = useState(profile.name);
  const [van, setVan] = useState(profile.van || 'Van 2');
  const [cold, setCold] = useState(profile.cold);
  const [consent, setConsent] = useState(profile.consent);
  const [error, setError] = useState(null);

  const save = () => {
    if (!name.trim()) return setError('Add your name so the food bank knows who is driving.');
    if (!consent) return setError('Recording is part of every FreshRoute drive. Agree to the recording terms to continue.');
    setState({profile: {name: name.trim(), van, cold, consent: true}});
    navigate('/drive');
  };

  return (
    <main className="center-page" tabIndex={-1}>
      <div className="form">
        <Button variant="ghost" label="Back" icon={<ArrowLeft size={18} />} onClick={() => (setState({role: null}), navigate('/'))} />
        <h1>Set up your van</h1>
        <TextInput label="Your name" value={name} onChange={setName} autoComplete="given-name" placeholder="First and last name" />
        <div className="stack" style={{gap: 'var(--space-sm)'}}>
          <span className="label">Vehicle</span>
          <SegmentedControl label="Vehicle" value={van} onChange={setVan} layout="fill" size="lg">
            {['Van 1', 'Van 2', 'Box truck', 'Own car'].map((v) => <SegmentedControlItem key={v} value={v} label={v} />)}
          </SegmentedControl>
        </div>
        <Switch label="This vehicle has cold storage" description="Pickups with chilled or frozen food are marked for you either way." value={cold} onChange={setCold} labelSpacing="spread" />
        <section className="stack" aria-labelledby="rec">
          <h3 id="rec">Recording during drives</h3>
          <div className="consent" tabIndex={0} aria-label="Recording terms">
            <p>While a drive is running, FreshRoute records video from the camera you pick, your location, and sudden movements (hard brakes, sharp turns, bumps). It does not record sound.</p>
            <p>{BANK.name} can watch the video live or later, and see drive reports, without asking you each time. The recording is there to show what happened to the food, and to protect you if something is damaged or goes missing.</p>
            <p>Recording only happens while a drive is running and FreshRoute is open on screen. Gaps are marked in the report. Video is kept for 90 days unless the food bank needs it for a report.</p>
            <p className="faint">This is a plain-language summary for the prototype, not legal advice. The food bank's own policy applies.</p>
          </div>
          <CheckboxInput label="I agree to drive recording on this device" value={consent} onChange={setConsent} />
        </section>
        {error && <Banner status="error" title={error} />}
        <Button variant="primary" size="lg" label="Save and plan pickups" onClick={save} />
      </div>
    </main>
  );
}
