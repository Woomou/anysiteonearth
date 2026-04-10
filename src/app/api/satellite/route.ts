import { NextRequest, NextResponse } from 'next/server';
import { Coordinates, SatelliteImageData } from '@/types';

// Sentinel Hub credentials are considered "configured" when they've been
// replaced from the placeholder values in .env.local
const SENTINEL_CONFIGURED =
  process.env.NEXT_PUBLIC_SENTINEL_CLIENT_ID &&
  process.env.NEXT_PUBLIC_SENTINEL_CLIENT_ID !== 'your_client_id_here';

/**
 * Fetch a satellite image via the ESRI ArcGIS World Imagery export endpoint.
 * No authentication required — uses the public tile service.
 * Returns a direct image URL (JPEG) that the browser can load as an <img> src.
 *
 * ESRI endpoint docs:
 *   https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export
 */
async function getESRISatelliteImage(
  coordinates: Coordinates,
  sizeKm = 10
): Promise<SatelliteImageData> {
  const kmToDegreesLat = 1 / 110.54;
  const kmToDegreesLng = 1 / (111.32 * Math.cos((coordinates.lat * Math.PI) / 180));

  const latR = (sizeKm / 2) * kmToDegreesLat;
  const lngR = (sizeKm / 2) * kmToDegreesLng;

  const bounds = {
    west: coordinates.lng - lngR,
    south: coordinates.lat - latR,
    east: coordinates.lng + lngR,
    north: coordinates.lat + latR,
  };

  const params = new URLSearchParams({
    bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`,
    size: '1024,1024',
    bboxSR: '4326',
    imageSR: '4326',
    format: 'jpg',
    f: 'image',
  });

  const url = `https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?${params}`;

  // Verify the URL is reachable (HEAD request) — fall back gracefully if not
  try {
    const probe = await fetch(url, { method: 'HEAD' });
    if (!probe.ok) throw new Error(`ESRI responded ${probe.status}`);
  } catch (e) {
    console.warn('ESRI World Imagery probe failed:', e);
    throw new Error('ESRI tile service unavailable');
  }

  return {
    url,
    date: new Date().toISOString(),
    cloudCoverage: 0,
    bounds,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { coordinates } = await request.json();

    if (
      !coordinates ||
      typeof coordinates.lat !== 'number' ||
      typeof coordinates.lng !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // 1. Try Sentinel Hub if credentials are configured
    if (SENTINEL_CONFIGURED) {
      try {
        const { sentinelService } = await import('@/lib/sentinel');
        const data = await sentinelService.getSatelliteImage(coordinates);
        return NextResponse.json(data);
      } catch (e) {
        console.warn('Sentinel Hub failed, falling back to ESRI World Imagery:', e);
      }
    }

    // 2. Free fallback: ESRI World Imagery export
    const data = await getESRISatelliteImage(coordinates);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Satellite API error:', error);
    return NextResponse.json({ error: 'Failed to fetch satellite image' }, { status: 500 });
  }
}
