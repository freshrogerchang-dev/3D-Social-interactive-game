// 本地 dist、實際 computed styles；不代替螢幕報讀器或完整 WCAG 審查。
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
let playwright;
try { playwright = require('playwright'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; playwright = require('playwright-core'); }
const out = process.argv[2] || 'docs/dev-flow/s5-audit-evidence';
await mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, headless: true, args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
 for (const webgl of [true, false]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  if (!webgl) await context.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...args) { return String(type).startsWith('webgl') ? null : get.call(this, type, ...args); }; });
  await context.route('**/*', async route => {
   const relative = new URL(route.request().url()).pathname.slice(1) || 'index.html';
   const target = path.resolve('dist', relative);
   if (!target.startsWith(path.resolve('dist') + path.sep)) return route.abort();
   try { await route.fulfill({ contentType: relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.css') ? 'text/css' : 'text/html', body: await readFile(target) }); }
   catch { await route.fulfill({ status: 404, body: 'missing' }); }
  });
  const page = await context.newPage();
  await page.goto('http://s5.local/', { waitUntil: 'networkidle' });
  await page.waitForFunction(ok => ok ? !!document.querySelector('canvas') && document.querySelector('#overlay').hidden : document.querySelector('#overlay-title').textContent === '目前無法顯示場景', webgl);
  async function inspect(state) {
   const items = await page.evaluate(() => {
    const parse = color => color.match(/[\d.]+/g).map(Number);
    const lum = rgb => rgb.slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const ratio = (a, b) => { const x = lum(parse(a)); const y = lum(parse(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    return [...document.querySelectorAll('button,h1,.panel-text,.status')].filter(el => el.getClientRects().length && el.textContent.trim()).map(el => {
      const style = getComputedStyle(el); let parent = el; let bg;
      while (parent) { bg = getComputedStyle(parent).backgroundColor; if ((parse(bg)[3] ?? 1) === 1) break; parent = parent.parentElement; }
      const rect = el.getBoundingClientRect();
      return { name: el.textContent.trim(), tag: el.tagName, color: style.color, background: bg, opaqueBackground: !!parent, textRatio: ratio(style.color, bg), borderRatio: el.tagName === 'BUTTON' ? ratio(style.borderTopColor, bg) : null, width: rect.width, height: rect.height };
    });
   });
   for (const item of items) results.push({ state, kind: 'computed', ...item, pass: item.opaqueBackground && item.textRatio >= 4.5 && (item.tag !== 'BUTTON' || (item.borderRatio >= 3 && item.width >= 64 && item.height >= 64)) });
   // 真正的鍵盤焦點，使 :focus-visible 生效。
   await page.keyboard.press('Tab');
   // 最後一個按鈕之後會先到頁面／瀏覽器的焦點邊界；再按 Tab 回到首個按鈕。
   if (!(await page.evaluate(() => document.activeElement?.tagName === 'BUTTON'))) await page.keyboard.press('Tab');
   const focus = await page.evaluate(() => {
    const el = document.activeElement; const s = getComputedStyle(el);
    return { name: el.textContent.trim(), visible: el.matches(':focus-visible'), width: parseFloat(s.outlineWidth), outline: s.outlineColor, background: s.backgroundColor };
   });
   const colors = [focus.outline, focus.background].map(c => c.match(/[\d.]+/g).slice(0, 3).map(Number));
   const luminance = color => color.map(v => { const x = v / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
   const [a, b] = colors.map(luminance); const contrast = (Math.max(a,b) + .05)/(Math.min(a,b) + .05);
   results.push({ state, kind: 'keyboard-focus', ...focus, ratio: contrast, pass: focus.visible && focus.width >= 3 && contrast >= 3 });
  }
  if (webgl) {
   await inspect('running');
   await page.getByRole('button', { name: '暫停', exact: true }).click(); await inspect('paused');
   await page.getByRole('button', { name: '返回安全區', exact: true }).click(); await inspect('safety');
   await page.getByRole('button', { name: '結束本次', exact: true }).click(); await inspect('ended');
  } else {
   await inspect('error');
   await page.getByRole('button', { name: '暫停', exact: true }).click(); await inspect('rest');
   await page.getByRole('button', { name: '返回安全區', exact: true }).click(); await inspect('safety-rest');
  }
  await context.close();
 }
} finally { await browser.close(); }
await writeFile(path.join(out, 'contrast-result.json'), JSON.stringify({ browser: 'system Chromium / SwiftShader', node: process.version, results }, null, 2) + '\n');
console.log(`${results.filter(r => r.pass).length}/${results.length} computed contrast / focus / target checks passed`);
for (const item of results.filter(r => !r.pass)) console.log(JSON.stringify(item));
process.exitCode = results.every(r => r.pass) ? 0 : 1;
