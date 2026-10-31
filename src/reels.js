// রিলের ধরন অনুযায়ী স্লাইড, বলার লেখা (ভয়েস) আর ক্যাপশন তৈরি
import { readFileSync } from 'node:fs';
import * as S from './reel-slides.js';
import { weatherText } from './templates.js';
import { bn, bnDate, HIJRI_MONTHS } from './util.js';
import { hashtags, ask, followLine, finalize } from './viral.js';
import { noLinks } from './design.js';

const tags = (page, extra = []) => [...extra, ...(page.hashtags || [])].map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');

// "05:12" → "ভোর পাঁচটা বারো মিনিট" না বলে "ভোর ৫টা ১২ মিনিট" (TTS এটা ঠিকভাবে পড়ে)
function sayTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  let part = 'রাত';
  if (h >= 4 && h < 6) part = 'ভোর'; else if (h < 12 && h >= 6) part = 'সকাল'; else if (h >= 12 && h < 15) part = 'দুপুর';
  else if (h >= 15 && h < 17) part = 'বিকেল'; else if (h >= 17 && h < 19) part = 'সন্ধ্যা';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${part} ${bn(h12)}টা ${bn(m)} মিনিট`;
}

// ভয়েসের জন্য লেখা পরিষ্কার: লিংক, উদ্ধৃতিচিহ্ন, ইমোজি, বন্ধনী বাদ; কোলন জায়গায় বিরতি
export const sayClean = (s) => noLinks(s)
  .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
  .replace(/["“”'‘’«»]/g, '')
  .replace(/\s*[:：]\s*/g, '। ')
  .replace(/\s*[—–-]{1,2}\s*/g, ', ')
  .replace(/[()\[\]]/g, '')
  .replace(/\s{2,}/g, ' ').trim();

const outroSlide = (base, line, say) => ({ html: S.outro({ ...base, line }), say: say || `এমন আরও খবর সবার আগে পেতে ${base.page.name} ফলো করুন।`, min: 3 });
const seedOf = (base, x = '') => `${base.t.iso}|${base.page.id}|${x}`;

let LINES;
export const loadLines = () => (LINES ||= JSON.parse(readFileSync('content/lines.json', 'utf8')));

// ---------- খবরের তালিকা ----------
export function reelNews(base, { title, label, items, topic = 'news' }) {
  const slides = [
    { html: S.intro({ ...base, kicker: label, title, sub: bnDate(base.t) }), say: `${base.page.name}-এ আপনাকে স্বাগতম। দেখে নিন ${title}।`, min: 2.5 },
    ...items.map((it, i) => ({
      html: S.headline({ ...base, n: i + 1, total: items.length, label, title: it.title, source: it.source }),
      say: `${i === 0 ? 'প্রথম খবর' : i === items.length - 1 ? 'আর শেষ খবর' : `${bn(i + 1)} নম্বরে`}। ${sayClean(it.title)}।`, min: 3.5,
    })),
    outroSlide(base),
  ];
  const list = items.map((it, i) => `${bn(i + 1)}. ${noLinks(it.title)}${it.source ? ` — ${noLinks(it.source)}` : ''}`).join('\n');
  const caption = finalize(`🎬 ${title} | ১ মিনিটে দিনের সব গুরুত্বপূর্ণ খবর

${list}

(শিরোনাম উল্লিখিত সংবাদমাধ্যম থেকে সংকলিত)

${ask('list', seedOf(base, title))}
${followLine(base.page)}

${hashtags(base.page, topic, { reel: true })}`);
  return { slides, caption };
}

// ---------- ব্রেকিং ----------
export function reelBreaking(base, { item, topic = 'breaking' }) {
  const slides = [
    { html: S.breaking({ ...base, title: item.title, source: item.source }), say: `ব্রেকিং নিউজ। ${sayClean(item.title)}।${item.source ? ` খবরটি জানিয়েছে ${sayClean(item.source)}।` : ''}`, min: 5 },
    outroSlide(base),
  ];
  const caption = finalize(`🔴 ব্রেকিং নিউজ | ${noLinks(item.title)}

🗞️ সূত্র: ${noLinks(item.source || 'সংশ্লিষ্ট সংবাদমাধ্যম')}

${ask('news', seedOf(base, item.title))}
${followLine(base.page)}

