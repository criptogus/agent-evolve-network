import puppeteer from 'puppeteer';

const BASE = 'http://127.0.0.1:8080';
const OUT = 'screenshots';

const pages = [
  { name: 'marketplace', path: '/marketplace' },
  { name: 'connect', path: '/connect' },
];

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'],
});

for (const p of pages) {
  const url = BASE + p.path;
  const d = await browser.newPage();
  await d.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await d.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await d.evaluate(() => document.fonts && document.fonts.ready);
  await new Promise((r) => setTimeout(r, 6000));
  await d.screenshot({ path: `${OUT}/${p.name}-desktop.png` });
  await d.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await d.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 6000));
  await d.screenshot({ path: `${OUT}/${p.name}-mobile.png` });
  console.log('OK ' + p.name);
  await d.close();
}
await browser.close();
console.log('done');
