// খবরের সারাংশ: শিরোনামসহ পুরো রিল ২০–৪০ সেকেন্ড (কখনো ৪০-এর বেশি নয়)।
// ১) আসল সংবাদমাধ্যমের পাতা থেকে মূল খবর পড়ে, Gemini নিজের ভাষায় টিভি-সংবাদ বানায় (শুধু সেই তথ্য থেকে)
// ২) পাতা পড়া না গেলে Gemini + Google Search
// কোনোটা না হলে null — তখন শুধু শিরোনামের রিল। বানানো তথ্য কখনো নয়।
import { geminiText } from './voice.js';
import { noLinks } from './design.js';
import { fetchArticle } from './article.js';

const BN = '০১২৩৪৫৬৭৮৯';
const clean = (s) => noLinks(String(s || ''))
  .replace(/\[[\d,\s]+\]/g, '') // [1] ধরনের সূত্র-চিহ্ন
  .replace(/[*#_`>]/g, '')
  .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
  .replace(/\d/g, (d) => BN[d])
  .replace(/\s{2,}/g, ' ').trim();

const RULES = `নিয়ম:
- প্রমিত বাংলাদেশি বাংলা, সহজ ও স্পষ্ট বাক্য। শুধু মূল পয়েন্টগুলোর সারাংশ — পুরো খবর নয়। ৩৫ থেকে ৬০ শব্দ, ৩ থেকে ৪টি ছোট বাক্য — সংবাদপাঠিকা ২৫ সেকেন্ডের মধ্যে পড়বেন।
- প্রথম বাক্যেই সবচেয়ে গুরুত্বপূর্ণ তথ্য; শিরোনামের কথা হুবহু আবার বলবে না।
- শুধু প্রতিবেদনে থাকা তথ্য: কী ঘটেছে, কোথায়, কখন, কারা, কেন, এরপর কী। অনুমান, মতামত বা বানানো তথ্য একদম নয়।
- হুবহু কপি নয় — নিজের ভাষায় টিভি সংবাদের মতো করে লেখো।
- কোনো সংবাদমাধ্যমের নাম, "সূত্র জানায়", চ্যানেলের নাম, শুভেচ্ছা, "ফলো করুন", "সঙ্গে থাকুন", লিংক, ইমোজি, হ্যাশট্যাগ লিখবে না।
- সংখ্যা বাংলা অঙ্কে। ইংরেজি নাম বাংলা বানানে।

উত্তরের ধরন (এর বাইরে কিছু লিখবে না):
শিরোনাম: <১২ শব্দের মধ্যে পরিষ্কার শিরোনাম>
<প্রতিটি বাক্য আলাদা লাইনে>`;

const WRITER = 'তুমি বাংলাদেশের একটি শীর্ষ টিভি চ্যানেলের অভিজ্ঞ সংবাদ লেখক।';

// প্রতিবেদন আসলেই এই শিরোনামের খবর কিনা (শিরোনামের মূল শব্দগুলো লেখায় আছে কিনা)
export function relevant(title, text) {
  const words = [...new Set(String(title).replace(/[^\u0980-\u09FFA-Za-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3))];
  if (!words.length) return true;
  const head = text.slice(0, 2500);
  const hit = words.filter((w) => head.includes(w.slice(0, Math.max(3, w.length - 2)))).length;
  return hit / words.length >= 0.4;
}

// Gemini সময়মতো না পারলে: প্রতিবেদনের শুরুর অংশ থেকে মূল কথাগুলো (প্রায় ৫৫ শব্দ)
function leadSentences(article) {
  const sents = article.replace(/\n+/g, ' ').split(/(?<=[।!?])\s+/).map((x) => clean(x))
    .filter((x) => x.length > 25 && x.length < 260 && !/^[^।]{0,40}(প্রতিনিধি|ডেস্ক|অনলাইন)\s*[:,]/.test(x));
  const out = []; let w = 0;
  for (const x of sents) { const n = x.split(/\s+/).length; if (w + n > 60 && out.length >= 2) break; out.push(x); w += n; }
  return w >= 25 ? { sentences: out, words: w } : null;
}

export async function newsDetail(item, { deadline } = {}) {
  const art = item.article !== undefined ? item.article : await fetchArticle(item).catch(() => null);
  const article = art?.text;
  if (article) console.log(`   📄 মূল খবর: ${art.host} (${article.length} অক্ষর)`);
  let text = null;
  if (article) {
    text = await geminiText(`${WRITER} নিচের প্রতিবেদন থেকে একটি টিভি সংবাদ লেখো।
শিরোনাম: «${item.title}»
প্রতিবেদন:
<<<
${article}
>>>
প্রতিবেদনটা শিরোনামের খবরের সাথে না মিললে শুধু লিখবে: NOT_FOUND

${RULES}`, { search: false, deadline });
  }
  if (!text && !article) {
    text = await geminiText(`${WRITER}
Google Search দিয়ে গত ৪৮ ঘণ্টার এই খবরটির মূল প্রতিবেদন খুঁজে বের করো:
শিরোনাম: «${item.title}»
প্রকাশ করেছে: ${item.source || 'অজানা'}
খবরটা নিশ্চিতভাবে খুঁজে না পেলে বা অন্য ঘটনার সাথে মিলে গেলে শুধু লিখবে: NOT_FOUND

${RULES}`, { search: true, deadline });
  }
  if (/NOT_FOUND/i.test(text || '')) return null;
  if (!text) {
    const lead = article && leadSentences(article);
    if (lead) console.log('   ↪ Gemini সময়মতো পারেনি — প্রতিবেদনের মূল অংশ থেকে');
    return lead ? { headline: clean(item.title), ...lead, extractive: true } : null;
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let headline = '';
  const body = [];
  for (const l of lines) {
    const m = /^শিরোনাম\s*[:：]\s*(.+)$/.exec(l.replace(/^[-•*\s]+/, ''));
    if (m && !headline) { headline = clean(m[1]).replace(/[।.]$/, ''); continue; }
    const s = clean(l.replace(/^[-•*\d.)\s]+/, ''));
    if (s.length > 6) body.push(...s.split(/(?<=[।!?])\s+/).filter((x) => x.length > 3));
  }
  const words = body.join(' ').split(/\s+/).length;
  if (body.length < 2 || words < 25) return null; // খুব ছোট — নির্ভরযোগ্য না
  // পুরো রিল ৪০ সেকেন্ডের মধ্যে রাখতে সারাংশ সর্বোচ্চ প্রায় ৬৫ শব্দ (শিরোনাম + শুরু/শেষ মিলিয়ে)
  const out = []; let w = 0;
  for (const s of body) { const n = s.split(/\s+/).length; if (w + n > 65 && out.length >= 2) break; out.push(s); w += n; }
  return { headline: headline || clean(item.title), sentences: out, words: w };
}
