import {lazy, Suspense, useEffect} from 'react';
import {Theme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {useAppState, usePath, navigate} from './lib/state.js';
import {useTheme} from './lib/theme.js';
import {Facilitator, useTestMode} from './components/TestMode.jsx';
import Welcome from './screens/Welcome.jsx';

// After a deploy, an open tab may ask for screen files that no longer exist: reload once to get the new ones.
const load = (f) =>
  lazy(() =>
    f().catch((e) => {
      if (sessionStorage.getItem('freshroute:reloaded')) throw e;
      sessionStorage.setItem('freshroute:reloaded', '1');
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

const TITLES = {
  '/': 'FreshRoute',
  '/setup': 'Set up · FreshRoute',
  '/drive': 'Plan pickups · FreshRoute',
  '/drive/check': 'Before you drive · FreshRoute',
  '/drive/nav': 'Navigation · FreshRoute',
  '/drive/prefs': 'Preferences · FreshRoute',
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
    document.title = TITLES[path] || (path.startsWith('/s/') ? 'Pickup ETA · FreshRoute' : path.includes('report') ? 'Drive report · FreshRoute' : 'FreshRoute');
    document.querySelector('main, [data-screen]')?.focus?.({preventScroll: true});
  }, [path]);

  // Send people to where they belong (a store link never needs an account).
  useEffect(() => {
    if (path.startsWith('/s/')) return;
    if (!role && path !== '/') navigate('/', {replace: true});
    else if (role === 'driver' && driveId && (path === '/' || path === '/drive')) navigate('/drive/nav', {replace: true});
    else if (role === 'driver' && !consent && path !== '/setup') navigate('/setup', {replace: true});
    else if (role === 'driver' && path === '/') navigate('/drive', {replace: true});
    else if (role === 'bank' && path === '/') navigate('/bank', {replace: true});
  }, [path, role, driveId, consent]);

  let screen;
  if (path.startsWith('/s/')) screen = <StoreLink path={path} />;
  else if (path === '/') screen = <Welcome />;
  else if (path === '/setup') screen = <Setup />;
  else if (path === '/drive') screen = <Plan />;
  else if (path === '/drive/check') screen = <Check />;
  else if (path === '/drive/nav') screen = <Navigate />;
  else if (path === '/drive/prefs') screen = <Prefs />;
  else if (path.startsWith('/drive/report/')) screen = <ReportPage id={path.split('/')[3]} back="/drive" />;
  else if (path.startsWith('/bank')) screen = <Bank path={path} />;
  else screen = <Welcome />;

  return (
    <Theme theme={neutralTheme} mode={mode}>
      <Suspense fallback={<div className="center-page muted" aria-busy="true">Loading…</div>}>{screen}</Suspense>
      <Facilitator />
    </Theme>
  );
}
