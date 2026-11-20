// Records the drive camera in self-contained segments so the food bank can watch "near live":
// each segment is a complete file (a fresh MediaRecorder per segment), uploaded as soon as it closes.
export const SEGMENT_MS = 10000;

export function pickMime(audio = false) {
  const options = audio
    ? ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
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
  return navigator.mediaDevices.getUserMedia({video, audio: false});
}

// Several cameras become one recording: the first is the main picture, the second an inset
// (picture in picture). Feeds the device can't run together are dropped and reported.
// shortcut: iPad Safari runs one camera at a time (opening a second one pauses the first), so there
// it records the first camera only; a native app (AVCaptureMultiCamSession) can record both.
export async function openFeeds(cameras, sound) {
  const feeds = [];
  const dropped = [];
  for (const camera of cameras) {
    try {
      feeds.push({camera, stream: await openCamera(camera)});
    } catch {
      dropped.push(camera);
    }
  }
  await new Promise((r) => setTimeout(r, 400)); // a camera paused by the next one reports muted shortly after
  for (const f of [...feeds]) {
    const t = f.stream.getVideoTracks()[0];
    if (feeds.length > 1 && (!t || t.readyState !== 'live' || t.muted)) {
      f.stream.getTracks().forEach((x) => x.stop());
      feeds.splice(feeds.indexOf(f), 1);
      dropped.push(f.camera);
    }
  }
  if (!feeds.length) throw Object.assign(new Error('No camera could start'), {name: 'NotFoundError'});
  let mic = null;
  if (sound) mic = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}, video: false}).catch(() => null);
  const pip = feeds.length > 1 ? compose(feeds.map((f) => f.stream)) : null;
  const video = pip ? pip.stream.getVideoTracks() : feeds[0].stream.getVideoTracks();
  const stream = new MediaStream([...video, ...(mic?.getAudioTracks() || [])]);
  const stop = () => {
    pip?.stop();
    feeds.forEach((f) => f.stream.getTracks().forEach((t) => t.stop()));
    mic?.getTracks().forEach((t) => t.stop());
  };
  return {stream, cameras: feeds.map((f) => f.camera), dropped, sound: !!mic, stop};
}

// Draws the main feed full frame and the second as an inset, bottom right.
function compose(streams) {
  const W = 1280, H = 720, INSET = 0.3, PAD = 24;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const vids = streams.map((s) => {
    const v = Object.assign(document.createElement('video'), {srcObject: s, muted: true, playsInline: true, autoplay: true});
    v.setAttribute('playsinline', '');
    v.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.append(v); // iOS only decodes frames for videos in the document
    v.play().catch(() => {});
    return v;
  });
  const cover = (v, x, y, w, h) => {
    const r = Math.max(w / (v.videoWidth || w), h / (v.videoHeight || h));
    const sw = w / r, sh = h / r;
    ctx.drawImage(v, ((v.videoWidth || w) - sw) / 2, ((v.videoHeight || h) - sh) / 2, sw, sh, x, y, w, h);
  };
  const timer = setInterval(() => {
    if (vids[0].readyState >= 2) cover(vids[0], 0, 0, W, H);
    if (vids[1]?.readyState >= 2) {
      const w = W * INSET, h = H * INSET, x = W - w - PAD, y = H - h - PAD;
      ctx.fillStyle = 'white';
      ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
      cover(vids[1], x, y, w, h);
    }
  }, 1000 / 24);
  return {stream: canvas.captureStream(24), stop: () => (clearInterval(timer), vids.forEach((v) => v.remove()))};
}

export class SegmentRecorder {
  constructor(stream, onSegment) {
    this.stream = stream;
    this.onSegment = onSegment;
    this.mime = pickMime(stream.getAudioTracks().length > 0);
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
    const rec = new MediaRecorder(this.stream, {mimeType: this.mime, videoBitsPerSecond: 900_000, audioBitsPerSecond: 64_000});
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
