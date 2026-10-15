// 公園多人物對話瀏覽器檢查。用法：
// PLAYWRIGHT_MODULE_DIR=<含 playwright-core 的目錄> CHROMIUM_EXECUTABLE_PATH=<chrome> \
//   node docs/dev-flow/park-dialogues-browser.mjs <證據目錄>
// 預設以 route 直接提供本機 dist；設定 PARK_URL 時改測該網址（例如公開 Pages）。
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const { chromium } = require('playwright-core');
const out = process.argv[2] || '/tmp/park-dialogues-evidence';
await mkdir(out, { recursive: true });
const checks = [];
const check = (name, pass, detail = '') => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  ...(process.env.PARK_URL && process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const types = { js: 'text/javascript', css: 'text/css', jpg: 'image/jpeg', json: 'application/json', txt: 'text/plain' };

async function openPark() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  if (!process.env.PARK_URL)
    await context.route('**/*', async (route) => {
      const relative = new URL(route.request().url()).pathname.slice(1) || 'index.html';
      const target = path.resolve('dist', relative);
      if (!target.startsWith(path.resolve('dist') + path.sep)) return route.abort();
      try {
        await route.fulfill({
          body: await readFile(target),
          contentType: types[relative.split('.').pop()] ?? 'text/html',
        });
      } catch {
        await route.abort();
      }
    });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(process.env.PARK_URL || 'http://park.local/', { waitUntil: 'networkidle' });
  await page.locator('#greeting-launch').waitFor({ state: 'visible' });
  return { context, page, errors };
}

/** 去掉注音後的純文字。 */
const plain = (page, selector) =>
  page.locator(selector).evaluate((el) => {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('rt').forEach((rt) => rt.remove());
    return clone.textContent.replace(/\s+/g, '');
  });
const button = (page, name) => page.getByRole('button', { name, exact: true });

/**
 * 按住移動鍵直到開始按鈕變成指定人物（路上經過別人時會先出現別人的按鈕），
 * 回傳最後的按鈕名稱；逾時則回傳當下名稱，由呼叫端判定失敗。
 */
async function walkTo(page, keys, expected) {
  await page.locator('canvas').focus();
  for (const key of keys) await page.keyboard.down(key);
  try {
    await page.waitForFunction(
      (label) => {
        const launch = document.querySelector('#greeting-launch');
        return !launch.disabled && launch.getAttribute('aria-label') === label;
      },
      expected,
      { timeout: 300000 },
    );
  } catch (error) {
    // 交由檢查結果顯示實際按鈕名稱；另存畫面方便判讀。
    console.log(`walkTo(${expected}) 未達成：${String(error).split('\n')[0]}`);
    await page.screenshot({ path: path.join(out, `walk-timeout-${keys.join('')}.png`) });
  } finally {
    for (const key of keys) await page.keyboard.up(key);
  }
  return page.locator('#greeting-launch').getAttribute('aria-label');
}

/** 用設定裡的單次按鈕轉向或移動（模擬先轉向人物再走過去）。 */
async function settingsSteps(page, name, times) {
  await page.locator('#movement-controls summary').tap();
  for (let step = 0; step < times; step += 1) {
    await button(page, name).tap();
    // 移動是走向目標點，下一次點按會取代目標；軟體 WebGL 幀率低，等走完再按。
    await page.waitForTimeout(3000);
  }
  await page.locator('#movement-controls summary').tap();
  // 收合設定會非同步觸發 toggle 並清除移動輸入；等它處理完再按住按鍵。
  await page.waitForTimeout(500);
}

async function choicesOk(page) {
  return page.locator('#greeting-choices button').evaluateAll((buttons) =>
    buttons.every((b) => {
      const r = b.getBoundingClientRect();
      return (
        r.width >= 64 &&
        r.height >= 64 &&
        b.querySelector('rt') &&
        b.querySelector('svg[aria-hidden="true"]') &&
        b.getAttribute('aria-label')
      );
    }),
  );
}

