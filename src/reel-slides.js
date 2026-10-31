// রিলের খাড়া স্লাইড — 1080×1920, টিভি নিউজ ধাঁচে। কোনো লিংক/পেজ-ঠিকানা নেই।
// ফেসবুক রিলে নিচের ~৪০০px আর ডানের কিনারায় বোতাম/ক্যাপশন বসে, তাই মূল লেখা ২২০–১৪৬০px-এর মধ্যে।
import { page, brand, headlineHTML, safe, tickerText, bn, bnDate, banglaDateText, esc } from './design.js';
import { weatherIcon, weatherText } from './templates.js';
import { bnTime12, HIJRI_MONTHS } from './util.js';

export const REEL_SIZE = { width: 1080, height: 1920 };
const W = 1080, H = 1920;

const CSS = `
.hd{position:absolute;top:110px;left:60px;right:60px;display:flex;align-items:center;justify-content:space-between;z-index:5}
.hd-r{text-align:right;color:#fff}.hd-r .d1{font:600 32px/1.2 'Hind'}.hd-r .d2{font:500 26px/1.3 'Hind';opacity:.75}
.lower{bottom:none;top:1400px}
.tk{position:absolute;left:0;right:0;top:1484px}`;
const hd = (pg, t) => `<div class="hd">${brand(pg, 1.1)}<div class="hd-r"><div class="d1">${bnDate(t)}</div><div class="d2">${banglaDateText(t)}</div></div></div>`;
const lower = (tag, mid, src) => `<div class="lower" style="top:1400px"><div class="tag">${esc(tag)}</div><div class="bar"><span>${safe(mid)}</span>${src ? `<span class="src">সূত্র: ${safe(src)}</span>` : ''}</div></div>`;
const tick = (pg, t, extra) => `<div class="ticker" style="top:1484px">${tickerText(pg, t, extra)}</div>`;
const studio = (top = 900) => `<div class="studio"></div><div class="dots"></div><div class="streak" style="top:${top}px"></div>`;

// ---------- শুরু ----------
export function intro({ page: pg, t, sample, kicker, title, sub }) {
  return page({ pageCfg: pg, t, w: W, h: H, sample, css: `${CSS}
.k{position:absolute;top:420px;left:0;right:0;text-align:center}
.k span{display:inline-block;background:#fff;color:var(--accent);font:700 46px/1 'Hind';padding:20px 40px 14px;border-radius:10px}
.ti{position:absolute;top:540px;left:60px;right:60px;height:560px;display:flex;align-items:center;justify-content:center;text-align:center;font:800 150px/1.1 'Baloo';color:#fff;text-shadow:0 10px 40px rgba(0,0,0,.5)}
.bar2{position:absolute;top:1140px;left:50%;transform:translateX(-50%);width:200px;height:12px;border-radius:6px;background:var(--hi)}
.su{position:absolute;top:1190px;left:60px;right:60px;text-align:center;font:500 44px/1.4 'Hind';color:#fff;opacity:.9}
.ring{position:absolute;width:1200px;height:1200px;border-radius:50%;border:2px solid rgba(255,255,255,.07);left:-60px;top:280px}`,
  body: `${studio()}<div class="ring"></div>${hd(pg, t)}
<div class="k"><span>${esc(kicker)}</span></div>
<div class="ti fit" data-min="80"><div>${esc(title)}</div></div><div class="bar2"></div>
${sub ? `<div class="su">${esc(sub)}</div>` : ''}
${lower(pg.name, 'এখনই দেখুন', '')}${tick(pg, t)}` });
}

// ---------- একটি শিরোনাম ----------
export function headline({ page: pg, t, sample, n, total, label, title, source }) {
  return page({ pageCfg: pg, t, w: W, h: H, sample, css: `${CSS}
.lab{position:absolute;top:300px;left:60px;display:flex;gap:18px;align-items:center}
.lab .l{background:#fff;color:var(--accent);font:700 40px/1 'Hind';padding:16px 28px 12px;border-radius:10px}
.lab .c{font:700 44px/1 'Hind';color:var(--hi)}
.num{position:absolute;top:340px;right:40px;font:800 360px/1 'Baloo';color:rgba(255,255,255,.07)}
.h{position:absolute;top:440px;left:60px;right:70px;height:820px;display:flex;align-items:center;color:#fff;font:700 96px/1.3 'Hind';text-shadow:0 6px 24px rgba(0,0,0,.45)}
.rule{position:absolute;top:410px;left:60px;width:140px;height:10px;border-radius:5px;background:var(--hi)}
.pr{position:absolute;top:1300px;left:60px;right:60px;height:12px;border-radius:6px;background:rgba(255,255,255,.15)}
.pr i{display:block;height:100%;border-radius:6px;background:var(--accent);width:${total ? Math.round((n / total) * 100) : 100}%}`,
  body: `${studio(1000)}${hd(pg, t)}
<div class="lab"><span class="l">${esc(label)}</span>${total ? `<span class="c">${bn(n)}/${bn(total)}</span>` : ''}</div>
${n ? `<div class="num">${bn(n)}</div>` : ''}<div class="rule"></div>
<div class="h fit" data-min="54"><div>${headlineHTML(title)}</div></div>
${total ? '<div class="pr"><i></i></div>' : ''}
${lower('খবর', pg.name, source)}${tick(pg, t)}` });
}

