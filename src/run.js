// মূল চালক: কার্ড বানানো → (চাইলে) ফেসবুকে পোস্ট
//
// ব্যবহার:
//   node src/run.js --due                 এখন যেগুলোর সময় হয়েছে সেগুলো (GitHub Actions এটাই চালায়)
//   node src/run.js --all --dry           সব পেজের সব কার্ড শুধু বানাবে, পোস্ট করবে না
//   node src/run.js --page jj-news --type weather
//   যোগ করা যায়: --sample (নমুনা ডেটা, ইন্টারনেট লাগে না)  --dry (পোস্ট করবে না)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dhakaNow, pick } from './util.js';
import { loadConfig, loadState, saveState, computeDue, postKey } from './due.js';
import { getWeather, getPrayer, getHeadlines, SAMPLE } from './data.js';
import * as T from './templates.js';
import * as C from './captions.js';
import { renderCard, closeBrowser } from './render.js';
import { postPhoto } from './facebook.js';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };

const cfg = loadConfig();
const state = loadState();
const t = dhakaNow();
const sample = flag('sample');
const dry = flag('dry') || process.env.DRY_RUN === 'true';

// টোকেন: FB_PAGE_TOKENS = {"jj-news": {"id": "123", "token": "EAA..."}, ...}
let tokens = {};
try { tokens = JSON.parse(process.env.FB_PAGE_TOKENS || '{}'); } catch { console.error('⚠️ FB_PAGE_TOKENS সঠিক JSON নয়।'); }
const credFor = (page) => {
  const v = tokens[page.id];
  if (!v) return null;
  if (typeof v === 'string') return page.pageId ? { id: page.pageId, token: v } : null;
  return { id: v.id || page.pageId, token: v.token };
};

// কোন কাজগুলো চালাতে হবে
let jobs;
if (flag('due')) jobs = computeDue(cfg, state, t);
else {
  const pages = cfg.pages.filter((p) => !opt('page') || opt('page') === 'all' || p.id === opt('page'));
  jobs = pages.flatMap((page) => (page.posts || []).filter((p) => !opt('type') || p.type === opt('type')).map((post) => ({ page, post })));
}
if (!jobs.length) { console.log('করার মতো কিছু নেই।'); process.exit(0); }

// ডেটা ক্যাশ (একই রানে একাধিকবার না আনার জন্য)
const cache = new Map();
const once = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };

function feedUrl(key) {
  const f = cfg.news[key];
  if (!f) throw new Error(`config-এ "${key}" নামে খবরের বিভাগ নেই`);
  return f.url || `https://news.google.com/rss/search?q=${encodeURIComponent(`${f.q} when:1d`)}&hl=bn&gl=BD&ceid=BD:bn`;
}

async function build({ page, post }) {
  const base = { page, t, sample };
  switch (post.type) {
    case 'good-morning': {
      const message = pick(C.MORNING_MESSAGES, `${t.iso}|${page.id}`);
      return { html: T.goodMorning({ ...base, message }), caption: C.captionGoodMorning(page, t, message) };
    }
    case 'weather': {
      const w = sample ? SAMPLE.weather : await once(`w|${page.weatherCity?.name}`, () => getWeather(page.weatherCity));
      return { html: T.weather({ ...base, w }), caption: C.captionWeather(page, t, w) };
    }
    case 'prayer': {
      const p = sample ? SAMPLE.prayer : await once(`p|${page.prayerCity?.name}`, () => getPrayer(page.prayerCity));
      return { html: T.prayer({ ...base, p }), caption: C.captionPrayer(page, t, p) };
    }
    case 'news-list': {
      const count = post.count || 5;
      const items = sample ? SAMPLE.headlines.slice(0, count) : await once(`n|${post.news}|${count}`, () => getHeadlines(feedUrl(post.news), count));
      if (items.length < 3) throw new Error(`"${post.news}" বিভাগে যথেষ্ট খবর পাওয়া যায়নি`);
      const title = post.title || cfg.news[post.news]?.label || 'খবর';
      return { html: T.newsList({ ...base, title, items }), caption: C.captionNewsList(page, t, title, items) };
    }
    case 'single-news': {
      const used = new Set(state.headlines[page.id] || []);
      const items = sample ? SAMPLE.headlines.slice(2, 3) : await getHeadlines(feedUrl(post.news), 1, used);
      if (!items.length) throw new Error(`"${post.news}" বিভাগে নতুন খবর পাওয়া যায়নি`);
      const label = post.label || cfg.news[post.news]?.label || 'খবর';
      return { html: T.singleNews({ ...base, label, item: items[0] }), caption: C.captionSingle(page, t, label, items[0]), headlineKey: items[0].key };
    }
    default: throw new Error(`অজানা পোস্টের ধরন: ${post.type}`);
  }
}

let failed = 0;
const outDir = `out/${t.iso}`;
mkdirSync(outDir, { recursive: true });

for (const job of jobs) {
  const { page, post } = job;
  const name = `${page.id}-${post.time.replace(':', '')}-${post.type}${post.news ? '-' + post.news : ''}`;
  try {
    const card = await build(job);
    const png = await renderCard(card.html, `${outDir}/${name}.png`);
    writeFileSync(`${outDir}/${name}.txt`, card.caption);
    console.log(`🖼️  তৈরি: ${png}`);

    if (dry || sample) { console.log('   (ড্রাই রান — পোস্ট করা হয়নি)'); continue; }
    const cred = credFor(page);
    if (!cred?.id || !cred?.token) { console.log(`   ⚠️ ${page.name}: টোকেন/পেজ আইডি নেই, তাই পোস্ট হয়নি`); continue; }

    const res = await postPhoto({ pageId: cred.id, token: cred.token, imagePath: png, caption: card.caption, graphVersion: cfg.graphVersion });
    console.log(`   ✅ পোস্ট হয়েছে: ${page.name} (post id ${res.post_id || res.id})`);
    (state.days[t.iso] ||= []).push(postKey(page, post));
    if (card.headlineKey) (state.headlines[page.id] ||= []).push(card.headlineKey);
    saveState(state);
  } catch (e) {
    failed++;
    console.error(`❌ ${name}: ${e.message}`);
  }
}

await closeBrowser();
if (failed) { console.error(`\n${failed}টি কাজ ব্যর্থ হয়েছে।`); process.exit(1); }
