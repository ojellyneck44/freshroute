import {useEffect, useState, useSyncExternalStore} from 'react';
import {Button, Badge, SegmentedControl, SegmentedControlItem, Selector} from '@astryxdesign/core';
import {FlaskConical, X, Download, Play, Square} from 'lucide-react';

// User-testing kit (wireframe T1). Open any page with ?test=1 to show the facilitator panel;
// ?test=0 hides it. Everything stays on this device until the facilitator exports the CSV.
const FLAG = 'freshroute:test';
const LOG = 'freshroute:testlog';

export const TASKS = [
  {id: 'D1', who: 'Driver', text: 'Join as a driver and set up your van'},
  {id: 'D2', who: 'Driver', text: 'Find a store with cold items that is open today and add it to your route'},
  {id: 'D3', who: 'Driver', text: 'Build a 3-stop route and start the drive'},
  {id: 'D4', who: 'Driver', text: 'Check whether you will make it on time'},
  {id: 'D5', who: 'Driver', text: 'Record a pickup with item counts'},
  {id: 'D6', who: 'Driver', text: 'Finish the drive and say what slowed you down'},
  {id: 'M1', who: 'Manager', text: 'Find Van 2 and when it will arrive'},
  {id: 'M2', who: 'Manager', text: 'Watch the latest footage from the van'},
  {id: 'M3', who: 'Manager', text: 'In a drive report, find the hard-brake moment'},
  {id: 'M4', who: 'Manager', text: 'Read what drivers said about a store'},
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
const isOn = () => sessionStorage.getItem(FLAG) === '1';
export const useIsTest = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), isOn);
export function useTestMode() {
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('test');
    if (q === '1') sessionStorage.setItem(FLAG, '1');
    if (q === '0') sessionStorage.removeItem(FLAG);
    subs.forEach((f) => f());
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
              <div className="spread"><span className="num mono">{Math.floor((now - start) / 1000)} s</span><Badge variant="warning" label="Timing" /></div>
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
          <p className="faint" style={{margin: 0, fontSize: 'var(--fs-sub)'}}>Tip: in navigation, the simulator moves the van without driving. Use 4× for a quick run.</p>
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
          {log.rows.length === 0 && <p className="muted" style={{margin: 0}}>No tasks timed yet.</p>}
          {log.rows.slice(-8).reverse().map((r, i) => (
            <div key={i} className="spread"><span>{r.p} · {r.task}</span><span className="num muted">{Math.round(r.ms / 1000)} s · {r.outcome}</span></div>
          ))}
          <div className="row wrap">
            <Button label="Export CSV" icon={<Download size={16} />} onClick={exportCsv} isDisabled={!log.rows.length && !Object.keys(log.sus).length} />
            <Button variant="ghost" label="Clear log" icon={<Square size={16} />} onClick={() => confirm('Delete every timed task and survey answer on this device? This cannot be undone.') && save({rows: [], sus: {}})} />
          </div>
        </div>
      )}
    </aside>
  );
}
