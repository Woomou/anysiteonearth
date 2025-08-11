export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SatelliteImageData {
  url: string;
  date: string;
  cloudCoverage: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface Scene3DData {
  heightMap: number[][];
  textureUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
}