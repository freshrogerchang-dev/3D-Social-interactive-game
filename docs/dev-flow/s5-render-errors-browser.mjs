// S5 本地 dist 執行期 renderer 例外回歸；不啟動伺服器。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PLAYWRIGHT_MODULE_DIR || '/opt/codex/runtimes/cua/lib/node_modules', 'playwright-core'));
const output = process.argv[2] || '/tmp/s5-render-errors';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const phase of ['frame', 'resize', 'paused-resize', 'safety']) {
    const context = await browser.newContext({ viewport: { width: 640, height: 360 } });
    await context.route('**/*', async route => {
      const relative = new URL(route.request().url()).pathname.slice(1) || 'index.html';
      const target = path.resolve('dist', relative);
      if (!target.startsWith(path.resolve('dist') + path.sep)) return route.abort();
      try { await route.fulfill({ contentType: relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.css') ? 'text/css' : 'text/html', body: await readFile(target) }); }
      catch { await route.fulfill({ status: 404, body: 'missing' }); }
    });
    await context.addInitScript(() => {
      const draw = WebGL2RenderingContext.prototype.drawElements;
      WebGL2RenderingContext.prototype.drawElements = function (...args) {
        if (window.__throwDraw) throw new Error('S5 injected drawElements exception');
        return draw.apply(this, args);
      };
      const request = window.requestAnimationFrame.bind(window);
      const cancel = window.cancelAnimationFrame.bind(window);
      const pending = new Set();
      window.requestAnimationFrame = callback => { const id = request(time => { pending.delete(id); callback(time); }); pending.add(id); return id; };
      window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
      window.__pending = () => pending.size;
    });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto('https://s5-local.test/');
    await page.waitForFunction(() => document.querySelector('#overlay').hidden && window.__pending() === 1);
    if (phase === 'safety' || phase === 'paused-resize') await page.getByRole('button', { name: '暫停', exact: true }).click();
    if (phase === 'frame' || phase === 'safety') await page.evaluate(() => { window.__throwDraw = true; });
    else await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
      Object.defineProperty(canvas, 'width', { configurable: true, get() { return descriptor.get.call(this); }, set() { throw new Error('S5 injected canvas resize exception'); } });
    });
    if (phase === 'safety') await page.getByRole('button', { name: '返回安全區', exact: true }).click();
    else if (phase !== 'frame') await page.setViewportSize({ width: 480, height: 360 });
    const title = phase === 'safety' ? '已返回安全區' : '目前無法顯示場景';
    await page.waitForFunction(expected => document.querySelector('#overlay-title').textContent === expected && !document.querySelector('#overlay').hidden, title);
    assert.equal(await page.evaluate(() => window.__pending()), 0);
    if (phase !== 'safety') await page.getByRole('button', { name: '暫停', exact: true }).click();
    assert.equal(await page.locator('canvas').count(), 0);
    await page.evaluate(() => { window.__throwDraw = false; });
    await page.getByRole('button', { name: '重新開始', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#overlay').hidden && window.__pending() === 1);
    assert.equal(await page.locator('canvas').count(), 1);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(output, `${phase}-restarted.png`) });
    results.push({ phase, errorTitle: title, unhandledErrors: errors, restarted: true });
    console.log(`PASS ${phase}: 錯誤停止 RAF、安全 DOM 接管、明確重建`);
    await context.close();
  }
} finally {
  await writeFile(path.join(output, 'result.json'), JSON.stringify(results, null, 2) + '\n');
  await browser.close();
}
console.log(`${results.length}/4 passed`);
