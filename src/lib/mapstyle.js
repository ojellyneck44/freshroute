import tokens from '../tokens/map.json';

// OpenFreeMap styles (free and open), recoloured to the Asphalt palette from the style sheet.
// Dark: base layers stay within Asphalt 900 to 700 so the Sprout route is the brightest thing on screen.
const DARK = tokens.base;

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
    else if (/aeroway/.test(id)) set(id, type === 'fill' ? 'fill-color' : 'line-color', DARK.major);
    else if (/rail/.test(id) && type === 'line') set(id, 'line-color', /dash/.test(id) ? DARK.background : DARK.minor);
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
export const ROUTE = tokens.route;
