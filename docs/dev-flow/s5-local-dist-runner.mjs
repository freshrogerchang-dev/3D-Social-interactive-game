// 用 Playwright route 跑既有腳本，讀取本地 dist；不啟動伺服器。
// node s5-local-dist-runner.mjs <browser-script> <virtual-url> <out-dir>
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [script, ...args] = process.argv.slice(2);
if (!script) throw new Error('需要瀏覽器腳本路徑');
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
let playwright;
try { playwright = require('playwright'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; playwright = require('playwright-core'); }
const launch = playwright.chromium.launch.bind(playwright.chromium);
const fulfill = async route => {
  const relative = new URL(route.request().url()).pathname.replace(/^\//, '') || 'index.html';
  const target = path.resolve('dist', relative);
  if (!target.startsWith(path.resolve('dist') + path.sep)) return route.abort();
  try { await route.fulfill({ contentType: relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.css') ? 'text/css' : 'text/html', body: await readFile(target) }); }
  catch { await route.fulfill({ status: 404, body: 'missing local artifact' }); }
};
playwright.chromium.launch = async options => {
  const browser = await launch(options);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async options => { const context = await newContext(options); await context.route('**/*', fulfill); return context; };
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async options => { const page = await newPage(options); await page.route('**/*', fulfill); return page; };
  return browser;
};
process.argv = [process.argv[0], path.resolve(script), ...args];
await import(pathToFileURL(path.resolve(script)).href);
