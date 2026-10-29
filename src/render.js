// HTML → PNG (Playwright Chromium দিয়ে, যাতে বাংলা যুক্তাক্ষর ঠিকভাবে আসে)
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

let browser;

async function getBrowser() {
  if (browser) return browser;
  const { chromium } = await import('playwright');
  const opts = { args: ['--no-sandbox', '--font-render-hinting=none'] };
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  browser = await chromium.launch(opts);
  return browser;
}

export async function renderCard(html, outPng, size = { width: 1080, height: 1350 }) {
  mkdirSync(resolve(outPng, '..'), { recursive: true });
  const htmlPath = outPng.replace(/\.png$/, '.html');
  writeFileSync(htmlPath, html);
  const b = await getBrowser();
  const page = await b.newPage({ viewport: size, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(resolve(htmlPath)).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // লম্বা লেখা বক্সে না ধরলে ফন্ট ছোট করা
  await page.evaluate(() => {
    document.querySelectorAll('.fit').forEach((el) => {
      const min = Number(el.dataset.min || 28);
      let size = parseFloat(getComputedStyle(el).fontSize);
      while ((el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) && size > min) {
        size -= 2;
        el.style.fontSize = size + 'px';
      }
    });
  });
  await page.screenshot({ path: outPng, type: 'png' });
  await page.close();
  return outPng;
}

export async function closeBrowser() {
  if (browser) await browser.close();
  browser = null;
}
