import {useEffect, useMemo, useRef, useState} from 'react';
import {videoUrl} from '../lib/api.js';
import {clock} from '../lib/format.js';
import {motionLabel} from '../lib/motion.js';
import {Volume2, VolumeX} from 'lucide-react';

const TICK = {motion: 'var(--fr-apricot)', arrived: 'var(--fr-sprout)', loaded: 'var(--fr-sprout)', skipped: 'var(--fr-text-3)', delivered: 'var(--fr-sprout)', 'arrived-bank': 'var(--fr-sprout)', delay: 'var(--fr-apricot)', reason: 'var(--fr-apricot)', 'store-ready': 'var(--fr-frost)'};
export const eventText = (e) => {
  const d = e.data || {};
  switch (e.kind) {
    case 'motion': return `${motionLabel[d.kind] || 'Movement'} ${d.g ? `${d.g}g` : ''}`.trim();
    case 'arrived': return `Arrived at ${d.name}`;
    case 'loaded': return `Loaded at ${d.name}${d.cold ? ', cold timer started' : ''}`;
    case 'skipped': return `Skipped ${d.name}: ${d.reason}`;
    case 'delay': return `${d.reason}, about ${d.minutes} min`;
    case 'reason': return `Driver: ${d.reason}`;
    case 'arrived-bank': return 'Arrived at the food bank';
    case 'delivered': return 'Drive finished';
    case 'store-ready': return d.ready ? 'Store marked donations ready' : 'Store marked not ready';
    case 'gap': return `FreshRoute was in the background for ${Math.max(1, Math.round((d.ms || 0) / 1000))} s, so nothing was recorded`;
    case 'gap-start': return 'App in background: recording paused';
    case 'gap-end': return 'Recording resumed';
    case 'reroute': return 'New route after leaving the planned one';
    default: return e.kind;
  }
};

/**
 * Plays a drive's video segments as one timeline, Ring-style: scrub bar with event ticks.
 * live: keeps jumping to the newest segment (the manager's near-live view).
 */
export default function Footage({segments = [], events = [], start, end, live = false, seekTo, noCamera = false}) {
  const [muted, setMuted] = useState(true); // autoplay needs muted; the viewer turns sound on
  const v = useRef(null);
  const pendingSeek = useRef(0);
  const [i, setI] = useState(0);
  const [t, setT] = useState(start);
  const segs = useMemo(() => segments.map((s) => ({...s, t0: Number(s.t0), t1: Number(s.t1)})).filter((s) => s.t0), [segments]);
  const span = Math.max(1, (end || Date.now()) - start);
  const pct = (x) => `${Math.max(0, Math.min(100, ((x - start) / span) * 100))}%`;

  // Live: follow the newest segment.
  useEffect(() => {
    if (live && segs.length && i < segs.length - 2) setI(segs.length - 2 >= 0 ? segs.length - 2 : 0);
  }, [live, segs.length]);
  useEffect(() => {
    if (seekTo) jump(seekTo.t);
  }, [seekTo]);

  const cur = segs[i];
  const jump = (time) => {
    const k = segs.findIndex((s) => time >= s.t0 && time < s.t1);
    const idx = k === -1 ? segs.findIndex((s) => s.t0 > time) : k;
    if (idx === -1) return;
    const off = Math.max(0, (time - segs[idx].t0) / 1000);
    if (idx === i && v.current) v.current.currentTime = off;
    else {
      pendingSeek.current = off;
      setI(idx);
    }
  };
  const gaps = [];
  let open = null;
  for (const e of events) {
    if (e.kind === 'gap-start') open = e.t;
    if (e.kind === 'gap-end' && open) (gaps.push([open, e.t]), (open = null));
  }

  if (!segs.length)
    return (
      <div className="video" style={{display: 'grid', placeItems: 'center'}}>
        <p className="muted" style={{textAlign: 'center', padding: 'var(--space-xl)', margin: 0}}>
          {noCamera ? 'This drive has no camera, so there is no video.' : live ? 'Waiting for the first video segment. Video arrives in 10-second pieces, so it runs a little behind live.' : 'No video for this drive. The camera was off or the footage has not uploaded yet.'}
        </p>
      </div>
    );

  return (
    <div className="stack" style={{gap: 'var(--space-sm)'}}>
      <div className="video">
        <video
          ref={v}
          key={cur?.key}
          src={cur ? videoUrl(cur.key) : undefined}
          controls={!live}
          autoPlay
          muted={muted}
          playsInline
          aria-label={`Drive video, ${clock(cur?.t0)}`}
          onLoadedMetadata={(e) => {
            if (pendingSeek.current) e.currentTarget.currentTime = pendingSeek.current;
            pendingSeek.current = 0;
          }}
          onTimeUpdate={(e) => setT(cur.t0 + e.currentTarget.currentTime * 1000)}
          onEnded={() => setI((x) => Math.min(segs.length - 1, x + 1))}
        />
        <button className="rec vidsound" onClick={() => setMuted((m) => !m)} aria-pressed={!muted} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}>{muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}{muted ? 'Sound off' : 'Sound on'}</button>
        <span className="rec live">{live ? <><i aria-hidden="true" />Live · {clock(cur?.t1)}</> : clock(t)}</span>
      </div>
      {!live && (
        <div className="scrub">
          <div className="track" />
          {gaps.map(([a, b], k) => <div key={k} className="gap" style={{left: pct(a), width: `calc(${pct(b)} - ${pct(a)})`}} title="Recording gap" />)}
          {events.filter((e) => TICK[e.kind]).map((e, k) => (
            <button key={k} className="tick" style={{left: pct(e.t), '--tick': TICK[e.kind]}} onClick={() => jump(e.t - 3000)} aria-label={`${eventText(e)} at ${clock(e.t)}`} title={`${clock(e.t)} ${eventText(e)}`} />
          ))}
          <div className="head" style={{left: pct(t)}} />
          <input type="range" min={start} max={start + span} value={t} onChange={(e) => jump(Number(e.target.value))} aria-label="Scrub through the drive" />
        </div>
      )}
    </div>
  );
}
