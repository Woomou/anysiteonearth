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

/** One OSM building footprint, already projected into Three.js local space. */
export interface BuildingFeature {
  id: string;
  /** Polygon vertices in scene coords. Scene is 10×10 units = extentKm×extentKm km. */
  footprint: Array<{ x: number; z: number }>;
  /** Height in Three.js units. */
  height: number;
  floors: number;
}

export interface Scene3DData {
  heightMap: number[][];
  textureUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
  buildings?: BuildingFeature[];
  /** Side length of the scene in km (default 1). 1 Three.js unit = extentKm/10 km. */
  extentKm?: number;
}