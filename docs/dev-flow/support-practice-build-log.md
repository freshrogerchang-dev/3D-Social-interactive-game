# 生活練習第二批：太吵人多、身體界線、計畫改變

日期：2026-10-17；基準51899f8；分支main-uv12jr。使用者在建議優先實作這三個情境後回覆「請繼續」，本輪按此範圍實作，沿用既有commit／push及Pages發布授權。不進下一個路線圖階段。

## 行為與設計

生活練習首頁保留過馬路、外出吃飯、上廁所；第四個選項改為「更多情境」。第二頁為「太吵人多」「身體界線」「計畫改變」「上一頁」，每頁及每節點最多四個選項。每個情境仍可先不參與；兩個選單皆可用常駐「返回安全區」退出。原先首頁直接先不參與的瀏覽器／單元路徑已改為進入情境後跳過，沒有移除跳過功能。

- **太吵人多**：說太吵／用手指得到相同回應；可找安靜位置、請熟悉照顧者陪著離開，或選自己平常舒服的輔具。試用後仍不舒服可以改方法，不強迫戴著繼續，不要求回到人群；沒有播放吵雜聲音或刺激效果。
- **身體界線**：親友想抱抱或親親時，可說不要、揮手代替或求助；拒絕與揮手都受到尊重。另可練習「如果沒停」：說停下、找媽媽或先離開，由照顧者協助拉開距離。明確說明「對方沒停下不是你的責任」。沒有實際碰觸動畫，也不讓對方用生氣、難過表情施壓；各節點表情均neutral。
- **計畫改變**：下雨、遊具維修、餐點賣完三條路，都能說失望、問下一步或先休息。可以不決定、不選替代活動；餐點可直接先不買，亦能中性結束。失望不需要被改正，不要求孩子馬上開心或微笑。

三張新原創SVG示意，沿用注音及媽媽／旁白的裝置語音；新句子自動加入既有語音清單，未呼叫API或生成音檔。語音不阻擋選擇，暫停／切節點取消播報。互動與資源生命週期沿用既有協調層，未修改引擎、人物、RAF、遊戲計時器、設定檔或套件；沒有儲存／追蹤資料。

仍是待專業審查的示意圖＋互動選項工程版，未新增可自由行走的3D場景。人工注音、身體界線與感官需求等用語、真實裝置語音與使用適切性都需要審查，不能宣稱療效或已核准供兒童使用。

## 驗證

Node22.22.0、npm10.9.4，沿用已還原的依賴，未安裝新套件。`npm run typecheck`、`npm run lint`、`npm run format:check`、`npm run test`、`npm run build`各exit0，14檔139項測試通過；完整輸出support-practice-evidence/five-checks.txt。

既有生活內容契約擴及所有新節點：圖上全部可達／可退出、幫助保留節點、跳過及退出不算finished、四選項上限、字數、禁用詞、全部漢字注音、新句子進語音清單。新增明確路徑測試：說／指對等、輔具可拒絕、身體界線對等尊重與未停下的三種求助、三種計畫變動可休息與暫不決定、餐點可不買。

build JS675.81kB／gzip177.18kB，CSS9.04kB／gzip2.49kB；既有大型bundle仍未拆分，不宣稱效能驗收。

瀏覽器直接route正式dist，不啟動伺服器、不注入引擎或相機。預裝Playwright-core1.57.0、Chromium154.0.8037.57、SwiftShader；語音用不結束的替身確認不用等播完也能操作，未試聽真實聲音。

```bash
export PATH=/tmp/node-v22.22.0-linux-x64/bin:$PATH
export PLAYWRIGHT_MODULE_DIR=/opt/codex/cua_node/lib/node_modules
export CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
node docs/dev-flow/support-practice-browser.mjs /tmp/support-local
node docs/dev-flow/life-practice-smoke.mjs /tmp/support-old-life
```

公開檢查可設定SUPPORT_URL為Pages網址再執行同一新情境腳本，沿用HTTPS_PROXY。

## 實機下一步

重新整理網站→生活練習→更多情境。試太吵人多的「熟悉輔具→試看看→還不舒服」；身體界線「說不要→如果沒停→先離開」；計畫改變「餐點賣完→先不買」。再測幫助／暫停恢復、返回安全區與橫向捲動。iPhone／Safari、VoiceOver、語音實際試聽、專業審查與完整S5未完成。

初次瀏覽器路徑檢查已跑到最後，但腳本彙整插圖時誤把已存成字串的url欄位當作函式，因而exit1；修正的是docs腳本，不是產品或檢查門檻，已重跑。最後另把身體界線起始句明確化為「你不想被親友抱或親」，五項工程已按最終文字重跑全部exit0，公開檢查會涵蓋最終版本。

本機新情境27/27、exit0；原三個生活情境整合10/10、exit0（含短畫面開FPS後入口命中）。證據support-practice-evidence/local及old-life，輸出support-browser.txt／old-life-browser.txt。新情境的幫助焦點、暫停恢復、跳過後移動與焦點、安全區退出、三張新圖HTTP200及pageerror均通過。這是軟體繪圖瀏覽器，不代表iPhone或VoiceOver驗證。

## 發布

產品提交101d54466f92add5926f711b0fa791ebb3a0aaa9已推送main-uv12jr；GitHub Actions [run39037867760](https://github.com/freshrogerchang-dev/3D-Social-interactive-game/actions/runs/39037867760) build／deploy均success。公開網址 https://freshrogerchang-dev.github.io/3D-Social-interactive-game/ 。本輪沒有開PR或推main。

公開Pages按最終版本執行`SUPPORT_URL=https://freshrogerchang-dev.github.io/3D-Social-interactive-game/ node docs/dev-flow/support-practice-browser.mjs /tmp/support-published`：27/27、exit0。三張新圖HTTP200、兩頁選單、三情境各分支、幫助／暫停焦點、語音取消不阻擋選擇、短畫面命中、跳過及安全區退出均通過，pageerror=[]。公開身體界線起始句已確認是「你不想被親友抱或親」，截圖已檢視，證據support-practice-evidence/published。以上不是實機、實際語音試聽或專業審查。
