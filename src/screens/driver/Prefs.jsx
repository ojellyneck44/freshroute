import {Button, SegmentedControl, SegmentedControlItem, Switch, TextInput} from '@astryxdesign/core';
import {ArrowLeft, LogOut} from 'lucide-react';
import {useAppState, setState, navigate, resetState} from '../../lib/state.js';

// D14: preferences.
export default function Prefs() {
  const {profile, prefs, code} = useAppState();
  const setProfile = (p) => setState((s) => ({profile: {...s.profile, ...p}}));
  const setPrefs = (p) => setState((s) => ({prefs: {...s.prefs, ...p}}));
  return (
    <main className="center-page" tabIndex={-1} style={{placeItems: 'start center'}}>
      <div className="form">
        <Button variant="ghost" label="Back" icon={<ArrowLeft size={18} />} onClick={() => navigate('/drive')} />
        <h1>Preferences</h1>
        <TextInput label="Your name" value={profile.name} onChange={(name) => setProfile({name})} autoComplete="name" />
        <div className="stack" style={{gap: 'var(--space-sm)'}}>
          <span className="label">Vehicle</span>
          <SegmentedControl label="Vehicle" value={profile.van} onChange={(van) => setProfile({van})} layout="fill">
            {['Van 1', 'Van 2', 'Box truck', 'Own car'].map((v) => <SegmentedControlItem key={v} value={v} label={v} />)}
          </SegmentedControl>
        </div>
        <Switch label="This vehicle has cold storage" value={profile.cold} onChange={(cold) => setProfile({cold})} labelSpacing="spread" />
        <div className="stack" style={{gap: 'var(--space-sm)'}}>
          <span className="label">Appearance</span>
          <SegmentedControl label="Appearance" value={prefs.theme} onChange={(theme) => setPrefs({theme})} layout="fill">
            <SegmentedControlItem value="auto" label="Auto" />
            <SegmentedControlItem value="dark" label="Dark" />
            <SegmentedControlItem value="light" label="Daylight" />
          </SegmentedControl>
          <p className="muted" style={{margin: 0, fontSize: 'var(--fs-label)'}}>Auto uses Daylight between sunrise and sunset, so the screen stays readable with sun on the windshield.</p>
        </div>
        <div className="panel stack">
          <div className="label">Food bank</div>
          <strong>{code}</strong>
          <p className="muted" style={{margin: 0, fontSize: 'var(--fs-label)'}}>You agreed to drive recording on {profile.consent ? 'this device' : 'no device yet'}. Video, location and motion markers are shared with your food bank during drives only.</p>
        </div>
        <Button variant="destructive" label="Sign out of this iPad" icon={<LogOut size={18} />} onClick={() => confirm('Sign out? Your name, vehicle and planned route are removed from this iPad. Finished drives stay with the food bank.') && (resetState(), navigate('/', {replace: true}))} />
      </div>
    </main>
  );
}
