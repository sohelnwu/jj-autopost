// ক্যাপশন ও শুভ সকালের বার্তা (সব বার্তা এই প্রজেক্টের জন্য নতুন লেখা — কারো উক্তি নয়)
import { bn, bnDate, banglaDateText, bnTime12, HIJRI_MONTHS } from './util.js';
import { weatherText } from './templates.js';
import { hashtags, ask, followLine, finalize } from './viral.js';
import { noLinks } from './design.js';

export const MORNING_MESSAGES = [
  'নতুন দিন মানে নতুন সুযোগ। আজকের দিনটা হোক হাসিমুখে শুরু।',
  'গতকালের ক্লান্তি থাক পেছনে, আজ এগিয়ে চলার দিন।',
  'এক কাপ চা আর একটু হাসি — দিনটা সুন্দর হতে এটুকুই যথেষ্ট।',
  'ভোরের আলো যেমন সবার জন্য, আপনার চেষ্টাও একদিন সবার চোখে পড়বে।',
  'আজ নিজের সাথে একটু ভালো ব্যবহার করুন। আপনি তার যোগ্য।',
  'ছোট ছোট পদক্ষেপেই বড় পথ পার হয়। আজও এক পা এগোই।',
  'সকালের বাতাসে যে শান্তি, সারাদিন যেন তা মনে থাকে।',
  'প্রিয় মানুষদের খোঁজ নিন আজ। একটা ফোনই অনেক কিছু বদলে দিতে পারে।',
  'যা হারিয়েছেন তা নিয়ে নয়, যা আছে তা নিয়ে শুরু হোক আজকের দিন।',
  'আজকের কাজ আজই — দিনশেষে মন হালকা থাকবে।',
  'সূর্য প্রতিদিন ওঠে, হাল ছাড়ে না। আমরাও ছাড়ব না।',
  'হাসি ছড়িয়ে দিন, খরচ নেই কিন্তু ফেরত আসে বহুগুণে।',
  'আজ কাউকে একটু সাহায্য করুন। ভালো কাজের আনন্দই আলাদা।',
  'দিনের শুরুটা হোক কৃতজ্ঞতা দিয়ে, শেষটা হোক তৃপ্তি দিয়ে।',
  'স্বপ্ন দেখুন, তারপর আজকের দিনটাকে সেই স্বপ্নের দিকে কাজে লাগান।',
  'পরিবারের সাথে একসাথে নাস্তা — ব্যস্ত দিনের সবচেয়ে মধুর মুহূর্ত।',
  'আজকের দিনটা আর কখনো ফিরবে না। তাই সুন্দর করে কাটাই।',
  'মন খারাপ থাকলে জানালা খুলে দিন, আলো ঢুকতে দিন।',
  'পরিশ্রমের ঘাম কখনো বৃথা যায় না। শুভ হোক আজকের পথচলা।',
  'নিজেকে অন্যের সাথে না মিলিয়ে গতকালের নিজের চেয়ে একটু ভালো হই।',
  'সকালের পাখির ডাক মনে করিয়ে দেয় — জীবন এখনো সুন্দর।',
  'সময়মতো খাওয়া, পরিমিত ঘুম আর হাসি — সুস্থ থাকার সহজ সূত্র।',
  'আজ যে বীজ বুনবেন, কাল তারই ফসল উঠবে।',
  'ধৈর্য রাখুন। সব ভালো জিনিস একটু সময় নিয়েই আসে।',
  'আপনার একটা মিষ্টি কথা কারো সারাদিন ভালো করে দিতে পারে।',
  'ভুল হলে শিখুন, থামবেন না। নতুন দিন নতুন করে চেষ্টার দিন।',
  'আজকের সকালটা আপনার জন্য — শান্ত মনে শুরু করুন।',
  'মা-বাবার দোয়া নিয়ে বের হোন, পথ সহজ হবে।',
  'যতটা পারেন ততটাই করুন, তবে মন দিয়ে করুন।',
  'আলোর মতো ছড়িয়ে পড়ুক আপনার ভালোবাসা, সবার মাঝে।',
];


const seedOf = (page, t, x = '') => `${t.iso}|${page.id}|${x}`;

