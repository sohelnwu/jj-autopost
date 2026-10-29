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
