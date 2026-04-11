'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Scene3DData, Coordinates, BuildingFeature } from '@/types';

// ─── Constants (must match sceneGenerator.ts) ─────────────────────────────────
const SCENE_UNITS   = 10;
const TERRAIN_H_SCALE = 1.5; // matches sceneGenerator.ts

// ─── Terrain height sampler (mirrors sceneGenerator logic) ────────────────────

function sampleHeight(heightMap: number[][], sceneX: number, sceneZ: number): number {
  const rows = heightMap.length;
  const cols = heightMap[0]?.length ?? 0;
  if (!rows || !cols) return 0;
  const u   = (sceneX + SCENE_UNITS / 2) / SCENE_UNITS;
  const v   = (-sceneZ + SCENE_UNITS / 2) / SCENE_UNITS;
  const col = Math.max(0, Math.min(cols - 1, Math.floor(u * cols)));
  const row = Math.max(0, Math.min(rows - 1, Math.floor(v * rows)));
  return heightMap[row][col] * TERRAIN_H_SCALE;
}

// ─── Building renderer ────────────────────────────────────────────────────────
// Uses bounding-box BoxGeometry per building — avoids polygon triangulation
// artifacts from inconsistent OSM winding orders.

function BuildingMeshes({ buildings, heightMap }: { buildings: BuildingFeature[]; heightMap: number[][] }) {
  const { geometry, material } = useMemo(() => {
    if (!buildings.length) return { geometry: null, material: null };

    // Palette: slightly varied grays based on floor count
    const buildingColor = 0xd0d4da;

    const geometries: THREE.BufferGeometry[] = [];

    for (const bld of buildings) {
      const fp = bld.footprint;
      if (fp.length < 3) continue;

      // Bounding box of footprint
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const v of fp) {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.z < minZ) minZ = v.z;
        if (v.z > maxZ) maxZ = v.z;
      }

      const w  = Math.max(0.01, maxX - minX);
      const d  = Math.max(0.01, maxZ - minZ);
      const h  = Math.max(0.02, bld.height);
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;

      const terrainY = sampleHeight(heightMap, cx, cz);

      const box = new THREE.BoxGeometry(w, h, d);
      // Translate so base sits on terrain
      box.translate(cx, terrainY + h / 2, cz);
      geometries.push(box);
    }

    if (!geometries.length) return { geometry: null, material: null };

    // Manual merge — all sub-geometries are indexed BoxGeometries
    let totalVerts = 0, totalIdx = 0;
    for (const g of geometries) {
      totalVerts += (g.attributes.position as THREE.BufferAttribute).count;
      totalIdx   += (g.index?.count ?? 0);
    }

    const posArr  = new Float32Array(totalVerts * 3);
    const normArr = new Float32Array(totalVerts * 3);
    const idxArr  = new Uint32Array(totalIdx);

    let vOff = 0, iOff = 0;
    for (const g of geometries) {
      const pos  = g.attributes.position as THREE.BufferAttribute;
      const norm = g.attributes.normal   as THREE.BufferAttribute;
      posArr .set(pos.array  as Float32Array, vOff * 3);
      normArr.set(norm.array as Float32Array, vOff * 3);
      const idx = g.index!;
      for (let i = 0; i < idx.count; i++) idxArr[iOff + i] = idx.array[i] + vOff;
      vOff += pos.count;
      iOff += idx.count;
      g.dispose();
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(posArr,  3));
    merged.setAttribute('normal',   new THREE.BufferAttribute(normArr, 3));
    merged.setIndex(new THREE.BufferAttribute(idxArr, 1));

    const mat = new THREE.MeshLambertMaterial({ color: buildingColor });
    return { geometry: merged, material: mat };
  }, [buildings, heightMap]);

  if (!geometry || !material) return null;
  return <mesh geometry={geometry} material={material} />;
}

// ─── Terrain mesh ─────────────────────────────────────────────────────────────

