import {PIN_HTML} from './pins.js';
import {useEffect, useRef} from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {STYLE_URL, recolor, ROUTE} from '../lib/mapstyle.js';
import {useTheme} from '../lib/theme.js';

maplibregl.setWorkerUrl(workerUrl); // the bundled worker; MapLibre can't find its own after bundling

const EMPTY = {type: 'FeatureCollection', features: []};
const line = (coords) => (coords && coords.length > 1 ? {type: 'Feature', geometry: {type: 'LineString', coordinates: coords}} : EMPTY);

/**
 * MapLibre map with the FreshRoute look.
 * route: [lon, lat][] full planned route; split: index where "driven" ends; trail: actual GPS trail.
 * markers: [{id, lon, lat, className, text, label, onClick}]; puck: {lon, lat, hdg}.
 * follow: 'nav' (heading-up, tilted, follows the puck) | 'fit' (fit everything once) | null.
 */
export default function MapView({route, split = 0, trail, state = 'on-time', markers = [], puck, follow = 'fit', fitKey, padding, focus, label = 'Map', legend, legendAt = 'br'}) {
  const el = useRef(null);
  const map = useRef(null);
  const ready = useRef(false);
  const mk = useRef(new Map());
  const puckMk = useRef(null);
  const mode = useTheme();
  const latest = useRef({});
  latest.current = {route, split, trail, state, mode};

  // Create the map (and recreate when the theme changes, since the base style differs).
  useEffect(() => {
    const m = new maplibregl.Map({
      container: el.current,
      style: STYLE_URL[mode],
      center: [-97.125, 33.205],
      zoom: 11.5,
      attributionControl: {compact: true},
      pitchWithRotate: false,
      dragRotate: false,
    });
    map.current = m;
    el.current.__map = m; // lets tests and the facilitator inspect the live map
    const init = () => {
      if (ready.current || !m.getStyle()) return;
      recolor(m, mode);
      const c = ROUTE[mode];
      m.addSource('route-ahead', {type: 'geojson', data: EMPTY});
      m.addSource('route-done', {type: 'geojson', data: EMPTY});
      m.addSource('trail', {type: 'geojson', data: EMPTY});
      const lineLayer = (id, source, color, width) => m.addLayer({id, type: 'line', source, layout: {'line-cap': 'round', 'line-join': 'round'}, paint: {'line-color': color, 'line-width': width}});
      lineLayer('route-casing', 'route-ahead', c.casing, 12);
      lineLayer('route-done', 'route-done', c.driven, 7);
      lineLayer('route-ahead', 'route-ahead', c['on-time'], 7);
      lineLayer('trail', 'trail', c.driven, 4);
      ready.current = true;
      draw();
      fit();
    };
    // 'load' waits for every tile; the style is enough to add our layers.
    m.on('style.load', init);
    m.on('load', init);
    return () => {
      ready.current = false;
      mk.current.forEach((x) => x.marker.remove());
      mk.current.clear();
      puckMk.current = null;
      m.remove();
    };
  }, [mode]);

  function draw() {
    const m = map.current;
    if (!ready.current) return;
    const {route, split, trail, state, mode} = latest.current;
    const coords = route || [];
    const i = Math.max(0, Math.min(coords.length - 1, split));
    m.getSource('route-done').setData(line(coords.slice(0, i + 1)));
    m.getSource('route-ahead').setData(line(coords.slice(i)));
    m.getSource('trail').setData(line(trail));
    m.setPaintProperty('route-ahead', 'line-color', ROUTE[mode][state] || ROUTE[mode]['on-time']);
  }

  function fit() {
    const m = map.current;
    if (!ready.current || follow !== 'fit') return;
    const pts = [...(latest.current.route || []), ...(latest.current.trail || []), ...markers.filter((x) => x.fit !== false).map((x) => [x.lon, x.lat])];
    if (puck) pts.push([puck.lon, puck.lat]);
    if (!pts.length) return;
    const b = pts.reduce((bb, p) => bb.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0]));
    m.fitBounds(b, {padding: padding || 60, maxZoom: 15, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600});
  }

  useEffect(draw, [route, split, trail, state]);
  useEffect(fit, [fitKey]);

  // Fly to a chosen place (e.g. the store whose details are open).
  useEffect(() => {
    if (!focus || !map.current) return;
    map.current.easeTo({center: [focus.lon, focus.lat], zoom: Math.max(map.current.getZoom(), 14), padding: padding || 60, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600});
  }, [focus?.lon, focus?.lat]);

  // Markers (diffed by id so they don't flicker).
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set();
    for (const x of markers) {
      seen.add(x.id);
      let entry = mk.current.get(x.id);
      if (!entry) {
        const node = document.createElement(x.onClick ? 'button' : 'div');
        if (x.onClick) node.type = 'button';
        node.addEventListener('click', (e) => {
          e.stopPropagation();
          entry?.onClick?.();
        });
        const marker = new maplibregl.Marker({element: node, anchor: x.anchor || 'center'}).setLngLat([x.lon, x.lat]).addTo(m);
        entry = {marker, node, base: node.className}; // keep MapLibre's own positioning classes
        mk.current.set(x.id, entry);
      }
      entry.onClick = x.onClick;
      entry.node.className = `${entry.base} ${x.className || 'pin'}`;
      if (x.html) entry.node.innerHTML = x.html; // trusted: built from constants in pins.js
      else entry.node.textContent = x.text ?? '';
      if (x.label) entry.node.setAttribute('aria-label', x.label);
      if (x.style) Object.assign(entry.node.style, x.style);
      entry.marker.setLngLat([x.lon, x.lat]);
    }
    for (const [id, entry] of mk.current) if (!seen.has(id)) (entry.marker.remove(), mk.current.delete(id));
  });

  // Puck and camera follow.
  useEffect(() => {
    const m = map.current;
    if (!m || !puck) return;
    if (!puckMk.current) {
      const node = document.createElement('div');
      node.className = 'puck';
      node.setAttribute('aria-label', 'Your van');
      node.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2 L17 17 L10 13 L3 17 Z" fill="currentColor"/></svg>';
      node.style.color = 'var(--fr-bg)';
      puckMk.current = new maplibregl.Marker({element: node, rotationAlignment: 'map'}).setLngLat([puck.lon, puck.lat]).addTo(m);
    }
    puckMk.current.setLngLat([puck.lon, puck.lat]).setRotation(puck.hdg || 0);
    if (follow === 'nav' && ready.current) {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      m.easeTo({center: [puck.lon, puck.lat], zoom: 16, pitch: 40, bearing: puck.hdg || 0, duration: reduce ? 0 : 900, offset: [0, 120]});
    }
  }, [puck?.lon, puck?.lat, puck?.hdg, follow]);

  // legend: {title, items: [[swatchClass, text]]}, so anyone can read what the map is for.
  return (
    <>
      <div ref={el} className="map" role="region" aria-label={label} />
      {legend && (
        <div className={`maplegend glass dense at-${legendAt}`}>
          <strong>{legend.title}</strong>
          <ul>
            {legend.items.map(([cls, text]) => (
              <li key={text}>{cls.startsWith('dest ') ? <span className={`key ${cls}`} aria-hidden="true" dangerouslySetInnerHTML={{__html: PIN_HTML[cls.slice(5)]}} /> : <span className={`key ${cls}`} aria-hidden="true">{cls === 'stopnum' ? '1' : ''}</span>}{text}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
