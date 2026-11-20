import {useEffect, useState} from 'react';
import {Button, Banner} from '@astryxdesign/core';
import {Truck, CheckCircle2} from 'lucide-react';
import {Wordmark} from '../components/Glyphs.jsx';
import {clock, clockAmPm, etaState} from '../lib/format.js';

// S1: the page a grocery store opens from a text. No account. Only ETA, what's coming, and "ready".
export default function StoreLink({path}) {
  const [, , driveId, storeId] = path.split('/');
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () =>
    fetch(`/api/link/${driveId}/${storeId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 404 ? 'This pickup link has expired or is not valid.' : 'Could not load the pickup.'))))
      .then((x) => (setD(x), setErr(null)))
      .catch((e) => setErr(e.message));
  useEffect(() => {
    // Store links are private to one pickup: keep them out of search results.
    const m = Object.assign(document.createElement('meta'), {name: 'robots', content: 'noindex, nofollow'});
    document.head.appendChild(m);
    load();
    const t = setInterval(load, 15000);
    return () => (clearInterval(t), m.remove());
  }, []);
  const ready = async (v) => {
    setBusy(true);
    await fetch(`/api/link/${driveId}/${storeId}`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({ready: v})}).catch(() => {});
    await load();
    setBusy(false);
  };
  const s = d?.stop;
  const st = s && etaState(s.etaAt, s.promiseAt);
  return (
    <main className="storelink" tabIndex={-1}>
      <div className="inner">
        <Wordmark size={28} />
        {err && <div className="stack"><h1>That pickup link doesn't work</h1><p className="muted" style={{margin: 0}}>{err} Ask the driver or the food bank to send a new one.</p></div>}
        {!d && !err && <p className="muted" aria-busy="true">Loading pickup…</p>}
        {s && (
          <>
            <div className="stack" style={{gap: 'var(--space-2xs)'}}>
              <div className="label">Donation pickup at {s.name}, {s.address}</div>
              {s.arrivedAt ? (
                <h1 className="eta-hero" style={{fontSize: 'var(--fs-numeral)'}}>The driver is here</h1>
              ) : d.status === 'delivered' ? (
                <h1 style={{fontSize: 'var(--fs-numeral)'}}>This pickup is finished. Thank you.</h1>
              ) : (
                <>
                  <div className="eta-hero" aria-live="polite">{clock(s.etaAt)}</div>
                  <div className="big-delta" style={{color: st.key === 'on-time' ? 'var(--fr-sprout)' : 'var(--fr-apricot)'}}>
                    {st.key === 'on-time' ? `On time for the ${clockAmPm(s.promiseAt)} pickup` : `About ${st.delta} min later than ${clockAmPm(s.promiseAt)}`}
                  </div>
                </>
              )}
              <div className="row muted" style={{marginTop: 'var(--space-sm)'}}><Truck size={18} aria-hidden="true" />{d.van} from {d.bankName}{d.driverFirst ? `, driven by ${d.driverFirst}` : ''}</div>
              {d.updated && <div className="faint" style={{fontSize: 'var(--fs-sub)'}}>Updated {clockAmPm(d.updated)}. This page refreshes on its own.</div>}
            </div>
            <section className="panel stack">
              <h2>What they're picking up</h2>
              <table className="table">
                <thead><tr><th>Item</th><th>Amount</th><th>Storage</th></tr></thead>
                <tbody>{s.items.map((it) => <tr key={it.name}><td>{it.name}<div className="muted" style={{fontSize: 'var(--fs-sub)'}}>{it.pack}</div></td><td className="num">{it.qty}</td><td>{it.storage === 'cold' ? 'Chilled' : it.storage === 'frozen' ? 'Frozen' : it.storage === 'cool' ? 'Cool, dry' : 'Dry'}</td></tr>)}</tbody>
              </table>
            </section>
            {!s.arrivedAt && d.status !== 'delivered' && (
              d.ready ? (
                <div className="stack">
                  <Banner status="success" title="Marked ready at the dock" description="The driver and the food bank can see this." icon={<CheckCircle2 size={20} />} />
                  <Button variant="ghost" label="Not ready after all" isLoading={busy} onClick={() => ready(false)} />
                </div>
              ) : (
                <Button variant="primary" size="lg" label="Donations are ready at the dock" isLoading={busy} onClick={() => ready(true)} />
              )
            )}
            <p className="faint" style={{fontSize: 'var(--fs-sub)', margin: 0}}>You got this link because {d.bankName} is picking up donations from your store. No account needed.</p>
          </>
        )}
      </div>
    </main>
  );
}