${hashtags(base.page, topic === 'sports' ? 'sports' : 'breaking', { reel: true })}`);
  return { slides, caption };
}

// ---------- আবহাওয়া + নামাজ ----------
export function reelWeatherPrayer(base, { w, p }) {
  const m = w.main;
  const hottest = [...w.divisions].sort((a, b) => b.max - a.max)[0];
  const T = p.times;
  const slides = [
    { html: S.weatherMain({ ...base, w }), say: `আজ ${m.name}-র আকাশ ${weatherText(m.code)}। সর্বোচ্চ তাপমাত্রা ${bn(m.max)} ডিগ্রি, আর সর্বনিম্ন ${bn(m.min)} ডিগ্রি সেলসিয়াস।${m.rain != null && m.rain >= 30 ? ` বৃষ্টির সম্ভাবনা ${bn(m.rain)} শতাংশ, তাই ছাতা সঙ্গে রাখুন।` : ''}`, min: 4 },
    { html: S.weatherGrid({ ...base, w }), say: `বিভাগীয় শহরগুলোর মধ্যে আজ সবচেয়ে বেশি তাপমাত্রা থাকতে পারে ${hottest.name} এলাকায়, ${bn(hottest.max)} ডিগ্রি সেলসিয়াস।`, min: 4 },
    { html: S.prayer({ ...base, p }), say: `এবার দেখে নিন ${p.city} ও আশপাশের নামাজের সময়। ফজর ${sayTime(T.fajr)}, যোহর ${sayTime(T.dhuhr)}, আসর ${sayTime(T.asr)}, মাগরিব ${sayTime(T.maghrib)}, আর এশা ${sayTime(T.isha)}।`, min: 5 },
    outroSlide(base, 'প্রতিদিনের আবহাওয়া আর নামাজের সময় পেতে পেজটি ফলো করুন।'),
  ];
  const hijri = p.hijri ? ` | ${bn(p.hijri.day)} ${HIJRI_MONTHS[p.hijri.month - 1]} ${bn(p.hijri.year)} হিজরি` : '';
  const caption = finalize(`🌤️ আজকের আবহাওয়া ও 🕌 নামাজের সময় — এক রিলেই সব!
📅 ${bnDate(base.t)}${hijri}

📍 ${m.name}: ${weatherText(m.code)}, ${bn(m.max)}° / ${bn(m.min)}°
🔥 সবচেয়ে গরম: ${hottest.name} (${bn(hottest.max)}°)

(পূর্বাভাস Open-Meteo থেকে; নামাজের সময় স্থানভেদে কয়েক মিনিট আগে-পরে হতে পারে)

${ask('weather', seedOf(base, 'wp'))}
${followLine(base.page)}

${hashtags(base.page, 'weather', { reel: true, extra: ['নামাজেরসময়'] })}`);
  return { slides, caption };
}

// ---------- শুভ সকাল ----------
export function reelMorning(base, { message }) {
  const slides = [
    { html: S.morning({ ...base, message }), say: `শুভ সকাল। ${sayClean(message)}`, min: 5 },
    outroSlide(base, 'প্রতিদিন সকালে নতুন শুভেচ্ছা পেতে পেজটি ফলো করুন।', `প্রতিদিনের শুভেচ্ছা পেতে ${base.page.name} ফলো করুন।`),
  ];
  const caption = finalize(`☀️ শুভ সকাল!

"${message}"

📅 ${bnDate(base.t)}

${ask('morning', seedOf(base, 'rm'))}

${hashtags(base.page, 'morning', { reel: true })}`);
  return { slides, caption };
}

// ---------- লেখা (ভালোবাসা / মনের কথা / অনুপ্রেরণা / একটু হাসি …) ----------
export function reelLines(base, { kind, lines }) {
  const label = loadLines().labels[kind] || kind;
  const slides = [
    { html: S.intro({ ...base, kicker: label, title: label, sub: lines.length > 1 ? `শেষ পর্যন্ত দেখুন, ${bn(lines.length)} নম্বরটা মন ছুঁয়ে যাবে` : '' }), say: '', min: 2 },
    ...lines.map((text, i) => ({ html: S.quote({ ...base, kind, label, text, n: i + 1, total: lines.length }), say: sayClean(text), min: 4.5 })),
    outroSlide(base, 'এমন আরও কথা পেতে পেজটি ফলো করুন।', `এমন আরও কথা শুনতে ${base.page.name} ফলো করুন।`),
  ];
  const caption = finalize(`${kind === 'fun' ? '😂' : kind === 'love' ? '❤️' : kind === 'motivation' ? '🔥' : '💭'} ${lines[0]}

${lines.slice(1).map((l) => `✨ ${l}`).join('\n\n')}

${ask(kind === 'fun' ? 'fun' : 'lines', seedOf(base, kind))}
${followLine(base.page)}

${hashtags(base.page, kind, { reel: true })}`);
  return { slides, caption };
}
