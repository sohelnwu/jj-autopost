// ফটোকার্ড — 1080×1350, টিভি নিউজ চ্যানেলের ধাঁচে। কোনো লিংক/পেজ-ঠিকানা নেই।
import { page, brand, headlineHTML, safe, tickerText, bn, bnDate, banglaDateText, esc } from './design.js';
import { weatherIcon, weatherText } from './templates.js';
import { bnTime12, HIJRI_MONTHS } from './util.js';

const W = 1080, H = 1350;

const header = (pg, t, right = '') => `
<div class="hd">${brand(pg)}<div class="hd-r">${right || `<div class="d1">${bnDate(t)}</div><div class="d2">${banglaDateText(t)}</div>`}</div></div>`;

const HEADER_CSS = `
.hd{position:absolute;top:44px;left:48px;right:48px;display:flex;align-items:center;justify-content:space-between;z-index:5}
.hd-r{text-align:right;color:#fff}
.hd-r .d1{font:600 30px/1.2 'Hind'}.hd-r .d2{font:500 24px/1.3 'Hind';opacity:.75}`;

const lower = (tag, mid, src, bottom = 46) => `
<div class="lower" style="bottom:${bottom}px"><div class="tag">${esc(tag)}</div><div class="bar"><span>${safe(mid)}</span>${src ? `<span class="src">সূত্র: ${safe(src)}</span>` : ''}</div></div>`;

// ---------- একক খবর (ব্রেকিং/বিভাগভিত্তিক) ----------
export function singleNews({ page: pg, t, label, item, sample, breaking = false }) {
  return page({ pageCfg: pg, t, w: W, h: H, sample, css: `${HEADER_CSS}
.k{position:absolute;top:250px;left:48px;display:flex;gap:16px;align-items:center;z-index:5}
.cat{background:#fff;color:var(--accent);font:700 34px/1 'Hind';padding:14px 26px 10px;border-radius:8px}
.rule{position:absolute;top:340px;left:48px;width:120px;height:10px;background:var(--hi);border-radius:5px}
.head{position:absolute;top:380px;left:48px;right:60px;height:640px;display:flex;align-items:center;color:#fff;font:700 92px/1.28 'Hind';text-shadow:0 6px 24px rgba(0,0,0,.45);z-index:5}
.glow{position:absolute;right:-180px;top:180px;width:760px;height:760px;border-radius:50%;border:2px solid rgba(255,255,255,.08);box-shadow:inset 0 0 120px rgba(255,255,255,.04)}
.glow2{position:absolute;right:-60px;top:300px;width:520px;height:520px;border-radius:50%;border:2px solid rgba(255,255,255,.06)}`,
  body: `<div class="studio"></div><div class="dots"></div><div class="streak" style="top:760px"></div><div class="glow"></div><div class="glow2"></div>
${header(pg, t)}
<div class="k">${breaking ? '<span class="live">ব্রেকিং</span>' : ''}<span class="cat">${esc(label)}</span></div>
<div class="rule"></div>
<div class="head fit" data-min="50"><div>${headlineHTML(item.title)}</div></div>
${lower(breaking ? 'ব্রেকিং' : 'খবর', pg.name, item.source)}
<div class="ticker" style="bottom:0">${tickerText(pg, t)}</div>` });
}

