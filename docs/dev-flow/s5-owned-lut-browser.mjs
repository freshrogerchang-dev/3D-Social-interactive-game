// S5 多 context 與 PBR 像素對照；公開 API，路由本地 source，沒有伺服器。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const { chromium } = require(path.join(process.env.PLAYWRIGHT_MODULE_DIR || '/opt/codex/runtimes/cua/lib/node_modules', 'playwright-core'));
const output = process.argv[2] || '/tmp/s5-owned-lut';
await mkdir(output, { recursive: true });
const source = await readFile('src/scene/ParkScene.ts', 'utf8');
const baseline = execFileSync('git', ['show', '2a098dd:src/scene/ParkScene.ts'], { encoding: 'utf8' });
const compile = text => ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const html = `<!doctype html><html><body style="margin:0"><canvas id="left"></canvas><canvas id="right"></canvas>
<script type="importmap">{"imports":{"three":"/modules/three.module.js"}}</script>
<script type="module">
import { ParkScene } from '/modules/ParkScene.js';
import { WebGLRenderer, ACESFilmicToneMapping, SRGBColorSpace } from 'three';
const parks = [new ParkScene(), new ParkScene()];
const renderers = ['left','right'].map(id => new WebGLRenderer({canvas: document.getElementById(id), antialias:true, preserveDrawingBuffer:true}));
renderers.forEach((renderer,i) => { renderer.outputColorSpace=SRGBColorSpace; renderer.toneMapping=ACESFilmicToneMapping; renderer.setSize(320,240); parks[i].resize(320,240); renderer.render(parks[i].scene, parks[i].camera); });
window.test = {
  stats: () => renderers.map(r => ({...r.info.memory})),
  disposeLeft: () => { parks[0].dispose(); renderers[0].dispose(); document.getElementById('left').remove(); },
  drawRight: () => renderers[1].render(parks[1].scene, parks[1].camera),
  disposeRight: () => { parks[1].dispose(); renderers[1].dispose(); document.getElementById('right').remove(); },
  releaseReferences: () => { parks.length=0; renderers.length=0; delete window.test; }
};
</script></body></html>`;
try {
  const makePage = async useBaseline => {
    const context = await browser.newContext({ viewport: { width: 800, height: 300 } });
    await context.route('**/*', async route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
      if (pathname === '/modules/ParkScene.js') return route.fulfill({ contentType: 'text/javascript', body: compile(useBaseline ? baseline : source) });
      if (['/modules/three.module.js', '/modules/three.core.js'].includes(pathname)) return route.fulfill({ contentType: 'text/javascript', body: await readFile(path.join('node_modules/three/build', path.basename(pathname))) });
      return route.fulfill({ status: 404, body: 'missing' });
    });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto('https://s5-owned-lut.test/');
    await page.waitForFunction(() => window.test !== undefined);
    return { context, page, errors };
  };
  const old = await makePage(true);
  const oldPixels = await old.page.locator('#right').screenshot({ path: path.join(output, 'baseline.png') });
  await old.context.close();
  const fixed = await makePage(false);
  const fixedPixels = await fixed.page.locator('#right').screenshot({ path: path.join(output, 'fixed.png') });
  assert.ok(oldPixels.equals(fixedPixels), '相同尺寸／相機／光線的 PBR PNG 應逐位元組相同');
  results.push({ check: 'baseline / fixed PBR pixels', pass: true });
  const before = await fixed.page.evaluate(() => window.test.stats());
  assert.equal(before[0].textures, 1); assert.equal(before[1].textures, 1);
  await fixed.page.evaluate(() => window.test.disposeLeft());
  const afterLeft = await fixed.page.evaluate(() => window.test.stats());
  assert.equal(afterLeft[0].textures, 0); assert.equal(afterLeft[1].textures, 1);
  await fixed.page.evaluate(() => window.test.drawRight());
  const rightAfter = await fixed.page.locator('#right').screenshot({ path: path.join(output, 'right-after-left-disposal.png') });
  assert.ok(fixedPixels.equals(rightAfter), '釋放左側後右側畫面應保持相同');
  results.push({ check: 'independent context texture disposal', pass: true, before, afterLeft });
  await fixed.page.evaluate(() => window.test.disposeRight());
  const final = await fixed.page.evaluate(() => window.test.stats());
  assert.equal(final[1].textures, 0);
  // 此測試的 window.test 刻意持有陣列供 stats 檢查；GC 前先清除測試持有者。
  await fixed.page.evaluate(() => window.test.releaseReferences());
  const cdp = await fixed.context.newCDPSession(fixed.page);
  await cdp.send('HeapProfiler.collectGarbage');
  const detached = await cdp.send('DOM.getDetachedDomNodes');
  const canvases = detached.detachedNodes.filter(n => n.treeNode.nodeName === 'CANVAS');
  assert.equal(canvases.length, 0);
  assert.deepEqual(fixed.errors, []);
  results.push({ check: 'both contexts released', pass: true, final, detachedCanvases: canvases.length });
  await fixed.context.close();
} finally {
  await writeFile(path.join(output, 'result.json'), JSON.stringify(results, null, 2) + '\n');
  await browser.close();
}
console.log(`${results.length}/3 passed`);
