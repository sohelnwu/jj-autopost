// স্টুডিও জব: PWA অ্যাপ থেকে অনুরোধ এলে বিষয়ভিত্তিক "এই মুহূর্তের ভাইরাল" খবর খুঁজে
// রিল আর ফটোকার্ড বানায়, তারপর dist/ ফোল্ডারে রাখে (workflow সেগুলো GitHub Release-এ তোলে)।
//
// ইনপুট (STUDIO_JOB env, JSON):
// { id, topic: 'politics-bd'|...|'random'|'custom', query, count, outputs: ['reel','card','headlines-reel','headlines-card'],
//   channel: { pageId, name, accent } }
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { loadConfig } from './due.js';
import { fetchFeed, scoreItem } from './breaking.js';
import { headlineKey } from './data.js';
import { dhakaNow, bnDate, bn } from './util.js';
import * as K from './cards.js';
import * as C from './captions.js';
import * as R from './reels.js';
import { renderCard, closeBrowser, getBrowser } from './render.js';
import { buildNewsReel } from './newsreel.js';
import { voiceStatus } from './voice.js';
import { noLinks } from './design.js';
import { newsDetail } from './detail.js';

// একসাথে limitটা কাজ (রিল রেন্ডার সমান্তরালে — সময় বাঁচে)
async function pool(list, limit, fn) {
  const out = new Array(list.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (next < list.length) { const i = next++; out[i] = await fn(list[i], i); }
  }));
  return out;
}

// বিষয় → খোঁজার শব্দ (Google News)
export const TOPICS = {
  'random': { label: 'এই মুহূর্তের ভাইরাল', topic: 'news', feeds: ['@top', 'বাংলাদেশ', 'খেলা', 'বিনোদন', 'আন্তর্জাতিক'] },
  'bangladesh': { label: 'দেশের খবর', topic: 'news', feeds: ['@top', 'বাংলাদেশ'] },
  'politics-bd': { label: 'দেশের রাজনীতি', topic: 'politics', feeds: ['রাজনীতি বাংলাদেশ', 'বিএনপি OR আওয়ামী লীগ OR জামায়াত OR এনসিপি', 'নির্বাচন বাংলাদেশ'] },
  'politics-world': { label: 'বিশ্ব রাজনীতি', topic: 'world', feeds: ['আন্তর্জাতিক রাজনীতি', 'যুক্তরাষ্ট্র OR ভারত OR চীন OR রাশিয়া', 'যুদ্ধ OR হামলা আন্তর্জাতিক'] },
  'cricket': { label: 'ক্রিকেট', topic: 'sports', feeds: ['ক্রিকেট', 'বাংলাদেশ ক্রিকেট দল', 'টাইগার ক্রিকেট'] },
  'football': { label: 'ফুটবল', topic: 'sports', feeds: ['ফুটবল', 'বাংলাদেশ ফুটবল', 'চ্যাম্পিয়নস লিগ OR প্রিমিয়ার লিগ OR লা লিগা'] },
  'sports': { label: 'খেলাধুলা', topic: 'sports', feeds: ['খেলা', 'ক্রিকেট', 'ফুটবল'] },
  'messi': { label: 'মেসি', topic: 'sports', feeds: ['মেসি', 'লিওনেল মেসি'] },
  'ronaldo': { label: 'রোনালদো', topic: 'sports', feeds: ['রোনালদো', 'ক্রিস্টিয়ানো রোনালদো'] },
  'players': { label: 'তারকা খেলোয়াড়', topic: 'sports', feeds: ['সাকিব OR মুশফিক OR মিরাজ OR শান্ত', 'মেসি OR রোনালদো OR নেইমার OR এমবাপ্পে'] },
  'entertainment': { label: 'বিনোদন', topic: 'entertainment', feeds: ['বিনোদন', 'সিনেমা OR নাটক', 'নায়ক OR নায়িকা OR অভিনেত্রী'] },
  'economy': { label: 'অর্থনীতি', topic: 'news', feeds: ['অর্থনীতি', 'দাম বাড়ল OR দাম কমল', 'বাজেট OR ডলার'] },
  'tech': { label: 'প্রযুক্তি', topic: 'news', feeds: ['প্রযুক্তি', 'মোবাইল OR ইন্টারনেট OR এআই'] },
};

