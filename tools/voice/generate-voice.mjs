/* global process, console, Buffer, fetch, setTimeout */
/**
 * 離線產生人物語音（Gemini TTS）→ public/assets/voice/*.m4a 與 manifest.json。
 *
 * 用法（需要 ffmpeg；金鑰只放在環境變數，不寫進檔案、不送到前端）：
 *   GEMINI_API_KEY=… node tools/voice/generate-voice.mjs            # 只產生還沒有的句子
 *   node tools/voice/generate-voice.mjs --dry-run                   # 列出要產生的句子，不呼叫 API
 * 可選環境變數：GEMINI_TTS_MODEL（預設 gemini-2.5-flash-preview-tts）、GEMINI_VOICE_<說話者>。
 *
 * 依產品決定 Q5：只給使用者自己使用；App 只播放這裡產生的靜態檔案。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'public/assets/voice');
const manifestPath = path.join(outDir, 'manifest.json');
const dryRun = process.argv.includes('--dry-run');
const model = process.env.GEMINI_TTS_MODEL ?? 'gemini-2.5-flash-preview-tts';

/** 每位說話者的預設聲音與角色描述（可用 GEMINI_VOICE_XIAOAN 等覆寫聲音）。 */
const SPEAKERS = {
  xiaoan: { voice: 'Puck', persona: '一位七歲、溫和友善的台灣小男孩' },
  xiaoyu: { voice: 'Fenrir', persona: '一位八歲、活潑愛玩球的台灣小男孩' },
  xiaoqing: { voice: 'Leda', persona: '一位七歲、溫柔的台灣小女孩' },
  mom: { voice: 'Sulafat', persona: '一位溫柔、有耐心的台灣媽媽' },
  narrator: { voice: 'Achernar', persona: '一位溫和、說話清楚的說故事老師' },
};
const TONES = {
  neutral: '平靜、友善',
  happy: '開心',
  excited: '開心、有精神，但不大聲',
  thinking: '在想事情，溫和',
  surprised: '有一點驚訝，仍然溫和',
  worried: '有點不好意思，溫和',
};

async function loadLines() {
  // 用專案的 vite 把 TypeScript 的台詞清單打包成暫時的 JS 再載入，確保和 App 用同一份資料。
  const temp = mkdtempSync(path.join(tmpdir(), 'voice-lines-'));
  try {
    await build({
      root,
      logLevel: 'error',
      configFile: false,
      build: {
        ssr: path.join(root, 'src/dialogue/VoiceLines.ts'),
        outDir: temp,
        emptyOutDir: true,
        rollupOptions: { output: { entryFileNames: 'voice-lines.mjs' } },
      },
    });
    const module = await import(pathToFileURL(path.join(temp, 'voice-lines.mjs')).href);
    return module.voiceLines();
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

function voiceFor(speaker) {
  return process.env[`GEMINI_VOICE_${speaker.toUpperCase()}`] ?? SPEAKERS[speaker].voice;
}

function promptFor(line) {
  const { persona } = SPEAKERS[line.speaker];
  return `用台灣口音的國語，以${persona}的聲音，語氣${TONES[line.tone] ?? TONES.neutral}，說得慢一點、清楚、音量平穩，只唸引號裡的話：「${line.text}」`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function synthesize(line, key) {
  const body = {
    contents: [{ parts: [{ text: promptFor(line) }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceFor(line.speaker) } } },
    },
  };
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      },
    );
    if (response.status === 429 && attempt <= 3) {
      // 免費額度的每分鐘上限：等一下再試；每日額度用完時重試也沒用，下次執行會接著產生。
      const wait = 25000 * attempt;
      console.log(`  429，${wait / 1000} 秒後重試（第 ${attempt} 次）`);
      await sleep(wait);
      continue;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
    }
    const json = await response.json();
    const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part) throw new Error('回應沒有音訊');
    const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType ?? '')?.[1] ?? 24000);
    return { pcm: Buffer.from(part.inlineData.data, 'base64'), rate };
  }
}

function encode(pcm, rate, file) {
  // PCM 16-bit 單聲道 → AAC（約 40 kbps）；統一音量，避免某幾句特別大聲。
  execFileSync(
    'ffmpeg',
    [
      '-loglevel',
      'error',
      '-y',
      '-f',
      's16le',
      '-ar',
      String(rate),
      '-ac',
      '1',
      '-i',
      'pipe:0',
      '-af',
      'loudnorm=I=-20:TP=-3',
      '-ar',
      '24000',
      '-c:a',
      'aac',
      '-b:a',
      '40k',
      '-movflags',
      '+faststart',
      file,
    ],
    { input: pcm },
  );
}

const lines = await loadLines();
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : { files: [] };
const done = new Set(manifest.files);
const missing = lines.filter(
  (line) => !done.has(line.file) || !existsSync(path.join(root, 'public', line.file)),
);
console.log(
  `共 ${lines.length} 句，已有 ${lines.length - missing.length} 句，要產生 ${missing.length} 句。`,
);
if (dryRun) {
  for (const line of missing.slice(0, 10))
    console.log(`  ${line.speaker}（${voiceFor(line.speaker)}）：${line.text}`);
  process.exit(0);
}
const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('需要環境變數 GEMINI_API_KEY（不要寫進檔案或 commit）。');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
const save = () => {
  const files = lines.map((line) => line.file).filter((file) => done.has(file));
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        generator: 'tools/voice/generate-voice.mjs',
        engine: `Gemini TTS（${model}），離線預先產生`,
        use: '依產品決定 Q5：僅使用者自己使用；App 不呼叫語音 API、前端沒有金鑰',
        voices: Object.fromEntries(Object.keys(SPEAKERS).map((s) => [s, voiceFor(s)])),
        files,
      },
      null,
      2,
    )}\n`,
  );
};
let made = 0;
for (const line of missing) {
  try {
    const { pcm, rate } = await synthesize(line, key);
    encode(pcm, rate, path.join(root, 'public', line.file));
    done.add(line.file);
    made += 1;
    save();
    console.log(`✓ ${line.speaker}：${line.text}`);
    await sleep(Number(process.env.GEMINI_TTS_DELAY_MS ?? 7000)); // 免費額度：每分鐘約 10 次以內
  } catch (error) {
    console.error(
      `✗ ${line.speaker}：${line.text}\n  ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error('先停在這裡；已產生的檔案都保留，修正後再執行會接著產生。');
    break;
  }
}
save();
console.log(`這次產生 ${made} 句；還差 ${missing.length - made} 句。`);
