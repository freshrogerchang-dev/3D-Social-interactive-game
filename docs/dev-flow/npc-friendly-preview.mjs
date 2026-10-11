import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const { chromium } = require('playwright-core');
const out = 'docs/dev-flow/npc-friendly-evidence';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await context.route('**/*', async route => {
    const relative = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    const target = path.resolve('dist', relative);
    if (!target.startsWith(path.resolve('dist') + path.sep)) return route.abort();
    await route.fulfill({ body: await readFile(target), contentType: relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.css') ? 'text/css' : relative.endsWith('.jpg') ? 'image/jpeg' : 'text/html' });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://npc.local/', { waitUntil: 'networkidle' });
  await page.locator('#greeting-launch').waitFor({ state: 'visible' });
  await page.locator('canvas').focus();
  await page.keyboard.down('w');
  try { await page.waitForFunction(() => !document.querySelector('#greeting-launch').disabled, {}, { timeout: 90000 }); await page.waitForTimeout(600); }
  finally { await page.keyboard.up('w'); }
  await page.screenshot({ path: `${out}/phone-character.png` });
  await page.locator('#greeting-launch').tap();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/phone-greeting.png` });
  await page.getByRole('button', { name: '點頭', exact: true }).tap();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/phone-nod.png` });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole('button', { name: '再練一次', exact: true }).tap();
  await page.getByRole('button', { name: '先不參與', exact: true }).tap();
  await page.getByRole('button', { name: '好', exact: true }).tap();
  await page.getByRole('button', { name: '回公園', exact: true }).tap();
  await page.screenshot({ path: `${out}/desktop-character.png` });
  await writeFile(`${out}/preview.json`, JSON.stringify({ browser: browser.version(), errors, screenshots: ['phone-character.png', 'phone-greeting.png', 'phone-nod.png', 'desktop-character.png'] }, null, 2));
  console.log(`visual capture errors=${errors.length}`);
  process.exitCode = errors.length ? 1 : 0;
} finally { await browser.close(); }
