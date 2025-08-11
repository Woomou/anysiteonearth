'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Scene3DData, Coordinates } from '@/types';

interface Scene3DViewerProps {
  sceneData: Scene3DData | null;
  coordinates: Coordinates | null;
  onCameraMove?: (position: [number, number, number], rotation: [number, number, number]) => void;
}

function TerrainMesh({ sceneData, coordinates }: { sceneData: Scene3DData; coordinates: Coordinates | null }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Load texture
  useEffect(() => {
    if (sceneData.textureUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(sceneData.textureUrl, (loadedTexture) => {
        loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        loadedTexture.minFilter = THREE.LinearFilter;
        setTexture(loadedTexture);
      });
    }
  }, [sceneData.textureUrl]);

  // Create terrain geometry from height map
  const geometry = useMemo(() => {
    const { heightMap, dimensions } = sceneData;
    const { width, height } = dimensions;
    
    if (!heightMap || heightMap.length === 0) return new THREE.PlaneGeometry(10, 10, 32, 32);
    
    const geometry = new THREE.PlaneGeometry(10, 10, width - 1, height - 1);
    const vertices = geometry.attributes.position;
    
    // Apply height map to vertices
    for (let i = 0; i < vertices.count; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      
      if (y < heightMap.length && x < heightMap[y].length) {
        const heightValue = heightMap[y][x];
        vertices.setZ(i, heightValue * 3); // Scale height
      }
    }
    
    vertices.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }, [sceneData]);

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshLambertMaterial
        map={texture}
        side={THREE.DoubleSide}
        transparent={!texture}
        opacity={texture ? 1 : 0.7}
        color={texture ? 0xffffff : 0x567d46}
      />
    </mesh>
  );
}

function Scene3D({ sceneData, coordinates, onCameraMove }: Scene3DViewerProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (cameraRef.current && controlsRef.current && onCameraMove) {
      const position = cameraRef.current.position;
      const rotation = cameraRef.current.rotation;
      onCameraMove(
        [position.x, position.y, position.z],
        [rotation.x, rotation.y, rotation.z]
      );
    }
  });

  if (!sceneData) {
    return (
      <mesh>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial color="#567d46" transparent opacity={0.3} />
      </mesh>
    );
  }

  return (
    <>
      <TerrainMesh sceneData={sceneData} coordinates={coordinates} />
      
      {/* Add some basic lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      {/* Add fog for depth */}
      <fog attach="fog" args={['#87CEEB', 10, 50]} />
      
      {/* Location marker if coordinates are available */}
      {coordinates && (
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}
    </>
  );
}

function CameraController({ sceneData }: { sceneData: Scene3DData | null }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useEffect(() => {
    if (cameraRef.current && sceneData) {
      // Position camera for optimal viewing
      const avgHeight = sceneData.heightMap?.length ? 
        sceneData.heightMap.flat().reduce((a, b) => a + b, 0) / (sceneData.heightMap.length * sceneData.heightMap[0].length) : 0;
      
      cameraRef.current.position.set(0, Math.max(2, avgHeight + 3), 8);
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, [sceneData]);

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={75}
      near={0.1}
      far={100}
      position={[0, 5, 8]}
    />
  );
}

export default function Scene3DViewer({ sceneData, coordinates, onCameraMove }: Scene3DViewerProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-sky-200 to-sky-400">
      <Canvas shadows>
        <CameraController sceneData={sceneData} />
        <Scene3D 
          sceneData={sceneData} 
          coordinates={coordinates}
          onCameraMove={onCameraMove}
        />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          zoomSpeed={0.6}
          panSpeed={0.5}
          rotateSpeed={0.4}
          minDistance={2}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
}