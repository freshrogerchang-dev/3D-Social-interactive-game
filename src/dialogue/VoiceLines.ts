import { PARK_SCENARIOS } from './ParkScenarios';
import type { Expression, Scenario } from './Scenario';

/** 說話的人：四位人物各自的聲音，提示文字由旁白唸。 */
export type Speaker = keyof typeof PARK_SCENARIOS | 'narrator';

export interface VoiceLine {
  readonly speaker: Speaker;
  readonly text: string;
  /** 產生語音時的語氣（取第一次出現時節點的表情）。 */
  readonly tone: Expression;
  /** 相對於網站根目錄的音檔路徑。 */
  readonly file: string;
}

/** 同一句話（同一個說話的人）永遠對應同一個檔名；改了文字就會是新檔案。 */
export function voiceFile(speaker: Speaker, text: string): string {
  let hash = 0x811c9dc5;
  for (const ch of `${speaker}|${text}`) {
    hash ^= ch.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `assets/voice/${speaker}-${hash.toString(16).padStart(8, '0')}.m4a`;
}

/** 某個對話節點要唸的內容：先是人物的台詞，再是旁白提示。 */
export function nodeVoice(
  speaker: Speaker,
  node: { readonly line: string; readonly prompts: readonly string[] },
): { speaker: Speaker; text: string }[] {
  const out: { speaker: Speaker; text: string }[] = [];
  if (node.line) out.push({ speaker, text: node.line });
  for (const prompt of node.prompts) out.push({ speaker: 'narrator', text: prompt });
  return out;
}

/** 所有情境要產生的語音（去除重複）；離線產生工具與測試共用。 */
export function voiceLines(): VoiceLine[] {
  const seen = new Map<string, VoiceLine>();
  for (const [speaker, scenario] of Object.entries(PARK_SCENARIOS) as [
    Speaker,
    Scenario<string>,
  ][]) {
    for (const node of Object.values(scenario.nodes)) {
      for (const item of nodeVoice(speaker, node)) {
        const file = voiceFile(item.speaker, item.text);
        if (!seen.has(file))
          seen.set(file, {
            ...item,
            tone: item.speaker === 'narrator' ? 'neutral' : (node.expression ?? 'neutral'),
            file,
          });
      }
    }
  }
  return [...seen.values()];
}
