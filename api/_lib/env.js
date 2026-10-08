// Every service is optional. A missing key switches that feature off instead of breaking the site.
const e = (k) => (process.env[k] || '').trim();

export const env = {
  get anthropicKey() { return e('ANTHROPIC_API_KEY'); },
  get anthropicBase() { return e('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com'; },
  get model() { return e('ANTHROPIC_MODEL') || 'claude-haiku-5-5'; },
  get redisUrl() { return e('KV_REST_API_URL') || e('UPSTASH_REDIS_REST_URL'); },
  get redisToken() { return e('KV_REST_API_TOKEN') || e('UPSTASH_REDIS_REST_TOKEN'); },
  get resendKey() { return e('RESEND_API_KEY'); },
  get resendBase() { return e('RESEND_BASE_URL') || 'https://api.resend.com'; },
  get contactTo() { return e('CONTACT_TO') || 'siddhantvashisth05@gmail.com'; },
  get contactFrom() { return e('CONTACT_FROM') || 'Portfolio <onboarding@resend.dev>'; },
  get notifyWebhook() { return e('NOTIFY_WEBHOOK_URL'); },
  get githubUser() { return e('GITHUB_USER') || 'sidvashisth2005'; },
  get githubToken() { return e('GITHUB_TOKEN'); },
  get githubApi() { return e('GITHUB_API_BASE') || 'https://api.github.com'; },
  get salt() { return e('IP_SALT') || e('VERCEL_PROJECT_ID') || 'sv-portfolio'; },
  get allowedOrigins() { return e('ALLOWED_ORIGINS').split(',').map((s) => s.trim()).filter(Boolean); },
  get aiDailyLimit() { return +e('AI_DAILY_LIMIT') || 400; },
};

export const has = {
  get ai() { return !!env.anthropicKey; },
  get redis() { return !!(env.redisUrl && env.redisToken); },
  get mail() { return !!env.resendKey; },
};
