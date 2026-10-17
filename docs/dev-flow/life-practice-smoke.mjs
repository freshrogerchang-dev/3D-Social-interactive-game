// 發布整合與入口排版檢查；LIFE_URL 未設定時服務本地 dist。
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const {chromium}=require('playwright-core');
const out=process.argv[2]||'/tmp/life-smoke';await mkdir(out,{recursive:true});
const checks=[];const check=(name,pass)=>{checks.push({name,pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.LIFE_URL&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
 if(!process.env.LIFE_URL)await context.route('**/*',async route=>{
  const rel=new URL(route.request().url()).pathname.slice(1)||'index.html';const target=path.resolve('dist',rel);
  if(!target.startsWith(path.resolve('dist')+path.sep))return route.abort();
  const types={js:'text/javascript',css:'text/css',jpg:'image/jpeg',svg:'image/svg+xml',json:'application/json'};
  try{await route.fulfill({body:await readFile(target),contentType:types[rel.split('.').pop()]||'text/html'});}catch{await route.fulfill({status:404,body:''});}
 });
 const page=await context.newPage();const errors=[];const loaded=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.url().includes('/assets/practice/'))loaded.push({url:r.url(),status:r.status()});});
 await page.goto(process.env.LIFE_URL||'http://life-smoke.local/',{waitUntil:'networkidle'});
 const button=name=>page.getByRole('button',{name,exact:true});const launch=page.locator('#practice-launch');
 const hit=el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));};
 await launch.waitFor({state:'visible'});await launch.tap();await page.screenshot({path:path.join(out,'menu.png')});
 for(const [label,setting]of[['過馬路','crossing'],['外出吃飯','dining'],['上廁所','toilet']]){
  await button(label).tap();await page.waitForFunction(()=>{const p=document.querySelector('#practice-picture');return p.complete&&p.naturalWidth>0&&!p.hidden;});
  check(`${label} 的正式頁面與插圖可載入`,await page.locator('#greeting-panel').getAttribute('data-practice')===setting);
  await page.screenshot({path:path.join(out,`${setting}.png`)});
  await button('返回安全區').tap();await button('繼續').tap();
  check(`${label} 退出後恢復操作`,await launch.isVisible()&&await page.locator('#movement-pad').isVisible());await launch.tap();
 }
 await button('過馬路').tap();await button('先不參與').tap();await button('回公園').tap();
 await page.locator('#movement-controls summary').tap();await page.locator('#performance-check').check();await page.locator('#movement-controls summary').tap();
 for(const size of[{width:320,height:360},{width:844,height:390}]){
  await page.setViewportSize(size);await page.waitForTimeout(200);
  check(`${size.width}x${size.height} 開啟FPS後生活入口可命中`,await launch.evaluate(hit));
  await page.screenshot({path:path.join(out,`fps-${size.width}.png`)});
 }
 await page.evaluate(()=>fetch(new URL('assets/practice/crossing-green.svg',document.baseURI)).then(r=>r.text()));
 check('插圖資源 HTTP 200',loaded.length>=4&&loaded.every(r=>r.status===200));
 check('無未處理例外',errors.length===0);
 await writeFile(path.join(out,'result.json'),JSON.stringify({node:process.version,chromium:browser.version(),url:process.env.LIFE_URL||'local dist',checks,loaded,errors},null,2)+'\n');
}finally{await browser.close();}
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} passed`);process.exitCode=checks.every(c=>c.pass)?0:1;
