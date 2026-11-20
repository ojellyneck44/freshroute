import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '@fontsource-variable/overpass/wght.css';
import './styles/tokens.css';
import './styles/app.css';
import App from './App.jsx';
import Crash from './components/Crash.jsx';

window.__frStarted = true;
// Safari ignores user-scalable=no, so block pinch-zoom here (the app is laid out for each screen size).
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault(), {passive: false});
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Crash>
      <App />
    </Crash>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js');

// A home-screen app resumes instead of relaunching, so it can run an old build for days. On return, load a newer build if one is live (never mid-drive).
if (import.meta.env.PROD) document.addEventListener('visibilitychange', async () => {
  if (document.hidden || location.pathname === '/drive/nav') return;
  const mine = document.querySelector('script[type="module"][src]')?.getAttribute('src');
  const live = await fetch('/', {cache: 'no-store'}).then((r) => r.text()).catch(() => '');
  if (mine && live.includes('/assets/index-') && !live.includes(mine)) location.reload();
});