// ---------- ব্রেকিং ----------
export function breaking({ page: pg, t, sample, title, source }) {
  return page({ pageCfg: pg, t, w: W, h: H, sample, vars: { accent: '#E11D2E', accent2: '#7F0018' }, css: `${CSS}
.bk{position:absolute;top:330px;left:0;right:0;height:140px;background:#E11D2E;display:flex;align-items:center;justify-content:center;gap:26px;transform:skewY(-4deg);box-shadow:0 20px 60px rgba(225,29,46,.45)}
.bk span{font:800 104px/1 'Baloo';color:#fff;padding-top:14px;letter-spacing:.01em}
.bk2{position:absolute;top:470px;left:0;right:0;height:16px;background:#fff;transform:skewY(-4deg)}
.dot{width:38px;height:38px;border-radius:50%;background:#fff;box-shadow:0 0 0 12px rgba(255,255,255,.3)}
.h{position:absolute;top:600px;left:60px;right:70px;height:700px;display:flex;align-items:center;color:#fff;font:700 98px/1.3 'Hind';text-shadow:0 6px 24px rgba(0,0,0,.5)}`,
  body: `${studio(1100)}${hd(pg, t)}
<div class="bk"><div class="dot"></div><span>ব্রেকিং নিউজ</span></div><div class="bk2"></div>
<div class="h fit" data-min="56"><div>${headlineHTML(title)}</div></div>
${lower('ব্রেকিং', pg.name, source)}${tick(pg, t)}` });
}

// ---------- আবহাওয়া ----------
const SKY = `<div style="position:absolute;inset:0;background:radial-gradient(80% 40% at 80% 8%,rgba(56,189,248,.45),transparent 60%),linear-gradient(180deg,#071A3A 0%,#0B2D66 55%,#0A1630 100%)"></div><div class="dots"></div>`;
export function weatherMain({ page: pg, t, sample, w }) {
  const m = w.main;
  return page({ pageCfg: pg, t, w: W, h: H, sample, css: `${CSS}
.ti{position:absolute;top:290px;left:0;right:0;text-align:center;font:800 96px/1 'Baloo';color:#fff}
.ic{position:absolute;top:410px;left:50%;transform:translateX(-50%)}
.big{position:absolute;top:740px;left:0;right:0;text-align:center;font:700 240px/1 'Hind';color:#fff}.big sup{font-size:80px;vertical-align:top}
.cty{position:absolute;top:1000px;left:0;right:0;text-align:center;font:700 66px/1.2 'Hind';color:#fff}
.cd{position:absolute;top:1090px;left:0;right:0;text-align:center;font:500 50px/1.3 'Hind';color:#fff;opacity:.95}
.row{position:absolute;top:1200px;left:60px;right:60px;display:flex;justify-content:center;gap:34px;font:600 40px/1.3 'Hind';color:#fff;flex-wrap:wrap}
.row span{background:rgba(255,255,255,.12);border-radius:12px;padding:10px 20px 6px}`,
  body: `${SKY}${hd(pg, t)}
<div class="ti">আজকের আবহাওয়া</div><div class="ic">${weatherIcon(m.code, 320)}</div>
<div class="big">${bn(m.now ?? m.max)}<sup>°সে</sup></div>
<div class="cty">${esc(m.name)}</div><div class="cd">${weatherText(m.code)}</div>
<div class="row"><span>সর্বোচ্চ ${bn(m.max)}°</span><span>সর্বনিম্ন ${bn(m.min)}°</span>${m.rain != null ? `<span>বৃষ্টি ${bn(m.rain)}%</span>` : ''}</div>
${lower('আবহাওয়া', pg.name, 'Open-Meteo')}${tick(pg, t)}` });
}

