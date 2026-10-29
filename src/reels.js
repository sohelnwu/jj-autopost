// রিলের ধরন অনুযায়ী স্লাইড, বলার লেখা (ভয়েস) আর ক্যাপশন তৈরি
import { readFileSync } from 'node:fs';
import * as S from './reel-slides.js';
import { weatherText } from './templates.js';
import { bn, bnDate, HIJRI_MONTHS } from './util.js';

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

const outroSlide = (base, line) => ({ html: S.outro({ ...base, line }), say: `আরও আপডেট পেতে ${base.page.name} পেজটি ফলো করুন।`, min: 3 });

let LINES;
export const loadLines = () => (LINES ||= JSON.parse(readFileSync('content/lines.json', 'utf8')));

// ---------- খবরের তালিকা ----------
export function reelNews(base, { title, label, items }) {
  const slides = [
    { html: S.intro({ ...base, kicker: label, title, sub: bnDate(base.t) }), say: `${title}।`, min: 2.5 },
    ...items.map((it, i) => ({
      html: S.headline({ ...base, n: i + 1, total: items.length, label, title: it.title, source: it.source }),
      say: `${bn(i + 1)}. ${it.title}।`, min: 3.5,
    })),
    outroSlide(base),
  ];
  const list = items.map((it, i) => `${bn(i + 1)}. ${it.title}${it.source ? ` (${it.source})` : ''}`).join('\n');
  const caption = `📰 ${title} — ${bnDate(base.t)}\n\n${list}\n\nশিরোনামগুলো সংশ্লিষ্ট সংবাদমাধ্যম থেকে সংকলিত।\n\n${tags(base.page, ['খবর', 'reels'])}`;
  return { slides, caption };
}

// ---------- ব্রেকিং ----------
export function reelBreaking(base, { item }) {
  const slides = [
    { html: S.breaking({ ...base, title: item.title, source: item.source }), say: `ব্রেকিং নিউজ। ${item.title}।`, min: 5 },
    outroSlide(base),
  ];
  const caption = `🔴 ব্রেকিং: ${item.title}\n\nসূত্র: ${item.source || 'সংশ্লিষ্ট সংবাদমাধ্যম'}\n\n${tags(base.page, ['ব্রেকিংনিউজ', 'reels'])}`;
  return { slides, caption };
}

// ---------- আবহাওয়া + নামাজ ----------
export function reelWeatherPrayer(base, { w, p }) {
  const m = w.main;
  const hottest = [...w.divisions].sort((a, b) => b.max - a.max)[0];
  const T = p.times;
  const slides = [
    { html: S.weatherMain({ ...base, w }), say: `আজ ${m.name}র আবহাওয়া ${weatherText(m.code)}। সর্বোচ্চ তাপমাত্রা ${bn(m.max)} ডিগ্রি, সর্বনিম্ন ${bn(m.min)} ডিগ্রি সেলসিয়াস।${m.rain != null && m.rain >= 30 ? ` বৃষ্টির সম্ভাবনা ${bn(m.rain)} শতাংশ।` : ''}`, min: 4 },
    { html: S.weatherGrid({ ...base, w }), say: `বিভাগীয় শহরগুলোর মধ্যে আজ সবচেয়ে বেশি তাপমাত্রা থাকতে পারে ${hottest.name} এলাকায়, ${bn(hottest.max)} ডিগ্রি সেলসিয়াস।`, min: 4 },
    { html: S.prayer({ ...base, p }), say: `${p.city} ও আশপাশের নামাজের সময়। ফজর ${sayTime(T.fajr)}, যোহর ${sayTime(T.dhuhr)}, আসর ${sayTime(T.asr)}, মাগরিব ${sayTime(T.maghrib)}, এবং এশা ${sayTime(T.isha)}।`, min: 5 },
    outroSlide(base),
  ];
  const hijri = p.hijri ? `🌙 ${bn(p.hijri.day)} ${HIJRI_MONTHS[p.hijri.month - 1]} ${bn(p.hijri.year)} হিজরি\n` : '';
  const caption = `🌤️ আজকের আবহাওয়া ও 🕌 নামাজের সময় — ${bnDate(base.t)}\n${hijri}\n📍 ${m.name}: ${weatherText(m.code)}, ${bn(m.max)}°/${bn(m.min)}°\n\n(পূর্বাভাস ও নামাজের সময় স্বয়ংক্রিয় হিসাব; স্থানভেদে কিছুটা পার্থক্য হতে পারে)\n\n${tags(base.page, ['আবহাওয়া', 'নামাজেরসময়', 'reels'])}`;
  return { slides, caption };
}

// ---------- শুভ সকাল ----------
export function reelMorning(base, { message }) {
  const slides = [
    { html: S.morning({ ...base, message }), say: `শুভ সকাল। ${message}`, min: 5 },
    outroSlide(base, 'প্রতিদিন সকালে নতুন শুভেচ্ছা পেতে পেজটি ফলো করুন।'),
  ];
  return { slides, caption: `☀️ শুভ সকাল!\n\n${message}\n\n📅 ${bnDate(base.t)}\n\n${tags(base.page, ['শুভসকাল', 'reels'])}` };
}

// ---------- লেখা (ভালোবাসা / মনের কথা / অনুপ্রেরণা / একটু হাসি …) ----------
export function reelLines(base, { kind, lines }) {
  const label = loadLines().labels[kind] || kind;
  const slides = [
    { html: S.intro({ ...base, kicker: label, title: label, sub: lines.length > 1 ? `আজকের ${bn(lines.length)}টি কথা` : '' }), say: '', min: 2 },
    ...lines.map((text, i) => ({ html: S.quote({ ...base, kind, label, text, n: i + 1, total: lines.length }), say: text, min: 4.5 })),
    outroSlide(base),
  ];
  const caption = `${lines.map((l) => `💬 ${l}`).join('\n\n')}\n\nভালো লাগলে শেয়ার করুন, আপনার কথাটা কমেন্টে লিখুন।\n\n${tags(base.page, [label.replace(/\s+/g, ''), 'reels'])}`;
  return { slides, caption };
}
