// কোন পোস্টের সময় হয়েছে তা বের করা (হালকা — কোনো প্যাকেজ লাগে না)
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { dhakaNow } from './util.js';

export const loadConfig = () => JSON.parse(readFileSync('config/pages.json', 'utf8'));

const STATE = 'state/posted.json';
export function loadState() {
  if (!existsSync(STATE)) return { days: {}, headlines: {}, breaking: {} };
  try { return { days: {}, headlines: {}, breaking: {}, ...JSON.parse(readFileSync(STATE, 'utf8')) }; } catch { return { days: {}, headlines: {}, breaking: {} }; }
}
export function saveState(s) {
  const keepDays = Object.keys(s.days).sort().slice(-3);
  s.days = Object.fromEntries(keepDays.map((d) => [d, s.days[d]]));
  for (const k of Object.keys(s.headlines)) s.headlines[k] = s.headlines[k].slice(-500);
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
    const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
    // নির্ধারিত পোস্ট — এক রানে এক পেজে সর্বোচ্চ ২টা (একসাথে গাদা পোস্ট এড়াতে)
    const mine = [];
    let lastDone = -9999;
    for (const post of page.posts || []) {
      const sched = toMin(post.time);
      if (done.has(postKey(page, post))) { lastDone = Math.max(lastDone, sched); continue; }
      if (nowMin >= sched && nowMin - sched <= window) mine.push({ page, post });
    }
    due.push(...mine.slice(0, 2));

    // স্বয়ংক্রিয় ব্রেকিং — সময়ের ভেতরে, দিনের সীমা না ছাড়ালে, আগের পোস্টের পর যথেষ্ট বিরতি থাকলে
    const b = page.breaking;
    if (b?.enabled && !mine.length) {
      const st = state.breaking?.[page.id];
      const today = st?.date === now.iso;
      const count = today ? st.count : 0;
      const lastB = today ? st.last : -9999;
      const inWindow = nowMin >= toMin(b.from || '08:00') && nowMin <= toMin(b.to || '23:00');
      const gapOk = nowMin - lastB >= (b.minGapMinutes ?? 75) && nowMin - lastDone >= (b.afterScheduledMinutes ?? 40);
      if (inWindow && count < (b.maxPerDay ?? 8) && gapOk) {
        const hhmm = `${String(now.h).padStart(2, '0')}:${String(now.min).padStart(2, '0')}`;
        due.push({ page, post: { type: 'breaking-auto', time: hhmm, n: count + 1 } });
      }
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
