// কার্ডের HTML টেমপ্লেট — 1080×1350 (ফেসবুক ফিডের জন্য 4:5)
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { bn, bnDate, banglaDateText, bnTime12, esc, HIJRI_MONTHS } from './util.js';

const require = createRequire(import.meta.url);
const fontFile = (pkg, file) => pathToFileURL(require.resolve(`@fontsource/${pkg}/files/${file}`)).href;

const face = (family, pkg, slug, weight) => ['bengali', 'latin'].map((sub) => `
@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;font-display:block;
src:url('${fontFile(pkg, `${slug}-${sub}-${weight}-normal.woff2`)}') format('woff2');}`).join('');

export const FONTS = [
  face('Hind', 'noto-sans-bengali', 'noto-sans-bengali', 400),
  face('Hind', 'noto-sans-bengali', 'noto-sans-bengali', 500),
  face('Hind', 'noto-sans-bengali', 'noto-sans-bengali', 600),
  face('Hind', 'noto-sans-bengali', 'noto-sans-bengali', 700),
  face('Baloo', 'baloo-da-2', 'baloo-da-2', 700),
  face('Baloo', 'baloo-da-2', 'baloo-da-2', 800),
  face('Tiro', 'tiro-bangla', 'tiro-bangla', 400),
].join('');

// ---------- আইকন (SVG — ইমোজি ফন্টের উপর নির্ভর না করার জন্য) ----------
const SUN = (c = '#FDB813') => `<circle cx="50" cy="50" r="20" fill="${c}"/>${Array.from({ length: 8 }, (_, i) => `<rect x="47" y="10" width="6" height="16" rx="3" fill="${c}" transform="rotate(${i * 45} 50 50)"/>`).join('')}`;
const CLOUD = (c = '#E5E7EB') => `<path d="M28 74h46a16 16 0 0 0 0-32 22 22 0 0 0-42-4 15 15 0 0 0-4 36z" fill="${c}"/>`;
const DROPS = `<g fill="#60A5FA"><path d="M36 80l-4 10" stroke="#60A5FA" stroke-width="5" stroke-linecap="round"/><path d="M52 80l-4 10" stroke="#60A5FA" stroke-width="5" stroke-linecap="round"/><path d="M68 80l-4 10" stroke="#60A5FA" stroke-width="5" stroke-linecap="round"/></g>`;
const BOLT = `<path d="M52 72l-10 16h9l-5 12 14-18h-9l6-10z" fill="#FACC15"/>`;
const FOG = `<g stroke="#CBD5E1" stroke-width="6" stroke-linecap="round"><path d="M22 40h56"/><path d="M16 56h68"/><path d="M24 72h52"/></g>`;

export function weatherIcon(code, size = 100) {
  let inner;
  if (code === 0) inner = SUN();
  else if (code <= 2) inner = `<g transform="translate(14,-10) scale(.72)">${SUN()}</g>${CLOUD()}`;
  else if (code === 3) inner = CLOUD('#CBD5E1');
  else if (code === 45 || code === 48) inner = FOG;
  else if (code >= 95) inner = `<g transform="translate(0,-8)">${CLOUD('#94A3B8')}</g>${BOLT}`;
  else if (code >= 51) inner = `<g transform="translate(0,-10)">${CLOUD('#CBD5E1')}</g>${DROPS}`;
  else inner = CLOUD();
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100">${inner}</svg>`;
}

export function weatherText(code) {
  if (code === 0) return 'পরিষ্কার আকাশ';
  if (code === 1) return 'প্রায় পরিষ্কার';
  if (code === 2) return 'আংশিক মেঘলা';
  if (code === 3) return 'মেঘলা আকাশ';
  if (code === 45 || code === 48) return 'কুয়াশা';
  if (code >= 51 && code <= 57) return 'গুঁড়ি গুঁড়ি বৃষ্টি';
  if (code >= 61 && code <= 67) return 'বৃষ্টি';
  if (code >= 71 && code <= 77) return 'তুষারপাত';
  if (code >= 80 && code <= 82) return 'থেমে থেমে বৃষ্টি';
  if (code >= 95) return 'বজ্রসহ বৃষ্টি';
  return 'আবহাওয়া';
}

// ---------- কাঠামো ----------
export function logoHTML(page) {
  const file = `assets/logos/${page.id}.png`;
  if (existsSync(file)) {
    const b64 = readFileSync(file).toString('base64');
    return `<img class="logo-img" src="data:image/png;base64,${b64}">`;
  }
  return `<div class="logo-badge"><span>${esc(page.logoText || page.name)}</span></div>`;
}

