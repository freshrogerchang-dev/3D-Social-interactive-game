/** 寫實素材的細節程度（Q6，03 §9.5）。骨架尚未使用，Phase 6–7 才接上設定 UI 與素材。 */
export type DetailLevel = 'high' | 'medium' | 'low';

export interface EngineSettings {
  /** 保守預設為開啟；骨架本身沒有任何動畫。 */
  readonly reducedMotion: boolean;
  readonly detailLevel: DetailLevel;
  /** devicePixelRatio 上限（S1 §7 第 8 點）。 */
  readonly maxPixelRatio: number;
}

export const DEFAULT_SETTINGS: EngineSettings = {
  reducedMotion: true,
  detailLevel: 'medium',
  maxPixelRatio: 2,
};
