import {MotionConfig} from 'motion/react';
import {lazy, Suspense, useEffect} from 'react';
import {Theme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {useAppState, usePath, navigate, homeFor, drives} from './lib/state.js';
import {useTheme} from './lib/theme.js';
import {Facilitator, useTestMode} from './components/TestMode.jsx';
import Welcome from './screens/Welcome.jsx';
import MoreBelow from './components/MoreBelow.jsx';

// After a deploy, an open tab may ask for screen files that no longer exist: reload once to get the new ones.
const load = (f) =>
  lazy(() =>
    f().catch((e) => {
      const last = Number(sessionStorage.getItem('freshroute:reloaded') || 0);
      if (Date.now() - last < 30000) throw e; // already tried just now: don't loop
      sessionStorage.setItem('freshroute:reloaded', String(Date.now()));
      location.reload();
      return new Promise(() => {});
    }),
  );
const Setup = load(() => import('./screens/driver/Setup.jsx'));
const Plan = load(() => import('./screens/driver/Plan.jsx'));
const Check = load(() => import('./screens/driver/Check.jsx'));
const Navigate = load(() => import('./screens/driver/Navigate.jsx'));
const Prefs = load(() => import('./screens/driver/Prefs.jsx'));
const ReportPage = load(() => import('./screens/Report.jsx'));
const Bank = load(() => import('./screens/bank/Bank.jsx'));
const StoreLink = load(() => import('./screens/StoreLink.jsx'));
const Haul = load(() => import('./screens/driver/Haul.jsx'));

const TITLES = {
  '/': 'FreshRoute',
  '/setup': 'Set up · FreshRoute',
  '/drive': 'Plan pickups · FreshRoute',
  '/drive/check': 'Before you drive · FreshRoute',
  '/drive/nav': 'Navigation · FreshRoute',
  '/drive/prefs': 'Preferences · FreshRoute',
  '/haul': 'Deliveries · FreshRoute',
  '/bank': 'Trucks on the road · FreshRoute',
  '/bank/reports': 'Drive reports · FreshRoute',
  '/bank/stores': 'Stores · FreshRoute',
};

export default function App() {
  const full = usePath();
  const path = full.split('?')[0];
  const mode = useTheme();
  const role = useAppState((s) => s.role);
  const driveId = useAppState((s) => s.driveId);
  const consent = useAppState((s) => s.profile.consent);
  useTestMode();

  useEffect(() => {
    document.title = TITLES[path] || (path.startsWith('/s/') ? 'Pickup ETA · FreshRoute' : path.includes('report') ? 'Drive report · FreshRoute' : path.startsWith('/bank/truck') ? 'Live truck · FreshRoute' : 'FreshRoute');
    document.querySelector('main, [data-screen]')?.focus?.({preventScroll: true});
  }, [path]);

  // Send people to where they belong (a store link never needs an account).
  useEffect(() => {
    if (path.startsWith('/s/')) return;
    if (!role && path !== '/') navigate('/', {replace: true});
    else if (drives(role) && driveId && (path === '/' || path === homeFor(role))) navigate('/drive/nav', {replace: true});
    else if (drives(role) && !consent && path !== '/setup') navigate('/setup', {replace: true});
    else if (role && path === '/') navigate(homeFor(role), {replace: true});
  }, [path, role, driveId, consent]);

  let screen;
  if (path.startsWith('/s/')) screen = <StoreLink path={path} />;
  else if (path === '/') screen = <Welcome />;
  else if (path === '/setup') screen = <Setup />;
  else if (path === '/drive') screen = <Plan />;
  else if (path === '/drive/check') screen = <Check />;
  else if (path === '/drive/nav') screen = <Navigate />;
  else if (path === '/drive/prefs') screen = <Prefs />;
  else if (path === '/haul') screen = <Haul />;
  else if (path.startsWith('/drive/report/')) screen = <ReportPage id={path.split('/')[3]} back={homeFor(role)} />;
  else if (path.startsWith('/bank')) screen = <Bank path={path} />;
  else screen = <Welcome />;

  return (
    <Theme theme={neutralTheme} mode={mode}>
      <MotionConfig reducedMotion="user" transition={{type: 'spring', stiffness: 420, damping: 34}}>
      <Suspense fallback={<div className="center-page muted" aria-busy="true">Loading…</div>}>{screen}</Suspense>
      </MotionConfig>
      <MoreBelow />
      <Facilitator />
    </Theme>
  );
}
