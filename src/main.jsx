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
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Crash>
      <App />
    </Crash>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js');
