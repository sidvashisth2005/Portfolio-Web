// Which optional services are switched on. Booleans only, never values.
import { env, has } from './_lib/env.js';
import { json } from './_lib/http.js';

export function GET() {
  return json({
    ok: true,
    services: { ai: has.ai, model: has.ai ? env.model : null, redis: has.redis, mail: has.mail, notify: !!env.notifyWebhook, githubToken: !!env.githubToken },
  });
}
