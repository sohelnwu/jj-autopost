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

export const postKey = (page, post) => `${page.id}|${post.time}|${post.type}|${post.news || ''}`;

export function computeDue(cfg, state, now = dhakaNow()) {
  const nowMin = now.h * 60 + now.min;
  const done = new Set(state.days[now.iso] || []);
  const window = (cfg.catchUpHours ?? 3) * 60;
  // টোকেন দেওয়া থাকলে, যেসব পেজের টোকেন নেই সেগুলো বাদ (অযথা কার্ড বানিয়ে সময় নষ্ট না করার জন্য)
  let withTokens = null;
  try { if (process.env.FB_PAGE_TOKENS) withTokens = new Set(Object.keys(JSON.parse(process.env.FB_PAGE_TOKENS))); } catch {}
  const due = [];
  for (const page of cfg.pages) {
    if (page.enabled === false) continue;
    if (withTokens && !withTokens.has(page.id)) continue;
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
  const due = computeDue(loadConfig(), loadState());
  console.log(due.length ? `এখন ${due.length}টি পোস্ট বাকি:\n` + due.map((d) => `  ${d.page.name} — ${d.post.time} ${d.post.type} ${d.post.news || ''}`).join('\n') : 'এখন কোনো পোস্টের সময় হয়নি।');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `has_due=${due.length ? 'true' : 'false'}\n`);
}
