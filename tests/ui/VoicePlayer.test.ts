import { describe, expect, it } from 'vitest';
import { PARK_SCENARIOS } from '../../src/dialogue/ParkScenarios';
import type { Scenario } from '../../src/dialogue/Scenario';
import { nodeVoice, voiceFile, voiceLines } from '../../src/dialogue/VoiceLines';
import { SPEECH_STYLE, VoicePlayer } from '../../src/ui/VoicePlayer';
import type { AudioLike, SpeechLike, VoiceClip } from '../../src/ui/VoicePlayer';

class FakeAudio implements AudioLike {
  src = '';
  played: string[] = [];
  paused = 0;
  private readonly listeners = new Map<string, () => void>();
  play(): Promise<void> {
    this.played.push(this.src);
    return Promise.resolve();
  }
  pause(): void {
    this.paused += 1;
  }
  addEventListener(type: 'ended' | 'error', listener: () => void): void {
    this.listeners.set(type, listener);
  }
  finish(): void {
    this.listeners.get('ended')?.();
  }
}

describe('語音清單', () => {
  it('每一句人物台詞與旁白提示都有對應的音檔，檔名固定且不重複', () => {
    const lines = voiceLines();
    const files = new Set(lines.map((line) => line.file));
    expect(files.size).toBe(lines.length);
    for (const [id, scenario] of Object.entries(PARK_SCENARIOS) as ['mom', Scenario<string>][])
      for (const node of Object.values(scenario.nodes)) {
        if (node.line) expect(files).toContain(voiceFile(id, node.line));
        for (const prompt of node.prompts) expect(files).toContain(voiceFile('narrator', prompt));
      }
    expect(voiceFile('mom', '我們等一下去游泳。')).toMatch(/^assets\/voice\/mom-[0-9a-f]{8}\.m4a$/);
    expect(voiceFile('mom', '我們等一下去游泳。')).toBe(voiceFile('mom', '我們等一下去游泳。'));
    expect(voiceFile('mom', '你好。')).not.toBe(voiceFile('xiaoan', '你好。'));
  });

  it('一個節點先唸人物台詞、再唸旁白提示；沒有台詞就只有旁白', () => {
    expect(nodeVoice('xiaoan', { line: '你好。', prompts: ['你想怎麼回應？'] })).toEqual([
      { speaker: 'xiaoan', text: '你好。' },
      { speaker: 'narrator', text: '你想怎麼回應？' },
    ]);
    expect(nodeVoice('xiaoyu', { line: '', prompts: ['小宇在玩球。'] })).toEqual([
      { speaker: 'narrator', text: '小宇在玩球。' },
    ]);
  });
});

describe('語音播放', () => {
  const clips = [
    { speaker: 'xiaoan', text: '你好。' },
    { speaker: 'narrator', text: '你想怎麼回應？' },
    { speaker: 'narrator', text: '沒有產生的句子' },
  ] as const;

  async function player() {
    const audio = new FakeAudio();
    const voice = new VoicePlayer('/base/', () => audio);
    await voice.load(() =>
      Promise.resolve({
        files: [voiceFile('xiaoan', '你好。'), voiceFile('narrator', '你想怎麼回應？')],
      }),
    );
    return { audio, voice };
  }

  it('依序播放，一句唸完才換下一句；沒有音檔的句子略過', async () => {
    const { audio, voice } = await player();
    voice.play(clips);
    expect(audio.played).toEqual([`/base/${voiceFile('xiaoan', '你好。')}`]);
    audio.finish();
    expect(audio.played[1]).toBe(`/base/${voiceFile('narrator', '你想怎麼回應？')}`);
    audio.finish();
    expect(audio.played).toHaveLength(2);
  });

  it('停止、關閉語音後不再播放；換新的一步會先停掉上一段', async () => {
    const { audio, voice } = await player();
    voice.play(clips);
    voice.stop();
    audio.finish();
    expect(audio.played).toHaveLength(1);
    voice.play(clips);
    expect(audio.paused).toBeGreaterThanOrEqual(2);
    voice.setEnabled(false);
    expect(voice.active).toBe(false);
    voice.play(clips);
    expect(audio.played).toHaveLength(2);
  });

  it('清單讀取失敗或還沒有音檔時不發聲，也不建立 audio', async () => {
    let created = 0;
    const voice = new VoicePlayer('/', () => {
      created += 1;
      return new FakeAudio();
    });
    await voice.load(() => Promise.reject(new Error('404')));
    expect(voice.active).toBe(false);
    voice.play(clips);
    expect(created).toBe(0);
  });
});

describe('裝置內建語音', () => {
  class FakeSpeech implements SpeechLike {
    spoken: VoiceClip[] = [];
    cancelled = 0;
    private done: (() => void) | null = null;
    speak(clip: VoiceClip, done: () => void): void {
      this.spoken.push(clip);
      this.done = done;
    }
    cancel(): void {
      this.cancelled += 1;
    }
    finish(): void {
      this.done?.();
    }
  }

  it('沒有音檔時用裝置語音依序唸；有音檔的句子優先播音檔', async () => {
    const audio = new FakeAudio();
    const speech = new FakeSpeech();
    const voice = new VoicePlayer('/', () => audio, speech);
    await voice.load(() => Promise.resolve({ files: [voiceFile('xiaoan', '你好。')] }));
    expect(voice.active).toBe(true);
    voice.play([
      { speaker: 'xiaoan', text: '你好。' },
      { speaker: 'narrator', text: '你想怎麼回應？' },
    ]);
    expect(audio.played).toEqual([`/${voiceFile('xiaoan', '你好。')}`]);
    expect(speech.spoken).toHaveLength(0);
    audio.finish();
    expect(speech.spoken).toEqual([{ speaker: 'narrator', text: '你想怎麼回應？' }]);
  });

  it('停止時取消播報；被取消的那句結束也不會接著唸下一句', () => {
    const speech = new FakeSpeech();
    const voice = new VoicePlayer('/', () => new FakeAudio(), speech);
    voice.play([
      { speaker: 'mom', text: '我們等一下去游泳。' },
      { speaker: 'narrator', text: '你想怎麼說？' },
    ]);
    expect(speech.spoken).toHaveLength(1);
    voice.stop();
    expect(speech.cancelled).toBeGreaterThan(0);
    speech.finish();
    expect(speech.spoken).toHaveLength(1);
    voice.setEnabled(false);
    voice.play([{ speaker: 'mom', text: '好。' }]);
    expect(speech.spoken).toHaveLength(1);
  });

  it('小孩的音高比媽媽和旁白高，全部說慢一點', () => {
    for (const kid of ['xiaoan', 'xiaoyu', 'xiaoqing'] as const) {
      expect(SPEECH_STYLE[kid].pitch).toBeGreaterThan(SPEECH_STYLE.mom.pitch);
      expect(SPEECH_STYLE[kid].rate).toBeLessThanOrEqual(1);
    }
    expect(SPEECH_STYLE.narrator.rate).toBeLessThan(1);
  });
});
