import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';

const BASE = 'http://127.0.0.1:8080';
const OUT = 'screenshots';

// Pages that render fully from the local build (no production backend needed).
const pages = [
  { name: 'home', path: '/' },
  { name: 'pricing', path: '/pricing' },
  { name: 'use-cases', path: '/use-cases' },
  { name: 'community', path: '/community' },
];

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'],
});

async function prep(page, w, h, dsf, mobile) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dsf, isMobile: mobile, hasTouch: mobile });
}

async function load(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await new Promise((r) => setTimeout(r, 1800));
}

for (const p of pages) {
  const url = BASE + p.path;

  // Desktop hero (above the fold), social-friendly framing.
  const d = await browser.newPage();
  await prep(d, 1440, 900, 2, false);
  try {
    await load(d, url);
    await d.screenshot({ path: `${OUT}/${p.name}-desktop.png` });
    // 1200x630 social card crop from the top of the page.
    await prep(d, 1200, 630, 2, false);
    await load(d, url);
    await d.screenshot({ path: `${OUT}/${p.name}-social-1200x630.png`, clip: { x: 0, y: 0, width: 1200, height: 630 } });
    console.log('OK   ' + p.name + ' desktop + social');
  } catch (e) {
    console.log('FAIL ' + p.name + ' desktop :: ' + e.message);
  }
  await d.close();

  // Mobile hero.
  const m = await browser.newPage();
  await prep(m, 390, 844, 3, true);
  try {
    await load(m, url);
    await m.screenshot({ path: `${OUT}/${p.name}-mobile.png` });
    console.log('OK   ' + p.name + ' mobile');
  } catch (e) {
    console.log('FAIL ' + p.name + ' mobile :: ' + e.message);
  }
  await m.close();
}

await browser.close();
console.log('done');
