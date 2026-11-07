// বাংলা ভয়েস: প্রথমে Google Gemini TTS (মানুষের মতো স্বাভাবিক কণ্ঠ, GEMINI_API_KEY Secret লাগে),
// না পেলে Microsoft Edge-এর ফ্রি বাংলা কণ্ঠ (edge-tts)। দুটোই না পেলে null — রিল তখন শুধু মিউজিকে হবে।
import { spawnSync } from 'node:child_process';
import { existsSync, statSync, writeFileSync } from 'node:fs';

// একাধিক Gemini কী: GEMINI_API_KEY-তে কমা/নতুন লাইন দিয়ে কয়েকটা, অথবা GEMINI_API_KEY_2 … GEMINI_API_KEY_10।
// একটার সীমা শেষ (৪২৯) হলে সাথে সাথে পরেরটায় যায়। প্রতি ঘণ্টায় শুরুর কী বদলায়, যাতে চাপ সব কী-তে ভাগ হয়।
const KEYS = (() => {
  const all = [process.env.GEMINI_API_KEY, ...Array.from({ length: 9 }, (_, i) => process.env[`GEMINI_API_KEY_${i + 2}`])]
    .flatMap((v) => String(v || '').split(/[\s,;]+/)).map((k) => k.trim()).filter((k) => k.length > 20);
  const uniq = [...new Set(all)];
  const start = uniq.length ? new Date().getUTCHours() % uniq.length : 0;
  return [...uniq.slice(start), ...uniq.slice(0, start)];
})();
const dead = new Set(); // এই রানে সীমা-শেষ কী (ভয়েস)
const deadText = new Set(); // লেখার মডেলের সীমা আলাদা
const KEY = () => KEYS.find((k) => !dead.has(k)) || '';
export const geminiKeyCount = KEYS.length;
const TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse';
let geminiBroken = false;
let edgeBroken = false;
export const voiceStatus = { used: new Set(), notes: new Set() };

// style: 'news' (সংবাদ পাঠক) | 'warm' (শুভেচ্ছা/অনুভূতি)
const STYLE = {
  news: 'You are a female news presenter on a leading Bangladeshi TV channel. Read the following Bangla text aloud exactly as written, in standard Bangladeshi (Dhaka) Bangla pronunciation, like a real human anchor: warm but authoritative, clear diction, natural intonation and breathing, lively brisk news pace, short natural pauses between news items. Read Bangla numerals in Bangla. Never sound robotic. Do not add, skip or translate any words.',
  warm: 'Read the following Bangla text aloud exactly as written, in standard Bangladeshi Bangla pronunciation, in a warm, natural, heartfelt young female human voice at a calm pace with natural pauses. Never sound robotic. Do not add, skip or translate any words.',
};

