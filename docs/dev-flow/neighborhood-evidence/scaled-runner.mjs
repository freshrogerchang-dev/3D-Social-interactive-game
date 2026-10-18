// 降低雲端軟體渲染像素量；CSS viewport／按鈕尺寸不變，不作為實機效能證據。
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const { chromium } = require('playwright-core');
const launch = chromium.launch.bind(chromium);
chromium.launch = async (options) => {
  const browser = await launch(options);
  for (const name of ['newContext', 'newPage']) {
    const original = browser[name].bind(browser);
    browser[name] = (options) => original({ ...options, deviceScaleFactor: 0.5 });
  }
  return browser;
};
const [script, ...args] = process.argv.slice(2);
process.argv = [process.argv[0], path.resolve(script), ...args];
await import(pathToFileURL(path.resolve(script)).href);
