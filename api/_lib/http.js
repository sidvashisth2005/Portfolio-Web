import { createHash } from 'node:crypto';
import { env, has } from './env.js';
import { redis } from './redis.js';

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

export const fail = (status, error, extra = {}) => json({ ok: false, error, ...extra }, status);

export function clientIp(req) {
  const xf = req.headers.get('x-forwarded-for');
  return (xf ? xf.split(',')[0] : req.headers.get('x-real-ip') || '0.0.0.0').trim();
}

// IPs are never stored, only a salted hash
export const ipHash = (req) => createHash('sha256').update(`${env.salt}:${clientIp(req)}`).digest('hex').slice(0, 24);

// Browsers send Origin on POST. Reject other sites trying to use these endpoints from a page.
export function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  let o;
  try { o = new URL(origin); } catch { return false; }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (o.host === host) return true;
  if (env.allowedOrigins.includes(o.origin)) return true;
  // the production domain, when the request reaches the function through another alias
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return !!prod && o.host === prod;
}

export async function readJson(req, maxBytes = 16_000) {
  const len = +req.headers.get('content-length') || 0;
  if (len > maxBytes) throw Object.assign(new Error('too large'), { status: 413 });
  const text = await req.text();
  if (text.length > maxBytes) throw Object.assign(new Error('too large'), { status: 413 });
  try { return JSON.parse(text || '{}'); } catch { throw Object.assign(new Error('bad json'), { status: 400 }); }
}

// Fixed-window limiter. Uses Redis when available, otherwise a per-instance map.
const mem = new Map();
export async function rateLimit(req, bucket, limit, windowSec) {
  const win = Math.floor(Date.now() / 1000 / windowSec);
  const key = `rl:${bucket}:${ipHash(req)}:${win}`;
  let count;
  if (has.redis) {
    try { [count] = await redis(['INCR', key], ['EXPIRE', key, windowSec + 5]); } catch { count = 0; }
  } else {
    count = (mem.get(key) || 0) + 1;
    mem.set(key, count);
    if (mem.size > 5000) mem.clear();
  }
  return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfter: windowSec };
}

// A hard daily ceiling on paid AI calls across all visitors
export async function aiBudget() {
  if (!has.redis) return true;
  const day = new Date().toISOString().slice(0, 10);
  try {
    const [n] = await redis(['INCR', `ai:${day}`], ['EXPIRE', `ai:${day}`, 172800]);
    return n <= env.aiDailyLimit;
  } catch { return true; }
}

export const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