export function weatherGrid({ page: pg, t, sample, w }) {
  const cells = w.divisions.map((d) => `<div class="c">${weatherIcon(d.code, 96)}<div><div class="n">${esc(d.name)}</div><div class="v">${bn(d.max)}°<span> / ${bn(d.min)}°</span></div></div></div>`).join('');
  return page({ pageCfg: pg, t, w: W, h: H, sample, css: `${CSS}
.ti{position:absolute;top:290px;left:0;right:0;text-align:center;font:800 84px/1 'Baloo';color:#fff}
.g{position:absolute;top:420px;left:60px;right:60px;display:grid;grid-template-columns:1fr 1fr;gap:22px}
.c{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.14);border-radius:24px;padding:18px;height:212px;color:#fff}
.n{font:600 44px/1.2 'Hind'}.v{font:700 56px/1.2 'Hind'}.v span{font-weight:500;font-size:40px;opacity:.75}`,
  body: `${SKY}${hd(pg, t)}<div class="ti">বিভাগীয় শহরে আজ</div><div class="g">${cells}</div>
${lower('আবহাওয়া', 'তাপমাত্রা ডিগ্রি সেলসিয়াসে', 'Open-Meteo')}${tick(pg, t)}` });
}

// ---------- নামাজ ----------
export function prayer({ page: pg, t, sample, p }) {
  const rows = [['ফজর', p.times.fajr], ['সূর্যোদয়', p.times.sunrise], ['যোহর', p.times.dhuhr], ['আসর', p.times.asr], ['মাগরিব', p.times.maghrib], ['এশা', p.times.isha]];
  const hijri = p.hijri ? `${bn(p.hijri.day)} ${HIJRI_MONTHS[p.hijri.month - 1]} ${bn(p.hijri.year)} হিজরি` : '';
  return page({ pageCfg: pg, t, w: W, h: H, sample, vars: { accent: '#047857' }, css: `${CSS}
.bg{position:absolute;inset:0;background:radial-gradient(70% 35% at 50% 18%,rgba(253,230,138,.22),transparent 60%),linear-gradient(180deg,#02261C 0%,#04392A 55%,#021A13 100%)}
.pat{position:absolute;inset:0;opacity:.07;background-image:repeating-linear-gradient(45deg,#FDE68A 0 2px,transparent 2px 50px),repeating-linear-gradient(-45deg,#FDE68A 0 2px,transparent 2px 50px)}
.mo{position:absolute;top:270px;left:50%;transform:translateX(-50%)}
.ti{position:absolute;top:430px;left:0;right:0;text-align:center;font:800 90px/1 'Baloo';color:#FDE68A}
.su{position:absolute;top:540px;left:0;right:0;text-align:center;font:500 40px/1.3 'Hind';color:#fff;opacity:.9}
.l{position:absolute;top:620px;left:100px;right:100px}
.r{display:flex;justify-content:space-between;align-items:center;height:120px;border-bottom:1px solid rgba(253,230,138,.25);padding:0 18px;color:#fff}
.r:nth-child(2){opacity:.7}.a{font:700 58px/1 'Hind'}.b{font:600 58px/1 'Hind';color:#FDE68A}`,
  body: `<div class="bg"></div><div class="pat"></div>${hd(pg, t)}
<svg class="mo" width="140" height="140" viewBox="0 0 100 100"><path d="M62 12a40 40 0 1 0 26 66A34 34 0 1 1 62 12z" fill="#FDE68A"/><path d="M78 30l3 8 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" fill="#FDE68A"/></svg>
<div class="ti">নামাজের সময়সূচি</div><div class="su">${esc(p.city)} ও আশপাশ${hijri ? ' · ' + hijri : ''}</div>
<div class="l">${rows.map(([a, b]) => `<div class="r"><span class="a">${a}</span><span class="b">${bnTime12(b)}</span></div>`).join('')}</div>
${lower('নামাজ', 'স্থানভেদে কয়েক মিনিট পার্থক্য হতে পারে', '')}${tick(pg, t)}` });
}

