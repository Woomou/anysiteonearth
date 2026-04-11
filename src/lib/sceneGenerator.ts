import { Coordinates, SatelliteImageData, Scene3DData, BuildingFeature } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCENE_UNITS = 10;      // Three.js scene side length
const EXTENT_KM   = 1;       // Real-world coverage: 1 km × 1 km
const M_PER_UNIT  = (EXTENT_KM * 1000) / SCENE_UNITS; // 100 m per Three.js unit
const TERRAIN_H_SCALE = 3;   // heightmap [0,1] → Three.js units (matches Scene3DViewer)
const DEFAULT_FLOOR_H = 3.5; // metres per floor when no height tag

// ─── Coordinate helpers ───────────────────────────────────────────────────────

function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const φ = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(φ) + 1 / Math.cos(φ)) / Math.PI) / 2) * n);
  return { x, y };
}

function latLngToScene(
  lat: number, lng: number,
  center: Coordinates,
  halfLatDeg: number, halfLngDeg: number,
): { x: number; z: number } {
  const x =  ((lng - center.lng) / halfLngDeg) * (SCENE_UNITS / 2);
  const z = -((lat - center.lat) / halfLatDeg) * (SCENE_UNITS / 2);
  return { x, z };
}

function halfExtents(lat: number, extentKm: number) {
  const halfKm = extentKm / 2;
  return {
    halfLatDeg: halfKm / 110.54,
    halfLngDeg: halfKm / (111.32 * Math.cos((lat * Math.PI) / 180)),
  };
}

// ─── DEM (AWS Terrain Tiles, terrarium) ──────────────────────────────────────

if (typeof window !== 'undefined') {
  // Guard: this file may be imported client-side via Scene3DViewer; DEM fetch is server-only.
}

async function fetchTerrainTile(z: number, x: number, y: number): Promise<Float32Array | null> {
  if (typeof window !== 'undefined') return null;
  try {
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const { PNG } = await import('pngjs') as any;
    return await new Promise<Float32Array>((resolve, reject) => {
      const png = new PNG();
      png.parse(buf, (err: Error, data: any) => {
        if (err) return reject(err);
        const px = data.data as Uint8Array;
        const elev = new Float32Array(256 * 256);
        for (let i = 0; i < 256 * 256; i++) {
          elev[i] = px[i * 4] * 256 + px[i * 4 + 1] + px[i * 4 + 2] / 256 - 32768;
        }
        resolve(elev);
      });
    });
  } catch { return null; }
}

async function buildHeightMap(
  center: Coordinates,
  extentKm: number,
  gridSize = 64,
): Promise<number[][]> {
  const zoom = 13; // ~10 m/px — enough for 1 km scenes
  const { x: tx, y: ty } = latLngToTile(center.lat, center.lng, zoom);
  const tile = await fetchTerrainTile(zoom, tx, ty);
  const { halfLatDeg, halfLngDeg } = halfExtents(center.lat, extentKm);
  const latMin = center.lat - halfLatDeg;
  const latMax = center.lat + halfLatDeg;
  const lngMin = center.lng - halfLngDeg;
  const lngMax = center.lng + halfLngDeg;

  const heightMap: number[][] = [];

  if (tile) {
    const n = 2 ** zoom;
    const raw: number[][] = [];
    let elevMin = Infinity, elevMax = -Infinity;

    for (let row = 0; row < gridSize; row++) {
      raw[row] = [];
      const lat = latMax - (row / (gridSize - 1)) * (latMax - latMin);
      for (let col = 0; col < gridSize; col++) {
        const lng = lngMin + (col / (gridSize - 1)) * (lngMax - lngMin);
        const φ = (lat * Math.PI) / 180;
        const px = Math.floor(((lng + 180) / 360) * n * 256 - tx * 256);
        const py = Math.floor(((1 - Math.log(Math.tan(φ) + 1 / Math.cos(φ)) / Math.PI) / 2) * n * 256 - ty * 256);
        const pxc = Math.max(0, Math.min(255, px));
        const pyc = Math.max(0, Math.min(255, py));
        const elev = tile[pyc * 256 + pxc];
        raw[row][col] = elev;
        if (elev < elevMin) elevMin = elev;
        if (elev > elevMax) elevMax = elev;
      }
    }

    const range = elevMax - elevMin || 1;
    for (let row = 0; row < gridSize; row++) {
      heightMap[row] = raw[row].map(v => (v - elevMin) / range);
    }
  } else {
    // Deterministic procedural fallback
    for (let row = 0; row < gridSize; row++) {
      heightMap[row] = [];
      for (let col = 0; col < gridSize; col++) {
        let h = 0, freq = 0.06, amp = 0.5;
        for (let o = 0; o < 5; o++) {
          const n = Math.sin(col * freq * 127.1 + row * freq * 311.7 + o * 31.7) * 43758.5453;
          h += amp * ((n - Math.floor(n)) * 2 - 1);
          freq *= 2.1; amp *= 0.5;
        }
        heightMap[row][col] = Math.max(0, Math.min(1, h * 0.5 + 0.5));
      }
    }
  }
  return heightMap;
}

