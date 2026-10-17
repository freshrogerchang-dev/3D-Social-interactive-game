// 三個新生活情境的正式 dist／Pages 驗證；不注入引擎，不播放刺激聲音。
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);const {chromium}=require('playwright-core');
const out=process.argv[2]||'/tmp/support-evidence';await mkdir(out,{recursive:true});
const checks=[];const check=(name,pass)=>{checks.push({name,pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.SUPPORT_URL&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
 if(!process.env.SUPPORT_URL)await context.route('**/*',async route=>{
  const rel=new URL(route.request().url()).pathname.slice(1)||'index.html';const target=path.resolve('dist',rel);if(!target.startsWith(path.resolve('dist')+path.sep))return route.abort();
  const types={js:'text/javascript',css:'text/css',jpg:'image/jpeg',json:'application/json',svg:'image/svg+xml'};
  try{await route.fulfill({body:await readFile(target),contentType:types[rel.split('.').pop()]||'text/html'});}catch{await route.fulfill({status:404,body:''});}
 });
 await context.addInitScript(()=>{window.__supportSpoken=[];window.__supportCancelled=0;speechSynthesis.speak=u=>window.__supportSpoken.push(u.text);speechSynthesis.cancel=()=>window.__supportCancelled++;});
 const page=await context.newPage();const errors=[];const illustrations=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(/(sensory|boundary|changes)\.svg/.test(r.url()))illustrations.push({url:r.url(),status:r.status()});});
 await page.goto(process.env.SUPPORT_URL||'http://support.local/',{waitUntil:'networkidle'});
 const button=name=>page.getByRole('button',{name,exact:true});const panel=page.locator('#greeting-panel');const launch=page.locator('#practice-launch');
 const act=async(...names)=>{for(const n of names)await button(n).tap();};
 const text=()=>page.locator('#greeting-copy').evaluate(el=>{const c=el.cloneNode(true);c.querySelectorAll('rt').forEach(x=>x.remove());return c.textContent.replace(/\s+/g,'');});
 const capture=async setting=>{await page.waitForFunction(()=>{const p=document.querySelector('#practice-picture');return p.complete&&p.naturalWidth>0&&!p.hidden;});check(`${setting} 示意圖與節點一致`,await panel.getAttribute('data-practice')===setting);await page.screenshot({path:path.join(out,`${setting}.png`)});};
 await launch.waitFor({state:'visible'});check('新情境不會自動開始',!(await panel.isVisible()));await launch.tap();await act('更多情境');
 check('第二頁列出三個新情境與上一頁',await button('太吵人多').isVisible()&&await button('身體界線').isVisible()&&await button('計畫改變').isVisible()&&await button('上一頁').isVisible());
 await act('上一頁');check('可以回到原三個情境',await button('過馬路').isVisible()&&await button('外出吃飯').isVisible()&&await button('上廁所').isVisible());
 await act('更多情境','太吵人多');await capture('sensory');
 await act('用手指','熟悉輔具','試看看','還不舒服');check('輔具仍不舒服可以離開',(await text()).includes('先到安全、安靜的位置。'));
 await act('先休息');check('休息不要求返回人群',(await text()).includes('可以先不回去。'));await act('結束練習','換個情境','身體界線');await capture('boundary');
 await act('說不要');check('拒絕後對方保持距離',(await text()).includes('對方停下，保持距離。'));
 await act('幫助','暫停');check('暫停仍隱藏情境並保留安全介面',!(await panel.isVisible())&&await button('繼續').isVisible());await act('繼續');
 check('恢復保留幫助與焦點',await page.locator('#greeting-help-panel').isVisible()&&await button('關閉幫助').evaluate(el=>el===document.activeElement));await act('關閉幫助');
 check('關閉幫助回到原按鈕',await button('幫助').evaluate(el=>el===document.activeElement));await act('如果沒停','先離開');check('對方沒停可求助與拉開距離',(await text()).includes('照顧者協助到安全位置。'));
 await act('結束練習','再練一次','揮手代替');check('揮手代替也受到尊重',(await text()).includes('對方接受你的選擇。'));await act('結束練習','換個情境','計畫改變');await capture('changes');
 await act('餐點賣完','先不買');check('不買也能中性結束',(await text()).includes('你選擇了現在的做法。'));await act('再練一次','下雨了','說失望');
 check('下雨可說失望，不要求開心',(await text()).includes('不必馬上變得開心。'));await act('先休息','結束練習','再練一次','遊具維修','問下一步','先不決定');
 check('遊具維修可暫不決定',(await text()).includes('不用現在決定。'));
 check('語音未唸完仍能選擇且舊播報取消',await page.evaluate(()=>window.__supportSpoken.includes('不用現在決定。')&&window.__supportCancelled>10));
 for(const size of[{width:320,height:360},{width:844,height:390}]){
  await page.setViewportSize(size);await button('看看選擇').scrollIntoViewIfNeeded();
  check(`${size.width}x${size.height} 選項至少64px且可捲動命中`,await button('看看選擇').evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=64&&r.height>=64&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
  check(`${size.width}x${size.height} 安全按鈕可命中`,await button('返回安全區').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
 }
 await page.setViewportSize({width:390,height:844});await act('先不參與','回公園');check('跳過後恢復圓盤與入口焦點',await page.locator('#movement-pad').isVisible()&&await launch.evaluate(el=>el===document.activeElement));
 await launch.tap();await act('更多情境','身體界線','返回安全區','繼續');check('安全區退出不恢復舊節點',!(await panel.isVisible()));await launch.tap();check('重新開啟仍從首頁選單開始',await button('過馬路').isVisible());
 check('三張新插圖HTTP200',new Set(illustrations.map(r=>r.url)).size===3&&illustrations.every(r=>r.status===200));check('無未處理例外',errors.length===0);
 await writeFile(path.join(out,'result.json'),JSON.stringify({node:process.version,chromium:browser.version(),url:process.env.SUPPORT_URL||'local dist',checks,illustrations,errors},null,2)+'\n');
}finally{await browser.close();}
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} passed`);process.exitCode=checks.every(c=>c.pass)?0:1;
