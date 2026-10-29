// স্লাইড + বাংলা ভয়েস + মিউজিক → রিল ভিডিও (ffmpeg)
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { pick } from './util.js';

const FPS = 30;
const XF = 0.45; // স্লাইড বদলের সময় (সেকেন্ড)

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`${cmd} চালানো যায়নি: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} ব্যর্থ: ${(r.stderr || '').split('\n').filter(Boolean).slice(-4).join(' | ')}`);
  return r.stdout;
}

export function duration(file) {
  const out = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(out) || 0;
}

// Microsoft Edge-এর ফ্রি বাংলা ভয়েস (edge-tts) — অফিশিয়াল ফ্রি সার্ভিস নয়, বন্ধ হলে null ফেরত দেয়
let ttsBroken = false;
export function tts(text, outFile, voice = 'bn-BD-NabanitaNeural', rate = '+0%') {
  if (ttsBroken || !text || process.env.NO_TTS === 'true') return null;
  const r = spawnSync('edge-tts', ['--voice', voice, `--rate=${rate}`, '--text', text, '--write-media', outFile], { encoding: 'utf8', timeout: 60000 });
  if (r.status !== 0 || !existsSync(outFile) || statSync(outFile).size < 1000) {
    ttsBroken = true; // একবার ব্যর্থ হলে বাকি রিলেও ভয়েস ছাড়া চলবে
    console.log(`   ⚠️ বাংলা ভয়েস পাওয়া যায়নি, শুধু মিউজিক দিয়ে বানানো হচ্ছে (${(r.stderr || r.error?.message || '').trim().split('\n').pop() || 'অজানা কারণ'})`);
    return null;
  }
  return outFile;
}

// কপিরাইটমুক্ত মিউজিক: assets/music/-এ নিজের রয়্যালটি-ফ্রি mp3 রাখলে সেখান থেকে নেবে,
// না থাকলে ffmpeg দিয়ে নরম কর্ড-প্যাড বানাবে।
function musicInput(seed, total) {
  const dir = 'assets/music';
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => /\.(mp3|m4a|wav|ogg)$/i.test(f)) : [];
  if (files.length) return ['-stream_loop', '-1', '-i', `${dir}/${pick(files, seed)}`];
  const chords = [[220, 277.18, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
  const parts = chords.map(([a, b, c], k) => `between(mod(t\\,16)\\,${k * 4}\\,${k * 4 + 3.999})*(sin(2*PI*${a}*t)+0.8*sin(2*PI*${b}*t)+0.6*sin(2*PI*${c}*t)+0.3*sin(2*PI*${a / 2}*t))`);
  const expr = `0.07*(0.55-0.45*cos(2*PI*mod(t\\,4)/4))*(${parts.join('+')})`;
  return ['-f', 'lavfi', '-i', `aevalsrc=${expr}:s=44100:d=${Math.ceil(total + 1)}`];
}

/**
 * slides: [{ png, voice (mp3|null), min (সেকেন্ড) }]
 */
export function buildReel(slides, outMp4, seed = 'x') {
  // প্রতিটা স্লাইডের দৈর্ঘ্য: ভয়েসের দৈর্ঘ্য + বিরতি, অন্তত min সেকেন্ড
  const d = slides.map((s) => {
    const v = s.voice ? duration(s.voice) : 0;
    return Math.max(s.min || 3, v ? v + 1.0 : 0);
  });
  const start = [0];
  for (let i = 1; i < d.length; i++) start[i] = start[i - 1] + d[i - 1] - XF;
  const total = start[d.length - 1] + d[d.length - 1];

  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  slides.forEach((s) => args.push('-i', s.png));
  const voices = slides.map((s, i) => ({ f: s.voice, at: start[i] + (i ? XF : 0.25) })).filter((v) => v.f);
  voices.forEach((v) => args.push('-i', v.f));
  const musicIdx = slides.length + voices.length;
  args.push(...musicInput(seed, total));

  const f = [];
  // হালকা জুম (Ken Burns) প্রতিটা স্লাইডে
  slides.forEach((_, i) => {
    const frames = Math.ceil(d[i] * FPS);
    const zin = i % 2 === 0;
    const z = zin ? `1+0.07*on/${frames}` : `1.07-0.07*on/${frames}`;
    f.push(`[${i}:v]scale=1620:2880,zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS},setsar=1,format=yuv420p[v${i}]`);
  });
  const trans = ['fade', 'slideup', 'fade', 'smoothleft'];
  let last = 'v0';
  for (let i = 1; i < slides.length; i++) {
    const out = i === slides.length - 1 ? 'vout' : `x${i}`;
    f.push(`[${last}][v${i}]xfade=transition=${trans[i % trans.length]}:duration=${XF}:offset=${start[i].toFixed(3)}[${out}]`);
    last = out;
  }
  if (slides.length === 1) f.push('[v0]null[vout]');

  // অডিও: ভয়েস ঠিক সময়ে বসানো + নিচু স্বরে মিউজিক
  const musicVol = voices.length ? 0.16 : 0.5;
  f.push(`[${musicIdx}:a]atrim=0:${total.toFixed(2)},asetpts=PTS-STARTPTS,volume=${musicVol},lowpass=f=2500,afade=t=in:d=1,afade=t=out:st=${Math.max(0, total - 1.5).toFixed(2)}:d=1.5[mus]`);
  if (voices.length) {
    voices.forEach((v, k) => {
      const ms = Math.round(v.at * 1000);
      f.push(`[${slides.length + k}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[a${k}]`);
    });
    f.push(`${voices.map((_, k) => `[a${k}]`).join('')}amix=inputs=${voices.length}:duration=longest:normalize=0,volume=1.6[vox]`);
    f.push('[mus]aformat=channel_layouts=stereo[mus2]');
    f.push('[vox][mus2]amix=inputs=2:duration=longest:normalize=0[aout]');
  } else {
    f.push('[mus]aformat=channel_layouts=stereo[aout]');
  }

  args.push('-filter_complex', f.join(';'), '-map', '[vout]', '-map', '[aout]',
    '-t', total.toFixed(2), '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-movflags', '+faststart', outMp4);
  run('ffmpeg', args);
  return { file: outMp4, seconds: total };
}
