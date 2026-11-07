// Google News-এর লিংক থেকে আসল সংবাদমাধ্যমের পাতা বের করে মূল খবরের লেখা তুলে আনা।
// (লিংক শুধু ভেতরে কাজে লাগে — কোনো ছবি/ভিডিও/ক্যাপশনে বসানো হয় না)
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36', 'Accept-Language': 'bn,en;q=0.8' };

async function get(url, opts = {}) {
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), opts.timeout || 15000);
  try { const r = await fetch(url, { ...opts, headers: { ...UA, ...(opts.headers || {}) }, signal: ac.signal, redirect: 'follow' }); return r; } finally { clearTimeout(tm); }
}

// news.google.com/rss/articles/<id> → আসল URL
export async function resolveGoogleNews(link) {
  const m = /news\.google\.com\/(?:rss\/)?articles\/([^?/#]+)/.exec(link || '');
  if (!m) return link;
  const id = m[1];
  for (const page of [`https://news.google.com/articles/${id}`, `https://news.google.com/rss/articles/${id}`]) {
    try {
      const html = await (await get(page)).text();
      const sg = /data-n-a-sg="([^"]+)"/.exec(html)?.[1]; const ts = /data-n-a-ts="([^"]+)"/.exec(html)?.[1];
      if (!sg || !ts) continue;
      const inner = JSON.stringify(['garturlreq', [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, Number(ts), sg]);
      const body = 'f.req=' + encodeURIComponent(JSON.stringify([[['Fbv4je', inner, null, 'generic']]]));
      const r = await get('https://news.google.com/_/DotsSplashUi/data/batchexecute', { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' } });
      const txt = await r.text();
      const part = txt.split('\n\n')[1];
      const url = JSON.parse(JSON.parse(part)[0][2])[1];
      if (/^https?:\/\//.test(url)) return url;
    } catch {}
  }
  return null;
}

const ent = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const strip = (h) => ent(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const bnShare = (s) => (s.match(/[ঀ-৿]/g) || []).length / Math.max(1, s.replace(/\s/g, '').length);
const JUNK = /আরও পড়ুন|আরো পড়ুন|পড়ুন:|বিজ্ঞাপন|সাবস্ক্রাইব|ফলো করুন|গুগল নিউজ|Google News|ছবি:|ফাইল ছবি|সংগৃহীত|সর্বশেষ খবর|ইমেইল|কপিরাইট|©|প্রতিনিধি$/;

// পাতার HTML থেকে মূল খবর (প্রথমে JSON-LD articleBody, না পেলে <p> অনুচ্ছেদ)
export function extractArticle(html) {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (o) => { if (!o || typeof o !== 'object') return null; if (typeof o.articleBody === 'string' && o.articleBody.length > 200) return o.articleBody; for (const v of Object.values(o)) { const r = walk(v); if (r) return r; } return null; };
      const b = walk(JSON.parse(m[1].trim()));
      if (b) return strip(b);
    } catch {}
  }
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => strip(m[1]))
    .filter((p) => p.length > 40 && bnShare(p) > 0.5 && !JUNK.test(p));
  return paras.join('\n');
}

async function readOne(link) {
  const url = await resolveGoogleNews(link);
  if (!url) return { why: 'আসল লিংক বের হয়নি' };
  const host = new URL(url).hostname.replace(/^www\./, '');
  try {
    const r = await get(url, { timeout: 20000 });
    if (!r.ok) return { why: `${host} ${r.status}` };
    const text = extractArticle(await r.text());
    if (text.length < 250) return { why: `${host} থেকে লেখা কম (${text.length})` };
    return { text: text.slice(0, 5000), host };
  } catch (e) { return { why: `${host} ${e.name === 'AbortError' ? 'সময় শেষ' : e.message}` }; }
}

// মূল সংবাদমাধ্যম, না হলে একই খবরের অন্য সংবাদমাধ্যম
export async function fetchArticle(item) {
  const why = [];
  for (const link of [item.link, ...(item.alts || [])].filter(Boolean).slice(0, 4)) {
    const r = await readOne(link);
    if (r.text) return r;
    why.push(r.why);
  }
  console.log(`   ⚠️ পাতা পড়া যায়নি: ${why.join(' | ') || 'লিংক নেই'}`);
  return null;
}
