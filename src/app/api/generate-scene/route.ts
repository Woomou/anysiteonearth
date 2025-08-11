import { NextRequest, NextResponse } from 'next/server';
import { SceneGenerator } from '@/lib/sceneGenerator';

export async function POST(request: NextRequest) {
  try {
    const { satelliteData, coordinates } = await request.json();
    
    if (!satelliteData || !coordinates) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }
    
    const sceneGenerator = new SceneGenerator();
    const scene3DData = await sceneGenerator.generateScene3D(satelliteData, coordinates);
    
    return NextResponse.json(scene3DData);
  } catch (error) {
    console.error('Scene generation error:', error);
    return NextResponse.json({ error: 'Failed to generate 3D scene' }, { status: 500 });
  }
}