// ---------- খবরের তালিকা (সেরা ৫ / ১০) ----------
export function newsList({ page: pg, t, title, items, sample }) {
  const many = items.length > 6;
  const rows = items.map((it, i) => `
<div class="it"><div class="n">${bn(i + 1)}</div><div class="tx"><div class="h">${safe(it.title)}</div>${it.source ? `<div class="s">${safe(it.source)}</div>` : ''}</div></div>`).join('');
  return page({ pageCfg: pg, t, w: W, h: H, sample, css: `${HEADER_CSS}
.ti{position:absolute;top:170px;left:48px;right:48px;display:flex;align-items:center;gap:22px}
.ti h1{font:800 ${many ? 64 : 76}px/1.1 'Baloo';color:#fff;white-space:nowrap}
.ti .ln{flex:1;height:8px;border-radius:4px;background:linear-gradient(90deg,var(--hi),transparent)}
.list{position:absolute;top:${many ? 268 : 290}px;left:48px;right:48px;bottom:156px;display:flex;flex-direction:column;gap:${many ? 10 : 16}px}
.it{flex:1;display:flex;align-items:center;gap:22px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-left:6px solid var(--accent);border-radius:14px;padding:0 24px}
.n{flex:none;width:${many ? 58 : 76}px;font:800 ${many ? 46 : 60}px/1 'Baloo';color:var(--hi);text-align:center;padding-top:6px}
.tx{flex:1;min-width:0}
.h{color:#fff;font:600 ${many ? 31 : 42}px/1.3 'Hind';display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.s{color:#94A3B8;font:500 ${many ? 21 : 25}px/1.2 'Hind';margin-top:2px}`,
  body: `<div class="studio"></div><div class="dots"></div>
${header(pg, t)}
<div class="ti"><h1>${esc(title)}</h1><div class="ln"></div></div>
<div class="list">${rows}</div>
${lower('শিরোনাম', pg.name, '')}
<div class="ticker" style="bottom:0">${tickerText(pg, t, ['বিস্তারিত সংশ্লিষ্ট সংবাদমাধ্যমে'])}</div>` });
}

// ---------- আবহাওয়া ----------
export function weather({ page: pg, t, w, sample }) {
  const m = w.main;
  const cells = w.divisions.map((d) => `<div class="c">${weatherIcon(d.code, 70)}<div class="cn">${esc(d.name)}</div><div class="cv">${bn(d.max)}°<span> / ${bn(d.min)}°</span></div></div>`).join('');
  return page({ pageCfg: pg, t, w: W, h: H, sample, vars: { accent2: '#1D4ED8' }, css: `${HEADER_CSS}
.sky{position:absolute;inset:0;background:radial-gradient(80% 50% at 80% 10%,rgba(56,189,248,.45),transparent 60%),linear-gradient(180deg,#071A3A 0%,#0B2D66 55%,#0A1630 100%)}
.ti{position:absolute;top:170px;left:48px;font:800 70px/1 'Baloo';color:#fff}
.hero{position:absolute;top:270px;left:48px;right:48px;height:330px;border-radius:28px;background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;gap:20px;padding:0 40px;color:#fff}
.big{font:700 150px/1 'Hind';margin-right:18px}.big sup{font-size:56px;vertical-align:top}
.hi{flex:1}.hc{font:700 48px/1.2 'Hind'}.hw{font:500 36px/1.3 'Hind';opacity:.95}
.hr{display:flex;gap:22px;flex-wrap:wrap;margin-top:12px;font:500 27px/1.3 'Hind';opacity:.9}
.g{position:absolute;top:660px;left:48px;right:48px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.c{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.12);border-radius:20px;text-align:center;padding:22px 6px 24px;color:#fff}
.cn{font:600 30px/1.2 'Hind'}.cv{font:700 36px/1.2 'Hind'}.cv span{font-weight:500;font-size:26px;opacity:.75}`,
  body: `<div class="sky"></div><div class="dots"></div>
${header(pg, t)}
<div class="ti">আজকের আবহাওয়া</div>
<div class="hero">${weatherIcon(m.code, 180)}<div class="big">${bn(m.now ?? m.max)}<sup>°সে</sup></div>
<div class="hi"><div class="hc">${esc(m.name)}</div><div class="hw">${weatherText(m.code)}</div>
<div class="hr"><span>সর্বোচ্চ ${bn(m.max)}°</span><span>সর্বনিম্ন ${bn(m.min)}°</span>${m.rain != null ? `<span>বৃষ্টি ${bn(m.rain)}%</span>` : ''}</div></div></div>
<div class="g">${cells}</div>
${lower('আবহাওয়া', 'বিভাগীয় শহরের পূর্বাভাস', 'Open-Meteo')}
<div class="ticker" style="bottom:0">${tickerText(pg, t, ['তাপমাত্রা ডিগ্রি সেলসিয়াসে'])}</div>` });
}

