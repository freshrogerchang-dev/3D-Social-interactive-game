import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(`${process.env.PLAYWRIGHT_MODULE_DIR}/`);
const {chromium}=require('playwright-core');
const out=process.argv[2]||'docs/dev-flow/park-evidence/fallback';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const checks=[];const check=(name,pass)=>{checks.push({name,pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
try {
 for(const mode of ['missing','late']) {
  const context=await browser.newContext({viewport:{width:390,height:844}});let release;const gate=new Promise(r=>{release=r;});let requests=0;
  await context.route('**/*',async route=>{
   const relative=new URL(route.request().url()).pathname.slice(1)||'index.html';
   if(relative.endsWith('.jpg')){requests++;if(mode==='missing')return route.fulfill({status:404,body:'missing texture'});await gate;}
   const file=path.resolve('dist',relative);if(!file.startsWith(path.resolve('dist')+path.sep))return route.abort();
   try{await route.fulfill({body:await readFile(file),contentType:relative.endsWith('.js')?'text/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.jpg')?'image/jpeg':'text/html'});}catch{await route.abort();}
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://park.local/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('canvas')&&document.querySelector('#overlay').hidden);
  for(let i=0;i<20&&requests<10;i++)await page.waitForTimeout(50);
  check(`${mode}：安全操作不等待十張材質`,requests===10&&await page.getByRole('button',{name:'暫停',exact:true}).isVisible());
  await page.getByRole('button',{name:'暫停',exact:true}).click();await page.getByRole('button',{name:'結束本次',exact:true}).click();release();await page.waitForLoadState('networkidle');
  check(`${mode}：失敗或晚到貼圖不重建已結束場景`,await page.locator('canvas').count()===0&&await page.getByRole('heading',{name:'本次練習結束了'}).isVisible());
  check(`${mode}：沒有未處理例外`,errors.length===0);await context.close();
 }
}finally{await browser.close();}
await writeFile(path.join(out,'result.json'),JSON.stringify({node:process.version,checks},null,2)+'\n');console.log(`${checks.filter(x=>x.pass).length}/${checks.length} passed`);process.exitCode=checks.every(x=>x.pass)?0:1;
