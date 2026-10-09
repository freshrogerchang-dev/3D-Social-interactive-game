import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PLAYWRIGHT_MODULE_DIR || '/opt/codex/runtimes/cua/lib/node_modules', 'playwright-core'));
const url = process.argv[2] || 'https://freshrogerchang-dev.github.io/3D-Social-interactive-game/';
const local = process.argv.includes('--local');
const output = process.argv[3] || 'docs/dev-flow/s5-extended-evidence';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', headless: true, proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = { source: local ? '本地 dist（Playwright route 提供，未啟動伺服器）' : '線上 Pages', url, browser: browser.version(), checks: [], memory: [], accessibility: {}, visibility: [], requests: [], errors: [] };
const check = (name, pass, evidence) => { results.checks.push({ name, pass, evidence }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); };
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 3 });
  await context.addInitScript(() => {
    const pending = new Set(); let maxPending = 0; let callbacks = 0;
    const request = window.requestAnimationFrame.bind(window); const cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => { const id = request((time) => { pending.delete(id); callbacks++; callback(time); }); pending.add(id); maxPending = Math.max(maxPending, pending.size); return id; };
    window.cancelAnimationFrame = (id) => { pending.delete(id); cancel(id); };
    window.__s5 = { get pending() { return pending.size; }, get maxPending() { return maxPending; }, get callbacks() { return callbacks; } };
  });
  if (local) await context.route('**/*', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const relative = pathname.replace(/^\/3D-Social-interactive-game\//, '').replace(/^\//, '') || 'index.html';
    const target = path.resolve('dist', relative);
    if (!target.startsWith(path.resolve('dist') + path.sep)) return route.abort();
    try { await route.fulfill({ status: 200, contentType: relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.css') ? 'text/css' : 'text/html', body: await readFile(target) }); }
    catch { await route.fulfill({ status: 404, body: 'Missing local artifact' }); }
  });
  const page = await context.newPage();
  page.on('pageerror', error => results.errors.push(String(error)));
  page.on('request', request => results.requests.push({ url: request.url(), method: request.method(), type: request.resourceType() }));
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#overlay').hidden && document.querySelector('canvas')?.width > 0);
  check(local ? '本地建置產物載入與場景啟動' : '正式網站 HTTP 200 與場景啟動', response.status() === 200, response.status());
  const dpr = await page.evaluate(() => { const c = document.querySelector('canvas'); return { device: devicePixelRatio, width: c.width, cssWidth: c.getBoundingClientRect().width, ratio: c.width / c.getBoundingClientRect().width }; });
  check('DPR 3 裝置的 canvas 比例上限為 2', dpr.ratio <= 2 && dpr.ratio > 0, dpr);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const ax = async name => { const tree = await cdp.send('Accessibility.getFullAXTree'); results.accessibility[name] = tree.nodes.filter(n => !n.ignored).map(n => ({ role: n.role?.value, name: n.name?.value, properties: n.properties })); };
  await ax('running');
  check('執行中安全按鈕具可及名稱', ['暫停', '返回安全區'].every(name => results.accessibility.running.some(n => n.role === 'button' && n.name === name)), results.accessibility.running.filter(n => n.role === 'button'));
  await page.getByRole('button', { name: '暫停', exact: true }).click();
  await ax('paused');
  check('休息畫面可及樹含標題與動作，隱藏動作不外露', results.accessibility.paused.some(n => n.role === 'heading' && n.name === '休息一下') && results.accessibility.paused.filter(n => n.role === 'button').map(n => n.name).join('|') === '暫停|返回安全區|繼續|結束本次', results.accessibility.paused.filter(n => ['button', 'heading'].includes(n.role)));
  const stopped = await page.evaluate(() => ({ ...window.__s5 }));
  await page.waitForTimeout(300);
  const stoppedLater = await page.evaluate(() => ({ ...window.__s5 }));
  check('暫停沒有待執行 RAF，回呼計數停住', stopped.pending === 0 && stoppedLater.callbacks === stopped.callbacks, { stopped, stoppedLater });
  const stats = async cycle => { await cdp.send('HeapProfiler.collectGarbage'); const heap = await cdp.send('Runtime.getHeapUsage'); const dom = await cdp.send('Memory.getDOMCounters'); results.memory.push({ cycle, heap, dom, raf: await page.evaluate(() => ({ ...window.__s5 })), canvases: await page.locator('canvas').count() }); };
  await page.getByRole('button', { name: '結束本次', exact: true }).click();
  await stats(0);
  for (let i = 1; i <= 20; i++) {
    await page.getByRole('button', { name: '重新開始', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#overlay').hidden && window.__s5.pending === 1);
    await page.getByRole('button', { name: '暫停', exact: true }).click();
    await page.getByRole('button', { name: '結束本次', exact: true }).click();
    if (i % 5 === 0) await stats(i);
  }
  try { results.detachedDom = await cdp.send('DOM.getDetachedDomNodes'); } catch (error) { results.detachedDom = { unavailable: String(error) }; }
  if (process.argv.includes('--expect-released')) check('20 次重建強制 GC 後 detached CANVAS 為零', Array.isArray(results.detachedDom.detachedNodes) && results.detachedDom.detachedNodes.filter(n => n.treeNode.nodeName === 'CANVAS').length === 0, results.detachedDom);
  check('20 次重建後每次結束 canvas 與 RAF 均為零', results.memory.every(m => m.canvases === 0 && m.raf.pending === 0) && results.memory.at(-1).raf.maxPending === 1, results.memory.map(m => ({ cycle: m.cycle, canvases: m.canvases, raf: m.raf })));
  const counters = results.memory.map(m => m.dom.jsEventListeners);
  check('強制 GC 後監聽數在第 5–20 次重建未持續增加', counters.slice(1).every(n => n === counters[1]), counters);
  await page.getByRole('button', { name: '重新開始', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#overlay').hidden);
  await page.getByRole('button', { name: '暫停', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }' });
  const reachable = [];
  for (const action of ['pause', 'safety', 'resume', 'end']) {
    const locator = page.locator(`[data-action="${action}"]`); await locator.focus(); await locator.scrollIntoViewIfNeeded();
    reachable.push(await locator.evaluate(el => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { action: el.dataset.action, width: r.width, height: r.height, focused: document.activeElement === el, hit: el.contains(hit) }; }));
  }
  check('320px 文字間距調整後安全與面板按鈕可聚焦命中', reachable.every(r => r.focused && r.hit && r.width >= 64 && r.height >= 64), reachable);
  await page.screenshot({ path: path.join(output, 'text-spacing-320.png') });
  const contrast = await page.locator('[data-action="pause"]').evaluate(el => { const s = getComputedStyle(el); return { text: s.color, background: s.backgroundColor, border: s.borderColor, fontSize: s.fontSize }; });
  results.contrast = contrast;
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: '繼續', exact: true }).click();
  results.visibility.push({ stage: 'before', state: await page.evaluate(() => document.visibilityState) });
  const second = await context.newPage(); await second.goto('about:blank'); await second.bringToFront(); await page.waitForTimeout(300);
  results.visibility.push({ stage: 'second tab active', state: await page.evaluate(() => document.visibilityState), paused: await page.locator('#overlay').isVisible() });
  await page.bringToFront(); await second.close();
  if (results.visibility.at(-1).state === 'hidden') check('實際瀏覽器分頁切換觸發休息且不自動恢復', await page.locator('#overlay').isVisible(), results.visibility);
  else console.log('UNVERIFIED headless 分頁切換沒有產生 hidden，不能當成系統切頁驗收');
  check('正常路徑無未處理 JS 例外', results.errors.length === 0, results.errors);
  check('頁面請求只有本站靜態 GET 資源', results.requests.every(r => r.method === 'GET' && new URL(r.url).origin === new URL(url).origin), results.requests);
} finally {
  await writeFile(path.join(output, 'browser-result.json'), JSON.stringify(results, null, 2) + '\n');
  await browser.close();
}
console.log(`${results.checks.filter(c => c.pass).length}/${results.checks.length} passed`);
if (results.checks.some(c => !c.pass)) process.exitCode = 1;