// ---------- নামাজের সময় ----------
export function prayer({ page: pg, t, p, sample }) {
  const rows = [['ফজর', p.times.fajr], ['সূর্যোদয়', p.times.sunrise], ['যোহর', p.times.dhuhr], ['আসর', p.times.asr], ['মাগরিব', p.times.maghrib], ['এশা', p.times.isha]];
  const hijri = p.hijri ? `${bn(p.hijri.day)} ${HIJRI_MONTHS[p.hijri.month - 1]} ${bn(p.hijri.year)} হিজরি` : '';
  return page({ pageCfg: pg, t, w: W, h: H, sample, css: `${HEADER_CSS}
.bg{position:absolute;inset:0;background:radial-gradient(70% 45% at 50% 18%,rgba(253,230,138,.22),transparent 60%),linear-gradient(180deg,#02261C 0%,#04392A 55%,#021A13 100%)}
.pat{position:absolute;inset:0;opacity:.08;background-image:repeating-linear-gradient(45deg,#FDE68A 0 2px,transparent 2px 46px),repeating-linear-gradient(-45deg,#FDE68A 0 2px,transparent 2px 46px)}
.mo{position:absolute;top:165px;left:50%;transform:translateX(-50%)}
.ti{position:absolute;top:300px;left:0;right:0;text-align:center;font:800 72px/1 'Baloo';color:#FDE68A}
.su{position:absolute;top:390px;left:0;right:0;text-align:center;font:500 32px/1.3 'Hind';color:#fff;opacity:.9}
.l{position:absolute;top:460px;left:90px;right:90px}
.r{display:flex;justify-content:space-between;align-items:center;height:104px;border-bottom:1px solid rgba(253,230,138,.25);padding:0 18px;color:#fff}
.r:nth-child(2){opacity:.7}
.a{font:700 48px/1 'Hind'}.b{font:600 48px/1 'Hind';color:#FDE68A}`,
  body: `<div class="bg"></div><div class="pat"></div>
${header(pg, t)}
<svg class="mo" width="120" height="120" viewBox="0 0 100 100"><path d="M62 12a40 40 0 1 0 26 66A34 34 0 1 1 62 12z" fill="#FDE68A"/><path d="M78 30l3 8 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" fill="#FDE68A"/></svg>
<div class="ti">আজকের নামাজের সময়সূচি</div>
<div class="su">${esc(p.city)} ও আশপাশ${hijri ? ' · ' + hijri : ''}</div>
<div class="l">${rows.map(([a, b]) => `<div class="r"><span class="a">${a}</span><span class="b">${bnTime12(b)}</span></div>`).join('')}</div>
${lower('নামাজ', 'স্থানভেদে কয়েক মিনিট পার্থক্য হতে পারে', '')}
<div class="ticker" style="bottom:0">${tickerText(pg, t, ['মসজিদের ঘোষিত সময় অনুসরণ করুন'])}</div>`, vars: { accent: '#047857' } });
}

