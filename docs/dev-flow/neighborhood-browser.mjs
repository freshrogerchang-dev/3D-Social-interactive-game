// 正式 dist／公開網站：只用鍵盤、按鈕與真實地圖位置點，不注入相機／引擎。
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const { chromium } = require('playwright-core');
const out = process.argv[2] || '/tmp/neighborhood-evidence';
await mkdir(out, { recursive: true });
const checks = [];
const check = (name, pass, detail = '') => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${detail}`);
};
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  ...(process.env.WORLD_URL && process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: Number(process.env.WORLD_DPR || 1),
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  if (!process.env.WORLD_URL)
    await context.route('**/*', async (route) => {
      const rel = new URL(route.request().url()).pathname.slice(1) || 'index.html';
      const file = path.resolve('dist', rel);
      if (!file.startsWith(path.resolve('dist') + path.sep)) return route.abort();
      const types = {
        js: 'text/javascript',
        css: 'text/css',
        jpg: 'image/jpeg',
        svg: 'image/svg+xml',
        json: 'application/json',
      };
      try {
        await route.fulfill({
          body: await readFile(file),
          contentType: types[rel.split('.').pop()] || 'text/html',
        });
      } catch {
        await route.fulfill({ status: 404, body: '' });
      }
    });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(process.env.WORLD_URL || 'http://neighborhood.local/', {
    waitUntil: 'networkidle',
  });
  const button = (n) => page.getByRole('button', { name: n, exact: true });
  const act = async (...names) => {
    for (const n of names) await button(n).tap();
  };
  const launch = page.locator('#greeting-launch');
  const map = page.locator('#practice-launch');
  const panel = page.locator('#greeting-panel');
  const pos = () =>
    page
      .locator('#map-player')
      .evaluate((el) => ({
        x: (Number(el.getAttribute('cx')) - 12) / 6 - 8,
        z: (Number(el.getAttribute('cy')) - 12) / 6 - 11,
      }));
  const walk = async (key, axis, target, sign) => {
    console.log(
      `WALK ${key} ${axis} ${target}`,
      await pos(),
      await page.locator('#map-heading').getAttribute('transform'),
    );
    await page.locator('canvas').focus();
    await page.waitForTimeout(200);
    await page.keyboard.down(key);
    const debug = setInterval(() => {
      void pos().then((p) => console.log('MOVING', p));
    }, 15000);
    try {
      await page.waitForFunction(
        ({ axis, target, sign }) => {
          const p = document.querySelector('#map-player');
          const value =
            axis === 'x'
              ? (Number(p.getAttribute('cx')) - 12) / 6 - 8
              : (Number(p.getAttribute('cy')) - 12) / 6 - 11;
          return sign > 0 ? value >= target : value <= target;
        },
        { axis, target, sign },
        { timeout: 240000 },
      );
    } catch (error) {
      console.log(
        'WALK BLOCKED',
        await pos(),
        await page.locator('#map-heading').getAttribute('transform'),
      );
      await page.screenshot({ path: path.join(out, 'walk-blocked.png') });
      throw error;
    } finally {
      clearInterval(debug);
      await page.keyboard.up(key);
    }
    await page.waitForTimeout(350);
    console.log('AT', await pos());
  };
  await map.waitFor({ state: 'visible' });
  await page.locator('#movement-controls summary').tap();
  await page.locator('#voice-enabled').uncheck();
  await page.locator('#environment-detail').selectOption('low');
  await page.locator('input[name=speed]').fill('1.8');
  await page.locator('#movement-controls summary').tap();
  const canvas = await page.locator('canvas').elementHandle();
  await page.waitForTimeout(250);
  const before = await pos();
  await map.tap();
  check(
    '原公園中可開地圖並看到六個生活地點',
    (await page.locator('[data-destination]').count()) === 6 &&
      (await page.locator('#district-map').isVisible()),
  );
  await button('餐館').tap();
  const after = await pos();
  check(
    '選目的地只指路，不傳送',
    Math.hypot(before.x - after.x, before.z - after.z) < 0.01 && !(await panel.isVisible()),
  );
  await walk('d', 'x', 3.2, 1);
  await walk('w', 'z', 0, -1);
  await walk('d', 'x', 18, 1);
  await page.locator('#movement-controls summary').tap();
  for (let i = 0; i < 6; i++) await button('向右看').tap();
  await page.locator('#movement-controls summary').tap();
  await walk('a', 'z', -4.5, -1);
  check(
    '從原公園實際走到同一世界路口',
    (await launch.getAttribute('aria-label')) === '路口練習' &&
      (await page.locator('canvas').count()) === 1,
  );
  await page.screenshot({ path: path.join(out, 'street-from-park.png') });
  await walk('w', 'x', 19.7, 1);
  await page.locator('canvas').focus();
  await page.keyboard.down('w');
  await page.waitForTimeout(1400);
  await page.keyboard.up('w');
  check('開始練習前不能直接走入車道', (await pos()).x <= 20.01);
  await launch.tap();
  check(
    '在眼前3D路口互動，沒有獨立示意圖',
    (await panel.getAttribute('data-world')) === 'true' &&
      !(await page.locator('#practice-picture').isVisible()),
  );
  await act('牽手', '看看號誌', '車停讓了', '一起走');
  check(
    '過馬路改為實際步行，尚未到達不可按完成',
    (await page.locator('#movement-pad').isVisible()) && (await button('到了對面').isDisabled()),
  );
  await act('幫助', '暫停', '繼續');
  check(
    '步行求助中暫停恢復仍停住並保留幫助',
    (await page.locator('#greeting-help-panel').isVisible()) &&
      !(await page.locator('#movement-pad').isVisible()),
  );
  await act('關閉幫助');
  for (const size of [
    { width: 320, height: 360 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await button('幫助').scrollIntoViewIfNeeded();
    await act('幫助');
    check(
      `${size.width}x${size.height} 步行卡可捲動開幫助且安全控制可命中`,
      (await page.locator('#greeting-help-panel').isVisible()) &&
        (await button('暫停').evaluate((el) => {
          const r = el.getBoundingClientRect();
          return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        })),
    );
    await act('關閉幫助');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await walk('w', 'x', 25, 1);
  check('真的走到對岸才開放確認', await button('到了對面').isEnabled());
  await act('到了對面', '繼續探索');
  check(
    '結束互動仍在同一街區，不返回另一場景',
    (await pos()).x > 24.5 && (await canvas.evaluate((el) => el.isConnected)),
  );
  await walk('w', 'x', 27.7, 1);
  await walk('a', 'z', -5.5, -1);
  await page.waitForFunction(
    () => document.querySelector('#greeting-launch').getAttribute('aria-label') === '用餐練習',
  );
  await launch.tap();
  await act('繼續吃');
  await page.screenshot({ path: path.join(out, 'cafe-seated.png') });
  check(
    '實際餐館桌邊開始用餐，場景仍可見',
    (await panel.getAttribute('data-world')) === 'true' &&
      (await canvas.evaluate((el) => el.isConnected)) &&
      (await button('想上廁所').isVisible()),
  );
  await act('想上廁所', '找標誌');
  check(
    '用餐接到找廁所，未到入口不能確認',
    (await button('到廁所了').isDisabled()) && (await page.locator('#movement-pad').isVisible()),
  );
  await walk('s', 'x', 26.1, -1);
  await walk('d', 'z', 3.5, 1);
  check('從餐館沿同一條人行道走到廁所', await button('到廁所了').isEnabled());
  await act('到廁所了');
  await page.screenshot({ path: path.join(out, 'restroom-entry.png') });
  await act('結束練習', '繼續探索');
  await walk('d', 'z', 9, 1);
  await walk('w', 'x', 27.7, 1);
  await page.waitForFunction(
    () => document.querySelector('#greeting-launch').getAttribute('aria-label') === '親友見面',
  );
  await launch.tap();
  check('親友界線在同一街區地點開始', await button('說不要').isVisible());
  await act('說不要', '結束練習', '繼續探索');
  await walk('s', 'x', 25.8, -1);
  await walk('a', 'z', -10, -1);
  await page.waitForFunction(
    () => document.querySelector('#greeting-launch').getAttribute('aria-label') === '看公告牌',
  );
  await launch.tap();
  check('公告牌承接計畫改變情境', await button('遊具維修').isVisible());
  await act('餐點賣完', '先不買', '繼續探索');
  await walk('d', 'z', -4.5, 1);
  await page.waitForFunction(
    () => document.querySelector('#greeting-launch').getAttribute('aria-label') === '路口練習',
  );
  await launch.tap();
  await act('牽手', '看看號誌', '車停讓了', '一起走');
  check('斑馬線另一側也能開始同行', await button('到了對面').isDisabled());
  await walk('s', 'x', 18.7, -1);
  await act('到了對面', '繼續探索');
  await walk('d', 'z', 6, 1);
  await page.waitForFunction(
    () => document.querySelector('#greeting-launch').getAttribute('aria-label') === '安靜休息',
  );
  await launch.tap();
  check('休息角接到感官需求情境', await button('說太吵').isVisible());
  await act('想離開', '結束練習', '換個情境');
  check('換個情境開啟地圖而不是遠端選單', await page.locator('#district-map').isVisible());
  await act('收起地圖');
  for (const size of [
    { width: 320, height: 360 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await map.tap();
    await button('收起地圖').scrollIntoViewIfNeeded();
    check(
      `${size.width}x${size.height} 地圖可捲動且安全按鈕可命中`,
      await button('返回安全區').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }),
    );
    await act('收起地圖');
  }
  await act('返回安全區', '繼續');
  const safe = await pos();
  check(
    '安全退出回到原公園，仍只有原本一個canvas',
    Math.abs(safe.x) < 0.01 &&
      Math.abs(safe.z - 3.5) < 0.01 &&
      (await canvas.evaluate((el) => el.isConnected)) &&
      (await page.locator('canvas').count()) === 1,
  );
  check('無未處理例外', errors.length === 0, JSON.stringify(errors));
  await writeFile(
    path.join(out, 'result.json'),
    JSON.stringify(
      {
        node: process.version,
        chromium: browser.version(),
        url: process.env.WORLD_URL || 'local dist',
        deviceScaleFactor: Number(process.env.WORLD_DPR || 1),
        checks,
        errors,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
console.log(`${checks.filter((c) => c.pass).length}/${checks.length} passed`);
process.exitCode = checks.every((c) => c.pass) ? 0 : 1;
