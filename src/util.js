// সাধারণ সাহায্যকারী ফাংশন: বাংলা সংখ্যা, তারিখ, বঙ্গাব্দ, হিজরি মাসের নাম

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const bn = (v) => String(v).replace(/[0-9]/g, (d) => BN_DIGITS[d]);

export const BN_WEEKDAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
export const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const BANGLA_MONTHS = ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'];
export const HIJRI_MONTHS = ['মুহাররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি', 'জমাদিউল আউয়াল', 'জমাদিউস সানি', 'রজব', 'শাবান', 'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ'];

// বাংলাদেশ সময়ে (UTC+6) এখনকার তারিখ-সময়ের অংশগুলো
export function dhakaNow(base = new Date()) {
  const d = new Date(base.getTime() + 6 * 3600 * 1000);
  return {
    y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, day: d.getUTCDate(),
    wd: d.getUTCDay(), h: d.getUTCHours(), min: d.getUTCMinutes(),
    iso: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
  };
}

export const bnDate = (t) => `${BN_WEEKDAYS[t.wd]}, ${bn(t.day)} ${BN_MONTHS[t.m - 1]} ${bn(t.y)}`;

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// বাংলাদেশের সংশোধিত বাংলা বর্ষপঞ্জি (২০১৯ থেকে):
// বৈশাখ–আশ্বিন ৩১ দিন, কার্তিক–মাঘ ও চৈত্র ৩০ দিন, ফাল্গুন ২৯ দিন (অধিবর্ষে ৩০)।
// ১ বৈশাখ = ১৪ এপ্রিল। যাচাই: ১৬ ডিসেম্বর = ১ পৌষ, ২১ ফেব্রুয়ারি = ৮ ফাল্গুন।
export function banglaDate(t) {
  const startYear = (t.m > 4 || (t.m === 4 && t.day >= 14)) ? t.y : t.y - 1;
  const start = Date.UTC(startYear, 3, 14);
  let n = Math.round((Date.UTC(t.y, t.m - 1, t.day) - start) / 86400000); // 0 থেকে শুরু
  const lens = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, isLeap(startYear + 1) ? 30 : 29, 30];
  let mi = 0;
  while (mi < 11 && n >= lens[mi]) { n -= lens[mi]; mi++; }
  return { day: n + 1, month: BANGLA_MONTHS[mi], year: startYear - 593 };
}

export const banglaDateText = (t) => {
  const b = banglaDate(t);
  return `${bn(b.day)} ${b.month} ${bn(b.year)} বঙ্গাব্দ`;
};

// "05:12" → "ভোর ৫:১২" ধরনের লেখা
export function bnTime12(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  let part = 'রাত';
  if (h >= 4 && h < 6) part = 'ভোর';
  else if (h >= 6 && h < 12) part = 'সকাল';
  else if (h >= 12 && h < 15) part = 'দুপুর';
  else if (h >= 15 && h < 17) part = 'বিকেল';
  else if (h >= 17 && h < 19) part = 'সন্ধ্যা';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${part} ${bn(h12)}:${bn(String(m).padStart(2, '0'))}`;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// দিনভিত্তিক স্থির "এলোমেলো" পছন্দ — একই দিনে একই পেজে একই ফল, পেজভেদে আলাদা
export function pick(list, seedText) {
  let h = 2166136261;
  for (const c of seedText) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return list[(h >>> 0) % list.length];
}
