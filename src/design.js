// JJ নেটওয়ার্কের টিভি-নিউজ ধাঁচের ডিজাইন সিস্টেম — ফটোকার্ড (1080×1350) আর রিল (1080×1920) দুটোতেই ব্যবহার হয়।
// নিয়ম: কার্ড/ভিডিওর ভেতরে কোনো লিংক, ওয়েব ঠিকানা বা পেজ-হ্যান্ডেল থাকবে না। শুধু সূত্রের নাম লেখা যাবে।
import { existsSync, readFileSync } from 'node:fs';
import { FONTS } from './templates.js';
import { bn, bnDate, banglaDateText, esc } from './util.js';

// কোনো লেখায় লিংক/ওয়েব ঠিকানা থাকলে মুছে ফেলা (শিরোনাম, সূত্র — সবকিছুর জন্য)
export function noLinks(s) {
  return String(s ?? '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bwww\.\S+/gi, '')
    .replace(/\b[\w-]+\.(com|net|org|bd|info|news|tv|co|io|in|me|live)(\.[a-z]{2})?\b\S*/gi, (m) => m.replace(/\.(com|net|org|bd|info|news|tv|co|io|in|me|live)(\.[a-z]{2})?\b\S*/i, ''))
    .replace(/\s{2,}/g, ' ')
    .trim();
}
export const safe = (s) => esc(noLinks(s));

// "অংশ ১: অংশ ২" ধরনের শিরোনামে প্রথম অংশ রঙিন করা (দেশের নিউজ পোর্টালের ফটোকার্ডের মতো)
export function headlineHTML(title, hiColor = 'var(--hi)') {
  const t = noLinks(title);
  const i = t.search(/[:：]/);
  if (i > 3 && i < t.length * 0.55) {
    return `<span style="color:${hiColor}">${esc(t.slice(0, i + 1))}</span> ${esc(t.slice(i + 1).trim())}`;
  }
  return esc(t);
}

// লোগো: assets/logos/<id>.png থাকলে সেটা, না থাকলে "JJ | NEWS" ধাঁচের ব্যাজ
export function brand(page, size = 1) {
  const file = `assets/logos/${page.id}.png`;
  if (existsSync(file)) {
    return `<img class="brand-img" style="height:${Math.round(88 * size)}px" src="data:image/png;base64,${readFileSync(file).toString('base64')}">`;
  }
  const [first, ...rest] = String(page.logoText || page.name).split(/\s+/);
  return `<div class="brand" style="font-size:${Math.round(44 * size)}px"><b>${esc(first)}</b><span>${esc(rest.join(' ').toUpperCase() || '')}</span></div>`;
}

export const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Hind',sans-serif;position:relative;overflow:hidden;-webkit-font-smoothing:antialiased}
.brand{display:inline-flex;align-items:stretch;font-family:'Baloo';font-weight:800;line-height:1;box-shadow:0 10px 30px rgba(0,0,0,.35);border-radius:.22em;overflow:hidden}
.brand b{background:var(--accent);color:#fff;padding:.28em .32em .14em}
.brand span{background:#fff;color:#0B1020;padding:.28em .4em .14em;letter-spacing:.02em}
.brand-img{object-fit:contain;max-width:420px}
.fit{overflow:hidden}
.sample{position:absolute;top:24px;left:50%;transform:translateX(-50%);background:#DC2626;color:#fff;font:700 26px/1 'Hind';padding:10px 26px 8px;border-radius:8px;z-index:50;opacity:.92}
/* টিভি-স্টুডিও ব্যাকগ্রাউন্ড */
.studio{position:absolute;inset:0;background:
  radial-gradient(90% 60% at 85% 0%, color-mix(in srgb,var(--accent) 55%, transparent) 0%, transparent 60%),
  radial-gradient(70% 50% at 0% 100%, color-mix(in srgb,var(--accent2) 60%, transparent) 0%, transparent 65%),
  linear-gradient(180deg,#0A0F1F 0%,#0B1226 55%,#070A14 100%)}
.dots{position:absolute;inset:0;opacity:.18;background-image:radial-gradient(rgba(255,255,255,.55) 1.4px, transparent 1.6px);background-size:22px 22px;
  -webkit-mask-image:radial-gradient(70% 55% at 70% 35%, #000 0%, transparent 75%);mask-image:radial-gradient(70% 55% at 70% 35%, #000 0%, transparent 75%)}
.streak{position:absolute;width:160%;height:220px;left:-30%;transform:rotate(-14deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)}
/* নিচের টিভি "লোয়ার থার্ড" বার */
.lower{position:absolute;left:0;right:0;display:flex;align-items:stretch;height:84px;font-family:'Hind'}
.lower .tag{background:var(--accent);color:#fff;font-weight:700;font-size:34px;display:flex;align-items:center;padding:6px 34px 0 48px;clip-path:polygon(0 0,100% 0,calc(100% - 26px) 100%,0 100%)}
.lower .bar{flex:1;background:rgba(255,255,255,.96);color:#0B1020;display:flex;align-items:center;justify-content:space-between;padding:6px 48px 0 34px;font-weight:600;font-size:30px;margin-left:-26px}
.lower .bar .src{color:#475569;font-weight:500;font-size:27px}
.ticker{position:absolute;left:0;right:0;height:46px;background:#05070E;color:#CBD5E1;display:flex;align-items:center;gap:22px;padding:4px 48px 0;font:500 24px/1 'Hind';white-space:nowrap;overflow:hidden}
.ticker i{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--accent);flex:none;margin-bottom:4px}
.live{display:inline-flex;align-items:center;gap:12px;background:#E11D2E;color:#fff;font:700 28px/1 'Hind';padding:12px 18px 8px;border-radius:8px;letter-spacing:.04em}
.live:before{content:'';width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 0 0 6px rgba(255,255,255,.25);margin-bottom:3px}
`;

export function page({ pageCfg, t, w, h, css = '', body, sample, vars = {} }) {
  const th = pageCfg.theme || {};
  const v = { accent: th.accent || '#C8102E', accent2: th.accent2 || '#7F1D1D', hi: th.hi || '#FFD23F', ...vars };
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><style>
${FONTS}
:root{--accent:${v.accent};--accent2:${v.accent2};--hi:${v.hi}}
html,body{width:${w}px;height:${h}px}
${BASE_CSS}
${css}
</style></head><body>
${body}
${sample ? '<div class="sample">নমুনা — আসল খবর নয়</div>' : ''}
</body></html>`;
}

// নিচের টিকার লাইনে দেখানোর লেখা (কোনো লিংক নয়)
export const tickerText = (pageCfg, t, extra = []) => [pageCfg.name, bnDate(t), banglaDateText(t), ...extra]
  .map((x) => `<span>${esc(x)}</span>`).join('<i></i>');

export { bn, bnDate, banglaDateText, esc };
