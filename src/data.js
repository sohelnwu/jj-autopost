// ডেটা সংগ্রহ: আবহাওয়া (Open-Meteo), নামাজের সময় (Aladhan), খবরের শিরোনাম (RSS)
import { dhakaNow } from './util.js';

const UA = { 'User-Agent': 'Mozilla/5.0 (JJ-Network-AutoPost)' };

async function safeFetch(url) {
  try { return await fetch(url, { headers: UA }); }
  catch (e) { throw new Error(`ডেটা আনা যায়নি (${new URL(url).host}): ${e.cause?.code || e.message}`); }
}

async function getJSON(url) {
  const r = await safeFetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// ---------- আবহাওয়া ----------
export const DIVISIONS = [
  { name: 'ঢাকা', lat: 23.8103, lon: 90.4125 },
  { name: 'চট্টগ্রাম', lat: 22.3569, lon: 91.7832 },
  { name: 'রাজশাহী', lat: 24.3745, lon: 88.6042 },
  { name: 'খুলনা', lat: 22.8456, lon: 89.5403 },
  { name: 'বরিশাল', lat: 22.701, lon: 90.3535 },
  { name: 'সিলেট', lat: 24.8949, lon: 91.8687 },
  { name: 'রংপুর', lat: 25.7439, lon: 89.2752 },
  { name: 'ময়মনসিংহ', lat: 24.7471, lon: 90.4203 },
];

async function weatherFor(place) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}`
    + '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset'
    + '&timezone=Asia%2FDhaka&forecast_days=1';
  const j = await getJSON(u);
  return {
    name: place.name,
    now: Math.round(j.current?.temperature_2m),
    humidity: Math.round(j.current?.relative_humidity_2m),
    wind: Math.round(j.current?.wind_speed_10m),
    code: j.daily?.weather_code?.[0] ?? j.current?.weather_code,
    max: Math.round(j.daily?.temperature_2m_max?.[0]),
    min: Math.round(j.daily?.temperature_2m_min?.[0]),
    rain: j.daily?.precipitation_probability_max?.[0] ?? null,
    sunrise: j.daily?.sunrise?.[0]?.slice(11, 16),
    sunset: j.daily?.sunset?.[0]?.slice(11, 16),
  };
}

// mainCity: পেজের কনফিগে দেওয়া প্রধান শহর (যেমন উল্লাপাড়া), না দিলে ঢাকা
export async function getWeather(mainCity) {
  const main = mainCity || DIVISIONS[0];
  const [m, ...divs] = await Promise.all([weatherFor(main), ...DIVISIONS.map(weatherFor)]);
  return { main: m, divisions: divs };
}

// ---------- নামাজের সময় ----------
// method=1 (University of Islamic Sciences, Karachi), school=1 (হানাফি আসর) — বাংলাদেশে প্রচলিত হিসাবের কাছাকাছি।
// ইসলামিক ফাউন্ডেশনের সময়সূচির সাথে কয়েক মিনিট পার্থক্য হতে পারে।
export async function getPrayer(city = { name: 'ঢাকা', lat: 23.8103, lon: 90.4125 }) {
  const t = dhakaNow();
  const date = `${String(t.day).padStart(2, '0')}-${String(t.m).padStart(2, '0')}-${t.y}`;
  const j = await getJSON(`https://api.aladhan.com/v1/timings/${date}?latitude=${city.lat}&longitude=${city.lon}&method=1&school=1&timezonestring=Asia/Dhaka`);
  const tm = j.data.timings;
  const clean = (s) => String(s).slice(0, 5);
  const h = j.data.date?.hijri;
  return {
    city: city.name,
    times: {
      fajr: clean(tm.Fajr), sunrise: clean(tm.Sunrise), dhuhr: clean(tm.Dhuhr),
      asr: clean(tm.Asr), maghrib: clean(tm.Maghrib), isha: clean(tm.Isha),
    },
    hijri: h ? { day: Number(h.day), month: Number(h.month?.number), year: Number(h.year) } : null,
  };
}

// ---------- খবর (RSS) ----------
const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/<[^>]+>/g, '').trim();

export function parseRSS(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const tag = (name) => { const r = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return r ? decode(r[1]) : ''; };
    let title = tag('title');
    let source = tag('source');
    // Google News শিরোনামের শেষে " - উৎসের নাম" থাকে
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    else if (!source) { const i = title.lastIndexOf(' - '); if (i > 5) { source = title.slice(i + 3); title = title.slice(0, i); } }
    items.push({ title: title.trim(), source: source.trim(), link: tag('link'), date: tag('pubDate') });
  }
  return items;
}

const norm = (s) => s.replace(/[\s\p{P}]+/gu, '').slice(0, 40);

export async function getHeadlines(feedUrl, count = 10, skip = new Set()) {
  const r = await safeFetch(feedUrl);
  if (!r.ok) throw new Error(`খবরের ফিড পাওয়া যায়নি: ${r.status} ${feedUrl}`);
  const items = parseRSS(await r.text());
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const k = norm(it.title);
    if (!it.title || seen.has(k) || skip.has(k)) continue;
    seen.add(k);
    out.push({ ...it, key: k });
    if (out.length >= count) break;
  }
  return out;
}
export const headlineKey = norm;

// ---------- নমুনা ডেটা (ডিজাইন দেখার জন্য — আসল তথ্য নয়) ----------
export const SAMPLE = {
  weather: {
    main: { name: 'ঢাকা', now: 29, humidity: 74, wind: 11, code: 2, max: 31, min: 23, rain: 20, sunrise: '06:04', sunset: '17:24' },
    divisions: DIVISIONS.map((d, i) => ({ name: d.name, code: [2, 3, 0, 1, 61, 80, 0, 45][i], max: 30 + (i % 3), min: 21 + (i % 4), rain: [20, 40, 5, 10, 60, 70, 0, 15][i] })),
  },
  prayer: {
    city: 'ঢাকা',
    times: { fajr: '04:46', sunrise: '06:01', dhuhr: '11:41', asr: '15:44', maghrib: '17:21', isha: '18:36' },
    hijri: { day: 17, month: 5, year: 1448 },
  },
  headlines: Array.from({ length: 10 }, (_, i) => ({
    title: [
      'নমুনা শিরোনাম: এখানে আজকের প্রধান খবরের শিরোনাম বসবে',
      'নমুনা: ছোট শিরোনাম',
      'নমুনা শিরোনাম: দুই লাইনের লম্বা শিরোনাম কার্ডে কেমন দেখায় তা পরীক্ষা করার জন্য এই লেখা',
      'নমুনা: খেলাধুলার একটি শিরোনাম এখানে দেখানো হবে',
      'নমুনা শিরোনাম: অর্থনীতি বা বাণিজ্যের খবরের জায়গা',
      'নমুনা: আন্তর্জাতিক খবরের একটি শিরোনাম',
      'নমুনা শিরোনাম: শিক্ষা ও স্বাস্থ্য বিষয়ক খবর',
      'নমুনা: বিনোদনের খবর',
      'নমুনা শিরোনাম: প্রযুক্তি বিষয়ক একটি খবরের শিরোনাম এখানে থাকবে',
      'নমুনা: আবহাওয়া ও পরিবেশের খবর',
    ][i],
    source: 'নমুনা সূত্র',
    key: `sample${i}`,
  })),
};