// ---------- শুভ সকাল ----------
export function morning({ page: pg, t, sample, message }) {
  const rays = Array.from({ length: 24 }, (_, i) => `<rect x="297" y="0" width="6" height="110" rx="3" fill="#FFD27A" opacity=".5" transform="rotate(${i * 15} 300 300)"/>`).join('');
  return page({ pageCfg: pg, t, w: W, h: H, sample, css: `${CSS}
.bg{position:absolute;inset:0;background:linear-gradient(180deg,#1E1B4B 0%,#7C2D12 34%,#F97316 58%,#FDE68A 100%)}
.sun{position:absolute;top:260px;left:50%;transform:translateX(-50%)}
.gm{position:absolute;top:780px;left:0;right:0;text-align:center;font:800 190px/1 'Baloo';color:#fff;text-shadow:0 10px 40px rgba(124,45,18,.6)}
.msg{position:absolute;top:1020px;left:70px;right:70px;height:330px;display:flex;align-items:center;justify-content:center;text-align:center;font:400 62px/1.5 'Tiro';color:#1F1300;background:rgba(255,255,255,.6);border-radius:30px;padding:0 44px}`,
  body: `<div class="bg"></div>${hd(pg, t)}
<svg class="sun" width="620" height="620" viewBox="0 0 600 600">${rays}<circle cx="300" cy="300" r="140" fill="#FFB547"/><circle cx="300" cy="300" r="112" fill="#FFD27A"/></svg>
<div class="gm">শুভ সকাল</div><div class="msg fit" data-min="40"><div>${safe(message)}</div></div>
${lower('শুভেচ্ছা', `${pg.name} পরিবারের পক্ষ থেকে`, '')}${tick(pg, t)}` });
}

// ---------- লেখা (ভালোবাসা, মনের কথা, অনুপ্রেরণা, একটু হাসি …) ----------
const QUOTE_BG = {
  love: 'radial-gradient(80% 50% at 80% 10%,rgba(244,114,182,.45),transparent 60%),linear-gradient(170deg,#2A0718 0%,#6B0F35 55%,#1A0410 100%)',
  feelings: 'radial-gradient(80% 50% at 80% 10%,rgba(99,102,241,.45),transparent 60%),linear-gradient(170deg,#0B1023 0%,#1E2A5E 55%,#070A18 100%)',
  motivation: 'radial-gradient(80% 50% at 80% 10%,rgba(245,158,11,.45),transparent 60%),linear-gradient(170deg,#1A0E04 0%,#6B3410 55%,#120802 100%)',
  fun: 'radial-gradient(80% 50% at 80% 10%,rgba(45,212,191,.45),transparent 60%),linear-gradient(170deg,#04201C 0%,#0F5A50 55%,#031512 100%)',
};
export function quote({ page: pg, t, sample, kind, label, text, n, total }) {
  return page({ pageCfg: pg, t, w: W, h: H, sample, css: `${CSS}
.bg{position:absolute;inset:0;background:${QUOTE_BG[kind] || QUOTE_BG.feelings}}
.lab{position:absolute;top:330px;left:0;right:0;text-align:center}
.lab span{display:inline-block;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.3);color:#fff;font:700 42px/1 'Hind';padding:18px 36px 14px;border-radius:999px}
.qm{position:absolute;top:410px;left:60px;font:800 280px/1 'Baloo';color:var(--hi);opacity:.35}
.tx{position:absolute;top:560px;left:80px;right:80px;height:760px;display:flex;align-items:center;justify-content:center;text-align:center;font:400 82px/1.5 'Tiro';color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.35)}
.pg{position:absolute;top:1330px;left:0;right:0;text-align:center;font:600 36px/1 'Hind';color:#fff;opacity:.8}`,
  body: `<div class="bg"></div><div class="dots"></div>${hd(pg, t)}
<div class="lab"><span>${esc(label)}</span></div><div class="qm">“</div>
<div class="tx fit" data-min="48"><div>${safe(text)}</div></div>
${total > 1 ? `<div class="pg">${bn(n)} / ${bn(total)}</div>` : ''}
${lower(label, pg.name, '')}${tick(pg, t)}` });
}

// ---------- শেষ ----------
export function outro({ page: pg, t, sample, line }) {
  return page({ pageCfg: pg, t, w: W, h: H, sample, css: `${CSS}
.f{position:absolute;top:500px;left:60px;right:60px;text-align:center;font:800 120px/1.15 'Baloo';color:#fff}
.b{position:absolute;top:720px;left:0;right:0;display:flex;justify-content:center}
.l{position:absolute;top:960px;left:80px;right:80px;text-align:center;font:500 48px/1.45 'Hind';color:#fff;opacity:.92}
.cta{position:absolute;top:1180px;left:0;right:0;display:flex;justify-content:center;gap:24px}
.cta span{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;font:600 38px/1 'Hind';padding:18px 28px 14px;border-radius:14px}`,
  body: `${studio()}${hd(pg, t)}
<div class="f">ফলো করুন</div><div class="b">${brand(pg, 2.2)}</div>
<div class="l">${esc(line || 'প্রতিদিনের গুরুত্বপূর্ণ খবর সবার আগে পেতে পেজটি ফলো করুন।')}</div>
<div class="cta"><span>লাইক</span><span>কমেন্ট</span><span>শেয়ার</span></div>
${lower(pg.name, 'আপনার বিশ্বস্ত সঙ্গী', '')}${tick(pg, t)}` });
}
