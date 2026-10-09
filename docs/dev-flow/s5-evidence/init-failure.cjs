const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const input=fs.readFileSync(require('node:path').join(__dirname,'src/core/GameEngine.ts'),'utf8').replace(/^import .*;\n/gm,'');
const js=stripTypeScriptTypes(input,{mode:'transform'}).replace(/^export /gm,'');
const context={RenderLoop:class {stop(){}},ParkScene:class {dispose(){}resize(){}},DEFAULT_SETTINGS:{maxPixelRatio:2},console};
vm.createContext(context);vm.runInContext(js+'\nglobalThis.TestEngine=GameEngine;',context);
(async()=>{
 const errors=[];
 const engine=new context.TestEngine({rendererFactory:()=>({setPixelRatio(){},setSize(){throw Error('injected setSize failure')},render(){},dispose(){}}),getDevicePixelRatio:()=>1,onError:(reason)=>errors.push(reason)});
 engine.resize(800,600);
 await assert.rejects(engine.init({addEventListener(){}}),/injected setSize failure/);
 assert.equal(engine.state,'ready');assert.equal(errors.length,0);
 console.log('REPRODUCED resize failure rejects init while state remains ready and onError is not called');
})().catch(e=>{console.error(e);process.exitCode=1});
