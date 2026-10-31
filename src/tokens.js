// FB_PAGE_TOKENS Secret পড়া। তিন রকম লেখা চলে:
//  ১) Graph API Explorer-এ me/accounts চালিয়ে যে পুরো লেখা আসে, সেটাই হুবহু: {"data":[{"access_token":"...","name":"JJ News","id":"123"}, ...]}
//  ২) শুধু পেজ টোকেনগুলো, প্রতি লাইনে একটা: EAAB...\nEAAB...
//  ৩) পুরোনো ধরন: {"jj-news": {"id": "123", "token": "EAAB..."}}
// কোন টোকেন কোন পেজের, তা পেজের নাম (বা config-এর pageId / fbName) মিলিয়ে বের করা হয়।
// নিরাপত্তা: কোনো টোকেন কখনো লগে লেখা হয় না।

const clean = (s) => String(s || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');

function parseSecret(raw) {
  raw = String(raw || '').trim();
  if (!raw) return { byId: {}, list: [] };
  if (raw.startsWith('{') || raw.startsWith('[')) {
    let j;
    try { j = JSON.parse(raw); } catch { throw new Error('FB_PAGE_TOKENS-এর লেখা ভাঙা — Explorer থেকে পুরো লেখাটা আবার কপি করে বসান (শুরুর { থেকে শেষের } পর্যন্ত)।'); }
    const arr = Array.isArray(j) ? j : Array.isArray(j.data) ? j.data : null;
    if (arr) return { byId: {}, list: arr.filter((p) => p.access_token).map((p) => ({ token: p.access_token, id: p.id, name: p.name })) };
    const byId = {};
    for (const [k, v] of Object.entries(j)) byId[k] = typeof v === 'string' ? { token: v } : { token: v.token, id: v.id };
    return { byId, list: [] };
  }
  return { byId: {}, list: raw.split(/[\s,]+/).filter((x) => x.length > 40).map((token) => ({ token })) };
}

async function whoIs(token, graphVersion) {
  const r = await fetch(`https://graph.facebook.com/${graphVersion}/me?fields=id,name&access_token=${encodeURIComponent(token)}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) return { error: j.error?.message || `HTTP ${r.status}` };
  return { id: j.id, name: j.name };
}

// ফেরত দেয়: { [config page id]: { id, token, fbName } }
export async function resolveTokens(cfg, raw = process.env.FB_PAGE_TOKENS, { log = console.log } = {}) {
  const { byId, list } = parseSecret(raw);
  const out = {};
  for (const page of cfg.pages) {
    const v = byId[page.id];
    if (v?.token) out[page.id] = { id: v.id || page.pageId, token: v.token, fbName: page.name };
  }
  if (!list.length) return out;

  // যেসব টোকেনে নাম/আইডি নেই, ফেসবুককে জিজ্ঞেস করে জেনে নেওয়া
  for (const item of list) {
    if (item.id && item.name) continue;
    const who = await whoIs(item.token, cfg.graphVersion || 'v23.0');
    if (who.error) { log(`⚠️ একটা টোকেন কাজ করছে না: ${who.error}`); item.bad = true; continue; }
    Object.assign(item, who);
  }
  const good = list.filter((x) => !x.bad && x.id);
  const used = new Set();
  for (const page of cfg.pages) {
    if (out[page.id]) continue;
    const wants = [page.fbName, page.name, page.id].filter(Boolean).map(clean);
    const hit = good.find((x) => !used.has(x.id) && (
      (page.pageId && String(page.pageId) === String(x.id)) || wants.includes(clean(x.name))));
    if (hit) { used.add(hit.id); out[page.id] = { id: hit.id, token: hit.token, fbName: hit.name }; }
  }
  const unmatched = good.filter((x) => !used.has(x.id));
  if (unmatched.length) {
    log(`ℹ️ এই পেজগুলোর টোকেন আছে কিন্তু config/pages.json-এর কোনো পেজের নামের সাথে মেলেনি: ${unmatched.map((x) => `"${x.name}" (id ${x.id})`).join(', ')}`);
    log('   মেলাতে চাইলে config-এ সেই পেজের "fbName"-এ ফেসবুকের হুবহু নামটা, বা "pageId"-তে আইডিটা লিখুন।');
  }
  return out;
}

// ইন্টারনেট ছাড়া দ্রুত হিসাব: Secret-এ মোটেও কিছু আছে কিনা
export const hasAnyToken = (raw = process.env.FB_PAGE_TOKENS) => String(raw || '').trim().length > 40;
