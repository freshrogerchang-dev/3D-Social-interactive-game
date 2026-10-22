/* global console */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const temp = mkdtempSync(path.join(tmpdir(), 'voice-queue-'));
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
  const { voiceLines } = await import(pathToFileURL(path.join(temp, 'voice-lines.mjs')).href);
  const lines = voiceLines();
  // Round-robin roles so the initial batches include both children and adults.
  const groups = new Map();
  for (const line of lines) {
    if (!groups.has(line.speaker)) groups.set(line.speaker, []);
    groups.get(line.speaker).push(line);
  }
  const queue = [];
  while ([...groups.values()].some((group) => group.length))
    for (const group of groups.values()) if (group.length) queue.push(group.shift());
  writeFileSync(
    path.join(root, 'tools/voice/queue.json'),
    `${JSON.stringify({ version: 1, lines: queue }, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        total: queue.length,
        bySpeaker: Object.fromEntries(
          [...new Set(lines.map((line) => line.speaker))].map((speaker) => [
            speaker,
            lines.filter((line) => line.speaker === speaker).length,
          ]),
        ),
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
