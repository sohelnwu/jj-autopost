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
import * as T from './cards.js';
import * as C from './captions.js';
import { renderCard, closeBrowser } from './render.js';
import { postPhoto, postReel } from './facebook.js';
import { resolveTokens, hasAnyToken } from './tokens.js';
import * as R from './reels.js';
import { REEL_SIZE } from './reel-slides.js';
import { tts, buildReel } from './video.js';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };

const cfg = loadConfig();
const state = loadState();
const t = dhakaNow();
const sample = flag('sample');
const dry = flag('dry') || process.env.DRY_RUN === 'true';

// টোকেন: FB_PAGE_TOKENS Secret (ধরনগুলো src/tokens.js-এ লেখা আছে)
let creds = {};
if (hasAnyToken() && !sample) {
  try { creds = await resolveTokens(cfg); } catch (e) { console.error(`⚠️ ${e.message}`); }
  for (const p of cfg.pages) {
    const c = creds[p.id];
    console.log(c ? `🔑 ${p.name} → ফেসবুক পেজ "${c.fbName}" (id ${c.id})` : `🔑 ${p.name} → টোকেন নেই`);
    if (process.env.GITHUB_ACTIONS) console.log(`::notice title=টোকেন যাচাই::${p.name} → ${c ? `"${c.fbName}" (id ${c.id})` : 'টোকেন নেই'}`);
  }
}
const credFor = (page) => creds[page.id] || null;
if (opt('type') === 'check-tokens') {
  console.log(hasAnyToken() ? `\n${Object.keys(creds).length}টি পেজের টোকেন ঠিক আছে।` : 'FB_PAGE_TOKENS Secret সেট করা নেই।');
  process.exit(0);
}

// কোন কাজগুলো চালাতে হবে
let jobs;
if (flag('due')) jobs = computeDue(cfg, state, t, new Set(Object.keys(creds)));
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

const topicOf = (k) => (['sports', 'cricket', 'football'].includes(k) ? 'sports' : k === 'politics' ? 'politics' : 'news');

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
      return { html: T.newsList({ ...base, title, items }), caption: C.captionNewsList(page, t, title, items, topicOf(post.news)) };
    }
    case 'single-news': {
      const used = new Set(state.headlines[page.id] || []);
      const items = sample ? SAMPLE.headlines.slice(2, 3) : await getHeadlines(feedUrl(post.news), 1, used);
      if (!items.length) throw new Error(`"${post.news}" বিভাগে নতুন খবর পাওয়া যায়নি`);
      const label = post.label || cfg.news[post.news]?.label || 'খবর';
      return { html: T.singleNews({ ...base, label, item: items[0], breaking: !!post.breaking }), caption: C.captionSingle(page, t, post.breaking ? 'ব্রেকিং' : label, items[0], topicOf(post.news)), headlineKey: items[0].key };
    }
    // ---------- রিল ----------
    case 'reel-news': {
      const count = post.count || 5;
      const items = sample ? SAMPLE.headlines.slice(0, count) : await once(`n|${post.news}|${count}`, () => getHeadlines(feedUrl(post.news), count));
      if (items.length < 3) throw new Error(`"${post.news}" বিভাগে যথেষ্ট খবর পাওয়া যায়নি`);
      const label = cfg.news[post.news]?.label || 'খবর';
      return { reel: R.reelNews(base, { title: post.title || `${label}: সেরা ${items.length}`, label, items, topic: topicOf(post.news) }) };
    }
    case 'reel-breaking': {
      const used = new Set(state.headlines[page.id] || []);
      const items = sample ? SAMPLE.headlines.slice(0, 1) : await getHeadlines(feedUrl(post.news), 1, used);
      if (!items.length) throw new Error(`"${post.news}" বিভাগে নতুন খবর পাওয়া যায়নি`);
      return { reel: R.reelBreaking(base, { item: items[0], topic: topicOf(post.news) }), headlineKey: items[0].key };
    }
    case 'reel-weather-prayer': {
      const w = sample ? SAMPLE.weather : await once(`w|${page.weatherCity?.name}`, () => getWeather(page.weatherCity));
      const p = sample ? SAMPLE.prayer : await once(`p|${page.prayerCity?.name}`, () => getPrayer(page.prayerCity));
      return { reel: R.reelWeatherPrayer(base, { w, p }) };
    }
    case 'reel-morning': {
      const message = pick(C.MORNING_MESSAGES, `${t.iso}|${page.id}|reel`);
      return { reel: R.reelMorning(base, { message }) };
    }
    case 'reel-lines': {
      const all = R.loadLines()[post.lines] || [];
      if (!all.length) throw new Error(`content/lines.json-এ "${post.lines}" তালিকা নেই`);
      const usedKey = `${page.id}|lines|${post.lines}`;
      let used = new Set(state.headlines[usedKey] || []);
      if (all.filter((l) => !used.has(l)).length < (post.count || 3)) used = new Set(); // সব শেষ হলে আবার শুরু
      const fresh = all.filter((l) => !used.has(l));
      const start = Math.abs([...`${t.iso}${page.id}`].reduce((a, c) => (Math.imul(a, 31) + c.codePointAt(0)) | 0, 7)) % fresh.length;
      const lines = Array.from({ length: Math.min(post.count || 3, fresh.length) }, (_, i) => fresh[(start + i) % fresh.length]);
      return { reel: R.reelLines(base, { kind: post.lines, lines }), usedLines: { key: usedKey, lines, reset: used.size === 0 } };
    }
    default: throw new Error(`অজানা পোস্টের ধরন: ${post.type}`);
  }
}

