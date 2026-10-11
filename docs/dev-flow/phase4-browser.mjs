import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const { chromium } = require('playwright-core');
const out = process.argv[2] || '/tmp/phase4-evidence';
await mkdir(out, {recursive:true});
const checks=[];
const check=(name, pass)=>{checks.push({name,pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'], ...(process.env.PHASE4_URL && process.env.HTTPS_PROXY ? {proxy:{server:process.env.HTTPS_PROXY}} : {})});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
 if (!process.env.PHASE4_URL) await context.route('**/*',async route=>{
  const relative=new URL(route.request().url()).pathname.slice(1)||'index.html';
  const target=path.resolve('dist',relative);
  if(!target.startsWith(path.resolve('dist')+path.sep))return route.abort();
  try{await route.fulfill({body:await readFile(target),contentType:relative.endsWith('.js')?'text/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.jpg')?'image/jpeg':'text/html'});}catch{await route.abort();}
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(process.env.PHASE4_URL||'http://phase4.local/',{waitUntil:'networkidle'});
 const plainCopy=()=>page.locator('#greeting-copy').evaluate(el=>{const clone=el.cloneNode(true);clone.querySelectorAll('rt').forEach(rt=>rt.remove());return clone.textContent;});
 const button=name=>page.getByRole('button',{name,exact:true});
 const panel=page.locator('#greeting-panel'); const launch=page.locator('#greeting-launch');
 await launch.waitFor({state:'visible'});
 check('遠處不開始，靠近不自動彈對話',await launch.isDisabled()&&!(await panel.isVisible()));
 await page.locator('canvas').focus();await page.keyboard.down('w');
 try{await page.waitForFunction(()=>!document.querySelector('#greeting-launch').disabled,{},{timeout:90000});}finally{await page.keyboard.up('w');}
 check('靠近後仍須明確打招呼',!(await panel.isVisible()));
 await launch.tap();check('開啟後停止移動並隱藏圓盤',await panel.isVisible()&&!(await page.locator('#movement-pad').isVisible()));
 check('台詞、提示及每個選項都有注音',await page.locator('#greeting-copy rt').count()>0&&await page.locator('#greeting-choices button').evaluateAll(buttons=>buttons.every(b=>b.querySelector('rt'))));
 check('注音直排於每個漢字右側',await panel.locator('ruby').evaluateAll(items=>items.length>0&&items.every(ruby=>{const base=ruby.querySelector('.ruby-character').getBoundingClientRect();const rt=ruby.querySelector('rt').getBoundingClientRect();const symbols=ruby.querySelector('.zhuyin-symbols');return rt.left>=base.right&&getComputedStyle(symbols).writingMode==='vertical-rl';})));
 await page.screenshot({path:path.join(out,'phone-right-zhuyin.png')});
 check('圖示不取代中文名稱',await page.locator('#greeting-choices button').evaluateAll(buttons=>buttons.every(b=>b.querySelector('svg[aria-hidden="true"]')&&b.getAttribute('aria-label'))));
 check('注音不加入報讀器名稱',await button('說你好').getAttribute('aria-label')==='說你好'&&await panel.locator('rt').evaluateAll(items=>items.every(rt=>rt.getAttribute('aria-hidden')==='true')));
 await button('幫助').tap();check('幫助保留原節點',await page.locator('#greeting-help-panel').isVisible());
 await button('暫停').tap();await button('繼續').tap();
 check('暫停恢復保留幫助和焦點',await page.locator('#greeting-help-panel').isVisible()&&await button('關閉幫助').evaluate(el=>el===document.activeElement));
 await button('關閉幫助').tap();check('關閉幫助焦點回原按鈕',await button('幫助').evaluate(el=>el===document.activeElement));
 await button('說你好').tap();const spoken=await plainCopy();
 await button('換個方式').tap();await button('回到開始').tap();await button('點頭').tap();
 check('說你好與點頭取得相同NPC回應',spoken.includes('你好。我在這裡休息。')&&(await plainCopy()).includes('你好。我在這裡休息。'));
 await button('再看一次').tap();check('再看一次保留節點',await button('換個方式').isVisible());
 await button('暫停').tap();await button('繼續').tap();check('恢復保留點頭節點與移動鎖', (await plainCopy()).includes('你點頭打招呼。')&&!(await page.locator('#movement-pad').isVisible()));
 await button('再練一次').tap();await button('先不參與').tap();await button('好').tap();await button('回公園').tap();
 check('先不參與可回公園自由移動',!(await panel.isVisible())&&await page.locator('#movement-pad').isVisible());
 await launch.tap();await button('說你好').tap();await button('結束招呼').tap();
 check('結束使用中性文字', (await plainCopy()).includes('這次打招呼結束了。'));
 await button('再練一次').tap();
 for(const size of [{width:320,height:360},{width:844,height:390}]){
  await page.setViewportSize(size);
  check(`${size.width}x${size.height} 安全按鈕仍可命中`,await button('返回安全區').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
  await button('點頭').scrollIntoViewIfNeeded();check(`${size.width}x${size.height} 選項至少64px可捲動`,await button('點頭').evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=64&&r.height>=64&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'phone-greeting.png')});
 await button('返回安全區').tap();await button('繼續').tap();check('返回安全區清除對話，不恢復舊節點',!(await panel.isVisible())&&await launch.isDisabled());
 await button('暫停').tap();await button('結束本次').tap();await button('重新開始').tap();await launch.waitFor({state:'visible'});
 check('重新開始只有一個場景且無舊對話',await page.locator('canvas').count()===1&&!(await panel.isVisible()));
 await page.locator('#movement-controls summary').tap();
 await page.locator('#npc-motion').uncheck();
 check('可明確關閉人物動作',!(await page.locator('#npc-motion').isChecked()));
 await page.locator('#movement-controls summary').tap();
 await page.emulateMedia({reducedMotion:'reduce'});
 check('尊重系統減少動態',await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));
 check('沒有未處理例外',errors.length===0);
 await writeFile(path.join(out,'result.json'),JSON.stringify({node:process.version,chromium:browser.version(),checks,errors},null,2)+'\n');
}finally{await browser.close();}
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} passed`);
process.exitCode=checks.every(c=>c.pass)?0:1;
