// 對話語音瀏覽器檢查（裝置內建語音以替身攔截，不真的發聲）。用法：
// PLAYWRIGHT_MODULE_DIR=<含 playwright-core 的目錄> CHROMIUM_EXECUTABLE_PATH=<chrome> \
//   node docs/dev-flow/voice-browser.mjs
// 以 route 直接提供本機 dist。
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const { chromium } = require('playwright-core');
const checks = [];
const check = (name, pass, detail = '') => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass || !detail ? '' : ` — ${detail}`}`);
};
const types = { js: 'text/javascript', css: 'text/css', jpg: 'image/jpeg', json: 'application/json' };
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await context.route('**/*', async (route) => {
    const rel = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    try {
      await route.fulfill({ body: await readFile(path.resolve('dist', rel)), contentType: types[rel.split('.').pop()] ?? 'text/html' });
    } catch {
      await route.fulfill({ status: 404, body: '' });
    }
  });
  // 替身：記錄每一句（文字、語言、音高、速度），0.2 秒後結束；記錄取消次數。
  await context.addInitScript(() => {
    window.__spoken = [];
    window.__cancelled = 0;
    let timer = null;
    window.speechSynthesis.speak = (u) => {
      window.__spoken.push({ text: u.text, lang: u.lang, pitch: u.pitch, rate: u.rate });
      timer = setTimeout(() => u.onend?.(new Event('end')), 200);
    };
    window.speechSynthesis.cancel = () => {
      window.__cancelled += 1;
      clearTimeout(timer);
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://voice.local/', { waitUntil: 'networkidle' });
  const launch = page.locator('#greeting-launch');
  const button = (name) => page.getByRole('button', { name, exact: true });
  await launch.waitFor({ state: 'visible' });
  await page.locator('canvas').focus();
  await page.keyboard.down('w');
  try {
    await page.waitForFunction(() => !document.querySelector('#greeting-launch').disabled, {}, { timeout: 300000 });
  } finally {
    await page.keyboard.up('w');
  }
  const spoken = () => page.evaluate(() => window.__spoken.map((s) => s.text));
  await launch.tap();
  await page.waitForTimeout(800);
  const first = await page.evaluate(() => window.__spoken);
  check('開始對話自動唸：先小安的台詞再旁白', JSON.stringify(first.map((s) => s.text)) === JSON.stringify(['你好。', '你想怎麼回應？']), JSON.stringify(first));
  check('用台灣國語（zh-TW）', first.every((s) => /^zh/i.test(s.lang)), JSON.stringify(first.map((s) => s.lang)));
  check('小安的音高比旁白高、全部說慢一點', (first[0]?.pitch ?? 0) > (first[1]?.pitch ?? 9) && first.every((s) => s.rate < 1));
  check('有語音時按鈕是「再聽一次」', await button('再聽一次').isVisible());
  await button('再聽一次').tap();
  await page.waitForTimeout(800);
  check('「再聽一次」重唸這一步', (await spoken()).slice(-2).join('|') === '你好。|你想怎麼回應？', (await spoken()).join('|'));
  await button('說你好').tap();
  await page.waitForTimeout(300);
  const cancelledBefore = await page.evaluate(() => window.__cancelled);
  check('選了下一步會先停掉上一段再唸新的', cancelledBefore > 0 && (await spoken()).includes('你好。我在這裡休息。'));
  await button('暫停').tap();
  check('暫停時立刻停止', (await page.evaluate(() => window.__cancelled)) > cancelledBefore);
  const count = (await spoken()).length;
  await button('繼續').tap();
  await page.waitForTimeout(500);
  check('繼續後不會自己重唸', (await spoken()).length === count);
  // 對話中設定是收起的：先結束回公園，再關閉語音、重新開始對話。
  await button('結束招呼').tap();
  await button('回公園').tap();
  await page.locator('#movement-controls summary').tap();
  await page.locator('#voice-enabled').uncheck();
  await page.locator('#movement-controls summary').tap();
  await page.waitForTimeout(500);
  const before = (await spoken()).length;
  await launch.tap();
  await page.waitForTimeout(800);
  check('關閉語音後開始對話不發聲', (await spoken()).length === before);
  check('關閉語音後按鈕是「再看一次」', await button('再看一次').isVisible());
  check('沒有未處理例外', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}
const passed = checks.filter((c) => c.pass).length;
console.log(`${passed}/${checks.length} passed`);
process.exit(passed === checks.length ? 0 : 1);
