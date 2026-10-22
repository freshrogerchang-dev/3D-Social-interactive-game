import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

/** 使用者選定的 Zephyr 音檔後製；播放端不再變速或升調。 */
export const APPROVED_PROFILE = Object.freeze(
  JSON.parse(readFileSync(new URL('./voice-profile.json', import.meta.url), 'utf8')),
);

/** 只套用於小女生角色及 Zephyr，成人／男孩和手動覆寫的其他聲線不變。 */
export function profileFor(speaker, voice) {
  return ['xiaoqing', 'xiaoyun'].includes(speaker) && voice === APPROVED_PROFILE.voice
    ? APPROVED_PROFILE
    : null;
}

export function profileFilter(profile) {
  const ratio = 2 ** (profile.pitchSemitones / 12);
  return (
    `rubberband=tempo=${profile.tempo}:pitch=${ratio}:` +
    `formant=${profile.formant}:pitchq=${profile.pitchQuality},` +
    `alimiter=limit=${profile.limiter}:level=false`
  );
}
