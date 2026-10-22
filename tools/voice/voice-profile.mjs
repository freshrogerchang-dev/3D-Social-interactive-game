import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

/** 使用者選定的 Zephyr 音檔後製；播放端不再變速或升調。 */
export const APPROVED_PROFILE = Object.freeze(
  JSON.parse(readFileSync(new URL('./voice-profile.json', import.meta.url), 'utf8')),
);
export const BOY_PROFILE = Object.freeze(
  JSON.parse(readFileSync(new URL('./boy-profile.json', import.meta.url), 'utf8')),
);
export const VOICE_PRESETS = JSON.parse(
  readFileSync(new URL('./voice-presets.json', import.meta.url), 'utf8'),
);

/** 兒童角色套用已選定的聲線效果；成人與其他覆寫聲線不套用。 */
export function profileFor(speaker, voice) {
  if (['xiaoan', 'xiaoyu', 'xiaozhe'].includes(speaker) && voice === BOY_PROFILE.voice)
    return BOY_PROFILE;
  return ['xiaoqing', 'xiaoyun'].includes(speaker) && voice === APPROVED_PROFILE.voice
    ? APPROVED_PROFILE
    : null;
}

export function promptForLine(speaker, text) {
  const { delivery } = VOICE_PRESETS.speakers[speaker];
  return `Read aloud in natural Taiwanese Mandarin, with a ${delivery}. Speak only the following dialogue.\n${text}`;
}

export function profileFilter(profile) {
  const ratio = 2 ** (profile.pitchSemitones / 12);
  return (
    `rubberband=tempo=${profile.tempo}:pitch=${ratio}:` +
    `formant=${profile.formant}:pitchq=${profile.pitchQuality},` +
    `alimiter=limit=${profile.limiter}:level=false`
  );
}
