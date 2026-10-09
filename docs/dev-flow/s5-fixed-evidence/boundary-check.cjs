const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const root = require('node:path').resolve(__dirname, '../../..');
function source(path) {
  return stripTypeScriptTypes(fs.readFileSync(root+'/'+path,'utf8').replace(/^import .*;\n/gm,''),{mode:'transform'}).replace(/^export /gm,'');
}
let count=0;
async function mainCase(kind) {
  const docEvents={}, winEvents={}, views=[], engines=[], canvases=new Set();
  let actions;
  const doc={visibilityState:kind==='initial-hidden'?'hidden':'visible',addEventListener(k,f){docEvents[k]=f},getElementById(id){return id==='stage'?{append(c){canvases.add(c)},getBoundingClientRect(){return {width:800,height:600}}}:{}},createElement(){const c={remove(){canvases.delete(c)}};return c}};
  class Engine {
    constructor(opts){this.opts=opts;this.state='new';this.starts=0;engines.push(this)}
    resize(){}
    init(){this.state='initializing';this.opts.onStateChange();return new Promise((res,rej)=>{this.reject=rej;this.complete=()=>{if(this.state==='disposed'){res({ok:false,reason:'disposed'});return;}this.state=kind==='error'?'error':'ready';this.opts.onStateChange();res({ok:kind!=='error'})}})}
    start(){this.starts++;this.state='running';this.opts.onStateChange()}
    pause(){if(this.state!=='running')return false;this.state='paused';this.opts.onStateChange();return true}
    resume(){if(this.state!=='paused')return false;this.start();return true}
    dispose(){this.state='disposed'}
  }
  class UI {attach(a){actions=a}render(v){views.push(v)}}
  vm.runInNewContext(source('src/main.ts'),{document:doc,window:{addEventListener(k,f){winEvents[k]=f}},GameEngine:Engine,SafetyUI:UI,ResizeObserver:class {observe(){}},console:{error(){}}});
  if(kind==='initial-hidden') {
    assert.equal(engines.length,0);assert.equal(views.at(-1),'rest');
    doc.visibilityState='visible';docEvents.visibilitychange();assert.equal(engines.length,0);
    actions.restart();engines[0].complete();await new Promise(r=>setImmediate(r));assert.equal(engines[0].starts,1);
  } else {
    const e=engines[0];
    if(kind==='hidden-event'){doc.visibilityState='hidden';docEvents.visibilitychange()}
    if(kind==='pagehide')winEvents.pagehide();
    if(kind==='hidden-no-event')doc.visibilityState='hidden';
    if(kind==='rejection')e.reject(Error('injected init rejection'));else e.complete();
    await new Promise(r=>setImmediate(r));
    if(['hidden-event','pagehide','hidden-no-event'].includes(kind)){assert.equal(e.starts,0);assert.equal(e.state,'disposed');assert.equal(views.at(-1),'rest');assert.equal(canvases.size,0);doc.visibilityState='visible';docEvents.visibilitychange();assert.equal(e.starts,0)}
    if(kind==='error'){assert.equal(views.at(-1),'error');actions.pause();assert.equal(e.state,'disposed');assert.equal(views.at(-1),'rest');assert.equal(canvases.size,0)}
    if(kind==='rejection'){assert.equal(views.at(-1),'error');assert.equal(canvases.size,0);actions.pause();assert.equal(views.at(-1),'rest');actions.safety();assert.equal(views.at(-1),'safety-rest')}
    if(kind==='normal'){assert.equal(e.starts,1);doc.visibilityState='hidden';docEvents.visibilitychange();assert.equal(e.state,'paused');doc.visibilityState='visible';docEvents.visibilitychange();assert.equal(e.starts,1);actions.resume();assert.equal(e.starts,2)}
  }
  count++;console.log('PASS main '+kind);
}
async function coreCase(method) {
  const parks=[], errors=[], pending=new Map();let next=0,disposed=0;
  class Park {constructor(){parks.push(this);this.scene={};this.camera={};this.disposed=0}resize(){}dispose(){this.disposed++}}
  const context={ParkScene:Park,DEFAULT_SETTINGS:{maxPixelRatio:2},requestAnimationFrame(){throw Error('unexpected RAF')},cancelAnimationFrame(){}};
  vm.createContext(context);vm.runInContext(source('src/core/RenderLoop.ts')+'\n'+source('src/core/GameEngine.ts')+'\nglobalThis.Engine=GameEngine;',context);
  const renderer={setPixelRatio(){},setSize(){},render(){},dispose(){disposed++}};
  renderer[method]=()=>{throw Error('injected '+method)};
  const engine=new context.Engine({rendererFactory:()=>renderer,getDevicePixelRatio:()=>1,scheduler:{request(cb){pending.set(++next,cb);return next},cancel(id){pending.delete(id)}},onError:(reason)=>errors.push(reason)});
  engine.resize(800,600);const canvas=new EventTarget();const result=await engine.init(canvas);
  assert.equal(result.ok,false);assert.equal(result.reason,'failed');assert.equal(engine.state,'error');assert.equal(disposed,1);assert.equal(parks[0].disposed,1);assert.equal(pending.size,0);assert.equal(errors.length,1);
  canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));assert.equal(errors.length,1);
  engine.dispose();assert.equal(disposed,1);assert.equal(parks[0].disposed,1);
  count++;console.log('PASS core '+method+' failure cleanup');
}
(async()=>{for(const kind of ['normal','initial-hidden','hidden-event','pagehide','hidden-no-event','error','rejection'])await mainCase(kind);for(const method of ['setPixelRatio','setSize','render'])await coreCase(method);console.log(count+'/'+count+' boundary cases passed (Node '+process.version+', isolated mocks; not Vitest)')})().catch(e=>{console.error(e);process.exitCode=1});
