# 卡片對戰遊戲 — Card Battle Game

網頁版 TCG（Trading Card Game）卡片對戰遊戲原型，類似遊戲王的回合制 1v1 對戰系統。

使用 PixiJS v8 Canvas 渲染引擎，支援 WebGPU 自動偵測（fallback WebGL2），包含完整的對戰系統、AI 對手、視覺特效與音效系統。

## 技術棧

| 層級 | 技術 |
|------|------|
| 渲染引擎 | PixiJS v8（WebGPU / WebGL2） |
| UI 框架 | React 19 |
| 狀態管理 | Zustand 5 + Immer |
| 建置工具 | Vite 8 |
| 後端框架 | Node.js + Fastify 5 |
| WebSocket | @fastify/websocket |
| 資料庫 | PostgreSQL（Drizzle ORM） |
| 語言 | TypeScript（全端） |
| 套件管理 | pnpm Monorepo |

## 功能列表

### 對戰系統
- 完整回合結構（DP → SP → MP1 → BP → MP2 → EP）
- 通常召喚 / 祭品召喚 / 翻轉召喚
- 戰鬥計算（ATK vs ATK、ATK vs DEF、直接攻擊）
- 連鎖系統（Stack + 速度等級驗證）
- 牌組驗證（40-60 張、同名卡限制、禁限卡）
- AI 對手（自動召喚、攻擊、蓋放）

### 卡片系統
- 怪獸卡（普通 / 效果 / 融合）
- 魔法卡（通常 / 速攻 / 永續 / 裝備 / 場地）
- 陷阱卡（通常 / 永續 / 反擊）
- 4 級稀有度（N / R / SR / UR）

### 視覺特效（PixiJS v8）
- 5 種召喚動畫（通常 / 祭品 / 翻轉 / 3D 翻轉 / 特殊）
- 4 級稀有度光效（銀色光帶 / 全息彩虹 / 動態粒子）
- 攻擊動畫（斬擊線 / 衝擊波 / 怪獸破壞 / 直接攻擊）
- LP 傷害特效（螢幕震動 / 浮動數字 / 低血量暗角）
- 場地魔法背景切換（5 種主題 + 粒子效果）
- 回合過場橫幅動畫
- 連鎖提示特效
- 勝敗結算特效（金色光芒 / 碎裂灰燼）
- 粒子物件池（300 上限，物件重用）

### 音效系統
- Web Audio API 音效管理器
- 戰鬥 BGM + 情境切換
- 卡片操作音效（抽牌 / 召喚 / 攻擊 / 破壞）
- 音量控制（主音量 / BGM / SFX）

### 美術素材
- 怪獸卡插圖（10 張 SVG）
- 魔法 / 陷阱卡插圖（10 張 SVG）
- 對戰場地素材（背景 / 卡槽 / UI 元件，SVG + PNG）
- 共用素材（屬性圖標 / 卡背 / 星級）
- 主選單 / 牌組編輯器素材

## 快速開始

```bash
# 安裝依賴
pnpm install

# 啟動開發伺服器（前端 + 後端同時啟動）
pnpm dev

# 前端：http://localhost:5173
# 後端：http://localhost:3000
```

### 建置

```bash
pnpm build
```

## 專案結構

```
card-battle-game/
├── packages/
│   └── shared/                 # 前後端共用套件
│       └── src/
│           ├── models/card.ts  # 卡片型別定義
│           ├── engine/         # 遊戲引擎（對戰/召喚/連鎖/牌組驗證）
│           ├── types/          # API + WebSocket 型別
│           └── constants/      # 遊戲常數
│
├── apps/
│   ├── client/                 # 前端（React + PixiJS）
│   │   └── src/
│   │       ├── pixi/           # PixiJS 渲染層
│   │       │   ├── PixiApp.ts          # Application 初始化（WebGPU/WebGL2）
│   │       │   ├── scenes/             # 場景管理
│   │       │   ├── layers/             # 渲染層（場地/卡片/UI/覆蓋）
│   │       │   └── vfx/               # 視覺特效系統
│   │       │       ├── ParticlePool.ts # 粒子物件池
│   │       │       ├── CardVFX.ts      # 卡片特效
│   │       │       ├── BattleVFX.ts    # 戰鬥特效
│   │       │       ├── LPVFX.ts        # LP 傷害特效
│   │       │       ├── FieldVFX.ts     # 場地魔法背景
│   │       │       ├── TurnVFX.ts      # 回合過場
│   │       │       ├── ChainVFX.ts     # 連鎖提示
│   │       │       └── ResultVFX.ts    # 勝敗結算
│   │       ├── core/           # 遊戲核心邏輯
│   │       ├── stores/         # Zustand 狀態管理
│   │       ├── game/           # AI + 常數
│   │       ├── audio/          # 音效系統
│   │       └── components/     # React 元件
│   │
│   └── server/                 # 後端（Fastify + WebSocket）
│       └── src/
│           ├── routes/         # REST API
│           ├── ws/             # WebSocket 處理
│           ├── engine/         # 伺服器端對戰引擎
│           └── db/             # 資料庫（Drizzle ORM）
│
└── data/cards/                 # 卡片資料（JSON）
```

## 開發階段

- **Phase 1** — PixiJS v8 渲染引擎遷移（Canvas 渲染取代 React DOM）
- **Phase 2** — 視覺特效系統（召喚動畫、戰鬥特效、粒子系統）
- **Phase 3** — YGOProDeck 卡圖整合 + 畫質設定
- **Phase 4** — 效能優化 + 最終整合

## License

MIT
