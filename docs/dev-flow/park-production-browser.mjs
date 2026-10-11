// 最終 dist 操作，以畫面差異檢查，不向產品注入相機／控制器。
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const { chromium } = require('playwright-core');
const out = process.argv[2] || 'docs/dev-flow/park-evidence/production';
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
  try { await route.fulfill({ contentType:relative.endsWith('.js')?'text/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.jpg')?'image/jpeg':relative.endsWith('.json')?'application/json':'text/html', body:await readFile(target) }); } catch { await route.abort(); }
 });
 const page = await context.newPage(); const errors=[];
 page.on('pageerror', e=>errors.push(String(e)));
 await page.goto('http://phase2-prod.local/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('canvas')&&document.querySelector('#overlay').hidden);
 const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
 await settle();
 await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/park/')&&e.name.endsWith('.jpg')).length===10);
 await page.waitForTimeout(500);
 const pad=page.locator('#movement-pad');const cdp=await context.newCDPSession(page);
 const rect=await pad.boundingBox();const cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
 const touch=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:4,radiusY:4,force:1}))});
 await page.waitForTimeout(300);const initial=await page.screenshot();
 await touch('touchStart',[[cx+45,cy-45,1]]);await page.waitForTimeout(650);
 check('正式建置斜向觸控按住可移動',!initial.equals(await page.screenshot())&&await pad.evaluate(el=>parseFloat(el.style.getPropertyValue('--stick-x'))>0&&parseFloat(el.style.getPropertyValue('--stick-y'))<0));
 await touch('touchMove',[[cx+150,cy-150,1]]);check('拖出圓盤仍捕捉且旋鈕不越界',await pad.evaluate(el=>Math.hypot(parseFloat(el.style.getPropertyValue('--stick-x')),parseFloat(el.style.getPropertyValue('--stick-y')))<=56.01));
 await touch('touchEnd',[]);await settle();const stopped=await page.screenshot();await page.waitForTimeout(300);
 check('觸控放開畫面停止、旋鈕回中心',stopped.equals(await page.screenshot())&&await pad.evaluate(el=>!el.style.getPropertyValue('--stick-x')));
 await touch('touchStart',[[cx-40,cy,1]]);await touch('touchStart',[[cx-40,cy,1],[cx+40,cy,2]]);await settle();const multi=await page.screenshot();await page.waitForTimeout(250);
 check('多指取消輸入，不保持方向',multi.equals(await page.screenshot())&&await pad.evaluate(el=>!el.style.getPropertyValue('--stick-x')));await touch('touchEnd',[]);
 await touch('touchStart',[[cx,cy-40,1]]);await page.evaluate(()=>document.querySelector('[data-action="pause"]').click());await touch('touchEnd',[]);
 check('按住中暫停隱藏搖桿',!(await pad.isVisible()));await page.getByRole('button',{name:'繼續',exact:true}).click();await settle();const resumed=await page.screenshot();await page.waitForTimeout(300);
 check('恢復沒有殘留方向',resumed.equals(await page.screenshot()));
 await page.getByRole('button',{name:'返回安全區',exact:true}).click();await page.getByRole('button',{name:'繼續',exact:true}).click();
 for(const size of [{width:320,height:360},{width:390,height:844}]){await page.setViewportSize(size);check(`${size.width}x${size.height} 整圓盤中心可命中`,await pad.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));}
 await page.screenshot({path:path.join(out,'phone-park.png')});
 await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(200);await page.screenshot({path:path.join(out,'desktop-park.png')});
 await page.setViewportSize({width:390,height:844});
 await page.locator('#movement-controls summary').click();await page.getByRole('button',{name:'往前一步',exact:true}).click();await page.getByRole('button',{name:'停止移動',exact:true}).click();check('單次按鈕替代操作仍可用',await page.locator('[data-move]').count()===7);
 check('沒有未處理例外',errors.length===0,errors);
 await context.close();
} finally {await browser.close();}
await writeFile(path.join(out,'result.json'),JSON.stringify({node:process.version,checks},null,2)+'\n');
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} passed`);
process.exitCode=checks.every(c=>c.pass)?0:1;
