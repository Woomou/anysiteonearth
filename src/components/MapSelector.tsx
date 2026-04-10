'use client';

import 'leaflet/dist/leaflet.css';
import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Rectangle,
  CircleMarker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L, { LatLngBoundsExpression } from 'leaflet';
import { Coordinates, Region } from '@/types';

// Apple Maps-style red pin using inline SVG
function createPinIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="pin-shadow" x="-30%" y="-10%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.45)"/>
        </filter>
      </defs>
      <path d="M15 1C7.268 1 1 7.268 1 15c0 11.25 14 26 14 26S29 26.25 29 15C29 7.268 22.732 1 15 1z"
        fill="#FF3B30" filter="url(#pin-shadow)" stroke="white" stroke-width="1.5"/>
      <circle cx="15" cy="15" r="6" fill="white"/>
      <circle cx="15" cy="15" r="3" fill="#FF3B30"/>
    </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
  });
}

interface MapSelectorProps {
  onCoordinateSelect: (coords: Coordinates) => void;
  selectedCoordinates: Coordinates | null;
  onRegionSelect?: (region: Region) => void;
  selectedRegion?: Region | null;
  selectionMode: 'point' | 'region';
}

// Handles all map click/mousemove events for both modes
function MapInteraction({
  selectionMode,
  onCoordinateSelect,
  onRegionSelect,
  setDraftBounds,
  firstCorner,
  setFirstCorner,
}: {
  selectionMode: 'point' | 'region';
  onCoordinateSelect: (c: Coordinates) => void;
  onRegionSelect?: (r: Region) => void;
  setDraftBounds: (b: LatLngBoundsExpression | null) => void;
  firstCorner: L.LatLng | null;
  setFirstCorner: (v: L.LatLng | null) => void;
}) {
  const map = useMapEvents({
    click(e) {
      if (selectionMode === 'point') {
        onCoordinateSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else {
        if (!firstCorner) {
          setFirstCorner(e.latlng);
        } else {
          const b = L.latLngBounds(firstCorner, e.latlng);
          const region: Region = {
            north: b.getNorth(),
            south: b.getSouth(),
            east: b.getEast(),
            west: b.getWest(),
          };
          onRegionSelect?.(region);
          onCoordinateSelect({
            lat: b.getCenter().lat,
            lng: b.getCenter().lng,
          });
          setFirstCorner(null);
          setDraftBounds(null);
        }
      }
    },
    mousemove(e) {
      if (selectionMode === 'region' && firstCorner) {
        const b = L.latLngBounds(firstCorner, e.latlng);
        setDraftBounds([
          [b.getSouth(), b.getWest()],
          [b.getNorth(), b.getEast()],
        ]);
      }
    },
  });

  useEffect(() => {
    const el = map.getContainer();
    if (selectionMode === 'region') {
      el.style.cursor = firstCorner ? 'crosshair' : 'cell';
    } else {
      el.style.cursor = '';
    }
    return () => {
      el.style.cursor = '';
    };
  }, [selectionMode, firstCorner, map]);

  // Reset on mode change
  useEffect(() => {
    setFirstCorner(null);
    setDraftBounds(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionMode]);

  return null;
}

// Smooth fly-to animation when coordinates change
function FlyTo({ coords }: { coords: Coordinates | null }) {
  const map = useMap();
  const prevKey = useRef('');

  useEffect(() => {
    if (!coords) return;
    const key = `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
    if (key === prevKey.current) return;
    prevKey.current = key;
    map.flyTo([coords.lat, coords.lng], Math.max(map.getZoom(), 13), {
      duration: 1.4,
      easeLinearity: 0.25,
    });
  }, [coords, map]);

  return null;
}

export default function MapSelector({
  onCoordinateSelect,
  selectedCoordinates,
  onRegionSelect,
  selectedRegion,
  selectionMode,
}: MapSelectorProps) {
  const [pinIcon, setPinIcon] = useState<L.DivIcon | null>(null);
  const [firstCorner, setFirstCorner] = useState<L.LatLng | null>(null);
  const [draftBounds, setDraftBounds] = useState<LatLngBoundsExpression | null>(null);

  useEffect(() => {
    setPinIcon(createPinIcon());
  }, []);

  const regionBounds: LatLngBoundsExpression | null = selectedRegion
    ? [
        [selectedRegion.south, selectedRegion.west],
        [selectedRegion.north, selectedRegion.east],
      ]
    : null;

  return (
    <MapContainer
      center={[30, 15]}
      zoom={3}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      attributionControl={false}
    >
      {/* ESRI World Imagery – satellite tiles, no API key required */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      {/* Country/city label overlay */}
      <TileLayer
        url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
        opacity={0.75}
      />

      <MapInteraction
        selectionMode={selectionMode}
        onCoordinateSelect={onCoordinateSelect}
        onRegionSelect={onRegionSelect}
        setDraftBounds={setDraftBounds}
        firstCorner={firstCorner}
        setFirstCorner={setFirstCorner}
      />

      {/* First corner indicator in region mode */}
      {firstCorner && (
        <CircleMarker
          center={firstCorner}
          radius={6}
          pathOptions={{ color: '#0A84FF', fillColor: '#0A84FF', fillOpacity: 1, weight: 2 }}
        />
      )}

      {/* Selected point marker */}
      {selectedCoordinates && pinIcon && (
        <Marker
          position={[selectedCoordinates.lat, selectedCoordinates.lng]}
          icon={pinIcon}
        />
      )}

      {/* Confirmed region */}
      {regionBounds && (
        <Rectangle
          bounds={regionBounds}
          pathOptions={{
            color: '#0A84FF',
            weight: 2,
            fillColor: '#0A84FF',
            fillOpacity: 0.15,
          }}
        />
      )}

      {/* Draft region (while drawing) */}
      {draftBounds && (
        <Rectangle
          bounds={draftBounds}
          pathOptions={{
            color: '#0A84FF',
            weight: 2,
            fillColor: '#0A84FF',
            fillOpacity: 0.08,
            dashArray: '8 5',
          }}
        />
      )}

      <FlyTo coords={selectedCoordinates} />
    </MapContainer>
  );
}
