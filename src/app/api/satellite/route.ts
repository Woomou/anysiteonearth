import { NextRequest, NextResponse } from 'next/server';
import { sentinelService } from '@/lib/sentinel';

export async function POST(request: NextRequest) {
  try {
    const { coordinates, width = 1024, height = 1024 } = await request.json();
    
    if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }
    
    const imageData = await sentinelService.getSatelliteImage(coordinates, width, height);
    
    return NextResponse.json(imageData);
  } catch (error) {
    console.error('Satellite API error:', error);
    return NextResponse.json({ error: 'Failed to fetch satellite image' }, { status: 500 });
  }
}