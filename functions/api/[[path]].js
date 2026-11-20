// FreshRoute API (Cloudflare Pages Function). One food bank per join code.
// Drivers and managers send the code in `x-bank-code` (or `?code=` for <video> sources).
// The store link (/api/link/...) is public and returns only ETA and pickup details.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json', 'cache-control': 'no-store'}});
const bad = (msg, status = 400) => json({error: msg}, status);

const MAX_SEGMENT = 25 * 1024 * 1024; // a 10 s 720p segment is ~1–2 MB; anything near this is wrong
const MAX_JSON = 256 * 1024;

async function readJson(req) {
  const text = await req.text();
  if (text.length > MAX_JSON) throw new Error('Body too large');
  return text ? JSON.parse(text) : {};
}

const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

export async function onRequest({request, env, params}) {
  const url = new URL(request.url);
  const parts = params.path || [];
  const method = request.method;
  try {
    // ---- Public store link: /api/link/:drive/:store
    if (parts[0] === 'link') return storeLink(env, method, parts[1], parts[2], request);

    const code = request.headers.get('x-bank-code') || url.searchParams.get('code');
    if (!code || code !== env.BANK_CODE) return bad('Join code not recognised', 401);
    const bank = 'bank:' + code;

    // ---- /api/check: validates the join code
    if (parts[0] === 'check') return json({ok: true});

    // ---- /api/drives
    if (parts[0] === 'drives' && parts.length === 1) {
      if (method === 'GET') {
        const since = Number(url.searchParams.get('since') || 0);
        const {results} = await env.DB.prepare(
          'SELECT id, status, data, updated FROM drives WHERE bank = ? AND updated > ? ORDER BY updated DESC LIMIT 100',
        ).bind(bank, since).all();
        const ids = results.map((r) => r.id);
        const last = ids.length ? await lastPoints(env, ids) : {};
        return json(results.map((r) => ({...JSON.parse(r.data), id: r.id, status: r.status, updated: r.updated, last: last[r.id] || null})));
      }
      if (method === 'POST') {
        const body = await readJson(request);
        const id = newId();
        const now = Date.now();
        await env.DB.prepare('INSERT INTO drives (id, bank, status, data, updated) VALUES (?, ?, ?, ?, ?)')
          .bind(id, bank, body.status || 'en-route-pickup', JSON.stringify(body), now).run();
        return json({id});
      }
    }

    // ---- /api/drives/:id[/...]
    if (parts[0] === 'drives' && parts[1]) {
      const id = parts[1];
      const row = await env.DB.prepare('SELECT id, status, data, updated FROM drives WHERE id = ? AND bank = ?').bind(id, bank).first();
      if (!row) return bad('Drive not found', 404);
      const sub = parts[2];

      if (!sub && method === 'GET') {
        const [pts, evs, segs] = await Promise.all([
          env.DB.prepare('SELECT t, lat, lon, spd, hdg, eta FROM points WHERE drive = ? ORDER BY t').bind(id).all(),
          env.DB.prepare('SELECT t, kind, data FROM events WHERE drive = ? ORDER BY t').bind(id).all(),
          env.VIDEO.list({prefix: `drives/${id}/`, include: ['customMetadata']}),
        ]);
        return json({
          ...JSON.parse(row.data), id, status: row.status, updated: row.updated,
          points: pts.results,
          events: evs.results.map((e) => ({...e, data: e.data ? JSON.parse(e.data) : null})),
          segments: segs.objects.map((o) => ({key: o.key, size: o.size, ...o.customMetadata})).sort((a, b) => a.t0 - b.t0),
        });
      }
      if (!sub && method === 'PATCH') {
        const patch = await readJson(request);
        const data = {...JSON.parse(row.data), ...patch};
        await env.DB.prepare('UPDATE drives SET status = ?, data = ?, updated = ? WHERE id = ?')
          .bind(patch.status || row.status, JSON.stringify(data), Date.now(), id).run();
        return json({ok: true});
      }
      if (sub === 'points' && method === 'POST') {
        const list = await readJson(request);
        const pts = (Array.isArray(list) ? list : [list]).slice(0, 200);
        if (!pts.length) return json({ok: true});
        await env.DB.batch([
          ...pts.map((p) => env.DB.prepare('INSERT INTO points (drive, t, lat, lon, spd, hdg, eta) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(id, p.t, p.lat, p.lon, p.spd ?? null, p.hdg ?? null, p.eta ?? null)),
          env.DB.prepare('UPDATE drives SET updated = ? WHERE id = ?').bind(Date.now(), id),
        ]);
        return json({ok: true});
      }
      if (sub === 'events' && method === 'POST') {
        const list = await readJson(request);
        const evs = (Array.isArray(list) ? list : [list]).slice(0, 100);
        await env.DB.batch([
          ...evs.map((e) => env.DB.prepare('INSERT INTO events (drive, t, kind, data) VALUES (?, ?, ?, ?)')
            .bind(id, e.t, String(e.kind).slice(0, 40), e.data ? JSON.stringify(e.data) : null)),
          env.DB.prepare('UPDATE drives SET updated = ? WHERE id = ?').bind(Date.now(), id),
        ]);
        return json({ok: true});
      }
      // PUT /api/drives/:id/video/:idx  (body = one self-contained video segment)
      if (sub === 'video' && method === 'PUT') {
        const idx = Number(parts[3]);
        const len = Number(request.headers.get('content-length') || 0);
        if (!Number.isInteger(idx) || idx < 0 || idx > 100000) return bad('Bad segment index');
        if (len > MAX_SEGMENT) return bad('Segment too large', 413);
        const type = request.headers.get('content-type') || 'video/webm';
        if (!/^video\/(webm|mp4)/.test(type)) return bad('Video only');
        const ext = type.includes('mp4') ? 'mp4' : 'webm';
        const key = `drives/${id}/${String(idx).padStart(6, '0')}.${ext}`;
        await env.VIDEO.put(key, request.body, {
          httpMetadata: {contentType: type},
          customMetadata: {t0: request.headers.get('x-t0') || '0', t1: request.headers.get('x-t1') || '0', cam: request.headers.get('x-cam') || ''},
        });
        await env.DB.prepare('UPDATE drives SET updated = ? WHERE id = ?').bind(Date.now(), id).run();
        return json({key});
      }
    }

    // ---- GET /api/video/drives/:id/:file
    if (parts[0] === 'video' && method === 'GET') {
      const key = parts.slice(1).join('/');
      const driveId = parts[2];
      const own = await env.DB.prepare('SELECT 1 FROM drives WHERE id = ? AND bank = ?').bind(driveId, bank).first();
      if (!own) return bad('Not found', 404);
      const obj = await env.VIDEO.get(key, {range: request.headers});
      if (!obj) return bad('Not found', 404);
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set('accept-ranges', 'bytes');
      headers.set('cache-control', 'private, max-age=86400');
      if (obj.range) {
        const start = obj.range.offset ?? 0;
        const end = start + (obj.range.length ?? obj.size - start) - 1;
        headers.set('content-range', `bytes ${start}-${end}/${obj.size}`);
        headers.set('content-length', String(end - start + 1));
        return new Response(obj.body, {status: 206, headers});
      }
      headers.set('content-length', String(obj.size));
      return new Response(obj.body, {headers});
    }

    // ---- /api/notes?store=  (driver feedback that feeds store descriptions)
    if (parts[0] === 'notes') {
      if (method === 'GET') {
        const store = url.searchParams.get('store');
        const q = store
          ? env.DB.prepare('SELECT store, t, text, tags FROM notes WHERE store = ? ORDER BY t DESC LIMIT 50').bind(store)
          : env.DB.prepare('SELECT store, t, text, tags FROM notes ORDER BY t DESC LIMIT 200');
        const {results} = await q.all();
        return json(results.map((n) => ({...n, tags: n.tags ? JSON.parse(n.tags) : []})));
      }
      if (method === 'POST') {
        const n = await readJson(request);
        if (!n.store || !n.text) return bad('store and text are required');
        await env.DB.prepare('INSERT INTO notes (store, t, drive, text, tags) VALUES (?, ?, ?, ?, ?)')
          .bind(String(n.store).slice(0, 60), Date.now(), n.drive || null, String(n.text).slice(0, 1000), JSON.stringify(n.tags || [])).run();
        return json({ok: true});
      }
    }
    return bad('Not found', 404);
  } catch (err) {
    return bad(err.message || 'Server error', 500);
  }
}

async function lastPoints(env, ids) {
  const q = `SELECT p.drive, p.t, p.lat, p.lon, p.spd, p.hdg, p.eta FROM points p
    JOIN (SELECT drive, MAX(t) AS t FROM points WHERE drive IN (${ids.map(() => '?').join(',')}) GROUP BY drive) m
    ON p.drive = m.drive AND p.t = m.t`;
  const {results} = await env.DB.prepare(q).bind(...ids).all();
  return Object.fromEntries(results.map((r) => [r.drive, r]));
}

// The store link shows only what a store needs: ETA, what is being picked up, and a "ready" button.
async function storeLink(env, method, driveId, storeId, request) {
  if (!driveId || !storeId) return bad('Not found', 404);
  const row = await env.DB.prepare('SELECT id, status, data FROM drives WHERE id = ?').bind(driveId).first();
  if (!row) return bad('Not found', 404);
  const d = JSON.parse(row.data);
  const stop = (d.stops || []).find((s) => s.storeId === storeId);
  if (!stop) return bad('Not found', 404);
  if (method === 'POST') {
    const body = await readJson(request);
    await env.DB.prepare('INSERT INTO events (drive, t, kind, data) VALUES (?, ?, ?, ?)')
      .bind(driveId, d.clock ? d.clock.sim0 + (Date.now() - d.clock.real0) * d.clock.speed : Date.now(), 'store-ready', JSON.stringify({storeId, ready: !!body.ready})).run();
    return json({ok: true});
  }
  const last = await env.DB.prepare('SELECT t, eta FROM points WHERE drive = ? ORDER BY t DESC LIMIT 1').bind(driveId).first();
  const ready = await env.DB.prepare("SELECT data FROM events WHERE drive = ? AND kind = 'store-ready' ORDER BY t DESC LIMIT 1").bind(driveId).first();
  return json({
    status: row.status,
    van: d.van, driverFirst: (d.driver || '').split(' ')[0], bankName: d.bankName,
    stop: {storeId, name: stop.name, address: stop.address, items: stop.items, promiseAt: stop.promiseAt, etaAt: stop.etaAt, arrivedAt: stop.arrivedAt},
    updated: last ? last.t : null,
    ready: ready ? JSON.parse(ready.data).ready : false,
  });
}