function shell({ page, body, extraCSS = '', bg, sample, t }) {
  const th = page.theme;
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><style>
${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
:root{--accent:${th.accent};--accent2:${th.accent2 || th.accent};--ink:${th.ink || '#0F172A'};--paper:${th.paper || '#FFFFFF'}}
html,body{width:1080px;height:1350px;overflow:hidden}
body{font-family:'Hind',sans-serif;color:var(--ink);background:${bg || 'var(--paper)'};position:relative}
.top{position:absolute;left:0;right:0;top:0;height:120px;display:flex;align-items:center;justify-content:space-between;padding:0 56px}
.logo-badge{background:var(--accent);color:#fff;border-radius:18px;padding:10px 26px 6px;font:800 40px/1 'Baloo',sans-serif;letter-spacing:.5px;box-shadow:0 8px 24px rgba(0,0,0,.18)}
.logo-img{height:84px;max-width:340px;object-fit:contain}
.date{font:500 30px/1.2 'Hind';text-align:right;opacity:.9}
.foot{position:absolute;left:0;right:0;bottom:0;height:92px;display:flex;align-items:center;justify-content:space-between;padding:0 56px;background:var(--accent);color:#fff;font:600 30px/1 'Hind'}
.foot .src{font-weight:500;opacity:.92;font-size:26px}
.sample{position:absolute;top:260px;right:-80px;transform:rotate(35deg);background:#DC2626;color:#fff;font:700 30px/1 'Hind';padding:12px 100px;z-index:9;opacity:.9}
.fit{overflow:hidden}
${extraCSS}
</style></head><body>
<div class="top">${logoHTML(page)}<div class="date">${bnDate(t)}<br><span style="font-size:24px;opacity:.85">${banglaDateText(t)}</span></div></div>
${body}
${sample ? '<div class="sample">নমুনা ডেটা</div>' : ''}
</body></html>`;
}

const footer = (left, right = '') => `<div class="foot"><span>${esc(left)}</span><span class="src">${esc(right)}</span></div>`;

// ---------- শুভ সকাল ----------
const MORNING_BG = [
  'linear-gradient(160deg,#FFF7E6 0%,#FFE0B2 45%,#FFB38A 100%)',
  'linear-gradient(160deg,#E8F5E9 0%,#C8E6C9 50%,#81C784 100%)',
  'linear-gradient(160deg,#E3F2FD 0%,#BBDEFB 50%,#90CAF9 100%)',
  'linear-gradient(160deg,#FCE4EC 0%,#F8BBD0 50%,#F48FB1 100%)',
  'linear-gradient(160deg,#FFFDE7 0%,#FFF59D 50%,#FFD54F 100%)',
  'linear-gradient(160deg,#EDE7F6 0%,#D1C4E9 50%,#B39DDB 100%)',
  'linear-gradient(160deg,#E0F7FA 0%,#B2EBF2 50%,#80DEEA 100%)',
];

export function goodMorning({ page, t, message, sample }) {
  const bg = MORNING_BG[(t.day + page.id.length) % MORNING_BG.length];
  const rays = Array.from({ length: 16 }, (_, i) => `<rect x="296" y="0" width="8" height="90" rx="4" fill="#FFB300" opacity=".55" transform="rotate(${i * 22.5} 300 300)"/>`).join('');
  return shell({ page, t, sample, bg, extraCSS: `
.sun{position:absolute;left:50%;top:120px;transform:translateX(-50%)}
.gm{position:absolute;top:640px;left:0;right:0;text-align:center;font:800 168px/1 'Baloo';color:var(--ink);text-shadow:0 6px 0 rgba(255,255,255,.6)}
.msg{position:absolute;top:850px;left:90px;right:90px;height:280px;display:flex;align-items:center;justify-content:center;text-align:center;font:400 54px/1.5 'Tiro';color:#1F2937}
.hills{position:absolute;left:0;right:0;bottom:92px}`,
  body: `
<svg class="sun" width="500" height="500" viewBox="0 0 600 600">${rays}<circle cx="300" cy="300" r="150" fill="#FFC107"/><circle cx="300" cy="300" r="122" fill="#FFD54F"/></svg>
<div class="gm">শুভ সকাল</div>
<div class="msg fit" data-min="34">${esc(message)}</div>
<svg class="hills" width="1080" height="140" viewBox="0 0 1080 140" preserveAspectRatio="none"><path d="M0 90 Q200 10 420 80 T820 60 T1080 70 V140 H0Z" fill="#fff" opacity=".45"/><path d="M0 120 Q260 60 540 110 T1080 100 V140 H0Z" fill="#fff" opacity=".75"/></svg>
${footer(page.name, page.handle || '')}`,
  });
}

// ---------- আবহাওয়া ----------
export function weather({ page, t, w, sample }) {
  const m = w.main;
  const cells = w.divisions.map((d) => `
<div class="cell">${weatherIcon(d.code, 72)}<div class="cn">${esc(d.name)}</div><div class="ct">${bn(d.max)}°<span>/${bn(d.min)}°</span></div>${d.rain != null ? `<div class="cr">বৃষ্টি ${bn(d.rain)}%</div>` : ''}</div>`).join('');
  return shell({ page, t, sample, bg: 'linear-gradient(180deg,#0B3B66 0%,#1565C0 55%,#42A5F5 100%)', extraCSS: `
body{color:#fff}.date{color:#fff}
.title{position:absolute;top:140px;left:56px;font:800 64px/1 'Baloo'}
.hero{position:absolute;top:230px;left:56px;right:56px;height:330px;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.25);border-radius:36px;display:flex;align-items:center;padding:0 44px;gap:30px}
.big{font:700 150px/1 'Hind'}.big sup{font-size:60px;vertical-align:top}
.hinfo{flex:1}.hcity{font:700 50px/1.2 'Hind'}.hcond{font:500 38px/1.3 'Hind';opacity:.95}
.hrow{display:flex;gap:26px;margin-top:14px;font:500 28px/1.3 'Hind';opacity:.9;flex-wrap:wrap}
.grid{position:absolute;top:600px;left:56px;right:56px;display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.cell{background:rgba(255,255,255,.14);border-radius:26px;padding:16px 10px 18px;text-align:center}
.cn{font:600 32px/1.2 'Hind'}.ct{font:700 40px/1.2 'Hind'}.ct span{font-weight:500;font-size:30px;opacity:.8}.cr{font:500 24px/1.2 'Hind';opacity:.85}
.note{position:absolute;bottom:112px;left:56px;right:56px;text-align:center;font:500 24px/1.3 'Hind';opacity:.75}`,
  body: `
<div class="title">আজকের আবহাওয়া</div>
<div class="hero">${weatherIcon(m.code, 190)}
<div class="big">${bn(m.now ?? m.max)}<sup>°সে</sup></div>
<div class="hinfo"><div class="hcity">${esc(m.name)}</div><div class="hcond">${weatherText(m.code)}</div>
<div class="hrow"><span>সর্বোচ্চ ${bn(m.max)}°</span><span>সর্বনিম্ন ${bn(m.min)}°</span>${m.rain != null ? `<span>বৃষ্টির সম্ভাবনা ${bn(m.rain)}%</span>` : ''}${m.humidity ? `<span>আর্দ্রতা ${bn(m.humidity)}%</span>` : ''}</div></div></div>
<div class="grid">${cells}</div>
<div class="note">পূর্বাভাসের উৎস: Open-Meteo · তাপমাত্রা ডিগ্রি সেলসিয়াসে</div>
${footer(page.name, page.handle || '')}`,
  });
}

// ---------- নামাজের সময় ----------
export function prayer({ page, t, p, sample }) {
  const rows = [['ফজর', p.times.fajr], ['সূর্যোদয়', p.times.sunrise], ['যোহর', p.times.dhuhr], ['আসর', p.times.asr], ['মাগরিব', p.times.maghrib], ['এশা', p.times.isha]];
  const hijri = p.hijri ? `${bn(p.hijri.day)} ${HIJRI_MONTHS[p.hijri.month - 1]} ${bn(p.hijri.year)} হিজরি` : '';
  const arch = `<svg class="arch" width="140" height="140" viewBox="0 0 100 100"><path d="M62 12a40 40 0 1 0 26 66A34 34 0 1 1 62 12z" fill="#FDE68A"/><path d="M78 30l3 8 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" fill="#FDE68A"/></svg>`;
  return shell({ page, t, sample, bg: 'linear-gradient(180deg,#022C22 0%,#064E3B 50%,#065F46 100%)', extraCSS: `
body{color:#fff}.date{color:#fff}
.arch{position:absolute;top:120px;left:50%;transform:translateX(-50%)}
.title{position:absolute;top:270px;left:0;right:0;text-align:center;font:800 76px/1 'Baloo';color:#FDE68A}
.sub{position:absolute;top:365px;left:0;right:0;text-align:center;font:500 34px/1.3 'Hind';opacity:.92}
.list{position:absolute;top:450px;left:110px;right:110px}
.row{display:flex;justify-content:space-between;align-items:center;height:104px;border-bottom:2px solid rgba(253,230,138,.25);padding:0 26px}
.row:nth-child(2){opacity:.75}
.n{font:700 50px/1 'Hind'}.v{font:600 50px/1 'Hind';color:#FDE68A}
.note{position:absolute;bottom:112px;left:56px;right:56px;text-align:center;font:500 25px/1.35 'Hind';opacity:.75}`,
  body: `${arch}
<div class="title">আজকের নামাজের সময়সূচি</div>
<div class="sub">${esc(p.city)} ও আশপাশের এলাকা${hijri ? ' · ' + hijri : ''}</div>
<div class="list">${rows.map(([n, v]) => `<div class="row"><span class="n">${n}</span><span class="v">${bnTime12(v)}</span></div>`).join('')}</div>
<div class="note">হিসাব: Aladhan (করাচি পদ্ধতি, হানাফি আসর)। ইসলামিক ফাউন্ডেশনের সময়সূচির সাথে কয়েক মিনিট পার্থক্য হতে পারে।</div>
${footer(page.name, page.handle || '')}`,
  });
}

// ---------- খবরের তালিকা (সেরা ১০ / বিভাগভিত্তিক) ----------
export function newsList({ page, t, title, items, sample }) {
  const many = items.length > 6;
  return shell({ page, t, sample, bg: 'var(--paper)', extraCSS: `
.title{position:absolute;top:132px;left:56px;right:56px;display:flex;align-items:center;gap:20px}
.title h1{font:800 66px/1.1 'Baloo';color:var(--ink)}
.title .bar{flex:1;height:8px;border-radius:4px;background:linear-gradient(90deg,var(--accent),transparent)}
.list{position:absolute;top:240px;left:56px;right:56px;bottom:116px;display:flex;flex-direction:column;justify-content:space-between}
.item{display:flex;gap:22px;align-items:center;flex:1;border-bottom:2px solid #E5E7EB;padding:${many ? 6 : 14}px 0}
.item:last-child{border-bottom:none}
.num{flex:none;width:${many ? 62 : 80}px;height:${many ? 62 : 80}px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font:700 ${many ? 34 : 42}px/1 'Hind';padding-top:4px}
.txt{flex:1;min-width:0}
.h{font:600 ${many ? 34 : 46}px/1.28 'Hind';color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.s{font:500 ${many ? 22 : 26}px/1.2 'Hind';color:#64748B;margin-top:2px}`,
  body: `
<div class="title"><h1>${esc(title)}</h1><div class="bar"></div></div>
<div class="list">${items.map((it, i) => `<div class="item"><div class="num">${bn(i + 1)}</div><div class="txt"><div class="h">${esc(it.title)}</div>${it.source ? `<div class="s">${esc(it.source)}</div>` : ''}</div></div>`).join('')}</div>
${footer(page.name, 'সূত্র: সংশ্লিষ্ট সংবাদমাধ্যম')}`,
  });
}

// ---------- একক খবরের ফটোকার্ড ----------
export function singleNews({ page, t, label, item, sample }) {
  return shell({ page, t, sample, bg: 'var(--paper)', extraCSS: `
.panel{position:absolute;top:150px;left:56px;right:56px;bottom:140px;border-radius:40px;background:linear-gradient(160deg,var(--accent2) 0%,var(--accent) 100%);overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.18)}
.panel:before{content:'';position:absolute;width:700px;height:700px;border-radius:50%;background:rgba(255,255,255,.08);right:-260px;top:-260px}
.panel:after{content:'';position:absolute;width:520px;height:520px;border-radius:50%;background:rgba(0,0,0,.08);left:-200px;bottom:-220px}
.tag{position:absolute;top:56px;left:56px;background:#fff;color:var(--accent);font:700 36px/1 'Hind';padding:16px 30px 12px;border-radius:999px;z-index:2}
.head{position:absolute;top:160px;left:64px;right:64px;bottom:170px;display:flex;align-items:center;color:#fff;font:700 82px/1.3 'Hind';z-index:2;text-shadow:0 3px 12px rgba(0,0,0,.2)}
.nsrc{position:absolute;left:64px;right:64px;bottom:56px;color:#fff;font:500 32px/1.3 'Hind';opacity:.92;z-index:2;border-top:2px solid rgba(255,255,255,.35);padding-top:24px}`,
  body: `
<div class="panel"><div class="tag">${esc(label)}</div>
<div class="head fit" data-min="46">${esc(item.title)}</div>
<div class="nsrc">সূত্র: ${esc(item.source || 'সংশ্লিষ্ট সংবাদমাধ্যম')}</div></div>
${footer(page.name, page.handle || '')}`,
  });
}