// রিল: প্রতিটা স্লাইড ছবি → ভয়েস → ভিডিও
async function makeReel(page, reel, name) {
  const dir = `${outDir}/${name}`;
  mkdirSync(dir, { recursive: true });
  const voice = page.reelVoice || cfg.reelVoice || 'bn-BD-NabanitaNeural';
  const slides = [];
  for (const [i, s] of reel.slides.entries()) {
    const png = await renderCard(s.html, `${dir}/s${i}.png`, REEL_SIZE);
    const mp3 = s.say ? tts(s.say, `${dir}/s${i}.mp3`, voice, cfg.reelVoiceRate || '+0%') : null;
    slides.push({ png, voice: mp3, min: s.min });
  }
  const out = buildReel(slides, `${outDir}/${name}.mp4`, `${t.iso}|${page.id}|${name}`);
  const voiced = slides.filter((x) => x.voice).length;
  console.log(`🎬 রিল তৈরি: ${out.file} (${out.seconds.toFixed(1)} সেকেন্ড, ভয়েস ${voiced ? 'আছে' : 'নেই'})`);
  if (process.env.GITHUB_ACTIONS) console.log(`::notice title=রিল তৈরি::${name} — ${out.seconds.toFixed(0)} সেকেন্ড, ভয়েস ${voiced ? 'আছে' : 'নেই'}`);
  return out.file;
}

let failed = 0;
const outDir = `out/${t.iso}`;
mkdirSync(outDir, { recursive: true });

for (const job of jobs) {
  const { page, post } = job;
  const name = `${page.id}-${post.time.replace(':', '')}-${post.type}${(post.news || post.lines) ? '-' + (post.news || post.lines) : ''}`;
  try {
    const card = await build(job);
    let media;
    if (card.reel) {
      media = await makeReel(page, card.reel, name);
      card.caption = card.reel.caption;
    } else {
      media = await renderCard(card.html, `${outDir}/${name}.png`);
      console.log(`🖼️  তৈরি: ${media}`);
    }
    writeFileSync(`${outDir}/${name}.txt`, card.caption);

    if (dry || sample) { console.log('   (ড্রাই রান — পোস্ট করা হয়নি)'); continue; }
    const cred = credFor(page);
    if (!cred?.id || !cred?.token) { console.log(`   ⚠️ ${page.name}: টোকেন/পেজ আইডি নেই, তাই পোস্ট হয়নি`); continue; }

    if (card.reel) {
      const res = await postReel({ pageId: cred.id, token: cred.token, videoPath: media, caption: card.caption, graphVersion: cfg.graphVersion });
      console.log(`   ✅ ${res.as === 'reel' ? 'রিল' : 'ভিডিও'} পোস্ট হয়েছে: ${page.name} (id ${res.id})`);
    } else {
      const res = await postPhoto({ pageId: cred.id, token: cred.token, imagePath: media, caption: card.caption, graphVersion: cfg.graphVersion });
      console.log(`   ✅ পোস্ট হয়েছে: ${page.name} (post id ${res.post_id || res.id})`);
    }
    (state.days[t.iso] ||= []).push(postKey(page, post));
    if (card.headlineKey) (state.headlines[page.id] ||= []).push(card.headlineKey);
    if (card.usedLines) {
      const u = card.usedLines;
      state.headlines[u.key] = [...(u.reset ? [] : (state.headlines[u.key] || [])), ...u.lines];
    }
    saveState(state);
  } catch (e) {
    failed++;
    console.error(`❌ ${name}: ${e.message}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=${name}::${e.message.replace(/\n/g, ' ')}`);
  }
}

await closeBrowser();
if (failed) { console.error(`\n${failed}টি কাজ ব্যর্থ হয়েছে।`); process.exit(1); }
