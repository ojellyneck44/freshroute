import {holdToToggle} from './TestMode.jsx';
// FreshRoute's own glyphs (style sheet, iconography): drawn on a 48 grid, coloured by meaning.
const G = ({children, size = 24, color, label}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    {children}
  </svg>
);
export const Brake = (p) => <G color="var(--fr-apricot)" {...p}><path d="M6 24h22" /><path d="M22 16l8 8-8 8" /><path d="M38 10v28" strokeWidth="5" /></G>;
export const Turn = (p) => <G color="var(--fr-apricot)" {...p}><path d="M12 40V26a12 12 0 0 1 12-12h12" /><path d="M30 8l6 6-6 6" /><path d="M6 20c-2 4-2 10 0 14" /></G>;
export const Bump = (p) => <G color="var(--fr-apricot)" {...p}><path d="M4 34h10c4 0 5-10 10-10s6 10 10 10h10" /><path d="M24 8v8M18 12l6-4 6 4" /></G>;
export const Cold = (p) => <G color="var(--fr-frost)" {...p}><path d="M15 4v22M5 9l20 12M5 21l20-12" /><circle cx="36" cy="36" r="9" /><path d="M36 31v5l3 2" /></G>;
export const Rec = (p) => <G color="var(--fr-tomato)" {...p}><rect x="4" y="12" width="28" height="24" rx="5" /><path d="M32 20l12-6v20l-12-6" /><circle cx="18" cy="24" r="5" fill="var(--fr-tomato)" stroke="none" /></G>;
export const MOTION_GLYPH = {brake: Brake, turn: Turn, bump: Bump};

export const Mark = ({size = 40}) => <img src="/icons/mark.svg" width={size} height={size} alt="" />;
export const Wordmark = ({size = 32}) => (
  <span className="wordmark" {...holdToToggle()}><img src="/icons/icon-small.svg" width={size} height={size} alt="" style={{borderRadius: size * 0.22}} />FreshRoute</span>
);
