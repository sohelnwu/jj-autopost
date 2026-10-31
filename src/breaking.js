// স্বয়ংক্রিয় ব্রেকিং নিউজ: কয়েকটা ফিড থেকে সবচেয়ে আলোচিত, নতুন, আগে না-দেওয়া খবরটা বাছাই।
// ভাইরাল হওয়ার মতো খবর চেনার সংকেত:
//  • কভারেজ — Google News একই খবরের যত বেশি সংবাদমাধ্যমের লিংক একসাথে দেখায়, খবরটা তত বড়
//  • ফিডে অবস্থান — উপরের দিকের খবর বেশি গুরুত্বপূর্ণ
//  • সময় — যত নতুন তত ভালো (৪ ঘণ্টার বেশি পুরোনো বাদ)
//  • শব্দ — বড় ঘটনা/তারকা/খেলার ফল ইত্যাদি শব্দে বাড়তি নম্বর; মতামত/রাশিফল/বিজ্ঞাপনী খবর বাদ
import { parseRSS, headlineKey } from './data.js';

const UA = { 'User-Agent': 'Mozilla/5.0 (JJ-Network-AutoPost)' };

const HOT = ['ব্রেকিং', 'নিহত', 'মৃত্যু', 'আহত', 'গ্রেপ্তার', 'আটক', 'বিস্ফোরণ', 'আগুন', 'অগ্নিকাণ্ড', 'ভূমিকম্প', 'ঘূর্ণিঝড়', 'বন্যা', 'দুর্ঘটনা',
  'জয়', 'হার', 'জিতল', 'হারল', 'রেকর্ড', 'শিরোপা', 'ফাইনাল', 'সেঞ্চুরি', 'গোল', 'বিশ্বকাপ', 'টাইগার', 'সাকিব', 'মুশফিক', 'তামিম', 'মেসি', 'রোনালদো', 'নেইমার',
  'প্রধান উপদেষ্টা', 'প্রধানমন্ত্রী', 'রাষ্ট্রপতি', 'নির্বাচন', 'ইসি', 'হাইকোর্ট', 'রায়', 'ঘোষণা', 'দাম বাড়', 'দাম কম', 'বেতন', 'ছুটি', 'চাকরি',
  'ভাইরাল', 'চাঞ্চল্যকর', 'প্রথমবার', 'অভিনেত্রী', 'অভিনেতা', 'নায়ক', 'নায়িকা', 'বিয়ে', 'তালাক', 'সিনেমা', 'গায়ক'];
const SKIP = ['বার্ষিকী', 'স্মরণে', 'শ্রদ্ধাঞ্জলি', 'শ্রদ্ধা নিবেদন', 'আলোচনা সভা', 'দোয়া মাহফিল', 'মতামত', 'সম্পাদকীয়', 'রাশিফল', 'বিজ্ঞাপন', 'স্পন্সর', 'কুইজ', 'লাইভ আপডেট', 'ছবিতে দেখুন', 'ভিডিও দেখুন', 'দেখে নিন'];

// ছোট শব্দ (জয়, হার, গোল, রায়…) যেন অন্য শব্দের ভেতরে মিলে না যায় — আলাদা শব্দ হিসেবে মেলানো
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const HOT_RX = HOT.map((w) => (w.length <= 4 ? new RegExp(`(^|[\\s,।:'"‘“])${esc(w)}(ে|ের|য়|ী)?(?=$|[\\s,।:!?'"’”])`) : new RegExp(esc(w))));
const hotCount = (t) => HOT_RX.filter((rx) => rx.test(t)).length;

async function fetchFeed(url) {
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) return [];
    const xml = await r.text();
    const items = parseRSS(xml);
    // কভারেজ: প্রতিটা <item>-এর description-এ কয়টা <li> (সম্পর্কিত খবর) আছে
    const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    items.forEach((it, i) => {
      const d = blocks[i] || '';
      it.coverage = Math.max(1, (d.match(/&lt;li&gt;|<li>/g) || []).length);
      it.rank = i;
    });
    return items;
  } catch { return []; }
}

export function scoreItem(it, now = Date.now()) {
  const title = it.title || '';
  if (!title || title.length < 18) return -1;
  if (SKIP.some((w) => title.includes(w))) return -1;
  const ageH = it.date ? (now - Date.parse(it.date)) / 3600000 : 2;
  if (!(ageH >= -1) || ageH > 4) return -1;
  let s = 0;
  s += Math.min(it.coverage || 1, 8) * 6;        // কভারেজ
  s += Math.max(0, 20 - (it.rank || 0) * 2);       // ফিডে অবস্থান
  s += Math.max(0, 18 - ageH * 5);                 // নতুনত্ব
  s += hotCount(title) * 7;
  if ((it.coverage || 1) < 2 && hotCount(title) === 0) s -= 15; // একা একটা সূত্রের সাধারণ খবর — ব্রেকিং নয়
  if (/[?？]$/.test(title)) s -= 6;                  // প্রশ্নবোধক শিরোনাম সাধারণত মতামতধর্মী
  return s;
}

// feeds: [{ url, label }]  used: আগে দেওয়া খবরের key-র Set
export async function pickBreaking(feeds, used, { minScore = 45 } = {}) {
  const lists = await Promise.all(feeds.map(async (f) => (await fetchFeed(f.url)).map((it) => ({ ...it, label: f.label, topic: f.topic }))));
  const now = Date.now();
  const seen = new Set();
  const all = [];
  for (const it of lists.flat()) {
    const key = headlineKey(it.title);
    if (seen.has(key) || used.has(key)) continue;
    seen.add(key);
    const score = scoreItem(it, now);
    if (score >= minScore) all.push({ ...it, key, score });
  }
  all.sort((a, b) => b.score - a.score);
  return all[0] || null;
}
