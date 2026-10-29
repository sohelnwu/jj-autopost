// রিলের খাড়া স্লাইড — 1080×1920 (9:16)
// নিচের ~৪৫০px আর ডান পাশে ফেসবুকের বোতাম/ক্যাপশন বসে, তাই মূল লেখা ২৫০–১৪২০px-এর মধ্যে রাখা হয়েছে।
import { FONTS, logoHTML, weatherIcon, weatherText } from './templates.js';
import { bn, bnDate, banglaDateText, bnTime12, esc, HIJRI_MONTHS } from './util.js';

export const REEL_SIZE = { width: 1080, height: 1920 };

function shell({ page, t, body, css = '', bg, sample, light = false }) {
  const th = page.theme;
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><style>
${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
:root{--accent:${th.accent};--accent2:${th.accent2 || th.accent};--ink:${th.ink || '#0F172A'}}
html,body{width:1080px;height:1920px;overflow:hidden}
body{font-family:'Hind',sans-serif;color:${light ? 'var(--ink)' : '#fff'};background:${bg || `radial-gradient(120% 80% at 50% 0%,var(--accent) 0%,var(--accent2) 45%,#0B0F1A 100%)`};position:relative}
.top{position:absolute;left:70px;right:70px;top:90px;display:flex;align-items:center;justify-content:space-between}
.logo-badge{background:${light ? 'var(--accent)' : '#fff'};color:${light ? '#fff' : 'var(--accent)'};border-radius:20px;padding:12px 30px 8px;font:800 46px/1 'Baloo';box-shadow:0 10px 30px rgba(0,0,0,.25)}
.logo-img{height:96px;max-width:380px;object-fit:contain}
.date{font:500 32px/1.25 'Hind';text-align:right;opacity:.92}
.strip{position:absolute;left:0;right:0;top:1420px;height:86px;display:flex;align-items:center;justify-content:space-between;padding:0 70px;background:rgba(0,0,0,.35);font:600 34px/1 'Hind';color:#fff}
.strip b{background:var(--accent);padding:12px 22px 8px;border-radius:12px;font-weight:700}
.sample{position:absolute;top:300px;right:-90px;transform:rotate(35deg);background:#DC2626;color:#fff;font:700 34px/1 'Hind';padding:14px 120px;opacity:.9;z-index:9}
.fit{overflow:hidden}
${css}
</style></head><body>
<div class="top">${logoHTML(page)}<div class="date">${bnDate(t)}<br><span style="font-size:27px;opacity:.85">${banglaDateText(t)}</span></div></div>
${body}
${sample ? '<div class="sample">নমুনা ডেটা</div>' : ''}
</body></html>`;
}

const strip = (left, right) => `<div class="strip"><b>${esc(left)}</b><span>${esc(right)}</span></div>`;

// ---------- শুরু ----------
export function intro({ page, t, sample, kicker, title, sub }) {
  return shell({ page, t, sample, css: `
.k{position:absolute;top:470px;left:0;right:0;text-align:center}
.k span{display:inline-block;background:#fff;color:var(--accent);font:700 46px/1 'Hind';padding:20px 40px 14px;border-radius:999px}
.ti{position:absolute;top:600px;left:70px;right:70px;height:520px;display:flex;align-items:center;justify-content:center;text-align:center;font:800 150px/1.12 'Baloo';text-shadow:0 8px 30px rgba(0,0,0,.35)}
.su{position:absolute;top:1170px;left:70px;right:70px;text-align:center;font:500 44px/1.4 'Hind';opacity:.92}
.ring{position:absolute;width:1300px;height:1300px;border-radius:50%;border:3px solid rgba(255,255,255,.12);left:-110px;top:220px}
.ring2{position:absolute;width:900px;height:900px;border-radius:50%;border:3px solid rgba(255,255,255,.1);left:90px;top:420px}`,
  body: `<div class="ring"></div><div class="ring2"></div>
<div class="k"><span>${esc(kicker)}</span></div>
<div class="ti fit" data-min="80">${esc(title)}</div>
${sub ? `<div class="su">${esc(sub)}</div>` : ''}
${strip(page.name, page.handle || '')}` });
}

// ---------- একটি শিরোনাম ----------
export function headline({ page, t, sample, n, total, label, title, source }) {
  return shell({ page, t, sample, css: `
.lab{position:absolute;top:300px;left:70px;display:flex;gap:18px;align-items:center}
.lab .l{background:#fff;color:var(--accent);font:700 40px/1 'Hind';padding:16px 30px 12px;border-radius:999px}
.lab .c{font:600 40px/1 'Hind';opacity:.9}
.num{position:absolute;top:380px;left:50px;font:800 330px/1 'Baloo';color:rgba(255,255,255,.14)}
.card{position:absolute;top:560px;left:70px;right:70px;height:740px;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.22);border-radius:44px;padding:56px 54px;display:flex;flex-direction:column;justify-content:space-between}
.h{flex:1;display:flex;align-items:center;font:700 88px/1.32 'Hind';text-shadow:0 4px 18px rgba(0,0,0,.25)}
.s{font:500 38px/1.3 'Hind';opacity:.9;border-top:2px solid rgba(255,255,255,.3);padding-top:26px;margin-top:20px}
.bar{position:absolute;top:1340px;left:70px;right:70px;height:12px;border-radius:6px;background:rgba(255,255,255,.18)}
.bar i{display:block;height:100%;border-radius:6px;background:#fff;width:${total ? Math.round((n / total) * 100) : 100}%}`,
  body: `
<div class="lab"><span class="l">${esc(label)}</span>${total ? `<span class="c">${bn(n)} / ${bn(total)}</span>` : ''}</div>
${n ? `<div class="num">${bn(n)}</div>` : ''}
<div class="card"><div class="h fit" data-min="50">${esc(title)}</div><div class="s">সূত্র: ${esc(source || 'সংশ্লিষ্ট সংবাদমাধ্যম')}</div></div>
${total ? '<div class="bar"><i></i></div>' : ''}
${strip(page.name, page.handle || '')}` });
}

// ---------- ব্রেকিং ----------
export function breaking({ page, t, sample, title, source }) {
  return shell({ page, t, sample, bg: 'linear-gradient(180deg,#1A0006 0%,#7F0018 45%,#B00020 100%)', css: `
.bk{position:absolute;top:330px;left:0;right:0;height:150px;background:#fff;display:flex;align-items:center;justify-content:center;gap:26px;transform:skewY(-3deg)}
.bk span{font:800 100px/1 'Baloo';color:#B00020;padding-top:14px}
.dot{width:40px;height:40px;border-radius:50%;background:#B00020;box-shadow:0 0 0 12px rgba(176,0,32,.25)}
.h{position:absolute;top:620px;left:70px;right:70px;height:620px;display:flex;align-items:center;font:700 92px/1.32 'Hind';text-shadow:0 4px 20px rgba(0,0,0,.35)}
.s{position:absolute;top:1280px;left:70px;right:70px;font:500 38px/1.3 'Hind';opacity:.9}`,
  body: `<div class="bk"><div class="dot"></div><span>ব্রেকিং নিউজ</span></div>
<div class="h fit" data-min="52">${esc(title)}</div>
<div class="s">সূত্র: ${esc(source || 'সংশ্লিষ্ট সংবাদমাধ্যম')}</div>
${strip(page.name, page.handle || '')}` });
}

// ---------- আবহাওয়া ----------
export function weatherMain({ page, t, sample, w }) {
  const m = w.main;
  return shell({ page, t, sample, bg: 'linear-gradient(180deg,#0B3B66 0%,#1565C0 55%,#42A5F5 100%)', css: `
.ti{position:absolute;top:300px;left:0;right:0;text-align:center;font:800 96px/1 'Baloo'}
.ic{position:absolute;top:430px;left:50%;transform:translateX(-50%)}
.big{position:absolute;top:780px;left:0;right:0;text-align:center;font:700 230px/1 'Hind'}
.big sup{font-size:80px;vertical-align:top}
.cty{position:absolute;top:1030px;left:0;right:0;text-align:center;font:700 64px/1.2 'Hind'}
.cd{position:absolute;top:1120px;left:0;right:0;text-align:center;font:500 50px/1.3 'Hind';opacity:.95}
.row{position:absolute;top:1220px;left:70px;right:70px;display:flex;justify-content:center;gap:34px;font:500 38px/1.3 'Hind';opacity:.92;flex-wrap:wrap}`,
  body: `<div class="ti">আজকের আবহাওয়া</div>
<div class="ic">${weatherIcon(m.code, 340)}</div>
<div class="big">${bn(m.now ?? m.max)}<sup>°সে</sup></div>
<div class="cty">${esc(m.name)}</div><div class="cd">${weatherText(m.code)}</div>
<div class="row"><span>সর্বোচ্চ ${bn(m.max)}°</span><span>সর্বনিম্ন ${bn(m.min)}°</span>${m.rain != null ? `<span>বৃষ্টি ${bn(m.rain)}%</span>` : ''}</div>
${strip(page.name, 'উৎস: Open-Meteo')}` });
}

export function weatherGrid({ page, t, sample, w }) {
  const cells = w.divisions.map((d) => `<div class="c">${weatherIcon(d.code, 92)}<div><div class="n">${esc(d.name)}</div><div class="v">${bn(d.max)}° <span>/ ${bn(d.min)}°</span></div></div></div>`).join('');
  return shell({ page, t, sample, bg: 'linear-gradient(180deg,#0B3B66 0%,#1565C0 55%,#42A5F5 100%)', css: `
.ti{position:absolute;top:300px;left:0;right:0;text-align:center;font:800 84px/1 'Baloo'}
.g{position:absolute;top:430px;left:70px;right:70px;display:grid;grid-template-columns:1fr 1fr;gap:22px}
.c{display:flex;align-items:center;gap:16px;background:rgba(255,255,255,.14);border-radius:30px;padding:22px 20px;height:220px}
.n{font:600 44px/1.2 'Hind'}.v{font:700 54px/1.2 'Hind'}.v span{font-weight:500;font-size:40px;opacity:.8}`,
  body: `<div class="ti">বিভাগীয় শহরে আজ</div><div class="g">${cells}</div>${strip(page.name, 'তাপমাত্রা ডিগ্রি সেলসিয়াসে')}` });
}

// ---------- নামাজ ----------
export function prayer({ page, t, sample, p }) {
  const rows = [['ফজর', p.times.fajr], ['সূর্যোদয়', p.times.sunrise], ['যোহর', p.times.dhuhr], ['আসর', p.times.asr], ['মাগরিব', p.times.maghrib], ['এশা', p.times.isha]];
  const hijri = p.hijri ? `${bn(p.hijri.day)} ${HIJRI_MONTHS[p.hijri.month - 1]} ${bn(p.hijri.year)} হিজরি` : '';
  return shell({ page, t, sample, bg: 'linear-gradient(180deg,#022C22 0%,#064E3B 50%,#065F46 100%)', css: `
.mo{position:absolute;top:270px;left:50%;transform:translateX(-50%)}
.ti{position:absolute;top:440px;left:0;right:0;text-align:center;font:800 92px/1 'Baloo';color:#FDE68A}
.su{position:absolute;top:555px;left:0;right:0;text-align:center;font:500 40px/1.3 'Hind';opacity:.92}
.l{position:absolute;top:650px;left:110px;right:110px}
.r{display:flex;justify-content:space-between;align-items:center;height:120px;border-bottom:2px solid rgba(253,230,138,.25);padding:0 20px}
.r .a{font:700 58px/1 'Hind'}.r .b{font:600 58px/1 'Hind';color:#FDE68A}`,
  body: `<svg class="mo" width="150" height="150" viewBox="0 0 100 100"><path d="M62 12a40 40 0 1 0 26 66A34 34 0 1 1 62 12z" fill="#FDE68A"/><path d="M78 30l3 8 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" fill="#FDE68A"/></svg>
<div class="ti">নামাজের সময়সূচি</div><div class="su">${esc(p.city)}${hijri ? ' · ' + hijri : ''}</div>
<div class="l">${rows.map(([a, b]) => `<div class="r"><span class="a">${a}</span><span class="b">${bnTime12(b)}</span></div>`).join('')}</div>
${strip(page.name, 'স্থানভেদে কয়েক মিনিট পার্থক্য হতে পারে')}` });
}

// ---------- শুভ সকাল ----------
export function morning({ page, t, sample, message }) {
  const rays = Array.from({ length: 16 }, (_, i) => `<rect x="296" y="0" width="8" height="90" rx="4" fill="#FFB300" opacity=".55" transform="rotate(${i * 22.5} 300 300)"/>`).join('');
  return shell({ page, t, sample, light: true, bg: 'linear-gradient(180deg,#FFF7E6 0%,#FFE0B2 50%,#FFB38A 100%)', css: `
.sun{position:absolute;top:250px;left:50%;transform:translateX(-50%)}
.gm{position:absolute;top:800px;left:0;right:0;text-align:center;font:800 190px/1 'Baloo';color:var(--ink)}
.msg{position:absolute;top:1030px;left:90px;right:90px;height:360px;display:flex;align-items:center;justify-content:center;text-align:center;font:400 62px/1.5 'Tiro';color:#1F2937}`,
  body: `<svg class="sun" width="540" height="540" viewBox="0 0 600 600">${rays}<circle cx="300" cy="300" r="150" fill="#FFC107"/><circle cx="300" cy="300" r="122" fill="#FFD54F"/></svg>
<div class="gm">শুভ সকাল</div><div class="msg fit" data-min="40">${esc(message)}</div>
${strip(page.name, page.handle || '')}` });
}

// ---------- লেখা (ভালোবাসা, অনুভূতি, অনুপ্রেরণা, মজা …) ----------
const QUOTE_BG = {
  love: 'linear-gradient(170deg,#3B0A2A 0%,#9D174D 55%,#F472B6 100%)',
  feelings: 'linear-gradient(170deg,#0F172A 0%,#1E3A8A 55%,#6366F1 100%)',
  motivation: 'linear-gradient(170deg,#1C1917 0%,#9A3412 55%,#F59E0B 100%)',
  fun: 'linear-gradient(170deg,#064E3B 0%,#0D9488 55%,#FDE047 100%)',
};
export function quote({ page, t, sample, kind, label, text, n, total }) {
  return shell({ page, t, sample, bg: QUOTE_BG[kind] || QUOTE_BG.feelings, css: `
.lab{position:absolute;top:320px;left:0;right:0;text-align:center}
.lab span{display:inline-block;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.35);font:700 42px/1 'Hind';padding:18px 36px 14px;border-radius:999px}
.qm{position:absolute;top:420px;left:70px;font:800 260px/1 'Baloo';opacity:.25}
.tx{position:absolute;top:560px;left:90px;right:90px;height:760px;display:flex;align-items:center;justify-content:center;text-align:center;font:400 80px/1.5 'Tiro';text-shadow:0 4px 18px rgba(0,0,0,.3)}
.pg{position:absolute;top:1340px;left:0;right:0;text-align:center;font:600 36px/1 'Hind';opacity:.85}`,
  body: `<div class="lab"><span>${esc(label)}</span></div><div class="qm">“</div>
<div class="tx fit" data-min="46">${esc(text)}</div>
${total > 1 ? `<div class="pg">${bn(n)} / ${bn(total)}</div>` : ''}
${strip(page.name, page.handle || '')}` });
}

// ---------- শেষ ----------
export function outro({ page, t, sample, line }) {
  return shell({ page, t, sample, css: `
.f{position:absolute;top:560px;left:70px;right:70px;text-align:center;font:800 120px/1.15 'Baloo'}
.n{position:absolute;top:880px;left:0;right:0;text-align:center}
.n span{display:inline-block;background:#fff;color:var(--accent);font:800 84px/1 'Baloo';padding:30px 60px 20px;border-radius:30px;box-shadow:0 14px 40px rgba(0,0,0,.3)}
.l{position:absolute;top:1100px;left:90px;right:90px;text-align:center;font:500 46px/1.45 'Hind';opacity:.92}`,
  body: `<div class="f">ফলো করুন</div><div class="n"><span>${esc(page.name)}</span></div>
<div class="l">${esc(line || 'প্রতিদিনের খবর আর আপডেট পেতে পেজটি ফলো করুন, পোস্ট শেয়ার করুন।')}</div>
${strip(page.name, page.handle || '')}` });
}
