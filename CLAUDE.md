# Any Site on Earth — CLAUDE.md

## Project Overview

Interactive geospatial web app that lets users:
1. **Select a location** on a real satellite map (point or region)
2. **Fetch high-resolution satellite imagery** for that location
3. **Generate a 3D terrain scene** from the imagery

Tech stack: Next.js 14 · React 18 · TypeScript · Three.js · Leaflet · Tailwind CSS

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                   Main UI (Apple-style, full-screen)
│   ├── globals.css                Leaflet + Tailwind base styles
│   ├── layout.tsx                 Root layout
│   └── api/
│       ├── satellite/route.ts     POST /api/satellite  → SatelliteImageData
│       ├── generate-scene/route.ts POST /api/generate-scene → Scene3DData
│       └── placeholder-earth-texture/route.ts  (legacy fallback, unused)
├── components/
│   ├── MapSelector.tsx            Leaflet satellite map, point/region selection
│   ├── Scene3DViewer.tsx          Three.js 3D terrain viewer
│   ├── SatelliteImageViewer.tsx   (legacy, kept for reference)
│   ├── EarthModel.tsx             (legacy 3D globe, replaced by MapSelector)
│   └── CoordinateDisplay.tsx      (legacy, replaced by inline panel in page.tsx)
├── lib/
│   ├── sentinel.ts                Sentinel Hub API client (optional)
│   └── sceneGenerator.ts          Height map + 3D scene generation
└── types/
    └── index.ts                   Coordinates, Region, SatelliteImageData, Scene3DData
```

---

## Three-Phase Workflow

### Phase 1 — Coordinate Selection ✅
**Goal:** Intuitive way to pick a lat/lon point or region.

**Implementation:** `MapSelector.tsx`
- Uses **Leaflet** with **ESRI World Imagery** tiles (free, no API key)
- Labels overlay from ESRI Reference service
- **Point mode**: single click drops a red Apple Maps-style pin
- **Region mode**: click corner 1, then corner 2 → draws a blue rectangle; center becomes selected coordinate
- Smooth `flyTo` animation when a new location is selected
- Mode toggle (Point / Region) floats over the map (bottom-left)

### Phase 2 — Satellite Imagery ✅
**Goal:** Fetch a real satellite image of the selected area.

**Implementation:** `/api/satellite` route
- **Primary (optional):** ESA Sentinel Hub API — requires credentials in `.env.local`
- **Free fallback:** ESRI ArcGIS World Imagery Export (`/MapServer/export`)
  - No authentication required
  - Returns a direct JPEG URL (1024 × 1024 px)
  - Coverage ~10 km × 10 km around the selected point
  - Free for web use under ESRI terms

### Phase 3 — 3D Terrain Generation 🔄 (current: procedural)
**Goal:** Build a 3D Gaussian terrain mesh from the satellite image.

**Current implementation:** `sceneGenerator.ts`
- Procedural height map derived from satellite image RGB channels:
  - Green channel → vegetation height
  - High blue → water (negative elevation)
  - Balanced RGB → urban/rock
  - Red/yellow → sand/desert
- Noise applied for realism
- Rendered with Three.js (react-three-fiber) as a displacement-mapped plane

**Future improvement:** Replace procedural height map with:
- [OpenTopography](https://opentopography.org/) SRTM/Copernicus DEM data for real elevation
- Or 3D Gaussian Splatting pipeline (NeRF-style reconstruction from multi-view imagery)

---

## UI Design System

**Theme:** Apple dark (Apple Maps dark mode inspired)

| Token | Value |
|-------|-------|
| Background | `#000000` (map shows through) |
| Panel | `rgba(12, 12, 14, 0.88)` + `backdrop-filter: blur(28px) saturate(180%)` |
| Panel border | `rgba(255, 255, 255, 0.07)` |
| Accent blue | `#0A84FF` |
| Accent green | `#30D158` |
| Danger red | `#FF453A` |
| Text primary | `#FFFFFF` |
| Text secondary | `rgba(235, 235, 245, 0.6)` |
| Font | `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue"` |
| Font (mono) | `"SF Mono", Menlo, Monaco, "Courier New"` |

**Layout:** Full-screen map + floating header + right-side panel (300 px) + bottom-left mode controls.

---

## Environment Variables

Create `.env.local` (already present with placeholders):

```env
# Optional: Sentinel Hub (ESA Copernicus) — premium satellite imagery
NEXT_PUBLIC_SENTINEL_INSTANCE_ID=...
NEXT_PUBLIC_SENTINEL_CLIENT_ID=...
NEXT_PUBLIC_SENTINEL_CLIENT_SECRET=...

# Not currently used (reserved for future Mapbox integration)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=...
```

If Sentinel Hub is not configured, the app automatically uses the free ESRI fallback.

---

## Running Locally

```bash
npm install
npm run dev      # http://localhost:3000
```

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` | React framework + API routes |
| `three` + `@react-three/fiber` + `@react-three/drei` | 3D scene rendering |
| `leaflet` + `react-leaflet` | Interactive satellite map |
| `axios` | HTTP client (Sentinel Hub) |
| `tailwindcss` | Utility CSS |

---

## Data Sources

| Source | Used for | Auth required |
|--------|----------|---------------|
| ESRI World Imagery | Map tiles (background) | No |
| ESRI World Imagery Export | Satellite image download | No |
| ESRI World Boundaries & Places | Label overlay | No |
| ESA Sentinel Hub | High-res satellite (optional) | Yes (OAuth2) |
