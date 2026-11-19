// Sunrise and sunset (NOAA approximation, within a few minutes), used to switch to Daylight mode.
const rad = Math.PI / 180;
export function sunTimes(date, lat, lon) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const n = Math.floor((date.getTime() - start) / 86400000);
  const g = ((2 * Math.PI) / 365) * (n - 1);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl)) / rad;
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return {
    sunrise: new Date(midnight + (720 - 4 * (lon + ha) - eqt) * 60000),
    sunset: new Date(midnight + (720 - 4 * (lon - ha) - eqt) * 60000),
  };
}
export function isDaytime(now, lat, lon) {
  const {sunrise, sunset} = sunTimes(now, lat, lon);
  return now >= sunrise && now < sunset;
}
