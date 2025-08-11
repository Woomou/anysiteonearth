// Earth constants
export const EARTH_RADIUS = 6371; // km

// Sentinel-2 API configuration
export const SENTINEL_API_BASE = 'https://services.sentinel-hub.com';
export const SENTINEL_INSTANCE_ID = process.env.NEXT_PUBLIC_SENTINEL_INSTANCE_ID || '';

// Map tile URLs
export const EARTH_TEXTURE_URL = '/textures/earth-texture.jpg';
export const EARTH_NORMAL_URL = '/textures/earth-normal.jpg';
export const EARTH_SPECULAR_URL = '/textures/earth-specular.jpg';

// Camera settings
export const CAMERA_CONFIG = {
  position: [0, 0, 15] as [number, number, number],
  fov: 45,
  near: 0.1,
  far: 1000,
};