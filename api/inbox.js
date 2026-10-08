// Private inbox: the last 50 scrolls plus the counters. Needs ADMIN_TOKEN, sent as a Bearer token or ?key=.
import { timingSafeEqual } from 'node:crypto';
import { has } from './_lib/env.js';
import { fail, json } from './_lib/http.js';
import { redis } from './_lib/redis.js';

const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function GET(req) {
  const admin = (process.env.ADMIN_TOKEN || '').trim();
  if (admin.length < 16) return fail(404, 'not found');
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || new URL(req.url).searchParams.get('key') || '';
  if (!same(given, admin)) return fail(401, 'unauthorised');
  if (!has.redis) return fail(503, 'redis not configured');
  const [items, visits, kiai, resume, scrolls] = await redis(['LRANGE', 'inbox', 0, 49], ['GET', 'stat:visits'], ['GET', 'stat:kiai'], ['GET', 'stat:resume'], ['GET', 'stat:scrolls']);
  return json({
    ok: true,
    stats: { visits: +visits || 0, kiai: +kiai || 0, resume: +resume || 0, scrolls: +scrolls || 0 },
    inbox: items.map((s) => { try { return JSON.parse(s); } catch { return s; } }),
  });
}
