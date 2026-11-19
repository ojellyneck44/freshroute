// Driving routes from the public OSRM demo server (free and open; fine for a prototype,
// shortcut: demo server has no SLA and asks for light use, self-host OSRM or use a paid router before launch).
const BASE = 'https://router.project-osrm.org/route/v1/driving/';

export async function route(points) {
  const coords = points.map((p) => `${p.lon.toFixed(5)},${p.lat.toFixed(5)}`).join(';');
  const res = await fetch(`${BASE}${coords}?overview=full&geometries=geojson&steps=true`);
  if (!res.ok) throw new Error('Routing is unavailable right now');
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No driving route found between these stops');
  const r = data.routes[0];
  return {
    coords: r.geometry.coordinates,
    distance: r.distance,
    duration: r.duration,
    legs: r.legs.map((l) => ({
      distance: l.distance,
      duration: l.duration,
      steps: l.steps.map((s) => ({
        name: s.name || s.ref || '',
        type: s.maneuver.type,
        modifier: s.maneuver.modifier || '',
        at: s.maneuver.location,
        distance: s.distance,
      })),
    })),
  };
}

export function instruction(step) {
  if (!step) return '';
  const road = step.name ? ` onto ${step.name}` : '';
  const m = step.modifier;
  switch (step.type) {
    case 'depart': return `Head out${step.name ? ` on ${step.name}` : ''}`;
    case 'arrive': return 'Arrive at the stop';
    case 'roundabout':
    case 'rotary': return `Take the roundabout${road}`;
    case 'merge': return `Merge${road}`;
    case 'on ramp': return `Take the ramp${road}`;
    case 'off ramp': return `Take the exit${road}`;
    case 'fork': return `Keep ${m.includes('left') ? 'left' : 'right'}${road}`;
    case 'continue':
    case 'new name': return `Continue${road}`;
    case 'end of road':
    case 'turn':
    default:
      if (m === 'straight') return `Continue straight${road}`;
      if (m === 'uturn') return 'Make a U-turn';
      return `${m.startsWith('slight') ? 'Bear' : m.startsWith('sharp') ? 'Turn sharp' : 'Turn'} ${m.replace(/^(slight|sharp) /, '')}${road}`;
  }
}
