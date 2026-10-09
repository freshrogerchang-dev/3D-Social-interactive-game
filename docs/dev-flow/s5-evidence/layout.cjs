const fs=require('node:fs');
const {chromium}=require('/opt/codex/runtimes/cua/lib/node_modules/playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 console.log('Chromium '+browser.version());
 const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
 const css=fs.readFileSync(require('node:path').join(__dirname,'src/styles.css'),'utf8');
 for(const [w,h,size] of [[640,360,16],[320,568,16],[640,360,32],[320,568,32]]){
  const page=await browser.newPage({viewport:{width:w,height:h}});
  await page.setContent(html);await page.addStyleTag({content:css});
  await page.evaluate(s=>{
   document.documentElement.style.fontSize=s+'px';
   const overlay=document.getElementById('overlay');overlay.hidden=false;
   document.getElementById('status').textContent='';
   document.getElementById('overlay-title').textContent='休息一下';
   document.getElementById('overlay-text').textContent='畫面停住了。準備好再按「繼續」。';
   for(const a of ['resume','end'])document.querySelector('[data-action="'+a+'"]').hidden=false;
  },size);
  const result=await page.evaluate(()=>{
   const t=document.querySelector('.toolbar').getBoundingClientRect(),p=document.querySelector('.panel').getBoundingClientRect();
   const button=document.querySelector('[data-action="safety"]'),b=button.getBoundingClientRect();
   const mid=document.elementFromPoint(Math.min(innerWidth-1,b.x+b.width/2),Math.min(innerHeight-1,b.y+b.height/2));
   return {toolbarBottom:t.bottom,panelTop:p.top,overlap:t.bottom>p.top&&t.top<p.bottom,panelClippedTop:p.top<0,safetyWidth:b.width,safetyRight:b.right,viewport:innerWidth,safetyCenterHit:!!mid&&button.contains(mid),horizontalScroll:document.documentElement.scrollWidth>innerWidth};
  });
  console.log(JSON.stringify({viewport:[w,h],rootFontSize:size,...result}));
  await page.screenshot({path:'/tmp/s5-review/layout-'+w+'-'+h+'-'+size+'.png'});await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
