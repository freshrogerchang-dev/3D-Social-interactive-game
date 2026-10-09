// S5 例外邊界重現。使用專案 TypeScript 轉譯原始 core，不改產品程式。
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const baseline = process.argv.includes('--baseline');
const ts = require(path.join(root, 'node_modules/typescript'));
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 's5-runtime-proof-'));
function compile(directory) {
  for (const entry of fs.readdirSync(path.join(root, 'src', directory), { withFileTypes: true })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) compile(relative);
    else if (entry.name.endsWith('.ts')) {
      const target = path.join(scratch, relative.replace(/\.ts$/, '.js'));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, ts.transpileModule((baseline ? require('node:child_process').execFileSync('git', ['show', `ab28b9a:src/${relative}`], { cwd: root, encoding: 'utf8' }) : fs.readFileSync(path.join(root, 'src', relative), 'utf8')), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
    }
  }
}
compile('core'); compile('scene');
fs.symlinkSync(path.join(root, 'node_modules'), path.join(scratch, 'node_modules'));
(async () => {
  try {
    const { GameEngine } = require(path.join(scratch, 'core/GameEngine.js'));
    for (const phase of ['frame', 'resize', 'safety']) {
      const pending = new Map(); let next = 0; let throws = false;
      const errors = []; const renderer = { setPixelRatio() {}, setSize() { if (throws && phase === 'resize') throw new Error('injected resize'); }, render() { if (throws && phase !== 'resize') throw new Error('injected render'); }, dispose() {} };
      const engine = new GameEngine({ rendererFactory: () => renderer, getDevicePixelRatio: () => 1, scheduler: { request(cb) { pending.set(++next, cb); return next; }, cancel(id) { pending.delete(id); } }, onError(reason) { errors.push(reason); } });
      engine.resize(640, 360); assert.equal((await engine.init(new EventTarget())).ok, true); engine.start(); throws = true;
      let caught;
      try {
        if (phase === 'frame') { const [id, tick] = pending.entries().next().value; pending.delete(id); tick(100); }
        else if (phase === 'resize') engine.resize(320, 568);
        else engine.returnToSafety();
      } catch (error) { caught = error.message; }
      const result = { phase, caught, state: engine.state, pendingRAF: pending.size, onError: errors };
      console.log(JSON.stringify(result));
      if (baseline) { assert.ok(caught); assert.equal(engine.state, 'running'); assert.deepEqual(errors, []); }
      else { assert.equal(caught, undefined); assert.equal(engine.state, 'error'); assert.equal(pending.size, 0); assert.deepEqual(errors, ['render-failed']); }
      engine.dispose();
    }
    console.log(baseline ? '3/3 基準例外邊界問題已重現；exit 0 表示重現成立' : '3/3 本地執行期錯誤回歸通過');
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
})();