// ---------- শুভ সকাল ----------
export function goodMorning({ page: pg, t, message, sample }) {
  const rays = Array.from({ length: 24 }, (_, i) => `<rect x="297" y="0" width="6" height="110" rx="3" fill="#FFD27A" opacity=".5" transform="rotate(${i * 15} 300 300)"/>`).join('');
  return page({ pageCfg: pg, t, w: W, h: H, sample, css: `${HEADER_CSS}
.bg{position:absolute;inset:0;background:linear-gradient(180deg,#1E1B4B 0%,#7C2D12 38%,#F97316 62%,#FDE68A 100%)}
.sun{position:absolute;top:240px;left:50%;transform:translateX(-50%)}
.hz{position:absolute;left:0;right:0;top:700px;height:2px;background:rgba(255,255,255,.5)}
.gm{position:absolute;top:640px;left:0;right:0;text-align:center;font:800 170px/1 'Baloo';color:#fff;text-shadow:0 10px 40px rgba(124,45,18,.6)}
.msg{position:absolute;top:880px;left:80px;right:80px;height:250px;display:flex;align-items:center;justify-content:center;text-align:center;font:400 54px/1.5 'Tiro';color:#1F1300;background:rgba(255,255,255,.55);border-radius:28px;padding:0 40px;backdrop-filter:blur(4px)}`,
  body: `<div class="bg"></div>
${header(pg, t)}
<svg class="sun" width="600" height="600" viewBox="0 0 600 600">${rays}<circle cx="300" cy="300" r="140" fill="#FFB547"/><circle cx="300" cy="300" r="112" fill="#FFD27A"/></svg>
<div class="gm">শুভ সকাল</div>
<div class="msg fit" data-min="34">${safe(message)}</div>
${lower('শুভেচ্ছা', `${pg.name} পরিবারের পক্ষ থেকে`, '')}
<div class="ticker" style="bottom:0">${tickerText(pg, t)}</div>` });
}

// ---------- শুভ রাত্রি ----------
export function goodNight({ page: pg, t, message, sample }) {
  let seed = 7; for (const c of t.iso + pg.id) seed = (Math.imul(seed, 31) + c.codePointAt(0)) | 0;
  const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) | 0; return ((seed >>> 8) % 10000) / 10000; };
  const stars = Array.from({ length: 70 }, () => `<circle cx="${(rnd() * 1080).toFixed(0)}" cy="${(rnd() * 700).toFixed(0)}" r="${(0.8 + rnd() * 2.2).toFixed(1)}" fill="#fff" opacity="${(0.3 + rnd() * 0.7).toFixed(2)}"/>`).join('');
  return page({ pageCfg: pg, t, w: 1080, h: 1350, sample, css: `
.hd{position:absolute;top:44px;left:48px;right:48px;display:flex;align-items:center;justify-content:space-between;z-index:5}
.hd-r{text-align:right;color:#fff}.hd-r .d1{font:600 30px/1.2 'Hind'}.hd-r .d2{font:500 24px/1.3 'Hind';opacity:.75}
.bg{position:absolute;inset:0;background:radial-gradient(60% 40% at 72% 22%,rgba(147,197,253,.22),transparent 60%),linear-gradient(180deg,#020617 0%,#0B1437 55%,#1E1B4B 100%)}
.moon{position:absolute;top:150px;right:150px}
.gn{position:absolute;top:560px;left:0;right:0;text-align:center;font:800 160px/1 'Baloo';color:#fff;text-shadow:0 0 50px rgba(147,197,253,.45)}
.msg{position:absolute;top:800px;left:80px;right:80px;height:300px;display:flex;align-items:center;justify-content:center;text-align:center;font:400 52px/1.5 'Tiro';color:#E0E7FF;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:28px;padding:0 40px}`,
  body: `<div class="bg"></div><svg style="position:absolute;inset:0" width="1080" height="1350">${stars}</svg>
<div class="hd">${brand(pg)}<div class="hd-r"><div class="d1">${bnDate(t)}</div><div class="d2">${banglaDateText(t)}</div></div></div>
<svg class="moon" width="300" height="300" viewBox="0 0 100 100"><defs><radialGradient id="mg"><stop offset="0" stop-color="#FEF9C3"/><stop offset="1" stop-color="#FDE68A"/></radialGradient></defs><path d="M62 10a42 42 0 1 0 28 70A36 36 0 1 1 62 10z" fill="url(#mg)"/></svg>
<div class="gn">শুভ রাত্রি</div>
<div class="msg fit" data-min="34"><div>${safe(message)}</div></div>
<div class="lower" style="bottom:46px"><div class="tag">শুভ রাত্রি</div><div class="bar"><span>${esc(pg.name)} পরিবারের পক্ষ থেকে</span></div></div>
<div class="ticker" style="bottom:0">${tickerText(pg, t)}</div>` });
}
