// 戦闘力 · Power level: live site counters. Unique visitors per day, ki charged by visitors,
// résumé pulls, and how many people are watching right now.
import { has } from './_lib/env.js';
import { fail, json, readJson, rateLimit, sameOrigin, ipHash, clean } from './_lib/http.js';
import { redis } from './_lib/redis.js';

const LIVE_WINDOW = 70; // seconds a heartbeat keeps someone "watching"

async function counts() {
  const now = Math.floor(Date.now() / 1000);
  const [visits, kiai, resume, , live] = await redis(
    ['GET', 'stat:visits'], ['GET', 'stat:kiai'], ['GET', 'stat:resume'],
    ['ZREMRANGEBYSCORE', 'live', 0, now - LIVE_WINDOW], ['ZCARD', 'live'],
  );
  return { visits: +visits || 0, kiai: +kiai || 0, resume: +resume || 0, live: Math.max(1, +live || 0) };
}

export async function GET() {
  if (!has.redis) return fail(503, 'offline');
  try { return json({ ok: true, ...(await counts()) }, 200, { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60' }); }
  catch (e) { console.error(e); return fail(502, 'upstream'); }
}

export async function POST(req) {
  if (!sameOrigin(req)) return fail(403, 'forbidden');
  if (!has.redis) return fail(503, 'offline');
  let b;
  try { b = await readJson(req, 1000); } catch (e) { return fail(e.status || 400, e.message); }
  const action = clean(b.action, 12);
  const sid = clean(b.sid, 40).replace(/[^a-z0-9-]/gi, '') || ipHash(req);
  const now = Math.floor(Date.now() / 1000);
  try {
    if (action === 'visit') {
      // one visit per person per day
      const day = new Date().toISOString().slice(0, 10);
      const [fresh] = await redis(['SET', `seen:${day}:${ipHash(req)}`, '1', 'NX', 'EX', 90000]);
      if (fresh === 'OK') await redis(['INCR', 'stat:visits']);
      await redis(['ZADD', 'live', now, sid]);
    } else if (action === 'ping') {
      const rl = await rateLimit(req, 'ping', 20, 60);
      if (rl.ok) await redis(['ZADD', 'live', now, sid]);
    } else if (action === 'leave') {
      await redis(['ZREM', 'live', sid]);
    } else if (action === 'kiai') {
      const rl = await rateLimit(req, 'kiai', 12, 60);
      if (!rl.ok) return fail(429, 'ki exhausted', await counts());
      await redis(['INCR', 'stat:kiai']);
    } else if (action === 'resume') {
      const rl = await rateLimit(req, 'resume', 5, 3600);
      if (rl.ok) await redis(['INCR', 'stat:resume']);
    } else {
      return fail(400, 'unknown action');
    }
    return json({ ok: true, ...(await counts()) });
  } catch (e) {
    console.error(e);
    return fail(502, 'upstream');
  }
}
