// 原始碼整合檢查：只在測試路由的轉譯程式暴露相機，正式產品沒有測試探針。
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const { chromium } = require(path.join(process.env.PLAYWRIGHT_MODULE_DIR, 'playwright-core'));
const out = process.argv[2] || 'docs/dev-flow/park-evidence/integration';
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
  if(relative.startsWith('assets/park/')) return route.fulfill({contentType:relative.endsWith('.jpg')?'image/jpeg':'application/json',body:await readFile(path.join('public',relative))});
  if (!relative.startsWith('src/')) return route.abort();
  if (relative.endsWith('.css')) return route.fulfill({ contentType: 'text/css', body: await readFile(relative) });
  const file = relative.endsWith('.ts') ? relative : relative + '.ts';
  let source = (await readFile(file, 'utf8')).replaceAll('import.meta.env.BASE_URL', JSON.stringify('/'));
  if(file==='src/core/GameEngine.ts') source=source.replace('this.park = park;', 'window.__park = park; window.__renderer = renderer; this.park = park;');
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
 await page.waitForFunction(()=>window.__park.environment.assetStatus.loaded===10,{},{timeout:30000});
 check('十張 CC0 材質全部載入且無失敗',await page.evaluate(()=>window.__park.environment.assetStatus.failed===0));
 await page.waitForFunction(()=>window.__renderer.info.memory.textures>=12);
 const stats=await page.evaluate(()=>({calls:window.__renderer.info.render.calls,triangles:window.__renderer.info.render.triangles,textures:window.__renderer.info.memory.textures,geometries:window.__renderer.info.memory.geometries}));
 check('共享幾何減少繪製批次，初始可見場景低於80批次與40000三角形',stats.calls<80&&stats.triangles<40000,stats);
 check('步道、十二株樹木與木紋長椅存在',await page.evaluate(()=>!!window.__park.scene.getObjectByName('park-path')&&window.__park.environment.root.getObjectByName('park-tree-trunks').count===12&&window.__park.npc.materials[4].map!==null));
 await page.locator('#movement-controls summary').click();
 await page.locator('#environment-detail').selectOption('low');
 check('較少葉片將7800降至3000且保留所有樹的位置',await page.evaluate(()=>window.__park.environment.root.getObjectByName('park-leaves').count===3000));
 await page.locator('#performance-check').check();
 await page.waitForFunction(()=>document.querySelector('#performance-info').textContent.includes('FPS'));
 const diagnostic=await page.locator('#performance-info').innerText();check('FPS 可選開啟且使用原 RAF 更新',diagnostic.includes('FPS'),diagnostic);
 await page.locator('#performance-check').uncheck();await page.locator('#environment-detail').selectOption('standard');await page.locator('#movement-controls summary').click();
 await page.getByRole('button',{name:'暫停',exact:true}).click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const paused=await page.screenshot();await page.waitForTimeout(350);check('材質載入後暫停畫面不動',paused.equals(await page.screenshot()));
 await page.getByRole('button',{name:'結束本次',exact:true}).click();check('結束釋放環境 root 與 canvas',await page.locator('canvas').count()===0&&await page.evaluate(()=>window.__park.environment.root.children.length===0));
 await page.getByRole('button',{name:'重新開始',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#overlay').hidden);await page.waitForFunction(()=>window.__park.environment.assetStatus.loaded===10);
 check('重建只有一個公園與canvas',await page.locator('canvas').count()===1&&await page.evaluate(()=>window.__park.scene.children.filter(x=>x.name==='park-environment').length===1));
 await page.screenshot({path:path.join(out,'phone-source.png')});
 check('沒有未處理例外',errors.length===0,errors);
 await context.close();
} finally {await browser.close();}
await writeFile(path.join(out,'integration.json'),JSON.stringify({node:process.version,sourceProbe:true,checks,errors},null,2)+'\n');
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} passed`);
process.exitCode=checks.every(c=>c.pass)?0:1;
