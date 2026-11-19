import {Check, Clock, AlertCircle} from 'lucide-react';
import {clock, etaState} from '../lib/format.js';

const COLOR = {'on-time': 'var(--fr-sprout)', slipping: 'var(--fr-apricot)', late: 'var(--fr-tomato)', unknown: 'var(--fr-text-3)'};
const GLYPH = {'on-time': Check, slipping: Clock, late: AlertCircle, unknown: Clock};

/** The ETA ring: forecast in the middle, fill = share of the drive done, colour + glyph + word = state. */
export default function Ring({forecast, promise, progress = 0, size = 160, stroke = 10, timeSize = 38}) {
  const st = etaState(forecast, promise);
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const Glyph = GLYPH[st.key];
  return (
    <div className="ring" style={{width: size, height: size}} role="img" aria-label={`Arriving ${clock(forecast)}. ${st.label}${st.delta > 0 ? `, ${st.delta} minutes behind the ${clock(promise)} promise` : ''}.`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fr-line-strong)" strokeWidth={stroke} />
        <circle className="fill" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLOR[st.key]} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0.02, Math.min(1, progress)))} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{textAlign: 'center'}}>
        <div className="ring-time" style={{fontSize: timeSize}}>{clock(forecast)}</div>
        <div className="ring-state" style={{color: COLOR[st.key]}}><Glyph size={14} strokeWidth={2.5} aria-hidden="true" />{st.label}</div>
      </div>
    </div>
  );
}
