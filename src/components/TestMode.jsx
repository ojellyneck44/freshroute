import PracticeArea from './PracticeArea.jsx';
import {useEffect, useState, useSyncExternalStore} from 'react';
import {Button, Badge, SegmentedControl, SegmentedControlItem, Selector} from '@astryxdesign/core';
import {FlaskConical, X, Download, Play, Square} from 'lucide-react';

// User-testing kit (wireframe T1). Turn it on with ?test=1, by holding the FreshRoute logo for a second,
// or from driver Preferences (the Home Screen app can't open a URL with ?test=1). It stays on, across
// relaunches and participant resets, until turned off. Results stay on this device until exported.
const FLAG = 'freshroute:test';
const LOG = 'freshroute:testlog';

export const TASKS = [
  {id: 'D1', who: 'Driver', text: 'Join the demo pantry as a driver and set up your pickup runs'},
  {id: 'D2', who: 'Driver', text: 'Find a store that is open now and has cold items, and add it to your route'},
  {id: 'D3', who: 'Driver', text: 'Add a second store, then start the drive'},
  {id: 'D4', who: 'Driver', text: 'Find out whether you will be back at the pantry on time'},
  {id: 'D5', who: 'Driver', text: 'At the store, record what you loaded'},
  {id: 'D6', who: 'Driver', text: 'Finish the drive and say what slowed you down'},
  {id: 'P1', who: 'Pantry', text: 'Find out when the food bank truck will get here'},
  {id: 'P2', who: 'Pantry', text: 'Find out what the truck looks like'},
  {id: 'P3', who: 'Pantry', text: 'Receive the delivery. One case of apples arrived crushed'},
  {id: 'P4', who: 'Pantry', text: "Send the credit request for yesterday's delivery"},
  {id: 'P5', who: 'Pantry', text: 'Start a sample pickup run and find out when it will be back'},
  {id: 'P6', who: 'Pantry', text: 'Find how long cold food was out of the fridge on the last pickup run'},
  {id: 'P7', who: 'Pantry', text: 'Read what drivers said about a store'},
  {id: 'L1', who: 'Pantry', text: 'Add today\'s delivery from the food bank: order number = your initials plus 1234 (e.g. SM-1234), arriving in the next two hours, with three items, one of them frozen'},
  {id: 'L2', who: 'Pantry', text: 'The driver just called: they will be there in about 30 minutes. Record it'},
  {id: 'L3', who: 'Food bank driver', text: 'Join as a food bank driver and set up your deliveries'},
  {id: 'L4', who: 'Food bank driver', text: 'Start the delivery for your order'},
  {id: 'L5', who: 'Food bank driver', text: 'Find out whether you will reach the pantry inside its window'},
  {id: 'L6', who: 'Food bank driver', text: 'Finish the delivery at the pantry'},
  {id: 'L7', who: 'Pantry', text: 'Receive your order. Everything arrived except one case is missing'},
];
const SUS = [
  'I think that I would like to use FreshRoute frequently.',
  'I found FreshRoute unnecessarily complex.',
  'I thought FreshRoute was easy to use.',
  'I think that I would need the support of a technical person to be able to use FreshRoute.',
  'I found the various functions in FreshRoute were well integrated.',
  'I thought there was too much inconsistency in FreshRoute.',
  'I would imagine that most people would learn to use FreshRoute very quickly.',
  'I found FreshRoute very cumbersome to use.',
  'I felt very confident using FreshRoute.',
  'I needed to learn a lot of things before I could get going with FreshRoute.',
];

const subs = new Set();
const isOn = () => {
  try {
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
};
export function setTestMode(on) {
  try {
    on ? localStorage.setItem(FLAG, '1') : localStorage.removeItem(FLAG);
  } catch {
    /* private mode: test mode can't be saved */
  }
  subs.forEach((f) => f());
}
// Hold the logo for a second to switch test mode on or off (hidden from participants on purpose).
export function holdToToggle() {
  let t = null;
  const cancel = () => clearTimeout(t);
  return {
    onPointerDown: () => {
      cancel();
      t = setTimeout(() => {
        const on = !isOn();
        if (confirm(on ? 'Turn on test mode? The usability testing panel will appear.' : 'Turn off test mode? The panel hides; the test log stays on this iPad.')) setTestMode(on);
      }, 1000);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e) => e.preventDefault(),
  };
}
export const useIsTest = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), isOn);
export function useTestMode() {
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('test');
    if (q === '1' || q === '0') setTestMode(q === '1');
  });
}

const readLog = () => {
  try {
    return JSON.parse(localStorage.getItem(LOG) || '{"rows":[],"sus":{}}');
  } catch {
    return {rows: [], sus: {}};
  }
};
const writeLog = (l) => localStorage.setItem(LOG, JSON.stringify(l));

// Between participants: wipe everything this device remembers about the app (role, profile, route,
// drive in progress, receipts, local reports) but keep the test log, then start again at Welcome.
function resetForNext() {
  if (!confirm('Reset FreshRoute on this device for the next participant? The test log stays.')) return;
  for (const k of Object.keys(localStorage)) if (k.startsWith('freshroute:') && k !== LOG && k !== FLAG && k !== 'freshroute:area') localStorage.removeItem(k);
  sessionStorage.removeItem('freshroute:alerts');
  location.href = '/';
}

// SUS score: odd items (score − 1), even items (5 − score), sum × 2.5.
export const susScore = (ans) => (Object.keys(ans).length < 10 ? null : SUS.reduce((a, _, i) => a + (i % 2 === 0 ? ans[i] - 1 : 5 - ans[i]), 0) * 2.5);

