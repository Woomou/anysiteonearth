import axios from 'axios';
import { Coordinates, SatelliteImageData } from '@/types';

// Sentinel Hub API endpoints
const SENTINEL_CONFIG_API = 'https://services.sentinel-hub.com/configuration/v1';
const SENTINEL_PROCESS_API = 'https://services.sentinel-hub.com/api/v1/process';

interface SentinelConfig {
  instanceId?: string;
  clientId?: string;
  clientSecret?: string;
}

export class SentinelService {
  private config: SentinelConfig;
  private accessToken: string | null = null;

  constructor(config: SentinelConfig) {
    this.config = config;
  }

  // Get OAuth token for Sentinel Hub API
  async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    try {
      const response = await axios.post(
        'https://services.sentinel-hub.com/oauth/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.clientId || '',
          client_secret: this.config.clientSecret || '',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      return this.accessToken!;
    } catch (error) {
      console.error('Failed to get access token:', error);
      throw new Error('Authentication failed');
    }
  }

  // Create bounding box from coordinates
  private createBoundingBox(coordinates: Coordinates, sizeKm: number = 5): number[] {
    const kmToDegreesLat = 1 / 110.54; // Approximately
    const kmToDegreesLng = 1 / (111.32 * Math.cos(coordinates.lat * Math.PI / 180));
    
    const latRadius = (sizeKm / 2) * kmToDegreesLat;
    const lngRadius = (sizeKm / 2) * kmToDegreesLng;
    
    return [
      coordinates.lng - lngRadius, // west
      coordinates.lat - latRadius, // south
      coordinates.lng + lngRadius, // east
      coordinates.lat + latRadius  // north
    ];
  }

  // Get the latest Sentinel-2 image for coordinates
  async getSatelliteImage(coordinates: Coordinates, width: number = 1024, height: number = 1024): Promise<SatelliteImageData> {
    try {
      const bbox = this.createBoundingBox(coordinates, 10); // 10km area
      const token = await this.getAccessToken();
      
      const requestBody = {
        input: {
          bounds: {
            bbox: bbox,
            properties: {
              crs: "http://www.opengis.net/def/crs/EPSG/0/4326"
            }
          },
          data: [
            {
              type: "sentinel-2-l2a",
              dataFilter: {
                timeRange: {
                  from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
                  to: new Date().toISOString()
                }
              }
            }
          ]
        },
        output: {
          width: width,
          height: height,
          responses: [
            {
              identifier: "default",
              format: {
                type: "image/jpeg"
              }
            }
          ]
        },
        evalscript: `
          //VERSION=3
          function setup() {
            return {
              input: ["B02", "B03", "B04"],
              output: { bands: 3 }
            };
          }
          
          function evaluatePixel(sample) {
            return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
          }
        `
      };

      const response = await axios.post(SENTINEL_PROCESS_API, requestBody, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        responseType: 'blob'
      });

      // Convert blob to base64 URL
      const blob = response.data;
      const base64 = await this.blobToBase64(blob);
      
      return {
        url: base64,
        date: new Date().toISOString(),
        cloudCoverage: 0, // Would need cloud detection API call
        bounds: {
          north: bbox[3],
          south: bbox[1],
          east: bbox[2],
          west: bbox[0]
        }
      };
    } catch (error) {
      console.error('Failed to get satellite image:', error);
      
      // Fallback: return a placeholder satellite image
      return this.getPlaceholderSatelliteImage(coordinates);
    }
  }

  // Convert blob to base64 data URL
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Fallback placeholder satellite image
  private async getPlaceholderSatelliteImage(coordinates: Coordinates): Promise<SatelliteImageData> {
    const bbox = this.createBoundingBox(coordinates, 10);
    
    // Generate a simple procedural satellite-like image
    const canvas = document.createElement ? 
      document.createElement('canvas') : 
      null;
      
    if (!canvas) {
      // Return a simple data URL for server-side
      return {
        url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAoHBwkHBgoJCAkLCwoMDxkQDw4ODx4WFxIZJCAmJSMgIyIoLTkwKCo2KyIjMkQyNjs9QEBAJjBGS0U+Sjk/QD3/2wBDAQsLCw8NDx0QEB09KSMpPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT3/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        date: new Date().toISOString(),
        cloudCoverage: 0,
        bounds: {
          north: bbox[3],
          south: bbox[1],
          east: bbox[2],
          west: bbox[0]
        }
      };
    }
    
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    // Create a satellite-like terrain pattern
    const imageData = ctx.createImageData(1024, 1024);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % 1024;
      const y = Math.floor((i / 4) / 1024);
      
      // Generate terrain-like colors based on position and noise
      const noise = Math.sin(x * 0.01) * Math.cos(y * 0.01) * 127 + 127;
      const green = Math.min(255, 80 + noise * 0.5);
      const brown = Math.min(255, 60 + noise * 0.3);
      
      data[i] = brown;     // Red
      data[i + 1] = green; // Green
      data[i + 2] = 40;    // Blue
      data[i + 3] = 255;   // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return {
      url: canvas.toDataURL('image/jpeg', 0.8),
      date: new Date().toISOString(),
      cloudCoverage: 15,
      bounds: {
        north: bbox[3],
        south: bbox[1],
        east: bbox[2],
        west: bbox[0]
      }
    };
  }
}

// Create singleton instance
export const sentinelService = new SentinelService({
  instanceId: process.env.NEXT_PUBLIC_SENTINEL_INSTANCE_ID,
  clientId: process.env.NEXT_PUBLIC_SENTINEL_CLIENT_ID,
  clientSecret: process.env.NEXT_PUBLIC_SENTINEL_CLIENT_SECRET,
});