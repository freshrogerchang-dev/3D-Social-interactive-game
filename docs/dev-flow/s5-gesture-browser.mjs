// Chromium 原生合成觸控，含可縮放對照；不宣稱 iOS Safari 驗證。
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const { chromium } = require('playwright-core');
const out = process.argv[2] || 'docs/dev-flow/s5-gesture-evidence';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const checks = [];
const check = (name, pass, evidence) => { checks.push({ name, pass, evidence }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); };
try {
 for (const baseline of [true, false]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.route('**/*', async route => {
   const relative = new URL(route.request().url()).pathname.slice(1) || 'index.html';
   const target = path.resolve('dist', relative);
   if (!target.startsWith(path.resolve('dist') + path.sep)) return route.abort();
   try { await route.fulfill({ contentType: relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.css') ? 'text/css' : 'text/html', body: await readFile(target) }); } catch { await route.abort(); }
  });
  const page = await context.newPage();
  await page.goto('http://s5.local/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('canvas') && document.querySelector('#overlay').hidden);
  if (baseline) await page.addStyleTag({ content: '.app,.stage { touch-action: auto !important; }' });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  const pinch = async (x, y) => {
   const points = distance => [{ x: x - distance, y, id: 1 }, { x: x + distance, y, id: 2 }];
   await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(20) });
   for (let distance = 25; distance <= 70; distance += 5) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(distance) });
    await page.waitForTimeout(30);
   }
   await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
   await page.waitForTimeout(150);
   return page.evaluate(() => visualViewport.scale);
  };
  let scale = await pinch(195, 420);
  check(baseline ? '對照：解除限制可觸控放大' : '場景：雙指手勢維持 scale=1', baseline ? scale > 1.2 : Math.abs(scale - 1) < .01, { scale });
  if (!baseline) {
   await page.getByRole('button', { name: '暫停', exact: true }).tap();
   scale = await pinch(195, 420);
   check('休息面板：雙指手勢維持 scale=1', Math.abs(scale - 1) < .01, { scale });
   const button = await page.getByRole('button', { name: '返回安全區', exact: true }).boundingBox();
   scale = await pinch(button.x + button.width / 2, button.y + button.height / 2);
   check('安全按鈕：雙指手勢維持 scale=1', Math.abs(scale - 1) < .01, { scale });
   await page.getByRole('button', { name: '繼續', exact: true }).tap();
   check('觸控繼續可恢復場景', await page.locator('#overlay').evaluate(el => el.hidden));
   await page.setViewportSize({ width: 320, height: 360 });
   await page.addStyleTag({ content: ':root { font-size: 32px; }' });
   await page.getByRole('button', { name: '暫停', exact: true }).tap();
   const box = await page.locator('#overlay').boundingBox();
   await cdp.send('Input.synthesizeScrollGesture', { x: box.x + box.width / 2, y: box.y + box.height / 2, yDistance: -400, gestureSourceType: 'touch' });
   await page.waitForTimeout(150);
   const scroll = await page.locator('#overlay').evaluate(el => ({ top: el.scrollTop, height: el.clientHeight, full: el.scrollHeight }));
   check('短畫面大字：面板仍可觸控垂直捲動', scroll.full > scroll.height && scroll.top > 0, scroll);
   await page.getByRole('button', { name: '結束本次', exact: true }).tap();
   await page.getByRole('button', { name: '重新開始', exact: true }).tap();
   check('大字面板結束／重新開始仍可點按', await page.locator('#overlay').evaluate(el => el.hidden));
  }
  await context.close();
 }
} finally { await browser.close(); }
await writeFile(path.join(out, 'result.json'), JSON.stringify({ node: process.version, checks }, null, 2) + '\n');
console.log(`${checks.filter(c => c.pass).length}/${checks.length} passed`);
process.exitCode = checks.every(c => c.pass) ? 0 : 1;
