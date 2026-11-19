import {getState} from './state.js';

// Thin client for /api. Writes that fail (offline, tunnel, dead zone) wait in a queue and retry.
const QKEY = 'freshroute:queue';
let queue = [];
try {
  queue = JSON.parse(localStorage.getItem(QKEY) || '[]');
} catch {
  queue = [];
}
const saveQueue = () => {
  try {
    localStorage.setItem(QKEY, JSON.stringify(queue.slice(-2000)));
  } catch {
    /* storage full: keep in memory */
  }
};

export async function api(path, {method = 'GET', body, code} = {}) {
  const res = await fetch('/api/' + path, {
    method,
    headers: {'content-type': 'application/json', 'x-bank-code': code || getState().code},
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), {status: res.status});
  return data;
}

// Fire-and-forget write that survives losing signal.
export function send(path, body, method = 'POST') {
  queue.push({path, body, method});
  saveQueue();
  flush();
}
let flushing = false;
export async function flush() {
  if (flushing || !queue.length || !navigator.onLine) return;
  flushing = true;
  try {
    while (queue.length) {
      const job = queue[0];
      try {
        await api(job.path, {method: job.method, body: job.body});
      } catch (e) {
        if (!e.status || e.status >= 500) break; // network or server: try again later
        // 4xx will never succeed: drop it
      }
      queue.shift();
      saveQueue();
    }
  } finally {
    flushing = false;
  }
}
addEventListener('online', flush);
setInterval(flush, 15000);
export const pending = () => queue.length;

export const videoUrl = (key) => `/api/video/${key}?code=${encodeURIComponent(getState().code)}`;