const feedUrl = (q) => (q === '@top'
  ? 'https://news.google.com/rss?hl=bn&gl=BD&ceid=BD:bn'
  : `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:1d`)}&hl=bn&gl=BD&ceid=BD:bn`);

// শিরোনাম দুটো একই ঘটনার কিনা — বিশেষ শব্দের মিল দেখে (সাধারণ শব্দ বাদ)
const COMMON = new Set(['বাংলাদেশ', 'বাংলাদেশের', 'ক্রিকেট', 'ফুটবল', 'খেলা', 'দলের', 'সরকার', 'সরকারের', 'নিয়ে', 'থেকে', 'জন্য', 'বিরুদ্ধে', 'হবে', 'হলো', 'করে', 'করল', 'বললেন', 'দিলেন', 'আজ', 'আজকের', 'নতুন', 'পর', 'আগে', 'এবার', 'কেন', 'কী', 'যা', 'টেস্ট', 'ম্যাচ', 'ম্যাচে']);
const words = (t) => [...new Set(String(t).toLowerCase().replace(/[^\u0980-\u09FFa-z0-9\s]/g, ' ').split(/\s+/)
  .filter((w) => w.length >= 3 && !COMMON.has(w)))];
// একই শব্দের রূপ (হাসান/হাসানের, রেকর্ড/রেকর্ডের): ছোটটার প্রায় পুরোটা বড়টার শুরুতে আছে
const wordMatch = (x, y) => { const [a, b] = x.length <= y.length ? [x, y] : [y, x]; const k = Math.max(3, a.length - 2); return b.startsWith(a.slice(0, k)) && a.length >= 3; };
export function sameStory(a, b) {
  const A = words(a), B = words(b); if (!A.length || !B.length) return false;
  const hit = A.filter((w) => B.some((v) => wordMatch(w, v))).length;
  return hit >= 3 || hit / Math.min(A.length, B.length) >= 0.5;
}

export async function findViral({ topic, query, count }) {
  const T = topic === 'custom' ? { label: query || 'খবর', topic: 'news', feeds: [query] } : (TOPICS[topic] || TOPICS.random);
  const lists = await Promise.all(T.feeds.filter(Boolean).map((q) => fetchFeed(feedUrl(q))));
  const now = Date.now(); const seen = new Set(); const all = [];
  for (const it of lists.flat()) {
    const key = headlineKey(it.title);
    if (!it.title || seen.has(key)) continue;
    seen.add(key);
    const score = scoreItem(it, now, 24);
    if (score > 0) all.push({ ...it, key, score, label: T.label, topic: T.topic });
  }
  all.sort((a, b) => b.score - a.score);
  // একই ঘটনার একাধিক সংবাদমাধ্যমের শিরোনাম — শুধু সবচেয়ে ভালোটা রাখা
  const picked = [];
  for (const it of all) {
    if (picked.length >= count) break;
    if (picked.some((p) => sameStory(p.title, it.title))) continue;
    picked.push(it);
  }
  return { label: T.label, topic: T.topic, items: picked };
}

export async function main() {
  const job = JSON.parse(process.env.STUDIO_JOB || '{}');
  const cfg = loadConfig();
  const count = Math.max(1, Math.min(10, Number(job.count) || 5));
  const outputs = new Set(job.outputs?.length ? job.outputs : ['reel', 'card']);
  const base0 = cfg.pages.find((p) => p.id === job.channel?.pageId) || cfg.pages[0];
  const page = { ...base0, theme: { ...base0.theme } };
  if (job.channel?.name) { page.name = noLinks(job.channel.name).slice(0, 30); page.logoText = page.name; page.hashtags = [page.name.replace(/[^\p{L}\p{N}]/gu, '')].filter(Boolean); }
  if (/^#[0-9a-f]{6}$/i.test(job.channel?.accent || '')) page.theme.accent = job.channel.accent;
  const t = dhakaNow();
  const base = { page, t, sample: false };

  const { label, topic, items } = await findViral({ topic: job.topic || 'random', query: job.query, count });
  console.log(`📰 "${label}" — ${items.length}টা খবর পাওয়া গেছে`);
  items.forEach((x, i) => console.log(`   ${i + 1}. ${x.title} — ${x.source} (স্কোর ${Math.round(x.score)})`));
  if (!items.length) throw new Error('এই বিষয়ে গত ২৪ ঘণ্টায় কোনো খবর পাওয়া যায়নি। অন্য শব্দ দিয়ে চেষ্টা করুন।');

  mkdirSync('dist', { recursive: true });
  const manifest = { id: job.id, label, topic: job.topic, query: job.query || '', channel: page.name, date: bnDate(t), created: new Date().toISOString(), files: [] };
  const voice = { geminiVoice: page.geminiVoice || 'Kore', edgeVoice: page.reelVoice || cfg.reelVoice, edgeRate: page.newsVoiceRate || '+8%' };
  const add = (file, kind, title, caption, extra = {}) => manifest.files.push({ file, kind, title: noLinks(title), caption, ...extra });

  const cardLabel = topic === 'sports' ? 'খেলার খবর' : label;
  const order = []; // ফাইলগুলো খবরের ক্রমে সাজানো থাকবে
  if (outputs.has('card')) {
    for (const [i, it] of items.entries()) {
      const n = String(i + 1).padStart(2, '0');
      const png = await renderCard(K.singleNews({ ...base, label: cardLabel, item: it, breaking: true }), `out/studio/card-${n}.png`);
      copyFileSync(png, `dist/card-${n}.png`);
      order.push([i, 0, { file: `card-${n}.png`, kind: 'card', title: noLinks(it.title), caption: C.captionSingle(page, t, 'ব্রেকিং', it, topic), source: it.source }]);
      console.log(`🖼️ কার্ড ${n} তৈরি`);
    }
  }
  if (outputs.has('reel')) {
    // ১) প্রতিটা খবরের বিস্তারিত (Google Search থেকে আসল প্রতিবেদন পড়ে)
    // সব খবরের পাতা একসাথে পড়া (সময় বাঁচে), তারপর Gemini একটা একটা করে
    const { fetchArticle } = await import('./article.js');
    await Promise.all(items.map(async (it) => { it.article = await fetchArticle(it).catch(() => null); }));
    const deadline = Date.now() + 240000; // বিস্তারিত লেখার জন্য সর্বোচ্চ ৪ মিনিট
    await pool(items, 3, async (it) => {
      it.detail = await newsDetail(it, { deadline }).catch(() => null);
      console.log(it.detail ? `📝 বিস্তারিত পাওয়া গেছে (${it.detail.words} শব্দ): ${it.title.slice(0, 50)}` : `⚠️ বিস্তারিত পাওয়া যায়নি — শুধু শিরোনামের রিল: ${it.title.slice(0, 50)}`);
    });
    // ২) রিল — তিনটা একসাথে রেন্ডার
    await pool(items, 3, async (it, i) => {
      const n = String(i + 1).padStart(2, '0');
      // ইংরেজি-মেশানো শিরোনাম হলে Gemini-র বাংলা শিরোনাম দেখানো ও পড়া
      const latin = (it.title.match(/[A-Za-z]/g) || []).length / it.title.length;
      const shown = latin > 0.25 && it.detail?.headline && !it.detail.extractive ? it.detail.headline : it.title;
      const r = await buildNewsReel({ page, t, dateText: bnDate(t), breaking: true, items: [{ ...it, title: shown, label: 'ব্রেকিং', topic }], outDir: 'out/studio', name: `reel-${n}`, getBrowser, seed: `${t.iso}|${job.id}|${n}`, voice });
      copyFileSync(r.file, `dist/reel-${n}.mp4`);
      let caption = R.reelBreaking(base, { item: it, topic }).caption;
      if (it.detail) { const parts = caption.split('\n\n'); parts.splice(1, 0, it.detail.sentences.join(' ')); caption = parts.join('\n\n'); }
      order.push([i, 1, { file: `reel-${n}.mp4`, kind: 'reel', title: noLinks(it.title), caption, seconds: Math.round(r.seconds), source: it.source, ...(it.detail ? (it.detail.extractive ? { note: 'বিস্তারিত অংশ সংবাদমাধ্যমের লেখা থেকে নেওয়া — প্রকাশের আগে একবার দেখে নিন' } : {}) : { note: 'বিস্তারিত খবর পাওয়া যায়নি, তাই শুধু শিরোনাম' }) }]);
      console.log(`🎬 রিল ${n} তৈরি (${r.seconds.toFixed(0)} সেকেন্ড)`);
    });
  }
  order.sort((x, y) => x[0] - y[0] || x[1] - y[1]).forEach(([, , f]) => manifest.files.push(f));
  if (items.length > 1 && outputs.has('headlines-reel')) {
    const title = `${label}: সংবাদ শিরোনাম`;
    const r = await buildNewsReel({ page, t, dateText: bnDate(t), title, kicker: label, items: items.map(({ detail, ...x }) => ({ ...x, label })), outDir: 'out/studio', name: 'headlines', getBrowser, seed: `${t.iso}|${job.id}|h`, voice });
    copyFileSync(r.file, 'dist/headlines-reel.mp4');
    add('headlines-reel.mp4', 'reel', title, R.reelNews(base, { title, label, items, topic }).caption, { seconds: Math.round(r.seconds) });
    console.log('🎬 সংবাদ শিরোনাম রিল তৈরি');
  }
  if (items.length > 1 && outputs.has('headlines-card')) {
    const title = `${label}: সেরা ${bn(items.length)} খবর`;
    const png = await renderCard(K.newsList({ ...base, title, items }), 'out/studio/headlines-card.png');
    copyFileSync(png, 'dist/headlines-card.png');
    add('headlines-card.png', 'card', title, C.captionNewsList(page, t, title, items, topic));
    console.log('🖼️ সেরা খবর কার্ড তৈরি');
  }
  manifest.voice = [...voiceStatus.used].join('+') || 'নেই';
  manifest.news = items.map((x) => ({ title: noLinks(x.title), source: noLinks(x.source || '') }));
  writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 1));
  await closeBrowser();
  console.log(`✅ শেষ: ${manifest.files.length}টা ফাইল`);
}

if (process.argv[1]?.endsWith('studio.js')) {
  main().catch(async (e) => {
    console.error(`❌ ${e.message}`);
    mkdirSync('dist', { recursive: true });
    if (!existsSync('dist/manifest.json')) writeFileSync('dist/manifest.json', JSON.stringify({ error: e.message, files: [] }));
    await closeBrowser().catch(() => {});
    process.exit(1);
  });
}
