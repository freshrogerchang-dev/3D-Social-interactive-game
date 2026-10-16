import { voiceFile } from '../dialogue/VoiceLines';
import type { Speaker } from '../dialogue/VoiceLines';

export interface VoiceClip {
  readonly speaker: Speaker;
  readonly text: string;
}

/** 只用到 HTMLAudioElement 的這幾個功能；測試可以換成替身。 */
export interface AudioLike {
  src: string;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: 'ended' | 'error', listener: () => void): void;
}

/** 裝置內建語音（Web Speech API）；測試可以換成替身。 */
export interface SpeechLike {
  speak(clip: VoiceClip, done: () => void): void;
  cancel(): void;
}

/**
 * 每位說話者的音高與速度：小孩音高較高，媽媽與旁白較低；全部說慢一點。
 * 裝置語音沒有真正的小孩聲音，只能用音高區分。
 */
export const SPEECH_STYLE: Readonly<Record<Speaker, { pitch: number; rate: number }>> = {
  xiaoan: { pitch: 1.5, rate: 0.9 },
  xiaoyu: { pitch: 1.35, rate: 0.95 },
  xiaoqing: { pitch: 1.7, rate: 0.9 },
  mom: { pitch: 1.1, rate: 0.85 },
  xiaoyun: { pitch: 1.6, rate: 0.9 },
  agong: { pitch: 0.8, rate: 0.8 },
  xiaozhe: { pitch: 1.4, rate: 0.85 },
  narrator: { pitch: 1, rate: 0.85 },
};

type Item = { kind: 'file'; url: string } | { kind: 'speech'; clip: VoiceClip };

/**
 * 對話語音：有預先產生的靜態音檔（public/assets/voice）就播音檔，
 * 沒有的句子用裝置內建語音唸（不連網、不需要金鑰）。
 * 一次只唸一段；新的對話節點、暫停、返回安全區或關閉語音時立即停止。
 */
export class VoicePlayer {
  private available = new Set<string>();
  private enabled = true;
  private queue: Item[] = [];
  private audio: AudioLike | null = null;
  /** 每次 stop／play 都換代，舊的播報結束時不會接著唸下一句。 */
  private generation = 0;

  constructor(
    private readonly base: string,
    private readonly createAudio: () => AudioLike,
    private readonly speech: SpeechLike | null = null,
  ) {}

  /** 讀取音檔清單（manifest.json 的 files）；失敗時只用裝置語音。 */
  async load(fetchManifest: () => Promise<unknown>): Promise<void> {
    try {
      const manifest = await fetchManifest();
      const files =
        typeof manifest === 'object' && manifest !== null && 'files' in manifest
          ? manifest.files
          : null;
      if (Array.isArray(files))
        this.available = new Set(files.filter((file): file is string => typeof file === 'string'));
    } catch (error: unknown) {
      this.available = new Set();
      if (error instanceof Error) console.warn('[VoicePlayer] 沒有語音檔', error.message);
    }
  }

  /** 有音檔或裝置語音，而且語音開著。 */
  get active(): boolean {
    return this.enabled && (this.available.size > 0 || this.speech !== null);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  /** 依序播放；有音檔用音檔，沒有就用裝置語音，兩者都沒有就略過。 */
  play(clips: readonly VoiceClip[]): void {
    this.stop();
    if (!this.active) return;
    this.queue = clips.flatMap((clip): Item[] => {
      const file = voiceFile(clip.speaker, clip.text);
      if (this.available.has(file)) return [{ kind: 'file', url: `${this.base}${file}` }];
      return this.speech ? [{ kind: 'speech', clip }] : [];
    });
    this.next(this.generation);
  }

  stop(): void {
    this.generation += 1;
    this.queue = [];
    this.audio?.pause();
    this.speech?.cancel();
  }

  private next(generation: number): void {
    if (generation !== this.generation) return;
    const item = this.queue.shift();
    if (!item) return;
    if (item.kind === 'speech') {
      this.speech?.speak(item.clip, () => {
        this.next(generation);
      });
      return;
    }
    if (!this.audio) {
      // 重複使用同一個 audio：iOS 第一次播放在使用者點按時解鎖後，之後換檔也能播。
      const audio = this.createAudio();
      audio.addEventListener('ended', () => {
        this.next(this.generation);
      });
      audio.addEventListener('error', () => {
        this.next(this.generation);
      });
      this.audio = audio;
    }
    this.audio.src = item.url;
    this.audio.play().catch(() => {
      // 瀏覽器不允許自動播放時不重試；「再聽一次」按鈕仍可播放。
      this.queue = [];
    });
  }
}

/**
 * 瀏覽器內建語音；不支援時回傳 null。優先用台灣國語（zh-TW），沒有就用其他中文（不含粵語）。
 */
export function browserSpeech(): SpeechLike | null {
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined')
    return null;
  const pick = (): SpeechSynthesisVoice | null => {
    const voices = speechSynthesis.getVoices();
    const tw = voices.find((voice) => /^zh[-_]TW/i.test(voice.lang));
    const mandarin = voices.find((voice) => /^(zh[-_]CN|cmn)/i.test(voice.lang));
    return tw ?? mandarin ?? null;
  };
  return {
    speak(clip, done) {
      const utterance = new SpeechSynthesisUtterance(clip.text);
      const voice = pick();
      utterance.lang = voice?.lang ?? 'zh-TW';
      if (voice) utterance.voice = voice;
      utterance.pitch = SPEECH_STYLE[clip.speaker].pitch;
      utterance.rate = SPEECH_STYLE[clip.speaker].rate;
      utterance.volume = 0.9;
      utterance.onend = done;
      utterance.onerror = done;
      speechSynthesis.speak(utterance);
    },
    cancel() {
      speechSynthesis.cancel();
    },
  };
}