try {
  // 1. 出發點：沒有人在靠近範圍。
  {
    const { context, page, errors } = await openPark();
    check('出發點不能開始對話，按鈕寫「靠近再說話」', (await page.locator('#greeting-launch').isDisabled()) &&
      (await page.locator('#greeting-launch').getAttribute('aria-label')) === '靠近再說話');
    check('人物提示列出四位人物', (await page.locator('#npc-info').textContent()) === '公園裡有小安、小宇、小晴和媽媽。');
    await page.screenshot({ path: path.join(out, 'start.png') });
    check('出發點沒有例外', errors.length === 0, errors.join(' | '));
    await context.close();
  }

  // 2. 小宇：一起玩（含被拒絕練習）。
  {
    const { context, page, errors } = await openPark();
    await settingsSteps(page, '向左看', 3);
    const label = await walkTo(page, ['w'], '跟小宇說話');
    check('向左轉 45° 往前走靠近小宇，按鈕變成「跟小宇說話」', label === '跟小宇說話', String(label));
    check('靠近不自動開啟對話', !(await page.locator('#greeting-panel').isVisible()));
    check('人物提示：小宇在這裡玩球', (await page.locator('#npc-info').textContent()) === '小宇在這裡玩球。');
    await page.screenshot({ path: path.join(out, 'xiaoyu-near.png') });
    await page.locator('#greeting-launch').tap();
    check('對話標題為「一起玩」，小宇不先開口', (await plain(page, '#greeting-title')) === '一起玩' &&
      (await plain(page, '#greeting-copy')) === '小宇在玩球。你想怎麼開始？');
    check('對話中隱藏移動搖桿', !(await page.locator('#movement-pad').isVisible()));
    check('選項至少 64px、有注音、圖示與名稱', await choicesOk(page));
    await button(page, '問一起玩').tap();
    check('問一起玩：小宇說等一下', (await plain(page, '#greeting-copy')).includes('小宇：可以。等我踢完這球。'));
    await page.screenshot({ path: path.join(out, 'xiaoyu-dialogue.png') });
    await button(page, '點頭').tap();
    await button(page, '踢球').tap();
    check('一起玩完成', (await plain(page, '#greeting-copy')) === '你跟小宇一起玩球。');
    await button(page, '換個回答').tap();
    await button(page, '用手指球').tap();
    check('換個回答：小宇說現在不行', (await plain(page, '#greeting-copy')).includes('小宇：現在不行，在比賽。'));
    await button(page, '幫助').tap();
    check('幫助保留原節點', await page.locator('#greeting-help-panel').isVisible());
    await button(page, '關閉幫助').tap();
    check('關閉幫助後焦點回到幫助按鈕', await button(page, '幫助').evaluate((el) => el === document.activeElement));
    await button(page, '說我難過').tap();
    check('說我難過：中性回應', (await plain(page, '#greeting-copy')) === '難過是可以的。可以去做別的事。');
    await button(page, '結束練習').tap();
    await button(page, '回公園').tap();
    check('回公園後關閉對話、恢復搖桿', !(await page.locator('#greeting-panel').isVisible()) &&
      (await page.locator('#movement-pad').isVisible()));
    check('小宇路徑沒有例外', errors.length === 0, errors.join(' | '));
    await context.close();
  }

  // 3. 小晴：排隊（含插隊），中途暫停與返回安全區。
  {
    const { context, page, errors } = await openPark();
    await settingsSteps(page, '向右看', 3);
    const label = await walkTo(page, ['w'], '去排隊');
    check('向右轉 45° 往前走靠近小晴，按鈕變成「去排隊」', label === '去排隊', String(label));
    await page.screenshot({ path: path.join(out, 'xiaoqing-near.png') });
    await page.locator('#greeting-launch').tap();
    await button(page, '問排隊嗎').tap();
    check('小晴回答在排隊', (await plain(page, '#greeting-copy')).includes('小晴：對，我在排隊。'));
    await button(page, '排在後面').tap();
    await button(page, '說好').tap();
    await button(page, '溜下去').tap();
    await button(page, '有人插隊').tap();
    check('插隊有四種做法', (await page.locator('#greeting-choices button').count()) === 4);
    await button(page, '暫停').tap();
    await button(page, '繼續').tap();
    check('暫停後繼續仍在插隊節點', (await page.locator('#greeting-choices button').count()) === 4 &&
      (await plain(page, '#greeting-copy')).startsWith('有人站到你前面。'));
    await button(page, '找大人').tap();
    check('找大人：大人請他排後面', (await plain(page, '#greeting-copy')).includes('大人請他排後面。'));
    await button(page, '返回安全區').tap();
    await button(page, '繼續').tap();
    check('返回安全區清除對話，不恢復舊節點', !(await page.locator('#greeting-panel').isVisible()));
    check('小晴路徑沒有例外', errors.length === 0, errors.join(' | '));
    await context.close();
  }

  // 4. 媽媽：游泳課。
  {
    const { context, page, errors } = await openPark();
    // 往左三步（1.8m）繞過長椅，再往前走到入口。
    await settingsSteps(page, '往左一步', 3);
    const label = await walkTo(page, ['w'], '跟媽媽說話');
    check('繞過長椅往前走到入口，按鈕變成「跟媽媽說話」', label === '跟媽媽說話', String(label));
    await page.screenshot({ path: path.join(out, 'mom-near.png') });
    await page.locator('#greeting-launch').tap();
    check('媽媽先說明行程', (await plain(page, '#greeting-copy')).startsWith('媽媽：我們等一下去游泳。'));
    check('「媽媽」第二字標輕聲', await page.locator('#greeting-copy p').first().evaluate((p) => {
      const rts = [...p.querySelectorAll('rt')].slice(0, 2);
      return rts.length === 2 && !rts[0].classList.contains('has-neutral') && rts[1].classList.contains('has-neutral');
    }));
    await button(page, '說不想去').tap();
    check('媽媽複述：你今天不想去游泳', (await plain(page, '#greeting-copy')).includes('媽媽：你今天不想去游泳。'));
    await button(page, '說對').tap();
    await button(page, '聽媽媽說').tap();
    check('媽媽提出先游泳再玩 Switch', (await plain(page, '#greeting-copy')).includes('先游泳，再玩Switch。'));
    await page.screenshot({ path: path.join(out, 'mom-dialogue.png') });
    await button(page, '想先休息').tap();
    await button(page, '點頭').tap();
    check('休息後同意出發', (await plain(page, '#greeting-copy')).startsWith('媽媽：好，我們出發吧。'));
    for (const size of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(size);
      await button(page, '回公園').scrollIntoViewIfNeeded();
      check(`${size.width}x${size.height} 選項可命中、安全按鈕可命中`, await button(page, '回公園').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }) && await button(page, '返回安全區').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }));
    }
    check('媽媽路徑沒有例外', errors.length === 0, errors.join(' | '));
    await context.close();
  }

  // 5. 小安：原本的打招呼仍可用。
  {
    const { context, page, errors } = await openPark();
    const label = await walkTo(page, ['w'], '打招呼');
    check('往前走靠近小安，按鈕仍是「打招呼」', label === '打招呼', String(label));
    await page.locator('#greeting-launch').tap();
    await button(page, '說你好').tap();
    check('小安回應不變', (await plain(page, '#greeting-copy')).includes('小安：你好。我在這裡休息。'));
    check('小安路徑沒有例外', errors.length === 0, errors.join(' | '));
    await context.close();
  }
} finally {
  await writeFile(
    path.join(out, 'result.json'),
    JSON.stringify({ node: process.version, chromium: browser.version(), url: process.env.PARK_URL ?? 'local dist', checks }, null, 2) + '\n',
  );
  await browser.close();
}
console.log(`${checks.filter((c) => c.pass).length}/${checks.length} passed`);
process.exitCode = checks.every((c) => c.pass) ? 0 : 1;
