# 2026-10-12 人物自然比例與細節

## 範圍
依使用者要求改善人物的臉、手腳與衣服，保留和藹風格。使用者另授權「跑完先推上去」。
自製 Three.js 模型，未新增套件、外部素材或語音，未進入 Phase 5。

## 完成
- 頭部改為平滑輪廓截面，縮小頭身比例、縮短頸部；眼瞼、鼻樑、鼻翼與嘴唇增加形狀。
- 手臂連續連接肩／肘／腕，手掌放在腿上，有四指、拇指與指甲，左手整組保留原打招呼 pivot。
- 褲管採平滑彎曲並向腳踝收窄的連續幾何，增加低對比褲縫、鞋底、鞋舌與鞋帶。
- 上衣增加腰身、肩線、袖口、衣襬與低對比皺摺；原注音、對話、安全區與減少動態設定保留。

## 驗證
Windows Node 22.21.0。typecheck、lint、test、format:check、build 全部完成，70 項單元通過。
正式 JS 606.20 kB／gzip155.44 kB，既有 >500 kB 提示仍存在。
角色含長椅 112 meshes、42760 triangles、11 materials；所有位置頂點為有限數值，資源釋放回歸通過。
Chrome 154.0.8037.99／Playwright 1.62.1／SwiftShader，手機／桌面、打招呼與點頭截圖已保存於 npc-natural-evidence；pageerror=[]。
首次擷取撞上建置清空 dist 造成 ENOENT，已停止該批並在建置完成後依序重跑，不計為通過。
正式 dist 互動／排版 24/24、安全回歸 15/15，整批 exit 0。使用者授權推送，發布結果待部署後補入。

## 限制
較自然的工程模型，仍是風格化外觀。iPhone／Safari／VoiceOver 與真實 GPU 效能未驗證。
語音另做；完整 S5 未通過，Phase 5 未開始。
## 發布收尾（2026-10-12）
- 產品提交 af50a54b14fcd65fce36e1fe827ba6727bec6097 已推送 main-uv12jr。
- Pages Actions 38183337447 completed/success，公開 HTML、JS index-BDRvPafY.js 與 CSS index-DMPMRFGz.css 均 HTTP 200，JS 含 fingernail、trouser-leg。
- 公開网址 https://freshrogerchang-dev.github.io/3D-Social-interactive-game/?v=af50a54 的 24/24 互動排版檢查通過、exit 0；手機尺寸截圖人工檢視，未處理 pageerror=[]。
- 本次公開證據 npc-natural-public-evidence 與本收尾紀錄保留本机，產品與發布前證據已提交推送。iPhone/Safari 實機未驗證。
