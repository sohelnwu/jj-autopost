// কোন পোস্টের সময় হয়েছে তা বের করা (হালকা — কোনো প্যাকেজ লাগে না)
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { dhakaNow } from './util.js';

export const loadConfig = () => JSON.parse(readFileSync('config/pages.json', 'utf8'));

const STATE = 'state/posted.json';
export function loadState() {
  if (!existsSync(STATE)) return { days: {}, headlines: {} };
  try { return { days: {}, headlines: {}, ...JSON.parse(readFileSync(STATE, 'utf8')) }; } catch { return { days: {}, headlines: {} }; }
}
export function saveState(s) {
  const keepDays = Object.keys(s.days).sort().slice(-3);
  s.days = Object.fromEntries(keepDays.map((d) => [d, s.days[d]]));
  for (const k of Object.keys(s.headlines)) s.headlines[k] = s.headlines[k].slice(-300);
  mkdirSync('state', { recursive: true });
  writeFileSync(STATE, JSON.stringify(s, null, 1) + '\n');
}

export const postKey = (page, post) => `${page.id}|${post.time}|${post.type}|${post.news || post.lines || ''}`;

// allowed: যেসব পেজের টোকেন আছে তাদের id-র Set (null হলে সব পেজ)
export function computeDue(cfg, state, now = dhakaNow(), allowed = null) {
  const nowMin = now.h * 60 + now.min;
  const done = new Set(state.days[now.iso] || []);
  const window = (cfg.catchUpHours ?? 3) * 60;
  if (cfg.paused) return []; // config-এ "paused": true থাকলে অটো পোস্ট বন্ধ
  const due = [];
  for (const page of cfg.pages) {
    if (page.enabled === false) continue;
    if (allowed && !allowed.has(page.id)) continue;
    for (const post of page.posts || []) {
      const [h, m] = post.time.split(':').map(Number);
      const sched = h * 60 + m;
      if (nowMin >= sched && nowMin - sched <= window && !done.has(postKey(page, post))) due.push({ page, post });
    }
  }
  return due;
}

// সরাসরি চালালে: GitHub Actions-কে জানায় কিছু পোস্ট করার আছে কিনা
if (process.argv[1]?.endsWith('due.js')) {
  const { resolveTokens, hasAnyToken } = await import('./tokens.js');
  let due = [];
  if (!hasAnyToken()) {
    console.log('FB_PAGE_TOKENS Secret এখনো সেট করা হয়নি — তাই কিছু চালানো হচ্ছে না।');
  } else {
    const cfg = loadConfig();
    let creds = {};
    try { creds = await resolveTokens(cfg); } catch (e) { console.log(`⚠️ ${e.message}`); }
    console.log(`টোকেন মিলেছে: ${Object.keys(creds).join(', ') || 'কোনো পেজের সাথে মেলেনি'}`);
    due = computeDue(cfg, loadState(), dhakaNow(), new Set(Object.keys(creds)));
    console.log(due.length ? `এখন ${due.length}টি পোস্ট বাকি:\n` + due.map((d) => `  ${d.page.name} — ${d.post.time} ${d.post.type} ${d.post.news || d.post.lines || ''}`).join('\n') : 'এখন কোনো পোস্টের সময় হয়নি।');
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `has_due=${due.length ? 'true' : 'false'}\n`);
}
