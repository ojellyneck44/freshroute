import {useState} from 'react';
import {Button} from '@astryxdesign/core';
import {Settings, Truck, Plus, FileText} from 'lucide-react';
import {Cold} from '../../components/Glyphs.jsx';
import {useAppState, setState, navigate, vehicleText} from '../../lib/state.js';
import {api} from '../../lib/api.js';
import {clock, clockAmPm, day} from '../../lib/format.js';
import {BANK} from '../../data/stores.js';
import {PARENT, ORDER_LINES, orderLb, isCold} from '../../data/deliveries.js';
import {useDeliveries} from '../bank/Receiving.jsx';

// The food bank truck driver's home: today's deliveries to pantries, each one a single tap to start.
// Prototype: a food bank driver joins with the pantry's code, so they see that pantry's deliveries.
export default function Haul() {
  const profile = useAppState((s) => s.profile);
  const lastReport = useAppState((s) => s.lastReport);
  const [list, reload] = useDeliveries(10000);
  const [busy, setBusy] = useState(false);
  const open = (list || []).filter((x) => !x.receipt).sort((a, b) => a.windowStart - b.windowStart);

  // For solo testing: a delivery whose window is open now, with the sample invoice.
  const practice = async () => {
    setBusy(true);
    const start = new Date();
    start.setMinutes(0, 0, 0);
    await api('deliveries', {method: 'POST', body: {order: `PRACTICE-${String(start.getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}`, windowStart: start.getTime(), windowEnd: start.getTime() + 2 * 3600000, truck: vehicleText(profile.van, profile.plate), lines: ORDER_LINES, practice: true}}).catch(() => {});
    setBusy(false);
    reload();
  };

  return (
    <main className="center-page" tabIndex={-1}>
      <div className="form" style={{width: 'min(var(--size-content), 100%)'}}>
        <div className="spread">
          <div>
            <div className="label">{profile.name ? `${profile.name.split(' ')[0]} · ${profile.van}` : profile.van} · {PARENT.name}</div>
            <h1>Deliveries</h1>
          </div>
          <Button variant="ghost" isIconOnly label="Preferences" icon={<Settings size={20} />} onClick={() => navigate('/drive/prefs')} />
        </div>
        <p className="muted" style={{margin: 0}}>Start a delivery when you leave the warehouse. The pantry sees your live arrival time and gets a heads-up as you get close.</p>

        {list === null && <p className="muted" aria-busy="true">Loading deliveries…</p>}
        {list && open.length === 0 && (
          <div className="empty">
            <h2 className="as-h3">No deliveries waiting</h2>
            <p>Pantries add their orders on their Incoming screen. For a test run, add a practice delivery with the sample invoice.</p>
            <Button variant="primary" label="Add a practice delivery" icon={<Plus size={18} />} isLoading={busy} onClick={practice} />
          </div>
        )}
        {open.map((x) => {
          const cold = (x.lines || []).filter(isCold).length;
          const lb = orderLb(x.lines || []);
          const isToday = new Date(x.windowStart).toDateString() === new Date().toDateString();
          return (
            <article key={x.id} className="panel stack">
              <div className="spread wrap">
                <div>
                  <div className="store-name">{BANK.name}</div>
                  <div className="muted">{BANK.address}</div>
                </div>
                <span className="chip">{isToday ? 'Today' : day(x.windowStart)} {clock(x.windowStart)} to {clockAmPm(x.windowEnd)}</span>
              </div>
              <div className="row wrap" style={{gap: 'var(--space-xs)'}}>
                <span className="chip">Order {x.order}</span>
                {x.addedBy?.name && <span className="chip">Added by {x.addedBy.name}</span>}
                {x.lines?.length > 0 && <span className="chip">{x.lines.length} lines{lb ? `, ${lb.toLocaleString()} lb` : ''}</span>}
                {cold > 0 && <span className="chip frost"><Cold size={14} />{cold} cold or frozen</span>}
                {x.driveId && <span className="chip apricot">Started earlier</span>}
              </div>
              <div><Button variant="primary" size="lg" label="Start delivery" icon={<Truck size={18} />} onClick={() => (setState({haul: x.id}), navigate('/drive/check'))} /></div>
            </article>
          );
        })}
        {list && open.length > 0 && <Button variant="ghost" label="Add a practice delivery" icon={<Plus size={18} />} isLoading={busy} onClick={practice} />}
        {lastReport && <div><Button variant="ghost" label="Last delivery report" icon={<FileText size={18} />} onClick={() => navigate(`/drive/report/${lastReport}`)} /></div>}
      </div>
    </main>
  );
}
