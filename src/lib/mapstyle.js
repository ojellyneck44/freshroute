// OpenFreeMap styles (free and open), recoloured to the Asphalt palette from the style sheet.
// Dark: base layers stay within Asphalt 900–700 so the Sprout route is the brightest thing on screen.
const DARK = {
  background: '#111715',
  water: '#0C2530',
  green: '#142219',
  building: '#161D1B',
  minor: '#232B28',
  major: '#2E3734',
  motorway: '#3A4541',
  casing: '#0B0F0E',
  label: '#86928D',
  halo: '#0B0F0E',
};

export const STYLE_URL = {dark: 'https://tiles.openfreemap.org/styles/dark', light: 'https://tiles.openfreemap.org/styles/positron'};

export function recolor(map, mode) {
  if (mode !== 'dark') return;
  const set = (id, prop, v) => {
    if (map.getLayer(id)) map.setPaintProperty(id, prop, v);
  };
  for (const layer of map.getStyle().layers) {
    const {id, type} = layer;
    if (type === 'background') set(id, 'background-color', DARK.background);
    else if (/water/.test(id) && type === 'fill') set(id, 'fill-color', DARK.water);
    else if (/waterway/.test(id)) set(id, 'line-color', DARK.water);
    else if (/park|wood|grass|landcover/.test(id) && type === 'fill') set(id, 'fill-color', DARK.green);
    else if (/landuse/.test(id) && type === 'fill') set(id, 'fill-opacity', 0.15);
    else if (/building/.test(id) && type === 'fill') {
      set(id, 'fill-color', DARK.building);
      set(id, 'fill-outline-color', DARK.building);
    } else if (/casing/.test(id) && type === 'line') set(id, 'line-color', DARK.casing);
    else if (/motorway/.test(id) && type === 'line') set(id, 'line-color', DARK.motorway);
    else if (/major|trunk|primary|secondary/.test(id) && type === 'line') set(id, 'line-color', DARK.major);
    else if (/minor|street|service|tertiary/.test(id) && type === 'line') set(id, 'line-color', DARK.minor);
    else if (type === 'symbol') {
      set(id, 'text-color', DARK.label);
      set(id, 'text-halo-color', DARK.halo);
    }
  }
}

// Route colours follow the ETA state (DESIGN.md: the line ahead turns Apricot or Tomato when late).
export const ROUTE = {
  dark: {'on-time': '#B8F25E', slipping: '#FFB54A', late: '#FF7A66', unknown: '#B8F25E', driven: '#4A5551', casing: '#0B0F0E'},
  light: {'on-time': '#3C7A0C', slipping: '#9A5800', late: '#C2341E', unknown: '#3C7A0C', driven: '#A3AEA9', casing: '#FFFFFF'},
};
