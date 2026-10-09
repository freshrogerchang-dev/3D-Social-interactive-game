// S4 瀏覽器檢查（headless Chromium）。用法：node browser-check.mjs <url> <outDir>
// Playwright 不在專案依賴中：從 PLAYWRIGHT_MODULE_DIR（預設為 `npm root -g`）載入 playwright 或 playwright-core。
// CHROMIUM_EXECUTABLE_PATH 可指定系統 Chromium；不指定時使用 Playwright 快取。
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
const moduleDir =
  process.env.PLAYWRIGHT_MODULE_DIR ?? execSync('npm root -g', { encoding: 'utf8' }).trim();
const require = createRequire(`${moduleDir}/`);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
  ({ chromium } = require('playwright-core'));
}

const [url, outDir] = process.argv.slice(2);
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const ui = (page) =>
  page.evaluate(() => {
    const overlay = document.getElementById('overlay');
    const visible = [...document.querySelectorAll('#overlay [data-action]')]
      .filter((b) => !b.hidden)
      .map((b) => b.dataset.action);
    return {
      overlayHidden: overlay.hidden,
      title: document.getElementById('overlay-title').textContent,
      status: document.getElementById('status').textContent,
      actions: visible,
      focus: document.activeElement?.dataset?.action ?? document.activeElement?.tagName,
      canvases: document.querySelectorAll('canvas').length,
      scrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  proxy: process.env.PLAYWRIGHT_PROXY_SERVER
    ? { server: process.env.PLAYWRIGHT_PROXY_SERVER }
    : undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

// ---- 桌面 1280×720 ----
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => document.getElementById('status').textContent === '');
  let s = await ui(page);
  check('載入後進入執行畫面（overlay 隱藏、1 個 canvas）', s.overlayHidden && s.canvases === 1, JSON.stringify(s));

  const webgl2 = await page.evaluate(() => typeof WebGL2RenderingContext !== 'undefined');
  check('瀏覽器支援 WebGL2', webgl2);

  await page.screenshot({ path: `${outDir}/desktop-running.png` });
  // 取畫面中央與下方像素，確認不是空白（天空色與地面色不同）。
  const pixels = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return { w: c.width, h: c.height };
  });
  check('canvas 有尺寸（DPR 上限內）', pixels.w > 0 && pixels.h > 0, JSON.stringify(pixels));

  // 按鈕尺寸 ≥ 64px
  const sizes = await page.$$eval('.toolbar .control', (els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return [Math.round(r.width), Math.round(r.height)];
    }),
  );
  check('常駐按鈕 ≥ 64×64 px', sizes.every(([w, h]) => w >= 64 && h >= 64), JSON.stringify(sizes));

  // 滑鼠：暫停 → 繼續
  await page.click('[data-action="pause"]');
  s = await ui(page);
  check('按「暫停」顯示休息畫面，焦點在「繼續」', !s.overlayHidden && s.title === '休息一下' && s.focus === 'resume', JSON.stringify(s));
  await page.screenshot({ path: `${outDir}/desktop-paused.png` });
  await page.click('[data-action="resume"]');
  s = await ui(page);
  check('按「繼續」回到場景，焦點回到「暫停」', s.overlayHidden && s.focus === 'pause', JSON.stringify(s));

  // 鍵盤：Escape 暫停、Enter 繼續
  await page.keyboard.press('Escape');
  s = await ui(page);
  check('Esc 暫停', !s.overlayHidden && s.title === '休息一下', JSON.stringify(s));
  await page.keyboard.press('Enter');
  s = await ui(page);
  check('Enter 觸發聚焦的「繼續」', s.overlayHidden, JSON.stringify(s));

  // 鍵盤 Tab 可到達常駐按鈕
  await page.reload();
  await page.waitForFunction(() => document.getElementById('status').textContent === '');
  await page.keyboard.press('Tab');
  const firstTab = await page.evaluate(() => document.activeElement?.dataset?.action);
  await page.keyboard.press('Tab');
  const secondTab = await page.evaluate(() => document.activeElement?.dataset?.action);
  check('Tab 依序到「暫停」「返回安全區」', firstTab === 'pause' && secondTab === 'safety', `${firstTab}, ${secondTab}`);
  await page.keyboard.press('Enter');
  s = await ui(page);
  check('從執行中（鍵盤）返回安全區', s.title === '已返回安全區' && s.actions.join() === 'resume,end', JSON.stringify(s));
  await page.screenshot({ path: `${outDir}/desktop-safety.png` });

  // 暫停中也可以返回安全區
  await page.click('[data-action="resume"]');
  await page.click('[data-action="pause"]');
  await page.click('[data-action="safety"]');
  s = await ui(page);
  check('暫停中按「返回安全區」', s.title === '已返回安全區', JSON.stringify(s));

  // 分頁隱藏 → 暫停；回到前景不自動恢復
  await page.click('[data-action="resume"]');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  s = await ui(page);
  check('分頁隱藏後暫停，回來不自動恢復', !s.overlayHidden && s.title === '休息一下', JSON.stringify(s));

  // 結束 → 重新開始
  await page.click('[data-action="end"]');
  s = await ui(page);
  check('「結束本次」顯示結束畫面並移除 canvas', s.title === '本次練習結束了' && s.canvases === 0, JSON.stringify(s));
  await page.click('[data-action="restart"]');
  await page.waitForFunction(() => document.getElementById('overlay').hidden && document.getElementById('status').textContent === '');
  s = await ui(page);
  check('「重新開始」回到場景，只有 1 個 canvas', s.canvases === 1, JSON.stringify(s));

  // 重建 20 次
  for (let i = 0; i < 20; i += 1) {
    await page.click('[data-action="pause"]');
    await page.click('[data-action="end"]');
    await page.click('[data-action="restart"]');
    await page.waitForFunction(() => document.getElementById('overlay').hidden && document.getElementById('status').textContent === '');
  }
  s = await ui(page);
  check('結束／重新開始 20 次後仍只有 1 個 canvas', s.canvases === 1, JSON.stringify(s));

  check('console 無錯誤', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---- 平板 1024×768 觸控 ----
{
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForFunction(() => document.getElementById('status').textContent === '');
  await page.tap('[data-action="pause"]');
  let s = await ui(page);
  check('平板模擬：點「暫停」', s.title === '休息一下', JSON.stringify(s));
  await page.tap('[data-action="resume"]');
  await page.tap('[data-action="safety"]');
  s = await ui(page);
  check('平板模擬：點「返回安全區」', s.title === '已返回安全區', JSON.stringify(s));
  await page.screenshot({ path: `${outDir}/tablet-safety.png` });
  await context.close();
}

// ---- 窄畫面 640×360（約等於 1280×720 放大 200% 的版面寬度；不等於文字縮放驗收）----
{
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  await page.goto(url);
  await page.waitForFunction(() => document.getElementById('status').textContent === '');
  await page.click('[data-action="pause"]');
  const s = await ui(page);
  const overlap = await page.evaluate(() => {
    const t = document.querySelector('.toolbar').getBoundingClientRect();
    const p = document.querySelector('.panel').getBoundingClientRect();
    return t.bottom > p.top && t.top < p.bottom && t.right > p.left && t.left < p.right;
  });
  check('窄畫面：無水平捲動、工具列不遮住休息面板', !s.scrollX && !overlap, JSON.stringify({ ...s, overlap }));
  await page.screenshot({ path: `${outDir}/narrow-paused.png` });
  await page.close();
}

await browser.close();

// ---- WebGL 不可用 ----
{
  const noGl = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  proxy: process.env.PLAYWRIGHT_PROXY_SERVER
    ? { server: process.env.PLAYWRIGHT_PROXY_SERVER }
    : undefined,
    args: ['--disable-webgl', '--disable-3d-apis'],
  });
  const page = await noGl.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(url);
  await page.waitForFunction(() => !document.getElementById('overlay').hidden);
  let s = await ui(page);
  check('WebGL 不可用：顯示「目前無法顯示場景」與重試／結束', s.title === '目前無法顯示場景' && s.actions.join() === 'retry,end', JSON.stringify(s));
  await page.screenshot({ path: `${outDir}/no-webgl.png` });
  await page.click('[data-action="retry"]');
  await page.waitForFunction(() => document.getElementById('overlay-title').textContent === '目前無法顯示場景' && !document.getElementById('overlay').hidden);
  s = await ui(page);
  check('WebGL 不可用：重試後仍只有 1 個 canvas', s.canvases === 1, JSON.stringify(s));
  await page.click('[data-action="safety"]');
  s = await ui(page);
  check('WebGL 不可用：「返回安全區」由 DOM 接管', s.title === '已返回安全區' && s.actions.join() === 'restart' && s.canvases === 0, JSON.stringify(s));
  await noGl.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
