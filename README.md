# Any Site on Earth

交互式地理空间 Web App — 在地球上任意选取一个位置，即可查看其卫星影像并生成含真实建筑的 3D 地形场景。

纯静态部署，无需后端，所有渲染在客户端完成。

---

## 功能

- **选取位置** — 在真实卫星地图上点击（点模式）或框选（区域模式）
- **获取卫星影像** — 自动调用 ESRI 影像服务，1024×1024px 实时下载，无需认证
- **生成 3D 场景** — 结合 OSM 建筑数据 + 高程图，Three.js PBR 渲染带纹理的 3D 地形

---

## 快速开始

```bash
npm install
npm run dev      # http://localhost:3000
```

部署到 Cloudflare Pages：

```bash
wrangler login   # 首次登录
npm run deploy   # 构建（next build → out/）+ 上传
```

---

## 技术栈

### 前端框架

| 技术 | 用途 |
|------|------|
| **Next.js 14** (App Router) | 框架 + 静态导出 (`output: 'export'`) |
| **React 18** | UI 组件 + 状态管理 |
| **TypeScript** | 类型安全 |
| **Tailwind CSS** | 样式工具类 |

### Phase 1 — 地图选取

- **Leaflet + react-leaflet**：交互式地图容器，点选 / 框选两种模式
- **ESRI World Imagery** 瓦片服务（免费，无需 Key）：卫星底图
- **ESRI World Boundaries & Places**：地名标注叠加

### Phase 2 — 卫星影像

- **ESRI ArcGIS MapServer Export API**（免费，无需认证）  
  `server.arcgisonline.com/…/World_Imagery/MapServer/export`  
  指定 bbox + 1024×1024px，客户端直接构建 URL，无后端中转
- 可选升级：**ESA Sentinel Hub**（OAuth2，高分辨率）

### Phase 3 — 3D 地形渲染

**高程数据（双路径）**

| 环境 | 数据源 | 说明 |
|------|--------|------|
| Node / 服务端 | **AWS Terrain Tiles**（S3，Terrarium 格式） | zoom 13 ≈ 10m/px，SRTM 真实高程，`pngjs` 解码 |
| 浏览器（静态部署） | **平滑程序化噪声** | bilinear smoothstep value noise，3 个 octave（freq 0.04/0.08/0.16） |

**建筑数据**
- **OpenStreetMap / Overpass API**：查询 bbox 内 `building` way，解析 `height`/`building:levels` 标签，投影到场景坐标，最多 600 栋，合并为单个 draw call

**3D 渲染**
- **Three.js** + **@react-three/fiber** + **@react-three/drei**
- `PlaneGeometry` 128×128 顶点，按高程图逐顶点位移，`TERRAIN_H_SCALE = 1.5`
- `MeshStandardMaterial`（PBR），贴 ESRI 卫星图纹理，roughness=0.88
- 光照：`HemisphereLight`（天空/地面） + 暖色平行光（带 2048px 阴影贴图） + 冷色天光补光

### 部署

- **静态导出**：`next build` → `out/` 目录（纯 HTML/JS/CSS，无服务端依赖）
- **Cloudflare Pages**：`wrangler pages deploy out`，全球 CDN 分发
- 配置文件：`wrangler.toml`，部署脚本：`deploy.sh`

---

## 数据流

```
用户点击地图
    │
    ▼
Leaflet（ESRI 瓦片底图）
    │  坐标
    ▼
ESRI MapServer Export → 卫星 JPEG URL（客户端直接构建，无后端）
    │  URL + bounds
    ▼
SceneGenerator（客户端异步并行）
    ├─ Overpass API ──────────→ OSM 建筑 footprint
    └─ AWS Terrain Tiles ─────→ 真实高程（Node 环境）
       平滑 value noise ───────→ 程序化高程（浏览器）
         │
         ▼
Three.js WebGL
    ├─ 128×128 地形网格 + 卫星纹理（PBR MeshStandardMaterial）
    └─ OSM 建筑体块（BoxGeometry 合并 draw call）
```

---

## 外部数据源

| 来源 | 用途 | 需要认证 |
|------|------|----------|
| ESRI World Imagery | 地图底图瓦片 | 否 |
| ESRI MapServer Export | 卫星影像下载（1024px JPEG） | 否 |
| ESRI World Boundaries & Places | 地名标注 | 否 |
| AWS Terrain Tiles (S3) | 真实 SRTM 高程 | 否 |
| OpenStreetMap / Overpass API | 建筑 footprint | 否 |
| ESA Sentinel Hub | 高分辨率卫星（可选） | 是（OAuth2） |

**所有核心数据源均免费、无需 API Key。**

---

## 目录结构

```
src/
├── app/
│   ├── page.tsx               主 UI（Apple 风格全屏，三阶段工作流）
│   ├── globals.css            Leaflet + Tailwind 基础样式
│   └── layout.tsx             根布局
├── components/
│   ├── MapSelector.tsx        Leaflet 卫星地图，点/框选
│   └── Scene3DViewer.tsx      Three.js 3D 地形渲染（含 OSM 建筑）
├── lib/
│   ├── sentinel.ts            Sentinel Hub API 客户端（可选）
│   └── sceneGenerator.ts      高程图 + 场景生成（客户端运行）
└── types/
    └── index.ts               Coordinates, Region, SatelliteImageData, Scene3DData, BuildingFeature
```

---

## 可用脚本

```bash
npm run dev      # 开发服务器 http://localhost:3000
npm run build    # 静态构建 → out/
npm run deploy   # 构建 + 上传到 Cloudflare Pages
npm run lint     # ESLint
```

---

## 环境变量

`.env.local`（可选）：

```env
# ESA Sentinel Hub — 高分辨率卫星影像（未配置则自动使用 ESRI 免费方案）
NEXT_PUBLIC_SENTINEL_INSTANCE_ID=...
NEXT_PUBLIC_SENTINEL_CLIENT_ID=...
NEXT_PUBLIC_SENTINEL_CLIENT_SECRET=...
```
