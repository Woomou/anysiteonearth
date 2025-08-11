# Any Site on Earth 🌍

An interactive Next.js application featuring a 3D Earth model for selecting coordinates, fetching high-resolution Sentinel-2 satellite imagery, and generating realistic 3D terrain scenes that can be explored in a street view-like interface.

## Features

- **Interactive 3D Earth Model**: Click anywhere on a photorealistic Earth to select coordinates
- **Sentinel-2 Satellite Imagery**: Fetch the latest high-resolution satellite images from ESA's Copernicus program
- **3D Terrain Generation**: Convert satellite imagery into explorable 3D terrain with height maps
- **Real-time 3D Scene Viewer**: Explore generated 3D landscapes with camera controls
- **Responsive Design**: Works across desktop and mobile devices

## Technology Stack

- **Framework**: Next.js 14 with TypeScript
- **3D Graphics**: Three.js with React Three Fiber
- **Styling**: Tailwind CSS
- **Satellite Data**: Sentinel Hub API (Sentinel-2 imagery)
- **UI Components**: Lucide React icons

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Sentinel Hub account for satellite imagery (optional - fallback images provided)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (optional):
Create a `.env.local` file with your Sentinel Hub credentials:
```bash
NEXT_PUBLIC_SENTINEL_INSTANCE_ID=your_instance_id_here
NEXT_PUBLIC_SENTINEL_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_SENTINEL_CLIENT_SECRET=your_client_secret_here
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Select Location**: Click anywhere on the 3D Earth model to select coordinates
2. **Get Satellite Image**: Click "Get Satellite Image" to fetch Sentinel-2 imagery for the selected location
3. **Generate 3D Scene**: Click "Generate 3D Scene" to create a 3D terrain from the satellite data
4. **Explore**: Use mouse controls to navigate the 3D scene:
   - Left click + drag: Rotate camera
   - Right click + drag: Pan view
   - Mouse wheel: Zoom in/out

## API Endpoints

- `POST /api/satellite` - Fetch Sentinel-2 satellite imagery for coordinates
- `POST /api/generate-scene` - Generate 3D scene data from satellite imagery
- `GET /api/placeholder-earth-texture` - Fallback Earth texture generation

## Sentinel Hub Setup

To use real Sentinel-2 satellite imagery:

1. Create an account at [Sentinel Hub](https://www.sentinel-hub.com/)
2. Create a new configuration instance
3. Get your Instance ID, Client ID, and Client Secret
4. Add them to your `.env.local` file

Without these credentials, the app will use procedurally generated placeholder imagery.

## Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Main application page
├── components/         # React components
│   ├── EarthModel.tsx          # 3D Earth component
│   ├── CoordinateDisplay.tsx   # Coordinate controls
│   ├── SatelliteImageViewer.tsx # Satellite image display
│   └── Scene3DViewer.tsx       # 3D terrain viewer
├── lib/                # Utilities and services
│   ├── constants.ts    # App constants
│   ├── sentinel.ts     # Sentinel Hub API client
│   └── sceneGenerator.ts # 3D scene generation
└── types/              # TypeScript type definitions
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Key Technologies

- **React Three Fiber**: Declarative Three.js in React
- **@react-three/drei**: Useful helpers for R3F
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type safety and better development experience

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Sentinel Hub](https://www.sentinel-hub.com/) for satellite imagery API
- [ESA Copernicus](https://www.copernicus.eu/) for Sentinel-2 data
- [Three.js](https://threejs.org/) for 3D graphics
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) for React integration
