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
  let cur = 0.3;
  for (const s of segs) {
    const speakDur = s.adur || (s.say.length / 14); // ভয়েস না থাকলে পড়ার আনুমানিক সময়
    s.start = cur; s.voiceAt = cur + 0.15;
    s.dur = Math.max(s.min, speakDur + 0.15 + GAP);
    if (s.kind === 'item' || s.kind === 'detail') {
      const share = s.linkLen ? s.linkLen / s.say.length : 0;
      s.revealStart = s.voiceAt + speakDur * share;
      s.revealEnd = s.voiceAt + speakDur * (s.kind === 'detail' ? 0.95 : 0.9);
    }
    cur += s.dur;
  }
  segs[0].start = 0; segs[0].dur += 0.3;
  const total = cur + 0.2;
  const frames = Math.ceil(total * FPS);

  // ---------- অডিও (ভয়েস + নিচু মিউজিক) ----------
  const voiced = segs.filter((s) => s.audio);
  const narr = `${dir}/narration.wav`;
  const music = ['-f', 'lavfi', '-i', `aevalsrc=0.05*(0.6-0.4*cos(2*PI*mod(t\\,0.5)/0.5))*(sin(2*PI*110*t)+0.5*sin(2*PI*164.8*t)+0.35*sin(2*PI*220*t))*exp(-3*mod(t\\,0.5)):s=44100:d=${Math.ceil(total + 1)}`];
  {
    const a = ['-y', '-loglevel', 'error'];
    voiced.forEach((s) => a.push('-i', s.audio));
    a.push(...music);
    const f = [];
    voiced.forEach((s, k) => { const ms = Math.round(s.voiceAt * 1000); f.push(`[${k}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[a${k}]`); });
    const mi = voiced.length;
    f.push(`[${mi}:a]atrim=0:${total.toFixed(2)},volume=${voiced.length ? 0.35 : 0.9},lowpass=f=1800,afade=t=in:d=1,afade=t=out:st=${Math.max(0, total - 1.2).toFixed(2)}:d=1.2,aformat=channel_layouts=stereo[m]`);
    if (voiced.length) {
      f.push(`${voiced.map((_, k) => `[a${k}]`).join('')}amix=inputs=${voiced.length}:duration=longest:normalize=0,volume=1.5,acompressor=threshold=-18dB:ratio=3:attack=5:release=80[v]`);
      f.push('[v][m]amix=inputs=2:duration=first:normalize=0[o]');
    } else f.push('[m]anull[o]');
    a.push('-filter_complex', f.join(';'), '-map', '[o]', '-t', total.toFixed(2), '-ar', '44100', narr);
    const r = spawnSync('ffmpeg', a, { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`অডিও জোড়া ব্যর্থ: ${(r.stderr || '').split('\n').slice(-3).join(' ')}`);
  }
  const env = envelope(narr, frames);

  // ---------- ফ্রেম আঁকা ----------
  const spec = {
    accent: opts.accent || page.theme?.accent || '#C8102E', accent2: page.theme?.accent2 || '#7F1D1D',
    brandA, brandB: rest.join(' ') || 'NEWS', pageName: page.name, date: opts.dateText, title: opts.title || 'এই মুহূর্তের খবর',
    kicker: opts.kicker || 'সংবাদ শিরোনাম', breaking: !!opts.breaking, anchor: `${page.name} সংবাদ`,
    outroTop: opts.breaking ? 'আরও আপডেট পেতে' : 'আরও খবরের জন্য', outroLine: 'ফলো করুন, শেয়ার করুন',
    ticker: items.map((x) => noLinks(x.title)).join('   ●   '), cat: 'news', env,
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
