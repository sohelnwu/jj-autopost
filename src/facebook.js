// Facebook Graph API দিয়ে পেজে ছবি পোস্ট
import { readFileSync } from 'node:fs';

export async function postPhoto({ pageId, token, imagePath, caption, graphVersion = 'v23.0' }) {
  const form = new FormData();
  form.append('source', new Blob([readFileSync(imagePath)], { type: 'image/png' }), 'card.png');
  form.append('message', caption);
  form.append('published', 'true');
  form.append('access_token', token);
  const r = await fetch(`https://graph.facebook.com/${graphVersion}/${pageId}/photos`, { method: 'POST', body: form });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const e = j.error || {};
    // টোকেন লগে যেন না আসে — শুধু ত্রুটির বার্তা দেখানো হচ্ছে
    throw new Error(`ফেসবুক পোস্ট ব্যর্থ (${r.status}): ${e.message || 'অজানা ত্রুটি'} [code ${e.code ?? '-'}]`);
  }
  return j; // { id, post_id }
}

// ফেসবুক রিল পোস্ট (Reels Publishing API: start → upload → finish)
// রিল API একদম শুরুতেই কাজ না করলে সাধারণ ভিডিও হিসেবে পোস্ট করার চেষ্টা করে।
export async function postReel({ pageId, token, videoPath, caption, graphVersion = 'v23.0' }) {
  const G = `https://graph.facebook.com/${graphVersion}`;
  const fail = (step, r, j) => new Error(`রিল ${step} ব্যর্থ (${r.status}): ${j?.error?.message || j?.debug_info?.message || 'অজানা ত্রুটি'}`);
  const data = readFileSync(videoPath);
  try {
    let r = await fetch(`${G}/${pageId}/video_reels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ upload_phase: 'start', access_token: token }) });
    let j = await r.json().catch(() => ({}));
    if (!r.ok || !j.video_id) { const e = fail('শুরু', r, j); e.canFallback = true; throw e; }
    const videoId = j.video_id;
    const uploadUrl = j.upload_url || `https://rupload.facebook.com/video-upload/${graphVersion}/${videoId}`;
    r = await fetch(uploadUrl, { method: 'POST', headers: { Authorization: `OAuth ${token}`, offset: '0', file_size: String(data.length) }, body: data });
    j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) throw fail('আপলোড', r, j);
    const q = new URLSearchParams({ upload_phase: 'finish', video_id: videoId, video_state: 'PUBLISHED', description: caption, access_token: token });
    r = await fetch(`${G}/${pageId}/video_reels?${q}`, { method: 'POST' });
    j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false || j.error) throw fail('প্রকাশ', r, j);
    return { id: videoId, as: 'reel' };
  } catch (e) {
    // শুধু শুরুর ধাপে ব্যর্থ হলে ভিডিও হিসেবে চেষ্টা — পরের ধাপে ব্যর্থ হলে আবার পোস্ট করলে ডুপ্লিকেট হতে পারে
    if (!e.canFallback) throw e;
    console.log(`   ⚠️ ${e.message} — সাধারণ ভিডিও হিসেবে চেষ্টা করছি`);
    const form = new FormData();
    form.append('source', new Blob([data], { type: 'video/mp4' }), 'reel.mp4');
    form.append('description', caption);
    form.append('access_token', token);
    const r = await fetch(`${G}/${pageId}/videos`, { method: 'POST', body: form });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(`ভিডিও পোস্ট ব্যর্থ (${r.status}): ${j.error?.message || 'অজানা ত্রুটি'}`);
    return { id: j.id, as: 'video' };
  }
}
