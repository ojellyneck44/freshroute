// Things that must survive moving between screens but can't be saved: the camera stream,
// the recorder, the motion watcher and the screen wake lock.
import {SegmentRecorder, makeUploader, openFeeds} from './recorder.js';
import {watchMotion} from './motion.js';
import {getState} from './state.js';

export const session = {stream: null, camera: 'front', feeds: null, recorder: null, uploader: null, stopMotion: null, wake: null, motionOk: false};

// camera: one or more cameras joined by commas, e.g. 'front,back' (first is the main picture).
// sound: also record the microphone.
export async function useCamera(camera, sound = true) {
  stopCamera();
  session.camera = camera;
  session.feeds = await openFeeds(camera.split(',').filter(Boolean), sound);
  session.stream = session.feeds.stream;
  return session.feeds;
}
export function stopCamera() {
  session.feeds?.stop();
  session.feeds = null;
  session.stream = null;
}

export async function keepAwake() {
  try {
    session.wake = await navigator.wakeLock?.request('screen');
  } catch {
    /* not supported or denied: the drive still works, the screen may dim */
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && session.wake?.released) keepAwake();
});

// Start recording + motion for an active drive. Returns a stop function.
export function startCapture(drive, onMotion, headingRate) {
  const shared = !String(drive.id).startsWith('local-');
  if (session.stream && !session.recorder) {
    session.uploader = shared ? makeUploader(drive.id, getState().code, session.camera) : null;
    session.recorder = new SegmentRecorder(session.stream, (blob, idx, t0, t1) => session.uploader?.add(blob, idx, t0, t1));
    try {
      session.recorder.start();
    } catch {
      session.recorder = null;
    }
  }
  if (session.motionOk && !session.stopMotion) session.stopMotion = watchMotion(onMotion, headingRate);
}
export function stopCapture() {
  session.recorder?.stop();
  session.recorder = null;
  session.uploader?.stop();
  session.uploader = null;
  session.stopMotion?.();
  session.stopMotion = null;
  stopCamera();
  session.wake?.release?.();
  session.wake = null;
}
