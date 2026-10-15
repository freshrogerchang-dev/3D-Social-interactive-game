# 公園人物模型產生工具

`build_characters.py` 從 MakeHuman 的 CC0 資料（基礎網格、體型參數、骨架、權重、眼睛）產生
小安、小宇、小晴、媽媽四個 GLB，輸出到 `public/assets/characters/`。只需要 Python 3 與 numpy，
不需要 MakeHuman 程式或 Blender。

```bash
git clone --depth 1 https://github.com/makehumancommunity/makehuman /path/to/makehuman
python3 tools/characters/build_characters.py /path/to/makehuman/makehuman/data public/assets/characters
```

- 人物設定（年齡、性別、體型、髮型、衣服顏色）在檔案中的 `CHARACTERS`。
- 衣服與頭髮是從身體表面往外推出的殼；衣服底下看不到的身體會先抹平，避免胸點、肚臍透出。
- 骨架簡化為 36 根（脊椎、頸、頭、手臂、腿）；遊戲在 `src/npc/SeatedNPC.ts` 擺姿勢與做揮手、點頭。
- 產生後請更新 `public/assets/characters/manifest.json` 的雜湊與來源 commit。
