// বাংলা ভয়েস: প্রথমে Google Gemini TTS (মানুষের মতো স্বাভাবিক কণ্ঠ, GEMINI_API_KEY Secret লাগে),
// না পেলে Microsoft Edge-এর ফ্রি বাংলা কণ্ঠ (edge-tts)। দুটোই না পেলে null — রিল তখন শুধু মিউজিকে হবে।
import { spawnSync } from 'node:child_process';
import { existsSync, statSync, writeFileSync } from 'node:fs';

const KEY = () => process.env.GEMINI_API_KEY || '';
let geminiBroken = false;
let edgeBroken = false;
export const voiceStatus = { used: new Set(), notes: new Set() };

// style: 'news' (সংবাদ পাঠক) | 'warm' (শুভেচ্ছা/অনুভূতি)
const STYLE = {
  news: 'Read the following Bengali (Bangla, Bangladesh) text aloud exactly as written, like a professional Bangladeshi TV news anchor: clear, confident, natural human delivery, brisk news pace, no robotic tone. Do not add or skip any words.',
  warm: 'Read the following Bengali (Bangla, Bangladesh) text aloud exactly as written, in a warm, natural, heartfelt human voice at a calm pace. Do not add or skip any words.',
};

async function gemini(text, outWav, { voice = 'Charon', style = 'news', models } = {}) {
  if (!KEY() || geminiBroken) return null;
  const list = models || (process.env.GEMINI_TTS_MODEL ? [process.env.GEMINI_TTS_MODEL] : ['gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-tts', 'gemini-2.5-pro-preview-tts']);
  let lastErr = '';
  for (const model of list) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY() },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${STYLE[style] || STYLE.news}\n\n${text}` }] }],
            generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.status === 429) { lastErr = 'Gemini সীমা পূর্ণ (429)'; await new Promise((s) => setTimeout(s, 20000)); continue; }
        if (!r.ok) { lastErr = `${model}: ${j.error?.message || r.status}`; break; }
        const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
        if (!part) { lastErr = `${model}: অডিও আসেনি`; break; }
        const pcm = Buffer.from(part.inlineData.data, 'base64');
        const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1] || 24000);
        const raw = outWav + '.pcm'; writeFileSync(raw, pcm);
        const c = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', outWav]);
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
