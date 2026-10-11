// 原始碼整合檢查：只在測試路由的轉譯程式暴露相機，正式產品沒有測試探針。
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const { chromium } = require(path.join(process.env.PLAYWRIGHT_MODULE_DIR, 'playwright-core'));
const out = process.argv[2] || 'docs/dev-flow/joystick-evidence';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, headless: true, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const checks = []; const errors = [];
const check = (name, pass, evidence) => { checks.push({ name, pass, evidence }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); };
try {
 const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
 await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.pathname === '/') {
   let html = await readFile('index.html', 'utf8');
   html = html.replace('</head>', '<link rel="stylesheet" href="/src/styles.css"><script type="importmap">{"imports":{"three":"/three/three.module.js"}}</script></head>');
   return route.fulfill({ contentType: 'text/html', body: html });
  }
  if (url.pathname.startsWith('/three/')) return route.fulfill({ contentType: 'text/javascript', body: await readFile(path.join('node_modules/three/build', path.basename(url.pathname))) });
  const relative = url.pathname.slice(1);
  if (!relative.startsWith('src/')) return route.abort();
  if (relative.endsWith('.css')) return route.fulfill({ contentType: 'text/css', body: await readFile(relative) });
  const file = relative.endsWith('.ts') ? relative : relative + '.ts';
  let source = await readFile(file, 'utf8');
  if (file === 'src/main.ts') source = source.replace("import './styles.css';", '');
  if (file === 'src/input/FirstPersonController.ts') source = source.replace('this.syncCamera();', 'window.__p2 = { camera: this.camera, controller: this }; this.syncCamera();');
  if (file === 'src/npc/SeatedNPC.ts') source = source.replace("this.root.name =", "window.__npcProbe = this; this.root.name =");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return route.fulfill({ contentType: 'text/javascript', body: compiled });
 });
 const page = await context.newPage();
 page.on('pageerror', e => errors.push(String(e)));
 await page.goto('http://phase2.local/', { waitUntil: 'networkidle' });
 await page.waitForFunction(() => window.__p2 && document.querySelector('#overlay').hidden);
 const pad=page.locator('#movement-pad');
 const reset=async()=>page.evaluate(()=>{const {camera,controller}=window.__p2;camera.position.set(0,1.1,3.5);camera.rotation.set(0,0,0);controller.syncCamera();});
 const pose=()=>page.evaluate(()=>window.__p2.camera.position.toArray());
 const step=()=>page.evaluate(()=>{for(let i=0;i<60;i++)window.__p2.controller.update(1/60);});
 const box=await pad.boundingBox();const cx=box.x+box.width/2,cy=box.y+box.height/2;
 check('同心圓、整圓盤192px且無分割按鈕',box.width===192&&box.height===192&&await pad.locator('button').count()===0&&await pad.locator('.pad-ring,.pad-thumb').count()===2);
 let longest=0,shortest=100;
 for(const [dx,dy] of [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]]) {
  await reset();const before=await pose();await page.mouse.move(cx+dx*48,cy+dy*48);await page.mouse.down();await step();const after=await pose();await page.mouse.up();
  const x=after[0]-before[0],z=after[2]-before[2],distance=Math.hypot(x,z);longest=Math.max(longest,distance);shortest=Math.min(shortest,distance);
  check(`方向 ${dx},${dy} 含斜向可移動且不轉鏡頭`,distance>.75&&(dx===0?Math.abs(x)<.01:x*dx>0)&&(dy===0?Math.abs(z)<.01:z*dy>0)&&await page.evaluate(()=>Math.abs(window.__p2.camera.rotation.y)<.001),{x,z,distance});
 }
 check('斜向不比直向加速',longest-shortest<.1,{longest,shortest});
 await reset();await page.mouse.move(cx,cy);await page.mouse.down();await step();check('中心停止區不移動',JSON.stringify(await pose())==='[0,1.1,3.5]');await page.mouse.up();
 await page.mouse.move(cx+40,cy-40);await page.mouse.down();await page.mouse.move(cx+220,cy-180);await step();check('拖出圓盤仍保持捕捉且旋鈕限制在圓內',await page.evaluate(()=>window.__p2.camera.position.x>.5)&&await pad.evaluate(el=>Math.hypot(parseFloat(el.style.getPropertyValue('--stick-x')),parseFloat(el.style.getPropertyValue('--stick-y')))<=56.01));
 await page.mouse.up();const released=await pose();await step();check('放開立即停止並回到同心位置',JSON.stringify(released)===JSON.stringify(await pose())&&await pad.evaluate(el=>!el.style.getPropertyValue('--stick-x')));
 await page.mouse.move(cx+40,cy);await page.mouse.down();await pad.dispatchEvent('pointercancel',{pointerId:1});const cancelled=await pose();await step();check('pointercancel 清掉持續移動',JSON.stringify(cancelled)===JSON.stringify(await pose()));await page.mouse.up();
 await page.mouse.move(cx+40,cy);await page.mouse.down();await page.evaluate(()=>document.querySelector('[data-action="pause"]').click());await page.mouse.up();check('按住時暫停隱藏搖桿',!(await pad.isVisible()));
 await page.getByRole('button',{name:'繼續',exact:true}).click();const resumed=await pose();await step();check('恢復不沿用舊搖桿方向',JSON.stringify(resumed)===JSON.stringify(await pose()));
 await page.locator('#movement-controls summary').click();check('設定保留七個64px單次按鈕',await page.locator('[data-move]').count()===7&&await page.locator('[data-move]').evaluateAll(els=>els.every(el=>el.getBoundingClientRect().height>=64)));
 await page.getByRole('button',{name:'向左看',exact:true}).click();await page.getByRole('button',{name:'停止移動',exact:true}).click();await page.locator('#movement-controls summary').click();
 await page.getByRole('button',{name:'返回安全區',exact:true}).click();await page.getByRole('button',{name:'繼續',exact:true}).click();await page.screenshot({path:path.join(out,'phone-joystick.png')});
 check('沒有未處理例外',errors.length===0,errors);
 await context.close();
} finally {await browser.close();}
await writeFile(path.join(out,'integration.json'),JSON.stringify({node:process.version,sourceProbe:true,checks,errors},null,2)+'\n');
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} passed`);
process.exitCode=checks.every(c=>c.pass)?0:1;
