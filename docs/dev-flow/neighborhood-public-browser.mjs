// Pages 冒煙檢查：實際公開資源須與同來源 Pages base 建置一致。
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const { chromium } = require('playwright-core');
const [
  url,
  out = 'docs/dev-flow/neighborhood-evidence/published',
  expected = '/tmp/neighborhood-pages',
] = process.argv.slice(2);
if (!url) throw new Error('需要公開網站網址');
await mkdir(out, { recursive: true });
const local = process.env.PUBLIC_LOCAL === '1';
const checks = [];
const check = (name, pass) => {
  if (local) name = name.replaceAll('公開', '本機Pages');
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
};
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  if (local)
    await context.route('**/*', async (route) => {
      const rel =
        new URL(route.request().url()).pathname.replace(/^\/3D-Social-interactive-game\//, '') ||
        'index.html';
      const file = path.resolve(expected, rel);
      if (!file.startsWith(path.resolve(expected) + path.sep)) return route.abort();
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
  const assets = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('response', (r) => {
    if (/\.(js|css)$/.test(new URL(r.url()).pathname)) assets.push(r);
  });
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('#practice-launch').waitFor({ state: 'visible' });
  check(
    '公開頁面HTTP200且啟動同一個場景',
    response.status() === 200 && (await page.locator('canvas').count()) === 1,
  );
  const html = await readFile(path.join(expected, 'index.html'), 'utf8');
  for (const ext of local ? [] : ['js', 'css']) {
    const filename = html.match(new RegExp('assets/([^" ]+\\.' + ext + ')'))?.[1];
    const actual = assets.find((r) => new URL(r.url()).pathname.endsWith('/' + filename));
    check(
      `公開${ext.toUpperCase()} HTTP200且內容與本機Pages建置相同`,
      Boolean(
        actual &&
        actual.status() === 200 &&
        (await actual.body()).equals(await readFile(path.join(expected, 'assets', filename))),
      ),
    );
  }
  const canvas = await page.locator('canvas').elementHandle();
  const button = (name) => page.getByRole('button', { name, exact: true });
  const position = () =>
    page
      .locator('#map-player')
      .evaluate((el) => ({ x: el.getAttribute('cx'), z: el.getAttribute('cy') }));
  const before = await position();
  await button('街區地圖').click();
  check(
    '公開網站有六個街區目的地',
    (await page.locator('#district-map').isVisible()) &&
      (await page.locator('[data-destination]').count()) === 6,
  );
  await page.screenshot({ path: path.join(out, 'district-map.png') });
  check(
    '地點按鈕都有人工注音，報讀名稱不混入注音',
    await page.locator('#district-map button').evaluateAll((items) =>
      items.every((el) => {
        const label = el.getAttribute('aria-label') || '';
        return (
          label.length > 0 &&
          el.querySelectorAll('ruby').length ===
            Array.from(label).filter((c) => /[\u3400-\u9fff]/u.test(c)).length
        );
      }),
    ),
  );
  for (const size of [
    { width: 320, height: 360 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    let reachable = true;
    for (const el of await page.locator('#district-map button').all()) {
      await el.scrollIntoViewIfNeeded();
      reachable =
        reachable &&
        (await el.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.width >= 64 &&
            r.height >= 64 &&
            el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
          );
        }));
    }
    check(`${size.width}x${size.height} 含注音地圖各按鈕可捲動命中`, reachable);
  }
  await page.setViewportSize({ width: 390, height: 844 });

  await button('餐館').click();
  const after = await position();
  check(
    '公開地圖選點只指引，不傳送或另開對話',
    before.x === after.x &&
      before.z === after.z &&
      !(await page.locator('#greeting-panel').isVisible()) &&
      (await canvas.evaluate((el) => el.isConnected)),
  );
  await button('暫停').click();
  await button('繼續').click();
  await button('返回安全區').click();
  await button('繼續').click();
  check(
    '公開暫停與返回安全區仍有效',
    (await canvas.evaluate((el) => el.isConnected)) &&
      (await page.locator('canvas').count()) === 1 &&
      !(await page.locator('#overlay').isVisible()),
  );
  await page.screenshot({ path: path.join(out, 'park-entry.png') });
  check('公開頁面沒有未處理例外', errors.length === 0);
  await writeFile(
    path.join(out, 'result.json'),
    JSON.stringify(
      {
        url,
        source: local ? 'local Pages artifact' : 'published Pages',
        node: process.version,
        chromium: browser.version(),
        deviceScaleFactor: 1,
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
