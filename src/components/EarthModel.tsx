'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Sphere, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Coordinates } from '@/types';

interface EarthModelProps {
  onCoordinateSelect: (coordinates: Coordinates) => void;
  selectedCoordinates?: Coordinates | null;
}

function Earth({ onCoordinateSelect, selectedCoordinates }: EarthModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Load Earth textures - using placeholder URLs for now
  const earthTexture = useTexture('/api/placeholder-earth-texture');
  
  // Convert lat/lng to 3D coordinates on sphere
  const latLngToVector3 = useCallback((lat: number, lng: number, radius = 5) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }, []);

  // Convert 3D point to lat/lng
  const vector3ToLatLng = useCallback((vector: THREE.Vector3): Coordinates => {
    const radius = vector.length();
    const lat = 90 - (Math.acos(vector.y / radius) * 180 / Math.PI);
    const lng = (Math.atan2(vector.z, -vector.x) * 180 / Math.PI) - 180;
    
    return { lat, lng };
  }, []);

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!meshRef.current) return;
    
    event.stopPropagation();
    const clickPoint = event.point;
    const coordinates = vector3ToLatLng(clickPoint);
    onCoordinateSelect(coordinates);
  }, [onCoordinateSelect, vector3ToLatLng]);

  useFrame((state) => {
    if (meshRef.current && !hovered) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group>
      <Sphere
        ref={meshRef}
        args={[5, 64, 64]}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshPhongMaterial
          map={earthTexture}
          transparent
          opacity={0.9}
        />
      </Sphere>
      
      {/* Selected coordinate marker */}
      {selectedCoordinates && (
        <mesh position={latLngToVector3(selectedCoordinates.lat, selectedCoordinates.lng, 5.1)}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}
      
      {/* Atmosphere glow */}
      <Sphere args={[5.2, 32, 32]}>
        <meshBasicMaterial
          color="#4da6ff"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

export default function EarthModel({ onCoordinateSelect, selectedCoordinates }: EarthModelProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{
          position: [0, 0, 15],
          fov: 45,
        }}
        style={{ background: '#000011' }}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Earth 
          onCoordinateSelect={onCoordinateSelect}
          selectedCoordinates={selectedCoordinates}
        />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          zoomSpeed={0.6}
          panSpeed={0.5}
          rotateSpeed={0.4}
          minDistance={7}
          maxDistance={50}
        />
      </Canvas>
    </div>
  );
}