async function gemini(text, outWav, { voice = 'Charon', style = 'news', models, trim = true } = {}) {
  if (!KEY() || geminiBroken) return null;
  const list = models || (process.env.GEMINI_TTS_MODEL ? [process.env.GEMINI_TTS_MODEL] : ['gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-tts', 'gemini-2.5-pro-preview-tts']);
  let lastErr = '';
  for (const model of list) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const key = KEY(); if (!key) break;
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${STYLE[style] || STYLE.news}\n\n${text}` }] }],
            generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.status === 429 || r.status === 403) {
          lastErr = `Gemini সীমা পূর্ণ/অনুমতি নেই (${r.status})`;
          dead.add(key);
          if (KEY()) { attempt = -1; continue; } // পরের কী দিয়ে আবার
          break;
        }
        if (!r.ok) { lastErr = `${model}: ${(j.error?.message || r.status).toString().slice(0, 160)}`; break; }
        const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
        if (!part) { lastErr = `${model}: অডিও আসেনি`; break; }
        const pcm = Buffer.from(part.inlineData.data, 'base64');
        const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1] || 24000);
        const raw = outWav + '.pcm'; writeFileSync(raw, pcm);
        const c = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', raw, ...(trim ? ['-af', TRIM] : []), outWav]);
        if (c.status === 0 && existsSync(outWav)) { voiceStatus.used.add('Gemini'); return outWav; }
        lastErr = 'অডিও রূপান্তর ব্যর্থ'; break;
      } catch (e) { lastErr = e.message; break; }
    }
  }
  geminiBroken = true;
  voiceStatus.notes.add(`Gemini ভয়েস পাওয়া যায়নি (${lastErr}) — Microsoft বাংলা কণ্ঠ ব্যবহার হচ্ছে`);
  console.log(`   ⚠️ Gemini ভয়েস পাওয়া যায়নি: ${lastErr}`);
  return null;
}

function edge(text, outMp3, { voice = 'bn-BD-PradeepNeural', rate = '+8%' } = {}) {
  if (edgeBroken || process.env.NO_TTS === 'true') return null;
  const r = spawnSync('edge-tts', ['--voice', voice, `--rate=${rate}`, '--text', text, '--write-media', outMp3], { encoding: 'utf8', timeout: 60000 });
  if (r.status !== 0 || !existsSync(outMp3) || statSync(outMp3).size < 1000) {
    edgeBroken = true;
    voiceStatus.notes.add('Microsoft বাংলা কণ্ঠও পাওয়া যায়নি — রিল শুধু মিউজিকে');
    return null;
  }
  voiceStatus.used.add('Microsoft');
  return outMp3;
}

// base: ফাইলের নাম (এক্সটেনশন ছাড়া)
export async function speak(text, base, opts = {}) {
  if (!text) return null;
  return (await gemini(text, `${base}.wav`, { voice: opts.geminiVoice, style: opts.style })) || edge(text, `${base}.mp3`, { voice: opts.edgeVoice, rate: opts.edgeRate });
}

// একটা লম্বা অডিওকে n ভাগে ভাগ: সবচেয়ে লম্বা n-1টা বিরতিতে কাটা (না পেলে লেখার দৈর্ঘ্যের অনুপাতে)
export function splitBySilence(wav, lens, base) {
  const n = lens.length;
  const total = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], { encoding: 'utf8' }).stdout) || 0;
  if (!total) return null;
  let cuts = [];
  if (n > 1) {
    const r = spawnSync('ffmpeg', ['-i', wav, '-af', 'silencedetect=noise=-35dB:d=0.18', '-f', 'null', '-'], { encoding: 'utf8' });
    const st = [...(r.stderr || '').matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
    const en = [...(r.stderr || '').matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
    const sil = st.map((a, i) => ({ a, b: en[i] ?? total })).filter((x) => x.a > 0.4 && x.b < total - 0.3);
    const sum = lens.reduce((a, b) => a + b, 0);
    let acc = 0; const want = lens.slice(0, -1).map((l) => (acc += l) / sum * total); // প্রত্যাশিত কাটার জায়গা
    if (sil.length >= n - 1) {
      // প্রতিটা প্রত্যাশিত জায়গার কাছের লম্বা বিরতিটা নেওয়া
      const used = new Set();
      cuts = want.map((w) => {
        let best = -1, bestScore = -1e9;
        sil.forEach((x, i) => { if (used.has(i)) return; const mid = (x.a + x.b) / 2; const sc = (x.b - x.a) * 4 - Math.abs(mid - w); if (sc > bestScore) { bestScore = sc; best = i; } });
        used.add(best); return (sil[best].a + sil[best].b) / 2;
      }).sort((a, b) => a - b);
    } else cuts = want;
  }
  const pts = [0, ...cuts, total];
  const out = [];
  for (let i = 0; i < n; i++) {
    const f = `${base}-p${i}.wav`;
    const c = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', `atrim=${pts[i].toFixed(3)}:${pts[i + 1].toFixed(3)},asetpts=PTS-STARTPTS,${TRIM}`, f]);
    if (c.status !== 0) return null;
    out.push(f);
  }
  return out;
}

// একসাথে কয়েকটা রিল বানালেও ভয়েসের অনুরোধ একটা একটা করে যায় (Gemini-র মিনিটপ্রতি সীমা যেন না ভাঙে)
let voiceQueue = Promise.resolve();
export function speakSegments(texts, base, opts = {}) {
  const run = voiceQueue.then(() => speakSegments0(texts, base, opts));
  voiceQueue = run.catch(() => {});
  return run;
}

// লেখার জন্য কোন Gemini মডেল চালু আছে — Google-এর তালিকা থেকে নিজে খুঁজে নেয় (পুরোনো মডেল বন্ধ হলেও চলবে)
let textModelList = null;
async function textModels() {
  if (textModelList) return textModelList;
  const pref = [process.env.GEMINI_TEXT_MODEL, 'gemini-flash-latest'].filter(Boolean);
  let found = [];
  try {
    const key = KEYS[0];
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
    const j = await r.json();
    const ver = (n) => Number((/gemini-(\d+(?:\.\d+)?)/.exec(n) || [])[1] || 0);
    found = (j.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((n) => /^gemini-[\d.]+-flash/.test(n) && !/tts|image|audio|live|embed|thinking|exp/.test(n))
      .sort((x, y) => ver(y) - ver(x) || (/lite/.test(x) - /lite/.test(y)) || (/preview/.test(x) - /preview/.test(y)));
    console.log(`   ℹ️ লেখার মডেল: ${found.slice(0, 4).join(', ') || 'তালিকা পাওয়া যায়নি'}`);
  } catch (e) { console.log(`   ⚠️ মডেল তালিকা পাওয়া যায়নি: ${e.message}`); }
  textModelList = [...new Set([...pref, ...found.slice(0, 4)])];
  return textModelList;
}

// Gemini দিয়ে লেখা তৈরি (Google Search থেকে তথ্য নিয়ে)। কী শেষ হলে পরের কী। ব্যর্থ হলে null।
const badModels = new Set();
let lastGood = ''; // এই রানে যে মডেল কাজ করেছে, পরের খবরে আগে সেটা
const noThink = new Set(); // যেসব মডেল "কম ভাবো" সেটিং নেয় না
export async function geminiText(prompt, { search = true, deadline = Date.now() + 180000 } = {}) {
  if (!KEYS.length) return null;
  const ms = await textModels();
  for (const model of lastGood ? [lastGood, ...ms.filter((m) => m !== lastGood)] : ms) {
    if (badModels.has(model)) continue;
    for (let attempt = 0; attempt < 3 + KEYS.length; attempt++) {
      const left = deadline - Date.now(); if (left < 5000) return null;
      const key = KEYS.find((k) => !deadText.has(`${search}|${model}|${k}`)); if (!key) break; // এই মডেলে সব কী শেষ — পরের মডেল
      try {
        const t0 = Date.now(); const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), Math.min(20000, left));
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST', signal: ac.signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            ...(search ? { tools: [{ google_search: {} }] } : {}),
            generationConfig: { temperature: 0.2, ...(noThink.has(model) ? {} : /gemini-[3-9]/.test(model) || /latest/.test(model) ? { thinkingConfig: { thinkingLevel: 'low' } } : /2\.5/.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
          }),
        });
        const j = await r.json().catch(() => ({})); clearTimeout(tm);
        const msg = (j.error?.message || String(r.status)).slice(0, 160);
        console.log(`   ⏱️ ${model}: ${r.status} · ${((Date.now() - t0) / 1000).toFixed(0)} সেকেন্ড`);
        if (r.status === 429) {
          // মিনিটের সীমা হলে একটু থেমে আবার; দিনের সীমা হলে এই কী বাদ
          if (/per.?minute|PerMinute/i.test(JSON.stringify(j)) && attempt < 2) { console.log('   ⏳ মিনিটের সীমা — ২০ সেকেন্ড অপেক্ষা'); await new Promise((ok) => setTimeout(ok, 20000)); continue; }
          console.log(`   ⚠️ ${model}: সীমা পূর্ণ (${msg})`); deadText.add(`${search}|${model}|${key}`); continue;
        }
        if (r.status === 403) { console.log(`   ⚠️ ${model}: অনুমতি নেই (${msg})`); deadText.add(`${search}|${model}|${key}`); continue; }
        if (r.status >= 500) break; // সার্ভার ব্যস্ত — দ্রুত পরের মডেলে
        if (r.status === 400 && /think/i.test(msg) && !noThink.has(model)) { noThink.add(model); attempt--; continue; }
        if (!r.ok) { console.log(`   ⚠️ ${model}: ${msg}`); badModels.add(model); break; }
        const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
        if (text) { lastGood = model; return text; }
        console.log(`   ⚠️ ${model}: খালি উত্তর (${j.candidates?.[0]?.finishReason || '?'})`);
        break;
      } catch (e) { console.log(`   ⚠️ ${model}: ${e.name === 'AbortError' ? 'সময়মতো উত্তর আসেনি' : e.message}`); break; }
    }
  }
  return null;
}

// কয়েকটা অংশের ভয়েস — সব অংশ একই কণ্ঠে (Gemini একবারে, না হলে সব Microsoft)
async function speakSegments0(texts, base, opts = {}) {
  const idx = texts.map((t, i) => (t ? i : -1)).filter((i) => i >= 0);
  const res = texts.map(() => null);
  if (!idx.length) return res;
  if (KEY() && !geminiBroken) {
    const full = idx.map((i) => texts[i].trim()).join('\n\n');
    const wav = await gemini(full, `${base}-all.wav`, { voice: opts.geminiVoice, style: opts.style, trim: false });
    if (wav) {
      const parts = splitBySilence(wav, idx.map((i) => texts[i].length), base);
      if (parts) { idx.forEach((i, k) => { res[i] = parts[k]; }); return res; }
      voiceStatus.used.delete('Gemini');
    }
  }
  for (const i of idx) res[i] = edge(texts[i], `${base}-${i}.mp3`, { voice: opts.edgeVoice, rate: opts.edgeRate });
  if (res.some((x, i) => texts[i] && !x)) return texts.map(() => null); // অর্ধেক কণ্ঠ রাখার চেয়ে মিউজিক ভালো
  return res;
}