function TerrainMesh({ sceneData }: { sceneData: Scene3DData }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (sceneData.textureUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(sceneData.textureUrl, (t) => {
        t.wrapS = THREE.ClampToEdgeWrapping;
        t.wrapT = THREE.ClampToEdgeWrapping;
        t.minFilter = THREE.LinearFilter;
        setTexture(t);
      });
    }
  }, [sceneData.textureUrl]);

  const geometry = useMemo(() => {
    const { heightMap, dimensions } = sceneData;
    const { width, height } = dimensions;

    if (!heightMap?.length) return new THREE.PlaneGeometry(SCENE_UNITS, SCENE_UNITS, 32, 32);

    const geo = new THREE.PlaneGeometry(SCENE_UNITS, SCENE_UNITS, width - 1, height - 1);
    const verts = geo.attributes.position;

    for (let i = 0; i < verts.count; i++) {
      const col = i % width;
      const row = Math.floor(i / width);
      if (row < heightMap.length && col < heightMap[row].length) {
        verts.setZ(i, heightMap[row][col] * TERRAIN_H_SCALE);
      }
    }
    verts.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [sceneData]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
      <meshStandardMaterial
        map={texture ?? undefined}
        color={texture ? 0xffffff : 0x7aab5a}
        roughness={0.88}
        metalness={0.0}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// ─── Scene root ───────────────────────────────────────────────────────────────

interface Scene3DViewerProps {
  sceneData: Scene3DData | null;
  coordinates: Coordinates | null;
  onCameraMove?: (position: [number, number, number], rotation: [number, number, number]) => void;
}

function Scene3D({ sceneData, onCameraMove }: Scene3DViewerProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame(() => {
    if (cameraRef.current && onCameraMove) {
      const p = cameraRef.current.position;
      const r = cameraRef.current.rotation;
      onCameraMove([p.x, p.y, p.z], [r.x, r.y, r.z]);
    }
  });

  if (!sceneData) {
    return (
      <mesh>
        <planeGeometry args={[SCENE_UNITS, SCENE_UNITS]} />
        <meshBasicMaterial color="#567d46" transparent opacity={0.3} />
      </mesh>
    );
  }

  return (
    <>
      <TerrainMesh sceneData={sceneData} />

      {sceneData.buildings && sceneData.buildings.length > 0 && (
        <BuildingMeshes
          buildings={sceneData.buildings}
          heightMap={sceneData.heightMap}
        />
      )}

      {/* Outdoor PBR lighting rig */}
      <hemisphereLight args={['#c9e8ff', '#4a7c3f', 0.9]} />
      <directionalLight
        position={[12, 20, 8]}
        intensity={2.0}
        color="#fff8e8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
      />
      {/* Soft sky fill from opposite side */}
      <directionalLight position={[-6, 10, -5]} intensity={0.35} color="#aad4ff" />

      <fog attach="fog" args={['#c9dff5', 20, 60]} />
    </>
  );
}

function CameraController({ sceneData }: { sceneData: Scene3DData | null }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useEffect(() => {
    if (cameraRef.current && sceneData?.heightMap?.length) {
      const flat = sceneData.heightMap.flat();
      const avg = flat.reduce((a, b) => a + b, 0) / flat.length;
      cameraRef.current.position.set(0, Math.max(5, avg * TERRAIN_H_SCALE + 6), 10);
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, [sceneData]);

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={55}
      near={0.1}
      far={150}
      position={[0, 10, 10]}
    />
  );
}

// ─── Attribution bar ──────────────────────────────────────────────────────────

function Attribution() {
  return (
    <div style={{
      position: 'absolute',
      bottom: 6,
      right: 8,
      fontSize: 10,
      color: 'rgba(255,255,255,0.45)',
      pointerEvents: 'none',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
      textAlign: 'right',
      lineHeight: 1.4,
    }}>
      Imagery © Esri, Maxar, Earthstar Geographics<br />
      Elevation © AWS Terrain Tiles · Buildings © OpenStreetMap
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function Scene3DViewer({ sceneData, coordinates, onCameraMove }: Scene3DViewerProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'linear-gradient(to bottom, #7ab4d8 0%, #b8d8ee 100%)' }}>
      <Canvas shadows>
        <CameraController sceneData={sceneData} />
        <Scene3D sceneData={sceneData} coordinates={coordinates} onCameraMove={onCameraMove} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          zoomSpeed={0.6}
          panSpeed={0.5}
          rotateSpeed={0.4}
          minDistance={1.5}
          maxDistance={35}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
      <Attribution />
    </div>
  );
}
