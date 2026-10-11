# Phase 4 排版：每字右側直排注音

日期：2026-10-11。使用者指定「注音放在文字的右手邊」。

- 標題、台詞、提示、選項、幫助與打招呼按鈕改為每字右側直排注音。每個字和自己的注音為一個不可拆開的 inline-flex 單位，可在字與字之間換行。
- 注音符號直排且保持正向；二／三／四聲置於符號列右側，輕聲點放上方。人工讀音表保持原內容。
- rt 與圖示維持 aria-hidden，按鈕中文 aria-label 保留。既有至少 64px 觸控目標與卡片捲動保持有效。
- 改動檔案：src/ui/GreetingPresentation.ts、src/styles.css、phase4-browser.mjs。未新增套件、設定檔、API、語音或儲存；未 commit／push／發布。

## 驗證

Windows Node 22.21.0。typecheck、lint、format:check、test、build 五項命令各 exit 0；8 檔 70 項單元通過。正式 dist JS 589.35kB／gzip150.59kB，既有 >500kB 提示保留。

Chrome 154.0.8037.99／Playwright 1.62.1／SwiftShader：phase4-browser.mjs 24/24、exit 0；新增實際 bounding rect 檢查每字 rt 在漢字右側及 vertical-rl 直排。s5-runtime-browser.mjs 經 local-dist runner 15/15、exit 0，包含 32px root 文字、小畫面及 WebGL 安全路徑。已人工檢視 phone-right-zhuyin.png。

證據：zhuyin-right-evidence/browser/result.json、phone-right-zhuyin.png 與 safety/ 截圖。新版 iPhone、Safari、VoiceOver 尚未實測，完整 S5 未完成。

下一步：本機預覽重新整理檢視右側注音；新版手機與旁白複測。語音另做、不進 Phase 5。
