import { Coordinates, SatelliteImageData, Scene3DData } from '@/types';

export class SceneGenerator {
  // Generate height map from satellite image
  async generateHeightMapFromImage(imageUrl: string, width: number = 256, height: number = 256): Promise<number[][]> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const heightMap: number[][] = [];
        
        for (let y = 0; y < height; y++) {
          heightMap[y] = [];
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            // Use green channel for vegetation/height estimation
            // Convert RGB to grayscale and normalize to height
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Enhanced height calculation based on terrain characteristics
            let heightValue = 0;
            
            // Vegetation detection (high green values)
            if (g > r && g > b && g > 100) {
              heightValue = 0.3 + (g / 255) * 0.7; // Trees/vegetation
            }
            // Water detection (high blue, low others)
            else if (b > r && b > g && b > 120) {
              heightValue = -0.2; // Water level
            }
            // Urban/rock detection (balanced RGB or high overall)
            else if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && (r + g + b) / 3 > 150) {
              heightValue = 0.1 + ((r + g + b) / 765) * 0.4; // Urban/rocky areas
            }
            // Desert/sand (high red/yellow)
            else if (r > 150 && g > 120 && b < 100) {
              heightValue = 0.05 + Math.random() * 0.1; // Sandy areas with slight variation
            }
            // General terrain
            else {
              const grayscale = (r + g + b) / 3;
              heightValue = (grayscale / 255) * 0.5;
            }
            
            // Add some noise for realism
            heightValue += (Math.random() - 0.5) * 0.05;
            heightMap[y][x] = Math.max(-0.5, Math.min(1.0, heightValue));
          }
        }
        
        resolve(heightMap);
      };
      
      img.onerror = () => {
        // Fallback: generate procedural heightmap
        resolve(this.generateProceduralHeightMap(width, height));
      };
      
      img.src = imageUrl;
    });
  }

  // Generate procedural height map as fallback
  private generateProceduralHeightMap(width: number, height: number): number[][] {
    const heightMap: number[][] = [];
    
    for (let y = 0; y < height; y++) {
      heightMap[y] = [];
      for (let x = 0; x < width; x++) {
        // Multi-octave noise for realistic terrain
        let height = 0;
        let frequency = 0.01;
        let amplitude = 0.5;
        
        for (let i = 0; i < 4; i++) {
          height += amplitude * this.noise(x * frequency, y * frequency);
          frequency *= 2;
          amplitude *= 0.5;
        }
        
        heightMap[y][x] = Math.max(-0.2, Math.min(0.8, height));
      }
    }
    
    return heightMap;
  }

  // Simple noise function for procedural generation
  private noise(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }

  // Generate enhanced texture from satellite image
  async generateEnhancedTexture(imageUrl: string, width: number = 1024, height: number = 1024): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Apply enhancement filters
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Enhance contrast and saturation
        for (let i = 0; i < data.length; i += 4) {
          // Increase contrast
          data[i] = Math.min(255, (data[i] - 128) * 1.2 + 128);     // R
          data[i + 1] = Math.min(255, (data[i + 1] - 128) * 1.2 + 128); // G
          data[i + 2] = Math.min(255, (data[i + 2] - 128) * 1.2 + 128); // B
          
          // Enhance vegetation
          if (data[i + 1] > data[i] && data[i + 1] > data[i + 2]) {
            data[i + 1] = Math.min(255, data[i + 1] * 1.1);
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      
      img.onerror = () => {
        resolve(imageUrl); // Return original if enhancement fails
      };
      
      img.src = imageUrl;
    });
  }

  // Generate complete 3D scene data
  async generateScene3D(satelliteData: SatelliteImageData, coordinates: Coordinates): Promise<Scene3DData> {
    const heightMap = await this.generateHeightMapFromImage(satelliteData.url);
    const enhancedTexture = await this.generateEnhancedTexture(satelliteData.url);
    
    return {
      heightMap,
      textureUrl: enhancedTexture,
      dimensions: {
        width: heightMap[0]?.length || 256,
        height: heightMap.length || 256,
      }
    };
  }

  // Calculate optimal camera position for 3D scene
  calculateCameraPosition(heightMap: number[][], width: number, height: number): [number, number, number] {
    // Find average height and highest point
    let totalHeight = 0;
    let maxHeight = -Infinity;
    let count = 0;
    
    for (let y = 0; y < heightMap.length; y++) {
      for (let x = 0; x < heightMap[y].length; x++) {
        totalHeight += heightMap[y][x];
        maxHeight = Math.max(maxHeight, heightMap[y][x]);
        count++;
      }
    }
    
    const avgHeight = totalHeight / count;
    const cameraHeight = Math.max(avgHeight + 2, maxHeight + 1);
    
    return [0, cameraHeight, 5];
  }
}