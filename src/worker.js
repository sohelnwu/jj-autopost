// সারাক্ষণ চলা কর্মী: GitHub-এর নির্ধারিত রান অনিয়মিত হয় (কখনো ৫–৬ ঘণ্টা পরপর), তাই
// একটা রান প্রায় ৫ ঘণ্টা ৪০ মিনিট চালু থেকে প্রতি ৫ মিনিটে দেখে কোন পোস্টের সময় হয়েছে,
// তারপর শেষ হওয়ার আগে নিজেই পরের রান চালু করে দেয় — এভাবে ২৪ ঘণ্টা চলে।
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const MINUTES = Number(process.env.WORKER_MINUTES || 340);
const STEP_MIN = 5;
const end = Date.now() + MINUTES * 60_000;
const sh = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
const quiet = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', env: process.env });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function saveState() {
  if (!quiet('git', ['status', '--porcelain', 'state']).stdout.trim()) return;
  quiet('git', ['add', 'state']);
  quiet('git', ['commit', '-m', 'পোস্টের হিসাব আপডেট [skip ci]']);
  for (let i = 0; i < 3; i++) {
    quiet('git', ['pull', '--rebase', '--autostash', '-q']);
    if (quiet('git', ['push', '-q']).status === 0) return;
  }
  console.log('⚠️ হিসাব পুশ করা যায়নি, পরের বার আবার চেষ্টা হবে');
}

async function dispatchNext() {
  const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return console.log('পরের রান চালু করার তথ্য নেই (লোকাল চালানো?)');
  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/autopost.yml/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: process.env.GITHUB_REF_NAME || 'main', inputs: { mode: 'worker' } }),
  });
  console.log(r.ok ? '🔁 পরের কর্মী-রান চালু করা হলো' : `⚠️ পরের রান চালু করা যায়নি (${r.status}) — ঘণ্টাভিত্তিক শিডিউল থেকে আবার শুরু হবে`);
}

console.log(`🟢 কর্মী চালু: ${MINUTES} মিনিট, প্রতি ${STEP_MIN} মিনিটে পরীক্ষা`);
while (Date.now() < end - 60_000) {
  quiet('git', ['pull', '--rebase', '--autostash', '-q']); // config বদলালে সাথে সাথে কার্যকর
  const t0 = Date.now();
  sh('node', ['src/run.js', '--due']);
  saveState();
  try { rmSync('out', { recursive: true, force: true }); } catch {} // জায়গা খালি রাখা
  const took = Date.now() - t0;
  // পরের ৫ মিনিটের ঘর পর্যন্ত অপেক্ষা
  const next = Math.ceil((Date.now() + 1000) / (STEP_MIN * 60_000)) * STEP_MIN * 60_000 + 15_000;
  const wait = Math.max(30_000, Math.min(next - Date.now(), end - Date.now() - 60_000));
  if (took > 60_000) console.log(`⏱️ এই ধাপে ${Math.round(took / 1000)} সেকেন্ড লাগল`);
  if (wait <= 0) break;
  await sleep(wait);
}
await dispatchNext();
