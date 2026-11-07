// টিভি-স্টাইল নিউজ রিল: সংবাদপাঠকের মতো ভয়েস + শব্দে শব্দে লেখা + স্থির ক্যামেরা + চলমান টিকার
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FONTS } from './templates.js';
import { noLinks } from './design.js';
import { speakSegments } from './voice.js';
import { duration } from './video.js';
import { pick } from './util.js';

const FPS = 30;
const GAP = 0.35;

// সংবাদপাঠকের মতো সংযোগ শব্দ — "এক, দুই, তিন" বলা হয় না
const LINK = {
  sports: ['খেলার খবরে,', 'খেলার মাঠ থেকে,', 'এবার খেলার খবর।'],
  entertainment: ['বিনোদন অঙ্গনে,', 'এবার বিনোদনের খবর।'],
  world: ['আন্তর্জাতিক খবরে,', 'বিশ্বজুড়ে,'],
  politics: ['রাজনীতির খবরে,'],
  news: ['এদিকে,', 'অন্যদিকে,', 'এছাড়া,', 'আর এক খবরে,'],
};
const sayClean = (s) => noLinks(s)
  .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
  .replace(/["“”'‘’«»]/g, '').replace(/\s*[:：]\s*/g, ', ').replace(/\s*[—–]\s*/g, ', ')
  .replace(/[()[\]]/g, '').replace(/\s{2,}/g, ' ').trim()
  .replace(/[।.!?]*$/, '।');

function catOf(item) {
  const t = `${item.topic || ''} ${item.label || ''} ${item.title}`;
  if (/sports|খেলা|ক্রিকেট|ফুটবল|গোল|ম্যাচ|টাইগার/.test(t)) return 'sports';
  if (/বিনোদন|সিনেমা|নায়ক|নায়িকা|অভিনেত/.test(t)) return 'entertainment';
  if (/world|আন্তর্জাতিক|যুক্তরাষ্ট্র|ভারত|চীন|রাশিয়া|ইসরায়েল|গাজা|ইউক্রেন/.test(t)) return 'world';
  return 'news';
}

// পিসিএম থেকে প্রতি ফ্রেমের আওয়াজের মাত্রা (ভয়েস-ওয়েভের বারের জন্য)
function envelope(audioFile, frames) {
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', audioFile, '-ac', '1', '-ar', '6000', '-f', 's16le', '-'], { maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) return [];
  const buf = r.stdout; const per = 6000 / FPS; const out = [];
  for (let f = 0; f < frames; f++) {
    let sum = 0, n = 0;
    for (let i = Math.floor(f * per); i < Math.floor((f + 1) * per) && i * 2 + 1 < buf.length; i++) { const v = buf.readInt16LE(i * 2) / 32768; sum += v * v; n++; }
    out.push(n ? Math.sqrt(sum / n) : 0);
  }
  const mx = Math.max(0.05, ...out);
  return out.map((v) => Math.min(1, v / mx));
}

/**
 * opts: { page, t, dateText, title, kicker, items:[{title,source,label,topic}], breaking, outDir, name, browser, seed, voice:{geminiVoice, edgeVoice, edgeRate} }
 */
export async function buildNewsReel(opts) {
  const { page, items, outDir, name, getBrowser } = opts;
  const dir = `${outDir}/${name}`; mkdirSync(dir, { recursive: true });
  const [brandA, ...rest] = String(page.logoText || page.name).split(/\s+/);
  const segs = [];
  // ---------- স্ক্রিপ্ট ----------
  // শুধু খবর পড়া হয় — সূত্র, চ্যানেলের নাম বা "ফলো করুন" মুখে বলা হয় না (সূত্র শুধু পর্দায় লেখা থাকে)
  if (opts.breaking) segs.push({ kind: 'intro', say: '', min: 1.5 });
  else segs.push({ kind: 'intro', say: opts.introSay || 'এই মুহূর্তের গুরুত্বপূর্ণ খবর।', min: 2.2 });
  items.forEach((it, i) => {
    const cat = catOf(it);
    const link = i === 0 ? '' : `${pick(LINK[cat] || LINK.news, `${opts.seed}|${i}`)} `;
    const body = sayClean(it.title);
    const c2 = cat === 'sports' ? 'sports' : 'news';
    segs.push({ kind: 'item', title: noLinks(it.title), source: noLinks(it.source || ''), label: it.label || 'খবর', cat: c2, say: `${link}${body}`, linkLen: link.length, n: i + 1, of: items.length, min: 3.2 });
    // বিস্তারিত: প্রতিটা বাক্য আলাদা অংশ — বলার সাথে সাথে শব্দে শব্দে লেখা ওঠে
    (it.detail?.sentences || []).forEach((sen, k, all) => {
      segs.push({ kind: 'detail', title: noLinks(it.title), text: noLinks(sen), source: noLinks(it.source || ''), label: 'বিস্তারিত', cat: c2, say: sayClean(sen), linkLen: 0, k: k + 1, of: all.length, min: 2.4 });
    });
  });
  segs.push({ kind: 'outro', say: '', min: 1.8 });

  // ---------- ভয়েস ----------
  const auds = await speakSegments(segs.map((s) => s.say), `${dir}/v`, { style: 'news', ...opts.voice });
  segs.forEach((s, i) => { s.audio = auds[i]; s.adur = s.audio ? duration(s.audio) : 0; });
  // ---------- সময়রেখা ----------
  const full = auds.full; // Gemini: পুরো একটানা কণ্ঠ — কাটা-জোড়া ছাড়া, সংবাদপাঠকের মতো
  let narrAt = 0;         // একটানা কণ্ঠ কখন শুরু
  if (full) {
    const first = full.idx[0];
    narrAt = first === 0 ? 0.3 : segs.slice(0, first).reduce((t, s) => t + s.min, 0);
    let cur = 0;
    segs.forEach((s, i) => {
      const k = full.idx.indexOf(i);
      if (k >= 0) { s.start = narrAt + full.pts[k]; s.dur = full.pts[k + 1] - full.pts[k]; }
      else if (i < first) { s.start = cur; s.dur = s.min; }
      else { const last = segs[i - 1]; s.start = last.start + last.dur + 0.15; s.dur = s.min; }
      cur = s.start + s.dur;
    });
    if (first === 0) { segs[0].dur += segs[0].start; segs[0].start = 0; }
  } else {
    let cur = 0.3;
    for (const s of segs) {
      const speakDur = s.adur || (s.say.length / 14); // ভয়েস না থাকলে পড়ার আনুমানিক সময়
      s.start = cur; s.voiceAt = cur + 0.15;
      s.dur = Math.max(s.min, speakDur + 0.15 + GAP);
      cur += s.dur;
    }
    segs[0].start = 0; segs[0].dur += 0.3;
  }
  const lastSeg = segs[segs.length - 1];
  const total = lastSeg.start + lastSeg.dur + 0.2;
  const frames = Math.ceil(total * FPS);

  // ---------- অডিও ----------
  // ১) শুধু কণ্ঠের ট্র্যাক (লেখা মেলানোর জন্য এটা থেকেই মাপা হয়)
  const voiceOnly = `${dir}/voice.wav`;
  const voiced = full ? [] : segs.filter((s) => s.audio);
  const hasVoice = !!full || voiced.length > 0;
  if (hasVoice) {
    const a = ['-y', '-loglevel', 'error']; const f = [];
    if (full) {
      const ms = Math.round(narrAt * 1000);
      a.push('-i', full.wav);
      f.push(`[0:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${ms}|${ms},apad[v]`);
    } else {
      voiced.forEach((s) => a.push('-i', s.audio));
      // প্রতিটা অংশের শুরু-শেষে খুব নরম ফেড — হঠাৎ কাটার "টক" শব্দ যেন না হয়
      voiced.forEach((s, k) => { const ms = Math.round(s.voiceAt * 1000); f.push(`[${k}:a]aresample=44100,aformat=channel_layouts=stereo,afade=t=in:d=0.03,areverse,afade=t=in:d=0.06,areverse,adelay=${ms}|${ms}[a${k}]`); });
      f.push(`${voiced.map((_, k) => `[a${k}]`).join('')}amix=inputs=${voiced.length}:duration=longest:normalize=0,apad[v]`);
    }
    a.push('-filter_complex', f.join(';'), '-map', '[v]', '-t', total.toFixed(2), '-ar', '44100', voiceOnly);
    const r = spawnSync('ffmpeg', a, { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`কণ্ঠ জোড়া ব্যর্থ: ${(r.stderr || '').split('\n').slice(-3).join(' ')}`);
  }
  // ২) নিচু, টানা ব্যাকগ্রাউন্ড সুর (তাল/টিক-টিক শব্দ ছাড়া) + কণ্ঠ
  const narr = `${dir}/narration.wav`;
  {
    const pad = `aevalsrc=0.022*(sin(2*PI*110*t)+0.6*sin(2*PI*164.81*t)+0.45*sin(2*PI*220*t)+0.25*sin(2*PI*277.18*t))*(0.85+0.15*sin(2*PI*0.08*t)):s=44100:d=${Math.ceil(total + 1)}`;
    const a = ['-y', '-loglevel', 'error'];
    if (hasVoice) a.push('-i', voiceOnly);
    a.push('-f', 'lavfi', '-i', pad);
    const mi = hasVoice ? 1 : 0; const f = [];
    f.push(`[${mi}:a]atrim=0:${total.toFixed(2)},volume=${hasVoice ? 0.5 : 1.2},lowpass=f=1400,afade=t=in:d=1.2,afade=t=out:st=${Math.max(0, total - 1.2).toFixed(2)}:d=1.2,aformat=channel_layouts=stereo[m]`);
    if (hasVoice) {
      f.push('[0:a]volume=1.4,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150[v]');
      f.push('[v][m]amix=inputs=2:duration=first:normalize=0[o]');
    } else f.push('[m]anull[o]');
    a.push('-filter_complex', f.join(';'), '-map', '[o]', '-t', total.toFixed(2), '-ar', '44100', narr);
    const r = spawnSync('ffmpeg', a, { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`অডিও জোড়া ব্যর্থ: ${(r.stderr || '').split('\n').slice(-3).join(' ')}`);
  }
  // ৩) লেখা ওঠা কণ্ঠের সাথে হুবহু: কণ্ঠ যতটুকু আসলে বলা হয়েছে (আওয়াজ থাকা সময়) ততটুকু শব্দ দেখা যায়
  const venv = hasVoice ? envelope(voiceOnly, frames) : [];
  for (const s of segs) {
    if (s.kind !== 'item' && s.kind !== 'detail') continue;
    const f0 = Math.floor(s.start * FPS), f1 = Math.min(frames, Math.ceil((s.start + s.dur) * FPS));
    const act = []; let sum = 0;
    for (let f = f0; f < f1; f++) { const on = (venv[f] || 0) > 0.08 ? 1 : 0; sum += on; act.push(sum); }
    if (sum > FPS * 0.4) {
      // প্রতিটা ফ্রেমে কতটা বলা হয়েছে (০–১); একটু আগে দেখানো যাতে শব্দ শোনার সাথে সাথে দেখা যায়
      const lead = 3;
      s.curveF0 = f0; s.curve = act.map((_, i) => Math.round((act[Math.min(act.length - 1, i + lead)] / sum) * 1000) / 1000);
      const firstOn = act.findIndex((v) => v > 0); const lastOn = act.indexOf(sum);
      s.revealStart = (f0 + Math.max(0, firstOn)) / FPS; s.revealEnd = (f0 + Math.max(0, lastOn)) / FPS;
    } else {
      const share = s.linkLen ? s.linkLen / s.say.length : 0;
      const sd = s.adur || (s.say.length / 14); const va = s.voiceAt ?? s.start + 0.15;
      s.revealStart = va + sd * share; s.revealEnd = va + sd * 0.95;
    }
    s.share = s.linkLen ? s.linkLen / s.say.length : 0;
  }
  const env = hasVoice ? venv : envelope(narr, frames);

  // ---------- ফ্রেম আঁকা ----------
  const spec = {
    accent: opts.accent || page.theme?.accent || '#C8102E', accent2: page.theme?.accent2 || '#7F1D1D',
    brandA, brandB: rest.join(' ') || 'NEWS', pageName: page.name, date: opts.dateText, title: opts.title || 'এই মুহূর্তের খবর',
    kicker: opts.kicker || 'সংবাদ শিরোনাম', breaking: !!opts.breaking, anchor: `${page.name} সংবাদ`,
    outroTop: opts.breaking ? 'আরও আপডেট পেতে' : 'আরও খবরের জন্য', outroLine: 'ফলো করুন, শেয়ার করুন',
    ticker: items.map((x) => noLinks(x.title)).join('   ●   '), cat: 'news', env, fps: FPS,
    segments: segs.map(({ audio, adur, say, ...s }) => s),
  };
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}html,body{margin:0;background:#000}</style></head>
<body><canvas id="c" width="1080" height="1920"></canvas><div style="font-family:Hind;position:absolute;opacity:0">অ</div><div style="font-family:Baloo;position:absolute;opacity:0">অ</div>
<script>${readFileSync(new URL('./newsreel-canvas.js', import.meta.url), 'utf8')}</script></body></html>`;
  const htmlPath = `${dir}/reel.html`; writeFileSync(htmlPath, html);
  const b = await getBrowser();
  const tab = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await tab.goto(pathToFileURL(resolve(htmlPath)).href);
  await tab.evaluate((s) => window.setupReel(s), spec);

  const out = `${outDir}/${name}.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-', '-i', narr,
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-t', total.toFixed(2), out], { stdio: ['pipe', 'inherit', 'pipe'] });
  let errText = ''; ff.stderr.on('data', (d) => { errText += d; process.stderr.write(d); });
  let closed = false;
  ff.stdin.on('error', () => { closed = true; }); // ffmpeg শেষ সময়ে পৌঁছে আগেই পাইপ বন্ধ করলে — স্বাভাবিক
  const done = new Promise((res, rej) => ff.on('close', (c) => { closed = true; c === 0 ? res() : rej(new Error(`ভিডিও তৈরি ব্যর্থ (ffmpeg ${c}): ${errText.trim().split('\n').slice(-2).join(' ')}`)); }));
  const write = (buf) => new Promise((res) => {
    if (closed || ff.stdin.destroyed) return res();
    const onDrain = () => { ff.removeListener('close', onDrain); res(); };
    if (ff.stdin.write(buf)) res(); else { ff.stdin.once('drain', onDrain); ff.once('close', onDrain); }
  });
  const BATCH = 12;
  for (let f = 0; f < frames; f += BATCH) {
    const ts = Array.from({ length: Math.min(BATCH, frames - f) }, (_, k) => (f + k) / FPS);
    const urls = await tab.evaluate(([ts, f0]) => window.drawFrames(ts, f0), [ts, f]);
    for (const u of urls) await write(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
    if (closed) break;
  }
  if (!closed) ff.stdin.end();
  await done;
  await tab.close();
  return { file: out, seconds: total, voiced: voiced.length };
}
