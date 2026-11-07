// খবরের বিস্তারিত: ৫০–৬০ সেকেন্ডে পড়ার মতো সংবাদপাঠকের স্ক্রিপ্ট।
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
- প্রমিত বাংলাদেশি বাংলা, সহজ ও স্পষ্ট বাক্য। ১১০ থেকে ১৩০ শব্দ, ৬ থেকে ৮টি ছোট বাক্য — একজন সংবাদপাঠিকা ৫০ থেকে ৬০ সেকেন্ডে পড়বেন।
- শুধু প্রতিবেদনে থাকা তথ্য: কী ঘটেছে, কোথায়, কখন, কারা, কেন, এরপর কী। অনুমান, মতামত বা বানানো তথ্য একদম নয়।
- হুবহু কপি নয় — নিজের ভাষায় টিভি সংবাদের মতো করে লেখো।
- কোনো সংবাদমাধ্যমের নাম, "সূত্র জানায়", চ্যানেলের নাম, শুভেচ্ছা, "ফলো করুন", "সঙ্গে থাকুন", লিংক, ইমোজি, হ্যাশট্যাগ লিখবে না।
- সংখ্যা বাংলা অঙ্কে। ইংরেজি নাম বাংলা বানানে।

উত্তরের ধরন (এর বাইরে কিছু লিখবে না):
শিরোনাম: <১২ শব্দের মধ্যে পরিষ্কার শিরোনাম>
<প্রতিটি বাক্য আলাদা লাইনে>`;

const WRITER = 'তুমি বাংলাদেশের একটি শীর্ষ টিভি চ্যানেলের অভিজ্ঞ সংবাদ লেখক।';

export async function newsDetail(item) {
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

${RULES}`, { search: false });
  }
  if (!text) {
    text = await geminiText(`${WRITER}
Google Search দিয়ে গত ৪৮ ঘণ্টার এই খবরটির মূল প্রতিবেদন খুঁজে বের করো:
শিরোনাম: «${item.title}»
প্রকাশ করেছে: ${item.source || 'অজানা'}
খবরটা নিশ্চিতভাবে খুঁজে না পেলে বা অন্য ঘটনার সাথে মিলে গেলে শুধু লিখবে: NOT_FOUND

${RULES}`, { search: true });
  }
  if (!text || /NOT_FOUND/i.test(text)) return null;

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
  if (body.length < 3 || words < 50) return null; // খুব ছোট — নির্ভরযোগ্য না
  // ৬০ সেকেন্ডের মধ্যে রাখতে (প্রায় ১৪৫ শব্দ পর্যন্ত)
  const out = []; let w = 0;
  for (const s of body) { const n = s.split(/\s+/).length; if (w + n > 145 && out.length >= 4) break; out.push(s); w += n; }
  return { headline: headline || clean(item.title), sentences: out, words: w };
}
