// Turns the iPad's accelerometer into three driving markers: hard brake, sharp turn, bump.
// Thresholds are starting values for user testing (DESIGN.md, unresolved).
export const THRESH = {brake: 0.45, turn: 0.4, bump: 0.5};
const G = 9.81;

export async function askMotionPermission() {
  const DME = window.DeviceMotionEvent;
  if (!DME) return 'unsupported';
  if (typeof DME.requestPermission === 'function') {
    try {
      return (await DME.requestPermission()) === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }
  return 'granted'; // Android and desktop browsers don't ask
}

// headingRate(): degrees per second from GPS, used to tell a turn from a brake.
export function watchMotion(onEvent, headingRate = () => 0) {
  let grav = null;
  const last = {brake: 0, turn: 0, bump: 0};
  const handler = (e) => {
    const ag = e.accelerationIncludingGravity;
    if (!ag || ag.x == null) return;
    const v = [ag.x, ag.y, ag.z];
    grav = grav ? grav.map((g, i) => g * 0.9 + v[i] * 0.1) : v;
    const lin = v.map((x, i) => x - grav[i]);
    const gl = Math.hypot(...grav) || G;
    const vert = Math.abs(lin.reduce((s, x, i) => s + x * grav[i], 0) / gl) / G;
    const total = Math.hypot(...lin) / G;
    const horiz = Math.sqrt(Math.max(0, total * total - vert * vert));
    const now = Date.now();
    const fire = (kind, g) => {
      if (now - last[kind] < 4000) return;
      last[kind] = now;
      onEvent({t: now, kind, g: Math.round(g * 100) / 100});
    };
    if (vert >= THRESH.bump) fire('bump', vert);
    else if (horiz >= THRESH.turn && Math.abs(headingRate()) > 12) fire('turn', horiz);
    else if (horiz >= THRESH.brake) fire('brake', horiz);
  };
  addEventListener('devicemotion', handler);
  return () => removeEventListener('devicemotion', handler);
}

export const motionLabel = {brake: 'Hard brake', turn: 'Sharp turn', bump: 'Bump'};
