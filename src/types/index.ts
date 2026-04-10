export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Region {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface SatelliteImageData {
  url: string;
  date: string;
  cloudCoverage: number;
  bounds: Region;
}

export interface Scene3DData {
  heightMap: number[][];
  textureUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
}