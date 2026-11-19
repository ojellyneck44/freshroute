// Records the drive camera in self-contained segments so the food bank can watch "near live":
// each segment is a complete file (a fresh MediaRecorder per segment), uploaded as soon as it closes.
export const SEGMENT_MS = 10000;

export function pickMime() {
  const options = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return options.find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || '';
}

export async function listCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput');
  } catch {
    return [];
  }
}

// camera: 'back' | 'front' | a deviceId (USB-C cameras show up as their own device)
export async function openCamera(camera = 'back') {
  const video = {width: {ideal: 1280}, height: {ideal: 720}, frameRate: {ideal: 24, max: 30}};
  if (camera === 'back') video.facingMode = {ideal: 'environment'};
  else if (camera === 'front') video.facingMode = 'user';
  else video.deviceId = {exact: camera};
  // Audio stays off: recording conversations can need everyone's consent (two-party consent states).
  return navigator.mediaDevices.getUserMedia({video, audio: false});
}

export class SegmentRecorder {
  constructor(stream, onSegment) {
    this.stream = stream;
    this.onSegment = onSegment;
    this.mime = pickMime();
    this.idx = 0;
    this.running = false;
  }
  start() {
    if (!this.mime) throw new Error('This browser cannot record video');
    this.running = true;
    this.next();
  }
  next() {
    if (!this.running) return;
    const rec = new MediaRecorder(this.stream, {mimeType: this.mime, videoBitsPerSecond: 900_000});
    const chunks = [];
    const t0 = Date.now();
    const idx = this.idx++;
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      if (chunks.length) this.onSegment(new Blob(chunks, {type: this.mime.split(';')[0]}), idx, t0, Date.now());
    };
    rec.start();
    this.current = rec;
    this.timer = setTimeout(() => {
      if (rec.state !== 'inactive') rec.stop();
      this.next();
    }, SEGMENT_MS);
  }
  stop() {
    this.running = false;
    clearTimeout(this.timer);
    if (this.current && this.current.state !== 'inactive') this.current.stop();
  }
}

// Uploads segments in order; keeps failed ones in memory and retries.
// shortcut: failed segments live in memory only, so closing the tab loses them; move to IndexedDB before launch.
export function makeUploader(driveId, code, cam) {
  const waiting = [];
  let busy = false;
  const put = async ({blob, idx, t0, t1}) => {
    const res = await fetch(`/api/drives/${driveId}/video/${idx}`, {
      method: 'PUT',
      headers: {'content-type': blob.type, 'x-bank-code': code, 'x-t0': String(t0), 'x-t1': String(t1), 'x-cam': cam},
      body: blob,
    });
    if (!res.ok) throw new Error('upload failed');
  };
  const pump = async () => {
    if (busy) return;
    busy = true;
    while (waiting.length && navigator.onLine) {
      try {
        await put(waiting[0]);
        waiting.shift();
      } catch {
        break;
      }
    }
    busy = false;
  };
  const timer = setInterval(pump, 10000);
  return {
    add(blob, idx, t0, t1) {
      waiting.push({blob, idx, t0, t1});
      pump();
    },
    pending: () => waiting.length,
    stop: () => clearInterval(timer),
  };
}
