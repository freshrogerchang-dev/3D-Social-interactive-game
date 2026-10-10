// 最終 dist 操作，以畫面差異檢查，不向產品注入相機／控制器。
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const { chromium } = require('playwright-core');
const out = process.argv[2] || 'docs/dev-flow/phase2-evidence/production';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const checks = [];
const check = (name, pass, evidence) => { checks.push({name,pass,evidence}); console.log(`${pass?'PASS':'FAIL'} ${name}`); };
try {
 const context = await browser.newContext({ viewport: { width:390,height:844 }, hasTouch:true });
 await context.route('**/*', async route => {
  const relative = new URL(route.request().url()).pathname.slice(1) || 'index.html';
  const target = path.resolve('dist', relative);
  if (!target.startsWith(path.resolve('dist') + path.sep)) return route.abort();
  try { await route.fulfill({ contentType:relative.endsWith('.js')?'text/javascript':relative.endsWith('.css')?'text/css':'text/html', body:await readFile(target) }); } catch { await route.abort(); }
 });
 const page = await context.newPage(); const errors=[];
 page.on('pageerror', e=>errors.push(String(e)));
 await page.goto('http://phase2-prod.local/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('canvas')&&document.querySelector('#overlay').hidden);
 const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
 await settle();
 const initial = await page.screenshot({path:path.join(out,'initial.png')});
 await page.locator('canvas').tap({position:{x:195,y:550}}); await page.waitForTimeout(700);
 const walking=await page.screenshot({path:path.join(out,'walking.png')});
 check('production 點地面後實際畫面改變',!initial.equals(walking));
 await page.getByRole('button',{name:'暫停',exact:true}).tap();
 await settle(); const paused=await page.screenshot({path:path.join(out,'paused-a.png')}); await page.waitForTimeout(300);
 check('production 暫停畫面完全停住',paused.equals(await page.screenshot({path:path.join(out,'paused-b.png')})));
 await page.getByRole('button',{name:'繼續',exact:true}).tap(); await page.waitForTimeout(100);
 const resumed=await page.screenshot(); await page.waitForTimeout(350);
 check('production 恢復沒有舊前往目標',resumed.equals(await page.screenshot()));
 await page.getByRole('button',{name:'返回安全區',exact:true}).tap(); await page.getByRole('button',{name:'繼續',exact:true}).tap();
 await page.getByText('操作與設定',{exact:true}).tap();
 const buttons=await page.locator('[data-move]').evaluateAll(els=>els.map(el=>({name:el.textContent,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));
 check('production 七個導覽按鈕皆至少 64px',buttons.length===7&&buttons.every(b=>b.width>=64&&b.height>=64),buttons);
 await page.getByRole('button',{name:'往前一步',exact:true}).tap(); await page.waitForTimeout(400);
 await page.getByRole('button',{name:'停止移動',exact:true}).tap();
 await settle(); const stopped=await page.screenshot({path:path.join(out,'stopped-a.png')}); await page.waitForTimeout(250);
 check('production 按鈕停止後畫面穩定',stopped.equals(await page.screenshot({path:path.join(out,'stopped-b.png')})));
 await page.setViewportSize({width:320,height:360});
 await page.addStyleTag({content:':root {font-size:32px}'});
 await page.getByRole('button',{name:'向左看',exact:true}).tap();
 await page.getByRole('button',{name:'停止移動',exact:true}).tap();
 await page.getByRole('button',{name:'暫停',exact:true}).tap();
 check('production 短畫面大字仍可操作與暫停',await page.getByRole('heading',{name:'休息一下'}).isVisible());
 check('production 沒有未處理例外',errors.length===0,errors);
 await context.close();
} finally {await browser.close();}
await writeFile(path.join(out,'result.json'),JSON.stringify({node:process.version,checks},null,2)+'\n');
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} passed`);
process.exitCode=checks.every(c=>c.pass)?0:1;