// ─── Satellite texture (1 km bbox, high-detail) ───────────────────────────────

function esriTextureUrl(center: Coordinates, extentKm: number): string {
  const { halfLatDeg, halfLngDeg } = halfExtents(center.lat, extentKm);
  const bbox = [
    center.lng - halfLngDeg,
    center.lat - halfLatDeg,
    center.lng + halfLngDeg,
    center.lat + halfLatDeg,
  ].join(',');
  return (
    `https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export` +
    `?bbox=${bbox}&size=1024,1024&bboxSR=4326&imageSR=4326&format=jpg&f=image`
  );
}

// ─── OSM buildings via Overpass ───────────────────────────────────────────────

interface OverpassNode  { type: 'node';  id: number; lat: number; lon: number; }
interface OverpassWay   { type: 'way';   id: number; nodes: number[]; tags?: Record<string, string>; }
type OverpassElement = OverpassNode | OverpassWay;

async function fetchOSMBuildings(
  center: Coordinates,
  extentKm: number,
): Promise<BuildingFeature[]> {
  const { halfLatDeg, halfLngDeg } = halfExtents(center.lat, extentKm);
  const s = center.lat - halfLatDeg;
  const n = center.lat + halfLatDeg;
  const w = center.lng - halfLngDeg;
  const e = center.lng + halfLngDeg;

  const query = `[out:json][timeout:20];(way["building"](${s},${w},${n},${e}););out body;>;out skel qt;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  let elements: OverpassElement[];
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(22_000) });
    if (!res.ok) return [];
    const json = await res.json();
    elements = json.elements as OverpassElement[];
  } catch { return []; }

  // Build node id → lat/lng lookup
  const nodes = new Map<number, { lat: number; lon: number }>();
  for (const el of elements) {
    if (el.type === 'node') nodes.set(el.id, { lat: el.lat, lon: el.lon });
  }

  const buildings: BuildingFeature[] = [];

  for (const el of elements) {
    if (el.type !== 'way') continue;
    const tags = el.tags ?? {};
    if (!tags['building']) continue;

    // Resolve footprint polygon
    const coords = el.nodes
      .map(nid => nodes.get(nid))
      .filter(Boolean) as Array<{ lat: number; lon: number }>;
    if (coords.length < 3) continue;

    // Drop closing duplicate node
    const ring = coords[0].lat === coords[coords.length - 1].lat &&
                 coords[0].lon === coords[coords.length - 1].lon
      ? coords.slice(0, -1)
      : coords;

    const footprint = ring.map(({ lat, lon }) =>
      latLngToScene(lat, lon, center, halfLatDeg, halfLngDeg)
    );

    // Height in metres → Three.js units
    let metres = 0;
    if (tags['height']) {
      metres = parseFloat(tags['height']) || 0;
    } else if (tags['building:levels']) {
      metres = (parseInt(tags['building:levels']) || 1) * DEFAULT_FLOOR_H;
    } else {
      metres = DEFAULT_FLOOR_H * 2; // assume 2-floor default
    }
    const floors = tags['building:levels'] ? parseInt(tags['building:levels']) || 1 : Math.round(metres / DEFAULT_FLOOR_H);
    const height = metres / M_PER_UNIT;

    buildings.push({ id: String(el.id), footprint, height, floors });
  }

  // Limit to 600 buildings for frame-rate safety
  return buildings.slice(0, 600);
}

// ─── Terrain height sampler (for building base) ───────────────────────────────

function sampleTerrainHeight(
  heightMap: number[][],
  sceneX: number,
  sceneZ: number,
): number {
  const rows = heightMap.length;
  const cols = heightMap[0]?.length ?? 0;
  if (!rows || !cols) return 0;
  const u = (sceneX + SCENE_UNITS / 2) / SCENE_UNITS;
  const v = (-sceneZ + SCENE_UNITS / 2) / SCENE_UNITS;
  const col = Math.max(0, Math.min(cols - 1, Math.floor(u * cols)));
  const row = Math.max(0, Math.min(rows - 1, Math.floor(v * rows)));
  return heightMap[row][col] * TERRAIN_H_SCALE;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export class SceneGenerator {
  async generateScene3D(
    _satelliteData: SatelliteImageData,
    coordinates: Coordinates,
  ): Promise<Scene3DData> {
    const extentKm = EXTENT_KM;
    const gridSize = 64;

    // Run DEM + OSM in parallel
    const [heightMap, buildings] = await Promise.all([
      buildHeightMap(coordinates, extentKm, gridSize),
      fetchOSMBuildings(coordinates, extentKm),
    ]);

    return {
      heightMap,
      textureUrl: esriTextureUrl(coordinates, extentKm),
      dimensions: { width: gridSize, height: gridSize },
      buildings,
      extentKm,
    };
  }

  calculateCameraPosition(heightMap: number[][]): [number, number, number] {
    let maxH = 0;
    for (const row of heightMap) for (const v of row) if (v > maxH) maxH = v;
    return [0, maxH * TERRAIN_H_SCALE + 2, 6];
  }
}
