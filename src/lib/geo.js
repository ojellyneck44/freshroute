const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

export function distance(a, b) {
  const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function bearing(a, b) {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Cumulative distance along a [lon, lat] polyline.
export function cumulative(coords) {
  const out = [0];
  for (let i = 1; i < coords.length; i++) out.push(out[i - 1] + distance(coords[i - 1], coords[i]));
  return out;
}

// Where a point sits along the line: distance from the start and how far off the line it is.
// `from` limits the search to the segment window ahead of the last known index, so loops don't jump back.
export function project(coords, cum, p, from = 0) {
  let best = {along: 0, off: Infinity, i: from};
  const cosLat = Math.cos(rad(p[1]));
  const end = Math.min(coords.length - 1, from + 400);
  for (let i = Math.max(0, from); i < end; i++) {
    const a = coords[i], b = coords[i + 1];
    const ax = (a[0] - p[0]) * cosLat, ay = a[1] - p[1];
    const bx = (b[0] - p[0]) * cosLat, by = b[1] - p[1];
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
    const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const off = distance(p, q);
    if (off < best.off) best = {along: cum[i] + (cum[i + 1] - cum[i]) * t, off, i};
  }
  return best;
}

// Point at a given distance along the line, with its heading.
export function pointAt(coords, cum, d) {
  if (d <= 0) return {p: coords[0], hdg: bearing(coords[0], coords[1] || coords[0]), i: 0};
  let i = cum.findIndex((c) => c >= d);
  if (i === -1) return {p: coords[coords.length - 1], hdg: bearing(coords[coords.length - 2], coords[coords.length - 1]), i: coords.length - 1};
  i = Math.max(1, i);
  const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  const a = coords[i - 1], b = coords[i];
  return {p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], hdg: bearing(a, b), i: i - 1};
}
