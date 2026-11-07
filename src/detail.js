// খবরের বিস্তারিত: Gemini Google Search দিয়ে আসল প্রতিবেদন খুঁজে ৫০–৬০ সেকেন্ডে পড়ার মতো
// সংবাদপাঠকের স্ক্রিপ্ট লেখে। শুধু খুঁজে পাওয়া তথ্য — বানানো কিছু না। না পেলে null।
import { geminiText } from './voice.js';
import { noLinks } from './design.js';

const BN = '০১২৩৪৫৬৭৮৯';
const clean = (s) => noLinks(String(s || ''))
  .replace(/\[[\d,\s]+\]/g, '') // [1] ধরনের সূত্র-চিহ্ন
  .replace(/[*#_`>]/g, '')
  .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
  .replace(/\d/g, (d) => BN[d])
  .replace(/\s{2,}/g, ' ').trim();

export async function newsDetail(item) {
  const prompt = `তুমি বাংলাদেশের একটি শীর্ষ টিভি চ্যানেলের অভিজ্ঞ সংবাদ লেখক।
Google Search দিয়ে গত ৪৮ ঘণ্টার এই খবরটির মূল প্রতিবেদন খুঁজে বের করো:
শিরোনাম: «${item.title}»
প্রকাশ করেছে: ${item.source || 'অজানা'}

তারপর একজন সংবাদপাঠিকা ৫০ থেকে ৬০ সেকেন্ডে পড়বেন, এমন একটি টিভি সংবাদ লেখো।
নিয়ম:
- প্রমিত বাংলাদেশি বাংলা, সহজ ও স্পষ্ট বাক্য। ১১০ থেকে ১৩০ শব্দ, ৬ থেকে ৮টি ছোট বাক্য।
- শুধু খুঁজে পাওয়া প্রতিবেদনে থাকা তথ্য লিখবে: কী ঘটেছে, কোথায়, কখন, কারা, কেন, এরপর কী। অনুমান, মতামত বা বানানো তথ্য একদম নয়।
- কোনো সংবাদমাধ্যমের নাম, "সূত্র জানায়", চ্যানেলের নাম, শুভেচ্ছা, "ফলো করুন", "সঙ্গে থাকুন", লিংক, ইমোজি, হ্যাশট্যাগ লিখবে না।
- সংখ্যা বাংলা অঙ্কে। ইংরেজি নাম বাংলা বানানে।
- খবরটা নিশ্চিতভাবে খুঁজে না পেলে বা অন্য ঘটনার সাথে মিলে গেলে শুধু লিখবে: NOT_FOUND

উত্তরের ধরন (এর বাইরে কিছু লিখবে না):
শিরোনাম: <১২ শব্দের মধ্যে পরিষ্কার শিরোনাম>
<প্রতিটি বাক্য আলাদা লাইনে>`;

  const text = await geminiText(prompt);
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
  // খুব লম্বা হলে ৬০ সেকেন্ডের মধ্যে রাখতে কাটছাঁট (প্রায় ১৪০ শব্দ)
  const out = []; let w = 0;
  for (const s of body) { const n = s.split(/\s+/).length; if (w + n > 145 && out.length >= 4) break; out.push(s); w += n; }
  return { headline: headline || clean(item.title), sentences: out, words: w };
}