function csv(log) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['participant', 'task', 'task_text', 'started', 'seconds', 'outcome', 'notes'];
  const lines = log.rows.map((r) => [r.p, r.task, TASKS.find((t) => t.id === r.task)?.text, new Date(r.start).toISOString(), Math.round(r.ms / 1000), r.outcome, r.notes].map(esc).join(','));
  const susLines = Object.entries(log.sus).map(([p, a]) => [p, 'SUS', 'System Usability Scale', '', '', susScore(a) ?? 'incomplete', SUS.map((_, i) => a[i] ?? '').join(' ')].map(esc).join(','));
  return [head.join(','), ...lines, ...susLines].join('\n');
}

export function Facilitator() {
  const on = useIsTest();
  const [open, setOpen] = useState(true);
  const [p, setP] = useState(() => sessionStorage.getItem('freshroute:p') || 'P1');
  const [task, setTask] = useState('D1');
  const [start, setStart] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [notes, setNotes] = useState('');
  const [log, setLog] = useState(readLog);
  const [tab, setTab] = useState('tasks');
  useEffect(() => {
    if (!start) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [start]);
  if (!on) return null;

  const save = (l) => (writeLog(l), setLog(l));
  const finish = (outcome) => {
    save({...log, rows: [...log.rows, {p, task, start, ms: Date.now() - start, outcome, notes}]});
    setStart(null);
    setNotes('');
    const i = TASKS.findIndex((t) => t.id === task);
    if (TASKS[i + 1]) setTask(TASKS[i + 1].id);
  };
  const exportCsv = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv(log)], {type: 'text/csv'}));
    a.download = `freshroute-test-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };
  if (!open)
    return (
      <div className="facil glass dense min">
        <button className="btn icon" onClick={() => setOpen(true)} aria-label="Open the facilitator panel"><FlaskConical size={20} /></button>
      </div>
    );
  const sus = log.sus[p] || {};
  const score = susScore(sus);
  return (
    <aside className="facil glass dense stack" aria-label="User testing panel">
      <div className="spread">
        <strong>Test mode</strong>
        <button className="btn icon ghost" onClick={() => setOpen(false)} aria-label="Hide the facilitator panel"><X size={18} /></button>
      </div>
      <label className="stack" style={{gap: 'var(--space-2xs)'}}>
        <span className="label">Participant</span>
        <input type="text" value={p} onChange={(e) => (setP(e.target.value), sessionStorage.setItem('freshroute:p', e.target.value))} />
      </label>
      <SegmentedControl label="Panel section" value={tab} onChange={setTab} layout="fill" size="sm">
        <SegmentedControlItem value="tasks" label="Tasks" />
        <SegmentedControlItem value="sus" label="Survey" />
        <SegmentedControlItem value="log" label={`Log (${log.rows.length})`} />
      </SegmentedControl>
      {tab === 'tasks' && (
        <div className="stack">
          <Selector label="Task" value={task} onChange={setTask} width="100%" options={TASKS.map((t) => ({value: t.id, label: `${t.id} · ${t.text}`}))} />
          <p className="muted" style={{margin: 0}}>Read aloud: “{TASKS.find((t) => t.id === task)?.text}.”</p>
          {start ? (
            <>
              <div className="spread"><span className="num mono">{Math.floor((now - start) / 1000)} s</span><Badge variant="orange" label="Timing" /></div>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes: where they hesitated, what they said" aria-label="Observation notes" />
              <div className="row wrap">
                <Button variant="primary" label="Completed" onClick={() => finish('success')} />
                <Button label="With help" onClick={() => finish('assisted')} />
                <Button variant="destructive" label="Gave up" onClick={() => finish('fail')} />
              </div>
            </>
          ) : (
            <Button variant="primary" label="Start task" icon={<Play size={16} />} onClick={() => (setStart(Date.now()), setNow(Date.now()))} />
          )}
          <p className="faint" style={{margin: 0, fontSize: 'var(--fs-sub)'}}>Tip: on Before you drive, turn on Simulate the drive and pick 8×. The van moves by itself and the times stay realistic.</p>
        </div>
      )}
      {tab === 'sus' && (
        <form className="sus" onSubmit={(e) => e.preventDefault()}>
          <p className="muted" style={{margin: 0}}>1 = strongly disagree, 5 = strongly agree. Score: <strong className="num">{score ?? 'incomplete'}</strong></p>
          {SUS.map((q, i) => (
            <fieldset key={i}>
              <legend>{i + 1}. {q}</legend>
              <div className="likert">
                {[1, 2, 3, 4, 5].map((v) => (
                  <label key={v}>
                    <input type="radio" name={`sus${i}`} checked={sus[i] === v} onChange={() => save({...log, sus: {...log.sus, [p]: {...sus, [i]: v}}})} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </form>
      )}
      {tab === 'log' && (
        <div className="stack">
          <PracticeArea compact />
          {log.rows.length === 0 && <p className="muted" style={{margin: 0}}>No tasks timed yet.</p>}
          {log.rows.slice(-8).reverse().map((r, i) => (
            <div key={i} className="spread"><span>{r.p} · {r.task}</span><span className="num muted">{Math.round(r.ms / 1000)} s · {r.outcome}</span></div>
          ))}
          <div className="row wrap">
            <Button label="Export CSV" icon={<Download size={16} />} onClick={exportCsv} isDisabled={!log.rows.length && !Object.keys(log.sus).length} />
            <Button label="Reset app for next participant" onClick={resetForNext} />
            <Button variant="ghost" label="Clear log" icon={<Square size={16} />} onClick={() => confirm('Delete every timed task and survey answer on this device? This cannot be undone.') && save({rows: [], sus: {}})} />
          </div>
        </div>
      )}
    </aside>
  );
}
