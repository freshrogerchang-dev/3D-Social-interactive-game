# 人物美術參考與本次調整（2026-10-12）

## 問題
使用者指出 af50a54 人物像人偶／紙紮人。上一輪工程與互動驗證通過，只代表功能正常，沒有證明外觀令人舒服。
本次沿用 S4 人物切片，從市售社交／生活模擬遊戲研究美術語言；不是重新啟動 S1，也不新增語音或 Phase 5。

## 官方參考

| 遊戲 | 官方資料與相似處 | 本次美術取捨 |
| --- | --- | --- |
| MySims: Cozy Bundle | [EA](https://www.ea.com/games/the-sims/mysims-cozy-bundle)：友善居民、角色自訂、幫助居民與社區生活。已檢視官方公園展示圖。 | 採清楚表情、柔和輪廓與完整服裝體積，避免拼裝寫實五官。 |
| Tomodachi Life: Living the Dream | [Nintendo](https://www.nintendo.com/us/store/products/tomodachi-life-living-the-dream-switch/)：原創 Mii、島嶼生活與角色關係。已檢視官方躺椅人物展示圖。 | 表情貼合臉部表面，比獨立凸眼／腮紅球更容易閱讀；保留小安原創造型。 |
| Palia | [官方玩法介紹](https://palia.com/news/gpfl-highlights)：角色建立、自訂與共享社區。 | 可作後續完整骨架人物的參考；目前網頁原型先改善輪廓、膚色與衣服，不引進成人身形或高成本素材。 |
| Disney Dreamlight Valley | [官方網站](https://disneydreamlightvalley.com/)與[友情更新](https://disneydreamlightvalley.com/news/BestFriends2026)：與角色建立友誼。 | 參考其角色辨識與表情方向，不使用其角色、模型或貼圖。 |

以上相似處為官方玩法資訊。美術取捨是本次設計判斷，並非研究證明，也未代表這些遊戲適用於本專案使用族群。

## 實作
- 原創 512×256 程序臉部貼圖，固定柔和眼睛、眉毛、嘴角與漸層腮紅，移除突出眼球／腮紅塊／唇部球體。
- 頭部改為連續平滑曲面與柔和下巴，偏側瀏海；修正髮帽重疊造成第一輪髮型顯示不完整。
- 暖色皮膚與溫和固定材質補光，青藍上衣、自然色長褲；不改公園光照或動畫頻率。
- 袖子與前臂改連續曲面，移除球形肩肘與高對比紙片式摺線，手掌仍自然放在腿上。
- 保留單一 RAF、明確才觸發的抬手與點頭、暫停／安全區、動作開關、右側注音與對等回應。
- 無第三方人物素材、外部圖片、字型或新套件。官方參考圖僅留暫存區，不進產品；臉部 DataTexture 有自有生命週期及一次性釋放測試。

## 驗證
Windows Node 22.21.0，五項工程檢查已完成；71 單元通過。
正式 JS 606.83 kB／gzip155.73 kB，既有 >500kB 提示保留。
Chrome 154.0.8037.99／Playwright 1.62.1／SwiftShader：人物預覽 exit 0／pageerror=[]、互動排版 24/24、安全回歸 15/15，各 exit 0；證據 npc-cozy-evidence。手機、對話與桌面截圖已人工檢視。

## 限制
使用者外觀評估未完成；不能因單元與互動通過就宣稱人偶感消失。
iPhone／Safari／VoiceOver、真實 GPU 效能與專業評估未完成，語音另做，Phase 5 未開始。
程序幾何成本的原生 Node strip-types 臨時檢查因無副檔名 ESM import 失敗，未據此宣稱模型成本；Vite、TypeScript 與 71 項 Vitest 的正式工具鏈正常。