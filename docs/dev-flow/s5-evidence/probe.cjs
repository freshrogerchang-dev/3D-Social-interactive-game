const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {stripTypeScriptTypes} = require('node:module');
const source = fs.readFileSync(require('node:path').join(__dirname,'src/main.ts'),'utf8').replace(/^import .*;\n/gm,'');
const code = stripTypeScriptTypes(source,{mode:'transform'});
async function probe(kind) {
  const docEvents = {}, winEvents = {}, instances = [], views = [];
  let actions, resolve;
  const stage = {append(){},getBoundingClientRect(){return {width:800,height:600}}};
  const document = {visibilityState:kind==='initially-hidden'?'hidden':'visible', getElementById(id){return id==='stage'?stage:{}},createElement(){return {remove(){}}},addEventListener(k,f){docEvents[k]=f}};
  class GameEngine {
    constructor(options){this.options=options;this.state='new';this.startCount=0;instances.push(this)}
    resize(){}
    init(){this.state='initializing';return new Promise(r=>{resolve=()=>{this.state=kind==='error'?'error':'ready';this.options.onStateChange();r({ok:kind!=='error'})}})}
    start(){this.startCount++;this.state='running';this.options.onStateChange()}
    pause(){if(this.state!=='running')return false;this.state='paused';this.options.onStateChange();return true}
    dispose(){this.state='disposed'}
    handleVisibilityChange(hidden){if(hidden)this.pause()}
  }
  class SafetyUI {attach(a){actions=a}render(v){views.push(v)}}
  vm.runInNewContext(code,{document,window:{addEventListener(k,f){winEvents[k]=f}},GameEngine,SafetyUI,ResizeObserver:class {observe(){}},console});
  if(kind==='hidden'){document.visibilityState='hidden';docEvents.visibilitychange()}
  resolve();await new Promise(r=>setImmediate(r));
  if(kind==='error'){actions.pause();assert.equal(views.at(-1),'error');console.log('REPRODUCED error + pause leaves error view')}
  else {assert.equal(instances[0].state,'running');assert.equal(instances[0].startCount,1);console.log('REPRODUCED '+kind+' still starts running')}
}
(async()=>{await probe('initially-hidden');await probe('hidden');await probe('error')})().catch(e=>{console.error(e);process.exitCode=1});
