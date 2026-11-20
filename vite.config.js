import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: {format: 'es'},
  // Older iPads stay on older Safari: compile down to Safari 15 (iPadOS 15) instead of the newest baseline.
  build: {target: ['es2021', 'safari15', 'chrome100', 'firefox100']},
  server: {proxy: {'/api': 'http://localhost:8788'}},
});
