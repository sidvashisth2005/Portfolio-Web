// Minimal Upstash Redis REST client (works with the Vercel Marketplace Upstash integration).
import { env, has } from './env.js';

export async function redis(...commands) {
  if (!has.redis) throw new Error('redis not configured');
  const res = await fetch(`${env.redisUrl.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const out = await res.json();
  return out.map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}
