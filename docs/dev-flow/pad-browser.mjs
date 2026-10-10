// 最終 dist 操作，以畫面差異檢查，不向產品注入相機／控制器。
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const { chromium } = require('playwright-core');
const out = process.argv[2] || 'docs/dev-flow/pad-evidence/browser';
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
 const button = name => page.getByRole('button',{name,exact:true});
 const pad = page.locator('#movement-pad');
 const rects = await pad.locator('button').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height,x:r.x,y:r.y};}));
 check('圓盤在左下方，五個觸控目標至少64px',rects.length===5&&rects.every(r=>r.w>=64&&r.h>=64)&&rects[0].x<150);
 check('圓盤使用半透明底色，圖示不套整體透明',await pad.evaluate(el=>getComputedStyle(el).backgroundColor.includes('0.35')&&getComputedStyle(el).opacity==='1'));
 await page.waitForTimeout(300);const initial=await page.screenshot();
 await button('往前一步').tap();await page.waitForTimeout(900);
 check('圓盤前進可移動',!initial.equals(await page.screenshot()));
 await button('往後一步').tap();await page.waitForTimeout(900);
 await button('向左看').tap();await page.waitForTimeout(150);const left=await page.screenshot();
 await button('向右看').tap();await page.waitForTimeout(150);
 check('圓盤左右轉向有作用',!left.equals(await page.screenshot()));
 await button('往前一步').tap();await button('停止移動').tap();await settle();const stopped=await page.screenshot();await page.waitForTimeout(300);
 check('中央停止不留下移動目標',stopped.equals(await page.screenshot()));
 await button('暫停').tap();check('暫停隱藏圓盤且可繼續',!(await pad.isVisible())&&await button('繼續').isVisible());
 await button('返回安全區').tap();await button('繼續').tap();check('返回後繼續恢復圓盤',await pad.isVisible());
 await page.locator('#movement-controls summary').tap();check('展開設定讓出圓盤且平移仍可用',!(await pad.isVisible())&&await button('往左一步').isVisible());
 await button('往左一步').tap();await button('往右一步').tap();
 await page.locator('#movement-controls summary').tap();
 for(const size of [{width:320,height:360},{width:390,height:844}]) {
  await page.setViewportSize(size);
  const hits=await pad.locator('button').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
  check(`${size.width}x${size.height} 圓盤五個按鈕中心皆可點按`,hits.every(Boolean),hits);
 }
 await page.screenshot({path:path.join(out,'phone-pad.png')});
 await page.addStyleTag({content:':root {font-size:32px}'});
 await page.locator('#movement-controls summary').tap();await button('往左一步').tap();await button('暫停').tap();
 check('大字設定與安全按鈕可操作',await page.getByRole('heading',{name:'休息一下'}).isVisible());
 await button('結束本次').tap();await button('重新開始').tap();await page.waitForFunction(()=>document.querySelector('#overlay').hidden);
 if(await page.locator('#movement-controls').evaluate(el=>el.open)) await page.locator('#movement-controls summary').tap();
 check('重新開始只有一個圓盤及canvas',await pad.isVisible()&&await page.locator('canvas').count()===1);
 check('沒有未處理例外',errors.length===0,errors);
 await context.close();
} finally {await browser.close();}
await writeFile(path.join(out,'result.json'),JSON.stringify({node:process.version,checks},null,2)+'\n');
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} passed`);
process.exitCode=checks.every(c=>c.pass)?0:1;
