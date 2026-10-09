// S5 production preview 補充檢查；需先啟動 preview。
// 用法：node s5-runtime-browser.mjs <url> <outDir>
// PLAYWRIGHT_MODULE_DIR／CHROMIUM_EXECUTABLE_PATH 同 s5-fix-browser.mjs。
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const [url, outDir = '/tmp/s5-runtime-shots'] = process.argv.slice(2);
assert(url, '需要 production preview 網址');
const moduleDir =
  process.env.PLAYWRIGHT_MODULE_DIR ?? execSync('npm root -g', { encoding: 'utf8' }).trim();
const require = createRequire(`${moduleDir}/`);
let playwright;
let packageName = 'playwright';
try {
  playwright = require('playwright');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
  packageName = 'playwright-core';
  playwright = require('playwright-core');
}
await mkdir(outDir, { recursive: true });
const launchOptions = {
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
};
const browsers = [];
let count = 0;
const pass = (name) => { count += 1; console.log(`PASS ${name}`); };
const action = (page, name) => page.locator(`[data-action="${name}"]`);
const waitTitle = (page, title) => page.waitForFunction(
  (expected) => !document.getElementById('overlay').hidden &&
    document.getElementById('overlay-title').textContent === expected,
  title,
);
const waitRunning = (page) => page.waitForFunction(() =>
  document.getElementById('overlay').hidden && document.getElementById('status').textContent === '',
);
const canvasCount = (page) => page.locator('canvas').count();
async function loseContext(page) {
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas.getContext('webgl2');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('WEBGL_lose_context 不可用，不能把本項標為通過');
    extension.loseContext();
  });
  await waitTitle(page, '目前無法顯示場景');
}

try {
  const browser = await playwright.chromium.launch(launchOptions);
  browsers.push(browser);
  console.log(`Chromium ${browser.version()}; ${packageName} ${require(`${packageName}/package.json`).version}`);
  const pageErrors = [];

  // 初始化前模擬 hidden；不是實機系統切頁。
  const hiddenContext = await browser.newContext();
  await hiddenContext.addInitScript(() => {
    window.__s5Hidden = true;
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => window.__s5Hidden ? 'hidden' : 'visible',
    });
  });
  const hidden = await hiddenContext.newPage();
  hidden.on('pageerror', (error) => pageErrors.push(error.message));
  await hidden.goto(url);
  await waitTitle(hidden, '休息一下');
  assert.equal(await canvasCount(hidden), 0);
  pass('production：起始 hidden 不建立 canvas');
  await hidden.evaluate(() => {
    window.__s5Hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await waitTitle(hidden, '休息一下');
  assert.equal(await canvasCount(hidden), 0);
  pass('production：回前景保持休息');
  await action(hidden, 'restart').click();
  await waitRunning(hidden);
  assert.equal(await canvasCount(hidden), 1);
  pass('production：明確重新開始才建立場景');
  await hiddenContext.close();

  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(url);
  await waitRunning(page);
  await loseContext(page);
  pass('真實 WebGL extension：context loss 顯示可讀錯誤畫面');
  await action(page, 'pause').click();
  await waitTitle(page, '休息一下');
  assert.equal(await canvasCount(page), 0);
  pass('context loss 後滑鼠暫停由 DOM 接管並移除 canvas');
  await action(page, 'restart').click();
  await waitRunning(page);
  assert.equal(await canvasCount(page), 1);
  pass('context loss 後可明確重建新場景');
  await loseContext(page);
  await page.keyboard.press('Escape');
  await waitTitle(page, '休息一下');
  assert.equal(await canvasCount(page), 0);
  pass('context loss 後 Esc 暫停仍有效');
  await action(page, 'restart').click();
  await waitRunning(page);
  await loseContext(page);
  await page.tap('[data-action="safety"]');
  await waitTitle(page, '已返回安全區');
  assert.equal(await canvasCount(page), 0);
  pass('context loss 後模擬觸控返回安全區仍有效');
  await page.screenshot({ path: `${outDir}/context-loss-safety.png` });
  await context.close();

  // production 真實 DOM，放大 root 字級後檢查兩個面板動作可捲動、聚焦和點擊。
  for (const [width, height] of [[640, 360], [320, 568], [320, 360]]) {
    const layoutPage = await browser.newPage({ viewport: { width, height } });
    layoutPage.on('pageerror', (error) => pageErrors.push(error.message));
    await layoutPage.goto(url);
    await waitRunning(layoutPage);
    await action(layoutPage, 'pause').click();
    await layoutPage.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
    // Chrome 可能為保留「繼續」焦點而捲動；先回頂端核對標題，後面再驗證動作可到達。
    await layoutPage.locator('#overlay').evaluate((element) => { element.scrollTop = 0; });
    const nonOverlap = await layoutPage.evaluate(() => {
      const toolbar = document.querySelector('.toolbar').getBoundingClientRect();
      const panel = document.querySelector('.panel').getBoundingClientRect();
      const overlay = document.querySelector('.overlay').getBoundingClientRect();
      return overlay.top >= toolbar.bottom && panel.top >= overlay.top &&
        document.documentElement.scrollWidth <= innerWidth;
    });
    assert(nonOverlap);
    for (const name of ['resume', 'end']) {
      const button = action(layoutPage, name);
      await button.focus();
      await button.scrollIntoViewIfNeeded();
      assert(await button.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const toolbar = document.querySelector('.toolbar').getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return document.activeElement === element && rect.top >= toolbar.bottom &&
          rect.bottom <= innerHeight && hit !== null && element.contains(hit);
      }));
      await button.click({ trial: true });
    }
    await layoutPage.locator('#overlay').evaluate((element) => { element.scrollTop = 0; });
    await layoutPage.screenshot({ path: `${outDir}/production-${width}-${height}-32.png` });
    pass(`production：${width}x${height} 放大文字，面板不遮擋且動作可到達`);
    await layoutPage.close();
  }

  const noGl = await playwright.chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--disable-webgl', '--disable-3d-apis'],
  });
  browsers.push(noGl);
  for (const mode of ['mouse', 'keyboard', 'touch']) {
    const noGlContext = await noGl.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
    const noGlPage = await noGlContext.newPage();
    noGlPage.on('pageerror', (error) => pageErrors.push(error.message));
    await noGlPage.goto(url);
    await waitTitle(noGlPage, '目前無法顯示場景');
    if (mode === 'mouse') await action(noGlPage, 'pause').click();
    if (mode === 'keyboard') {
      await action(noGlPage, 'pause').focus();
      await noGlPage.keyboard.press('Enter');
    }
    if (mode === 'touch') await noGlPage.tap('[data-action="pause"]');
    await waitTitle(noGlPage, '休息一下');
    assert.equal(await canvasCount(noGlPage), 0);
    pass(`WebGL 不可用：${mode} 暫停由 DOM 接管`);
    await noGlContext.close();
  }
  assert.deepEqual(pageErrors, []);
  pass('補充檢查沒有未處理 pageerror（預期 WebGL 診斷 console 不納入）');
} finally {
  await Promise.all(browsers.map((browser) => browser.close()));
}
console.log(`${count}/15 supplementary cases passed`);
