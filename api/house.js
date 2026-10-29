// 住人街 · The residents' quarter: 24 houses in the 3D village that visitors can claim, fill with their things and
// show to everyone who passes. No accounts: a house is opened by its house key, which never leaves the visitor's
// browser (see src/world/registry.js). The server gets auth = SHA-256("auth|" + key) and keeps only a SHA-256 of
// that; private things arrive already sealed, so they are stored as ciphertext the server can't read.
//
// GET  /api/house             every plot: the resident's public profile and lantern count, or null when vacant
// GET  /api/house?id=7        one house's public face; with "Authorization: Bearer <auth>" from its owner, all of it
//                             (sealed things and the notes slipped under the door) too
// POST /api/house             { action: claim | save | lantern | note | notes-clear | leave, id, ... }
// DELETE /api/house?id=7      evict (needs ADMIN_TOKEN as a Bearer token)
import { createHash, timingSafeEqual } from 'node:crypto';
import { has } from './_lib/env.js';
import { fail, json, readJson, rateLimit, sameOrigin, ipHash } from './_lib/http.js';
import { redis } from './_lib/redis.js';
import { moderate } from './_lib/moderate.js';
import { PLOTS, LIMITS, normProfile, normItems, normNote, publicText } from '../src/registry.js';

const HOUSE = (id) => `house:${id}`, PLOT = (id) => `plot:${id}`, LANTERNS = (id) => `house:${id}:lanterns`, NOTES = (id) => `house:${id}:notes`;
const sha = (s) => createHash('sha256').update(s).digest('hex');
const plotId = (v) => (Number.isInteger(+v) && String(v).trim() !== '' && +v >= 0 && +v < PLOTS ? +v : -1);
const bearer = (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
const AUTH = /^[a-f0-9]{64}$/;
const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const owns = (h, auth) => !!h && AUTH.test(auth) && same(sha(auth), String(h.auth || ''));
const parse = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
const say = (status, message, extra = {}) => fail(status, message, { message, ...extra });
// what the street sees of a house
const summary = (h) => ({ id: h.id, name: h.name, crest: h.crest, color: h.color, roof: h.roof, motto: h.motto, since: h.since, items: h.items.filter((i) => i.pub).length });

export async function GET(req) {
  if (!has.redis) return fail(503, 'offline');
  const q = new URL(req.url).searchParams;
  try {
    if (!q.has('id')) {
      const ids = [...Array(PLOTS).keys()];
      const [plots, lanterns] = await redis(['MGET', ...ids.map(PLOT)], ['MGET', ...ids.map(LANTERNS)]);
      const houses = ids.map((i) => { const p = parse(plots[i]); return p ? { ...p, lanterns: +lanterns[i] || 0 } : null; });
      return json({ ok: true, houses }, 200, { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30' });
    }
    const id = plotId(q.get('id'));
    if (id < 0) return say(400, 'No such house');
    const [raw, lanterns] = await redis(['GET', HOUSE(id)], ['GET', LANTERNS(id)]);
    const h = parse(raw);
    if (!h) return json({ ok: true, house: null });
    const own = owns(h, bearer(req));
    const { auth, by, ...rest } = h; // never the key's hash or who claimed it
    const house = { ...rest, lanterns: +lanterns || 0, owner: own, items: own ? h.items : h.items.filter((i) => i.pub) };
    if (own) house.notes = ((await redis(['LRANGE', NOTES(id), 0, LIMITS.notes - 1]))[0] || []).map(parse).filter(Boolean);
    return json({ ok: true, house });
  } catch (e) {
    console.error(e);
    return fail(502, 'upstream');
  }
}

export async function POST(req) {
  if (!sameOrigin(req)) return fail(403, 'forbidden');
  if (!has.redis) return fail(503, 'offline');
  let b;
  try { b = await readJson(req, 48_000); } catch (e) { return fail(e.status || 400, e.message); }
  const id = plotId(b.id);
  if (id < 0) return say(400, 'No such house');
  const action = String(b.action || '');
  try {
    if (action === 'claim') {
      if (!AUTH.test(String(b.auth || ''))) return say(400, 'The house key went missing. Reload and try again.');
      const p = normProfile(b.profile);
      if (Object.keys(p.errors).length) return say(422, 'Check the form', { errors: p.errors });
      const m = await moderate(publicText(p.value));
      if (!m.ok) return say(422, m.reason);
      // (counted only once the form is good, so a typo doesn't use up the day's claim)
      const rl = await rateLimit(req, 'claim', 2, 86400);
      if (!rl.ok) return say(429, 'You’ve claimed a house today already. One home is plenty.');
      const h = { id, ...p.value, since: new Date().toISOString(), items: [], auth: sha(b.auth), by: ipHash(req) };
      const [set] = await redis(['SET', HOUSE(id), JSON.stringify(h), 'NX']);
      if (set !== 'OK') return say(409, 'Someone moved in just before you. Pick another house.');
      await redis(['SET', PLOT(id), JSON.stringify(summary(h))], ['DEL', LANTERNS(id), NOTES(id)]);
      return json({ ok: true });
    }
    if (action === 'lantern' || action === 'note') {
      const [exists] = await redis(['EXISTS', HOUSE(id)]);
      if (!exists) return say(404, 'Nobody lives there yet');
      if (action === 'lantern') {
        const rl = await rateLimit(req, 'lantern', 30, 3600);
        if (!rl.ok) return say(429, 'You’ve hung a lot of lanterns. Try again later.');
        // one lantern per visitor per house per day
        const day = new Date().toISOString().slice(0, 10);
        const [fresh] = await redis(['SET', `lit:${id}:${ipHash(req)}:${day}`, '1', 'NX', 'EX', 90000]);
        if (fresh === 'OK') { const [n] = await redis(['INCR', LANTERNS(id)]); return json({ ok: true, lanterns: n }); }
        const [n] = await redis(['GET', LANTERNS(id)]);
        return json({ ok: true, lanterns: +n || 0, already: true });
      }
      const rl = await rateLimit(req, 'note', 6, 3600);
      if (!rl.ok) return say(429, 'That’s a lot of notes. Try again later.');
      const n = normNote(b.note);
      if (n.error) return say(422, n.error);
      const m = await moderate([n.value.from, n.value.text]);
      if (!m.ok) return say(422, m.reason);
      await redis(['LPUSH', NOTES(id), JSON.stringify({ ...n.value, at: new Date().toISOString() })], ['LTRIM', NOTES(id), 0, LIMITS.notes - 1]);
      return json({ ok: true });
    }
    // everything else is the resident's own business
    const [raw] = await redis(['GET', HOUSE(id)]);
    const h = parse(raw);
    if (!owns(h, bearer(req))) return say(403, 'That key doesn’t open this house');
    if (action === 'save') {
      const rl = await rateLimit(req, 'save', 40, 3600);
      if (!rl.ok) return say(429, 'Lots of changes! Give it a few minutes.');
      const p = normProfile(b.profile), it = normItems(b.items);
      if (Object.keys(p.errors).length) return say(422, 'Check the form', { errors: p.errors });
      if (it.error) return say(422, it.error);
      // only what's new or changed goes to moderation
      const before = new Set(publicText(h, h.items));
      const m = await moderate(publicText(p.value, it.value).filter((t) => !before.has(t)));
      if (!m.ok) return say(422, m.reason);
      const next = { ...h, ...p.value, items: it.value, updated: new Date().toISOString() };
      await redis(['SET', HOUSE(id), JSON.stringify(next)], ['SET', PLOT(id), JSON.stringify(summary(next))]);
      return json({ ok: true });
    }
    if (action === 'notes-clear') { await redis(['DEL', NOTES(id)]); return json({ ok: true }); }
    if (action === 'leave') { await redis(['DEL', HOUSE(id), PLOT(id), LANTERNS(id), NOTES(id)]); return json({ ok: true }); }
    return say(400, 'Unknown action');
  } catch (e) {
    console.error(e);
    return fail(502, 'upstream');
  }
}

// the village's founder can evict a house (abuse, squatting): Authorization: Bearer <ADMIN_TOKEN>
export async function DELETE(req) {
  const admin = (process.env.ADMIN_TOKEN || '').trim();
  if (admin.length < 16) return fail(404, 'not found');
  if (!same(bearer(req), admin)) return fail(401, 'unauthorised');
  if (!has.redis) return fail(503, 'offline');
  const id = plotId(new URL(req.url).searchParams.get('id'));
  if (id < 0) return say(400, 'No such house');
  await redis(['DEL', HOUSE(id), PLOT(id), LANTERNS(id), NOTES(id)]);
  return json({ ok: true });
}
