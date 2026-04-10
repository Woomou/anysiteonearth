import { Coordinates, SatelliteImageData, Scene3DData } from '@/types';

// ─── Terrain tile helpers (AWS Terrain Tiles, terrarium format) ──────────────
// URL: https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
// Elevation (meters) = (R * 256 + G + B / 256) - 32768

function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

// Pixel coords within a 256x256 tile (0–255)
function latLngToTilePixel(lat: number, lng: number, zoom: number, tx: number, ty: number) {
  const n = Math.pow(2, zoom);
  const px = ((lng + 180) / 360) * n * 256 - tx * 256;
  const latRad = (lat * Math.PI) / 180;
  const py =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * 256 -
    ty * 256;
  return { px: Math.floor(px), py: Math.floor(py) };
}

/**
 * Fetch a terrarium terrain tile and decode its elevation data.
 * Returns a 256x256 Float32Array of elevation in metres.
 * Falls back to null if the fetch fails (network, CORS, etc.).
 */
async function fetchTerrainTile(z: number, x: number, y: number): Promise<Float32Array | null> {
  // Terrain tiles require Node.js Buffer + pngjs for PNG decoding; skip in the browser
  // (CORS also blocks S3 terrain tiles from browsers). Procedural fallback handles this.
  if (typeof window !== 'undefined') return null;

  try {
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;

    const buf = Buffer.from(await res.arrayBuffer());

    // Minimal PNG decoder – extract raw IDAT RGB pixels via Node built-ins.
    // We use the `pngjs` package if available, otherwise fall back to null.
    try {
      // Dynamic import so it doesn't break if pngjs isn't installed
      const { PNG } = await import('pngjs') as any;
      return await new Promise<Float32Array>((resolve, reject) => {
        const png = new PNG();
        png.parse(buf, (err: Error, data: any) => {
          if (err) return reject(err);
          const pixels = data.data; // RGBA, 256*256*4 bytes
          const elev = new Float32Array(256 * 256);
          for (let i = 0; i < 256 * 256; i++) {
            const r = pixels[i * 4];
            const g = pixels[i * 4 + 1];
            const b = pixels[i * 4 + 2];
            elev[i] = r * 256 + g + b / 256 - 32768;
          }
          resolve(elev);
        });
      });
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Build a gridSize×gridSize heightmap covering the bounding box around
 * `coordinates` using real elevation tiles (zoom 11, ~78 m/px at equator).
 * Falls back to procedural noise if tiles are unavailable.
 */
async function buildHeightMap(
  coordinates: Coordinates,
  gridSize = 64
): Promise<number[][]> {
  const zoom = 11;
  const { x: tx, y: ty } = latLngToTile(coordinates.lat, coordinates.lng, zoom);

  // 10 km bounding box in degrees
  const kmLat = 1 / 110.54;
  const kmLng = 1 / (111.32 * Math.cos((coordinates.lat * Math.PI) / 180));
  const halfKm = 5;
  const latMin = coordinates.lat - halfKm * kmLat;
  const latMax = coordinates.lat + halfKm * kmLat;
  const lngMin = coordinates.lng - halfKm * kmLng;
  const lngMax = coordinates.lng + halfKm * kmLng;

  // We only need the single tile that covers the centre point
  const tile = await fetchTerrainTile(zoom, tx, ty);

  const heightMap: number[][] = [];

  if (tile) {
    // Sample tile at gridSize×gridSize positions within the bbox
    let elevMin = Infinity;
    let elevMax = -Infinity;
    const raw: number[][] = [];

    for (let row = 0; row < gridSize; row++) {
      raw[row] = [];
      const lat = latMax - (row / (gridSize - 1)) * (latMax - latMin);
      for (let col = 0; col < gridSize; col++) {
        const lng = lngMin + (col / (gridSize - 1)) * (lngMax - lngMin);
        const { px, py } = latLngToTilePixel(lat, lng, zoom, tx, ty);
        const px2 = Math.max(0, Math.min(255, px));
        const py2 = Math.max(0, Math.min(255, py));
        const elev = tile[py2 * 256 + px2];
        raw[row][col] = elev;
        if (elev < elevMin) elevMin = elev;
        if (elev > elevMax) elevMax = elev;
      }
    }

    // Normalise to [0, 1]
    const range = elevMax - elevMin || 1;
    for (let row = 0; row < gridSize; row++) {
      heightMap[row] = [];
      for (let col = 0; col < gridSize; col++) {
        heightMap[row][col] = (raw[row][col] - elevMin) / range;
      }
    }
  } else {
    // Procedural fallback – multi-octave value noise, no DOM needed
    for (let row = 0; row < gridSize; row++) {
      heightMap[row] = [];
      for (let col = 0; col < gridSize; col++) {
        let h = 0;
        let freq = 0.06;
        let amp = 0.5;
        for (let oct = 0; oct < 5; oct++) {
          h += amp * valueNoise(col * freq + oct * 31.7, row * freq + oct * 17.3);
          freq *= 2.1;
          amp *= 0.5;
        }
        heightMap[row][col] = Math.max(0, Math.min(1, h * 0.5 + 0.5));
      }
    }
  }

  return heightMap;
}

/** Deterministic value noise (no DOM, no Math.random) */
function valueNoise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export class SceneGenerator {
  async generateScene3D(
    satelliteData: SatelliteImageData,
    coordinates: Coordinates
  ): Promise<Scene3DData> {
    const heightMap = await buildHeightMap(coordinates, 64);

    return {
      heightMap,
      // Satellite image is already a usable texture URL – no canvas processing needed
      textureUrl: satelliteData.url,
      dimensions: {
        width: heightMap[0]?.length ?? 64,
        height: heightMap.length ?? 64,
      },
    };
  }

  calculateCameraPosition(
    heightMap: number[][],
    _width: number,
    _height: number
  ): [number, number, number] {
    let maxH = 0;
    for (const row of heightMap) for (const v of row) if (v > maxH) maxH = v;
    return [0, maxH * 3 + 2, 5];
  }
}
