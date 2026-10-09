// S5 局部版面回歸：直接讀取 HTML/CSS，不啟動伺服器或驗證真實 WebGL。
// PLAYWRIGHT_MODULE_DIR 指向已安裝 playwright 或 playwright-core 的 node_modules。
// CHROMIUM_EXECUTABLE_PATH 可指定系統 Chromium；不指定時使用 Playwright 快取。
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = process.argv[2] ?? '/tmp/s5-fixed-shots';
const moduleDir =
  process.env.PLAYWRIGHT_MODULE_DIR ?? execSync('npm root -g', { encoding: 'utf8' }).trim();
const require = createRequire(`${moduleDir}/`);
let playwright;
try {
  playwright = require('playwright');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
  playwright = require('playwright-core');
}

const html = (await readFile(resolve(project, 'index.html'), 'utf8')).replace(
  /<script[^>]*>[\s\S]*?<\/script>/g,
  '',
);
const css = await readFile(resolve(project, 'src/styles.css'), 'utf8');
await mkdir(outDir, { recursive: true });
const browser = await playwright.chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  headless: true,
  args: ['--no-sandbox'],
});
console.log(`Chromium ${browser.version()}`);
let count = 0;
try {
  for (const [width, height] of [[1280, 720], [640, 360], [320, 568], [320, 360]]) {
    for (const fontSize of [16, 32]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.setContent(html);
      await page.addStyleTag({ content: css });
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = `${size}px`;
        document.getElementById('status').textContent = '';
        document.getElementById('overlay').hidden = false;
        document.getElementById('overlay-title').textContent = '休息一下';
        document.getElementById('overlay-text').textContent = '畫面停住了。準備好再按「繼續」。';
        for (const action of ['resume', 'end']) {
          document.querySelector(`[data-action="${action}"]`).hidden = false;
        }
      }, fontSize);

      const layout = await page.evaluate(() => {
        const toolbar = document.querySelector('.toolbar').getBoundingClientRect();
        const panel = document.querySelector('.panel').getBoundingClientRect();
        const overlay = document.querySelector('.overlay').getBoundingClientRect();
        return {
          toolbarBottom: toolbar.bottom,
          panelTop: panel.top,
          overlayTop: overlay.top,
          horizontalScroll: document.documentElement.scrollWidth > innerWidth,
          toolbarButtons: [...document.querySelectorAll('.toolbar button')].map((button) => {
            const rect = button.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            return {
              width: rect.width,
              height: rect.height,
              hit: hit !== null && button.contains(hit),
            };
          }),
        };
      });
      assert(layout.panelTop >= layout.toolbarBottom, '面板標題不可被工具列遮擋');
      assert(layout.overlayTop >= layout.toolbarBottom, '捲動區不可延伸到工具列後方');
      assert(!layout.horizontalScroll, '不可產生頁面水平捲動');
      assert(layout.toolbarButtons.every((b) => b.width >= 64 && b.height >= 64 && b.hit));

      for (const action of ['resume', 'end']) {
        const button = page.locator(`[data-action="${action}"]`);
        await button.focus();
        await button.scrollIntoViewIfNeeded();
        const reachable = await button.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const top = document.querySelector('.toolbar').getBoundingClientRect().bottom;
          const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          return {
            focus: document.activeElement === element,
            aboveToolbar: rect.top >= top,
            insideScreen: rect.bottom <= innerHeight,
            hit: hit !== null && element.contains(hit),
          };
        });
        assert(Object.values(reachable).every(Boolean), `${action} 的焦點與點擊必須可到達`);
        await button.click({ trial: true });
      }
      // 回到頂端保存標題與工具列的相對位置。
      await page.locator('#overlay').evaluate((element) => { element.scrollTop = 0; });
      await page.screenshot({ path: `${outDir}/layout-${width}-${height}-${fontSize}.png` });
      count += 1;
      console.log(`PASS ${width}x${height}, root=${fontSize}px ${JSON.stringify(layout)}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`${count}/8 layout cases passed`);
