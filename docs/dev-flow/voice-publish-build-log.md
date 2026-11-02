# 226句預錄語音發布紀錄

日期：2026-11-02。使用者要求發布；沿用既有commit／push與檢查授權，本次明確核准部署。

## 內容與範圍

基底main-uv12jr：566b6ae628ae15cb21d7f5fc0d0ea0a054b64e24，保留iPhone圖示、現有街區與安全控制。語音來源codex/daily-game-voice：16f1d065798696936a3a3685b549b12c9d2d254b。

僅整合public/assets/voice/的226個M4A與manifest、兩句改寫情境及共用VoiceLines清單的街區旁白變體；不整合離線生成工具／排程／原始WAV，不更動播放器音高或語速。小男孩Sadaltager B溫和慢速、+2.5半音；小女生Zephyr85%速度、+2.5半音；成人聲線維持原設定。

小晴「我在這裡排隊。」；媽媽「這裡在修理，先不玩。」。原224筆render紀錄未改，最終226/226已完成，生成排程和進度追蹤均已停止。

## 本機驗證

- Node22.22.0／npm10.9.4，沿用已安裝的相同鎖檔依賴，未新增或升級套件。
- npm run typecheck、lint、format:check、test、build各exit0，15檔145項測試通過。
- npm exec -- vite build --base=/3D-Social-interactive-game/ exit0。JS692.14kB／gzip183.78kB；既有500kB chunk警告保留。
- 226個M4A逐檔SHA256與manifest一致，ffprobe驗證AAC、24kHz、單聲道、正時長；總長641.79秒、總大小3,526,670bytes。
- Vite SSR載入共用voiceLines()，與manifest核對226/226，無缺檔或多餘台詞；iPhone兩個圖示均保留。

Chromium／SwiftShader，390×844手機尺寸，本機Pages子路徑瀏覽器檢查 11/11、exit0：226筆manifest、8位角色及最後兩句AAC可解碼、角色後接旁白使用靜態音檔、無裝置語音fallback、再聽一次、暫停停止、恢復不自動重唸、返回安全區、無runtime例外／Gemini呼叫、iPhone圖示保留。

發布結果待本次接續記錄；真實iPhone／Safari試聽與完整人工聽辨未驗證，不宣稱專業審查通過。
