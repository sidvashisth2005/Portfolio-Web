// 修行中 · Now training: the latest public repos Siddhant pushed to, cached at the edge for 30 minutes.
import { env } from './_lib/env.js';
import { json } from './_lib/http.js';

export async function GET() {
  const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'sv-portfolio', 'X-GitHub-Api-Version': '2022-11-28' };
  if (env.githubToken) h.Authorization = `Bearer ${env.githubToken}`;
  const u = encodeURIComponent(env.githubUser);
  try {
    const [ur, rr] = await Promise.all([
      fetch(`${env.githubApi}/users/${u}`, { headers: h, signal: AbortSignal.timeout(6000) }),
      fetch(`${env.githubApi}/users/${u}/repos?sort=pushed&per_page=12&type=owner`, { headers: h, signal: AbortSignal.timeout(6000) }),
    ]);
    // a failed upstream is not an error for the page: it just hides the feed (and keeps the console clean)
    if (!ur.ok || !rr.ok) return json({ ok: false, error: `github ${ur.status}/${rr.status}` }, 200, { 'Cache-Control': 'public, s-maxage=300' });
    const user = await ur.json();
    const repos = (await rr.json())
      .filter((r) => !r.fork && !r.archived && !r.private)
      .slice(0, 4)
      .map((r) => ({ name: r.name, description: r.description || '', language: r.language || '', stars: r.stargazers_count, pushedAt: r.pushed_at, url: r.html_url }));
    return json({ ok: true, user: user.login, publicRepos: user.public_repos, followers: user.followers, repos }, 200, {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
    });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: 'github unreachable' }, 200, { 'Cache-Control': 'public, s-maxage=120' });
  }
}
