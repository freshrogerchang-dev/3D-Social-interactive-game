// 正式 dist／公開 Pages 生活練習驗證；不注入引擎或相機，不啟動伺服器。
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const { chromium } = require('playwright-core');
const out=process.argv[2]||'/tmp/life-evidence'; await mkdir(out,{recursive:true});
const checks=[];const check=(name,pass,detail='')=>{checks.push({name,pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name}${detail?' '+detail:''}`);};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.LIFE_URL&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
 if(!process.env.LIFE_URL)await context.route('**/*',async route=>{
  const relative=new URL(route.request().url()).pathname.slice(1)||'index.html';const target=path.resolve('dist',relative);
  if(!target.startsWith(path.resolve('dist')+path.sep))return route.abort();
  const types={js:'text/javascript',css:'text/css',jpg:'image/jpeg',json:'application/json',svg:'image/svg+xml'};
  try{await route.fulfill({body:await readFile(target),contentType:types[relative.split('.').pop()]||'text/html'});}catch{await route.fulfill({status:404,body:''});}
 });
 await context.addInitScript(()=>{
  window.__lifeSpoken=[];window.__lifeCancelled=0;
  speechSynthesis.speak=u=>window.__lifeSpoken.push(u.text);
  speechSynthesis.cancel=()=>{window.__lifeCancelled++;};
 });
 const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(process.env.LIFE_URL||'http://life.local/',{waitUntil:'networkidle'});
 const button=name=>page.getByRole('button',{name,exact:true});
 const panel=page.locator('#greeting-panel');const launch=page.locator('#practice-launch');
 const plain=()=>page.locator('#greeting-copy').evaluate(el=>{const c=el.cloneNode(true);c.querySelectorAll('rt').forEach(x=>x.remove());return c.textContent.replace(/\s+/g,'');});
 const act=async(...names)=>{for(const name of names)await button(name).tap();};
 const pictureReady=()=>page.waitForFunction(()=>{const p=document.querySelector('#practice-picture');return !p.hidden&&p.complete&&p.naturalWidth>0;});
 await launch.waitFor({state:'visible'});
 check('公園保留七位人物，生活情境不自動開啟',!(await panel.isVisible())&&await page.locator('canvas').count()===1);
 for(const size of [{width:390,height:844},{width:320,height:360},{width:844,height:390}]){
  await page.setViewportSize(size);check(`${size.width}x${size.height} 生活入口可命中且至少64px`,await launch.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=64&&r.height>=64&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
 }
 await page.setViewportSize({width:390,height:844});await launch.tap();
 check('主動開啟才顯示三個選項並停止移動',await button('過馬路').isVisible()&&await button('外出吃飯').isVisible()&&await button('上廁所').isVisible()&&!(await page.locator('#movement-pad').isVisible()));
 await act('過馬路');await pictureReady();check('過馬路有可讀取的示意圖',await page.locator('#practice-picture').getAttribute('src').then(s=>s.endsWith('/crossing.svg')));
 await act('牽手','看看號誌');await pictureReady();check('綠燈仍要確認車輛停讓，圖文一致',(await plain()).includes('還要確認車輛停讓。')&&(await page.locator('#practice-picture').getAttribute('src')).endsWith('crossing-green.svg'));
 await act('車還在動');check('車輛未停讓時留在人行道',(await plain()).includes('留在人行道等車停讓。'));
 await act('幫助','暫停');check('暫停收起生活面板與入口',!(await panel.isVisible())&&!(await launch.isVisible()));
 await act('繼續');check('恢復保留原幫助與焦點',await page.locator('#greeting-help-panel').isVisible()&&await button('關閉幫助').evaluate(el=>el===document.activeElement));
 await act('關閉幫助');check('關閉幫助回原節點和按鈕',(await plain()).includes('留在人行道等車停讓。')&&await button('幫助').evaluate(el=>el===document.activeElement));
 await act('再確認','車停讓了','到了對面');check('手動走完整個過馬路流程',(await plain()).includes('你們一起走到對面。'));
 await act('再練一次','不想牽手','說不舒服');check('不想牽手獲得協助，不直接過馬路',(await plain()).includes('現在先留在人行道。')&&!(await button('到了對面').isVisible()));
 await act('換個情境','外出吃飯','不舒服','想鑽桌下');await pictureReady();
 check('桌下路徑先提供安全位置與需求選項',(await plain()).includes('想安靜或活動都能說。')&&await button('想安靜').isVisible());
 await page.screenshot({path:path.join(out,'dining.png')});
 await act('想安靜','出去休息','結束練習');check('表達想活動也能中性結束',(await plain()).includes('你說出了現在的需要。'));
 await act('再練一次','不舒服','東西掉了');check('掉物可請照顧者撿拾',(await plain()).includes('先留在位置，請大人幫忙。'));
 await act('回座位','想上廁所');await pictureReady();check('用餐可直接接到廁所，換對應示意圖',(await plain()).includes('我陪你找廁所')&&(await page.locator('#practice-picture').getAttribute('src')).endsWith('/toilet.svg'));
 await act('找標誌','到廁所了','結束練習','再練一次','已尿濕了','請幫幫我');
 check('尿濕後換衣與隱私協助，沒有羞辱',(await plain()).includes('找有隱私的地方處理。'));
 await page.screenshot({path:path.join(out,'toilet.png')});
 await act('結束練習','再練一次','廁所可怕','沖水太吵','請幫幫我');check('怕聲音可以求助，不強迫繼續',(await plain()).includes('可以幫忙找位置或衣物。'));
 await act('先不參與','回公園');check('先不參與回公園，恢復圓盤並回到生活入口焦點',!(await panel.isVisible())&&await page.locator('#movement-pad').isVisible()&&await launch.evaluate(el=>el===document.activeElement));
 await launch.tap();await act('上廁所','不太確定');check('不確定也可以表達需要',(await plain()).includes('可以請媽媽陪你去看看。'));
 check('語音不用播完也能操作，切節點取消舊播報',await page.evaluate(()=>window.__lifeSpoken.includes('不確定也可以說。')&&window.__lifeCancelled>10));
 for(const size of [{width:320,height:360},{width:844,height:390}]){
  await page.setViewportSize(size);await button('請幫幫我').scrollIntoViewIfNeeded();
  check(`${size.width}x${size.height} 選項可捲到且至少64px`,await button('請幫幫我').evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=64&&r.height>=64&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
  check(`${size.width}x${size.height} 安全控制不被面板遮擋`,await button('返回安全區').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
 }
 await page.setViewportSize({width:390,height:844});await act('返回安全區','繼續');check('安全區退出後不恢復舊情境',!(await panel.isVisible()));
 await launch.tap();await act('過馬路');await pictureReady();await page.screenshot({path:path.join(out,'crossing.png')});
 await page.evaluate(()=>document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
 await page.locator('#overlay').waitFor({state:'visible'});check('情境中 WebGL context lost 仍可安全暫停',!(await panel.isVisible())&&await button('暫停').isVisible());
 await act('返回安全區');check('WebGL 出錯仍可返回安全區',!(await panel.isVisible())&&await page.locator('canvas').count()===0);
 await act('重新開始');await launch.waitFor({state:'visible'});await launch.tap();check('重建只有一個場景，生活練習從選單開始',await page.locator('canvas').count()===1&&await button('外出吃飯').isVisible());
 check('無未處理例外',errors.length===0,JSON.stringify(errors));
 await writeFile(path.join(out,'result.json'),JSON.stringify({node:process.version,chromium:browser.version(),url:process.env.LIFE_URL||'local dist',checks},null,2)+'\n');
}finally{await browser.close();}
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} passed`);process.exitCode=checks.every(c=>c.pass)?0:1;
