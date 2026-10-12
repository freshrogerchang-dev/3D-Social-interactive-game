# 2026-10-12 圓潤人物與舉手揮動

## 使用者決策
依使用者要求，朝 Disney Dreamlight Valley 的柔和、圓潤與親切表情方向調整原創小安。
「圓環一些」依上下文理解為「圓潤一些」，已在對話告知。官方參考：[作品網站](https://disneydreamlightvalley.com/)、[官方媒體](https://disneydreamlightvalley.com/media/screenshots)。
本次美術取捨是設計判斷，並非商用人物品質或兒童適用性驗證；沒有使用其人物模型或素材。

## 完成
- 臉頰與下巴更柔和，頭部、髮型、肩身、上衣、褲管、手掌與鞋子增加圓潤體積。
- 眼睛由細長直立改較寬柔和的輪廓，保留暖色膚色、固定微笑與原創表面貼圖。
- 原整臂橫向抬起改成肩／肘／腕三段 pivot；中立手掌仍放腿上。
- 打招呼 0.65 秒平滑抬到臉旁、1.5 秒手腕左右兩次擺動、0.65 秒放回，共 2.8 秒；掌心朝前，手指跟著擺動。
- 點頭維持 1.6 秒。仍共用唯一 RAF、暫停凍結、退出／安全區／停用動作立即重設全部關節；不新增自動循環、鏡頭追蹤、呼吸或晃頭。

## 驗證
Node 22.21.0，typecheck／lint／format:check／test／build 各 exit 0，71 項單元通過。
既有揮手測試改驗證手掌高於臉中心、掌心朝前、手指位置隨時間變化、動作結束回腿上；角色／長椅／鏡頭不跟著移動。
正式 JS 607.87 kB／gzip156.02 kB，既有 >500kB 提示保留。
Chrome 154.0.8037.99／Playwright 1.62.1／SwiftShader 最終人物預覽 exit 0／pageerror=[]；24/24 互動與 15/15 安全回歸通過，各 exit 0；證據 npc-rounded-wave-evidence，包含 phone-wave-left.png／phone-wave-right.png。
無新套件、外部資產或語音，未進 Phase 5。最終手機正面及掌心朝前的揮手畫面已人工檢視，發布結果待推送後補入。

## 限制
外觀接受度與「像 Disney Dreamlight Valley」的程度待使用者評估，iPhone／Safari／VoiceOver、實際 GPU 與專業審查未驗證。