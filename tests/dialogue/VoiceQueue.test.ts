import { describe, expect, it } from 'vitest';
import queueSource from '../../tools/voice/queue.json?raw';
import presetSource from '../../tools/voice/voice-presets.json?raw';
import { voiceFile, voiceLines } from '../../src/dialogue/VoiceLines';
import type { Speaker, VoiceLine } from '../../src/dialogue/VoiceLines';

describe('每日語音製作清單', () => {
  it('提交的清單完整對應實際遊戲台詞，含街區模式文字，無重複或漏句', () => {
    const queue = JSON.parse(queueSource) as {
      version: number;
      lines: VoiceLine[];
    };
    expect(queue.version).toBe(1);
    expect(queue.lines).toHaveLength(voiceLines().length);
    expect(new Map(queue.lines.map((line) => [line.file, line]))).toEqual(
      new Map(voiceLines().map((line) => [line.file, line])),
    );
    expect(queue.lines.some((line) => line.file === voiceFile('narrator', '你留在這裡。'))).toBe(
      true,
    );
  });

  it('八位說話者都有設定，小男孩使用已選定的 Sadaltager 溫和慢速語氣', () => {
    const presets = JSON.parse(presetSource) as {
      speakers: Record<Speaker, { voice: string; delivery: string }>;
    };
    expect(Object.keys(presets.speakers)).toHaveLength(8);
    for (const boy of ['xiaoan', 'xiaoyu', 'xiaozhe'] as const) {
      expect(presets.speakers[boy].voice).toBe('Sadaltager');
      expect(presets.speakers[boy].delivery).toContain('gentle, slightly slower and connected');
    }
    for (const girl of ['xiaoqing', 'xiaoyun'] as const)
      expect(presets.speakers[girl].voice).toBe('Zephyr');
    for (const line of voiceLines()) expect(presets.speakers[line.speaker].voice).toBeTruthy();
  });
});
