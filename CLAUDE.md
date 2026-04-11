# Any Site on Earth — CLAUDE.md

## 项目概述

交互式地理空间 Web App，允许用户：
1. 在真实卫星地图上**选取位置**（点或区域）
2. **获取该位置的高分辨率卫星影像**
3. **生成含真实建筑的 3D 地形场景**

纯静态部署（Cloudflare Pages），无后端服务器，所有数据处理均在客户端完成。

Tech stack: Next.js 14 · React 18 · TypeScript · Three.js · Leaflet · Tailwind CSS

---

## 目录结构

```
src/
├── app/
│   ├── page.tsx               主 UI（Apple 风格全屏，含三阶段工作流）
│   ├── globals.css            Leaflet + Tailwind 基础样式
│   └── layout.tsx             根布局
├── components/
│   ├── MapSelector.tsx        Leaflet 卫星地图，点/框选
│   └── Scene3DViewer.tsx      Three.js 3D 地形渲染（含 OSM 建筑）
├── lib/
│   ├── sentinel.ts            Sentinel Hub API 客户端（可选，服务端专用）
│   └── sceneGenerator.ts      高程图 + 场景生成（客户端运行）
└── types/
    └── index.ts               Coordinates, Region, SatelliteImageData, Scene3DData, BuildingFeature
```

---

## 三阶段工作流

### Phase 1 — 坐标选取 ✅

**实现：** `MapSelector.tsx`
- **Leaflet** + **ESRI World Imagery** 瓦片（免费，无需 API Key）
- **Point 模式**：单击放置红色图钉
- **Region 模式**：点两个角落画蓝色矩形，中心作为选取坐标
- `flyTo` 平滑动画

### Phase 2 — 卫星影像 ✅

**实现：** `page.tsx`（纯客户端，无 API route）
- **ESRI ArcGIS MapServer Export**（免费，无需认证）：  
  `server.arcgisonline.com/…/World_Imagery/MapServer/export`  
  参数：bbox + 1024×1024px，直接返回 JPEG URL
- 可选升级：**ESA Sentinel Hub**（需 OAuth2 凭据，原 `/api/satellite` 逻辑已内联）

### Phase 3 — 3D 场景生成 ✅

**实现：** `sceneGenerator.ts` + `Scene3DViewer.tsx`（纯客户端）

**高程数据（两种路径）：**
- 服务端/Node 环境：**AWS Terrain Tiles**（Terrarium 格式，zoom 13 ≈ 10m/px），用 `pngjs` 解码
- 浏览器环境（静态部署）：**平滑程序化噪声** — bilinear smoothstep value noise，3 个 octave（freq 0.04/0.08/0.16），输出 [0,1] 高程图

**建筑数据：**
- **OpenStreetMap / Overpass API**：查询 bbox 内所有 `building` way
- 解析 `height`、`building:levels` 标签，投影到 Three.js 场景坐标
- 每个建筑用 `BoxGeometry`，合并为单个 draw call（最多 600 栋）

**渲染：**
- `PlaneGeometry` 128×128 顶点，按高程图逐顶点位移，`TERRAIN_H_SCALE = 1.5`
- `MeshStandardMaterial`（PBR），贴 ESRI 卫星纹理，roughness=0.88
- 光照：`HemisphereLight`（天空/地面）+ 暖色平行光（带阴影）+ 冷色天光补光

---

## 静态部署（Cloudflare Pages）

```bash
# 首次登录
wrangler login

# 构建 + 部署（等价于 npm run build && wrangler pages deploy out）
npm run deploy
```

- `next build` 输出到 `out/`（`output: 'export'` 模式）
- `wrangler.toml` 指定 `pages_build_output_dir = "out"`
- 项目名：`anysiteonearth` → 地址：`https://anysiteonearth.pages.dev`

**注意：** 静态导出不支持 API Routes，所有逻辑已迁移到客户端。`pngjs` 在浏览器 bundle 中通过 webpack fallback (`pngjs: false`) 排除，自动降级为程序化噪声。

---

## 数据流

```
用户点击地图
    │
    ▼
Leaflet (ESRI 瓦片底图)
    │  坐标
    ▼
ESRI MapServer Export → 卫星 JPEG URL（客户端直接构建）
    │  URL + bounds
    ▼
SceneGenerator（客户端异步）
    ├─ Overpass API → OSM 建筑 footprint
    ├─ AWS Terrain Tiles → 真实高程（仅服务端/Node）
    └─ 平滑 value noise → 程序化高程（浏览器）
         │
         ▼
Three.js WebGL
    ├─ 128×128 地形网格 + 卫星纹理（PBR）
    └─ OSM 建筑体块（合并 draw call）
```

---

## UI 设计系统

**主题：** Apple Maps 深色风格

| Token | Value |
|-------|-------|
| 背景 | `#000000`（地图透出） |
| 面板 | `rgba(12,12,14,0.88)` + `backdrop-filter: blur(28px) saturate(180%)` |
| 面板边框 | `rgba(255,255,255,0.07)` |
| 强调蓝 | `#0A84FF` |
| 强调绿 | `#30D158` |
| 危险红 | `#FF453A` |
| 主文字 | `#FFFFFF` |
| 次文字 | `rgba(235,235,245,0.6)` |
| 字体 | `-apple-system, "SF Pro Display", "Helvetica Neue"` |
| 等宽字体 | `"SF Mono", Menlo, Monaco, "Courier New"` |

---

## 环境变量

`.env.local`（可选，Sentinel Hub 高级影像）：

```env
NEXT_PUBLIC_SENTINEL_INSTANCE_ID=...
NEXT_PUBLIC_SENTINEL_CLIENT_ID=...
NEXT_PUBLIC_SENTINEL_CLIENT_SECRET=...
```

未配置时自动使用免费 ESRI 降级方案。

---

## 本地开发

```bash
npm install
npm run dev      # http://localhost:3000
```

---

## 关键依赖

| 包 | 用途 |
|----|------|
| `next` 14 | 框架 + 静态导出 |
| `three` + `@react-three/fiber` + `@react-three/drei` | 3D 渲染 |
| `leaflet` + `react-leaflet` | 交互地图 |
| `pngjs` | Terrarium PNG 解码（仅 Node/服务端） |
| `tailwindcss` | 样式 |

---

## 外部数据源

| 来源 | 用途 | 需要认证 |
|------|------|----------|
| ESRI World Imagery | 地图底图瓦片 | 否 |
| ESRI MapServer Export | 卫星影像下载（1024px） | 否 |
| ESRI World Boundaries & Places | 地名标注 | 否 |
| AWS Terrain Tiles (S3) | 真实 SRTM 高程（服务端） | 否 |
| OpenStreetMap / Overpass API | 建筑 footprint | 否 |
| ESA Sentinel Hub | 高分辨率卫星（可选） | 是（OAuth2） |