export function captionGoodMorning(page, t, message) {
  return finalize(`☀️ শুভ সকাল, প্রিয় ${page.name} পরিবার!

"${message}"

📅 ${bnDate(t)} | ${banglaDateText(t)}

${ask('morning', seedOf(page, t, 'gm'))}

${hashtags(page, 'morning')}`);
}

export function captionWeather(page, t, w) {
  const m = w.main;
  const hot = [...w.divisions].sort((a, b) => b.max - a.max)[0];
  const rainy = [...w.divisions].filter((d) => d.rain != null).sort((a, b) => b.rain - a.rain)[0];
  const lines = w.divisions.map((d) => `▪️ ${d.name}: ${bn(d.max)}° / ${bn(d.min)}° — ${weatherText(d.code)}`).join('\n');
  return finalize(`🌤️ আজ ${m.name}-সহ সারাদেশে আবহাওয়া কেমন থাকবে? এক নজরে দেখে নিন 👇

📍 ${m.name}: ${weatherText(m.code)}, সর্বোচ্চ ${bn(m.max)}° ও সর্বনিম্ন ${bn(m.min)}° সেলসিয়াস${m.rain != null ? `, বৃষ্টির সম্ভাবনা ${bn(m.rain)}%` : ''}
🔥 সবচেয়ে গরম: ${hot.name} (${bn(hot.max)}°)${rainy && rainy.rain >= 30 ? `\n☔ বৃষ্টির সম্ভাবনা বেশি: ${rainy.name} (${bn(rainy.rain)}%)` : ''}

${lines}

সূত্র: Open-Meteo পূর্বাভাস (বাস্তবে কিছুটা ভিন্ন হতে পারে)

${ask('weather', seedOf(page, t, 'w'))}
${followLine(page)}

${hashtags(page, 'weather')}`);
}

export function captionPrayer(page, t, p) {
  const T = p.times;
  const hijri = p.hijri ? ` | ${bn(p.hijri.day)} ${HIJRI_MONTHS[p.hijri.month - 1]} ${bn(p.hijri.year)} হিজরি` : '';
  return finalize(`🕌 আজকের নামাজের সময়সূচি — ${p.city} ও আশপাশ
📅 ${bnDate(t)}${hijri}

🌙 ফজর: ${bnTime12(T.fajr)}
🌅 সূর্যোদয়: ${bnTime12(T.sunrise)}
☀️ যোহর: ${bnTime12(T.dhuhr)}
🌤️ আসর: ${bnTime12(T.asr)}
🌇 মাগরিব: ${bnTime12(T.maghrib)}
🌃 এশা: ${bnTime12(T.isha)}

⚠️ জেলাভেদে কয়েক মিনিট আগে-পরে হতে পারে। স্থানীয় মসজিদের সময় অনুসরণ করুন।

${ask('prayer', seedOf(page, t, 'p'))}

${hashtags(page, 'prayer')}`);
}

export function captionNewsList(page, t, title, items, topic = 'news') {
  const list = items.map((it, i) => `${bn(i + 1)}. ${noLinks(it.title)}${it.source ? ` — ${noLinks(it.source)}` : ''}`).join('\n');
  return finalize(`📰 ${title} | ${bnDate(t)}
এক নজরে দিনের গুরুত্বপূর্ণ সব খবর 👇

${list}

(শিরোনামগুলো উল্লিখিত সংবাদমাধ্যম থেকে সংকলিত)

${ask('list', seedOf(page, t, title))}
${followLine(page)}

${hashtags(page, topic)}`);
}

export function captionSingle(page, t, label, item, topic = 'news') {
  const isBreaking = /ব্রেকিং/.test(label) || topic === 'breaking';
  return finalize(`${isBreaking ? '🔴 ব্রেকিং নিউজ' : `📰 ${label}`}

${noLinks(item.title)}

🗞️ সূত্র: ${noLinks(item.source || 'সংশ্লিষ্ট সংবাদমাধ্যম')}
📅 ${bnDate(t)}

${ask('news', seedOf(page, t, item.title))}
${followLine(page)}

${hashtags(page, isBreaking ? 'breaking' : topic)}`);
}
