'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Globe,
  MapPin,
  Layers,
  Satellite,
  Box,
  RefreshCw,
  Download,
  Calendar,
  Cloud,
  ArrowLeft,
} from 'lucide-react';
import Scene3DViewer from '@/components/Scene3DViewer';
import { Coordinates, Region, SatelliteImageData, Scene3DData } from '@/types';

// Leaflet requires a DOM – load client-side only
const MapSelector = dynamic(() => import('@/components/MapSelector'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2.5px solid rgba(10,132,255,0.3)',
            borderTopColor: '#0A84FF',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: 'rgba(235,235,245,0.4)', fontSize: 13 }}>Loading satellite map…</p>
      </div>
    </div>
  ),
});

type ViewMode = 'map' | 'satellite' | 'scene';
type SelectionMode = 'point' | 'region';

// Shared glass-morphism panel style (Apple dark UI)
const glass: React.CSSProperties = {
  background: 'rgba(18, 18, 20, 0.84)',
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.09)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  color,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color: string;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '13px 16px',
        borderRadius: 13,
        background: disabled ? `${color}55` : color,
        border: 'none',
        color: 'white',
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'opacity 0.2s ease, transform 0.1s ease',
        letterSpacing: '-0.2px',
      }}
      onMouseDown={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
    >
      {loading ? (
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }}
        />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}

function CoordPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.7px',
          textTransform: 'uppercase',
          color: 'rgba(235,235,245,0.38)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: '"SF Mono", Menlo, Monaco, "Courier New", monospace',
          fontSize: 17,
          fontWeight: 300,
          color: '#fff',
          letterSpacing: '-0.3px',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
  );
}

function StepIndicator({ step }: { step: number }) {
  const steps = ['Select Location', 'Satellite Image', '3D Scene'];
  return (
    <div>
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.9px',
          textTransform: 'uppercase',
          color: 'rgba(235,235,245,0.35)',
          marginBottom: 12,
        }}
      >
        Workflow
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {steps.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n || (step === 0 && n === 1);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'white',
                  background: done
                    ? '#30D158'
                    : active
                    ? '#0A84FF'
                    : 'rgba(255,255,255,0.08)',
                  border: done || active ? 'none' : '1.5px solid rgba(255,255,255,0.18)',
                  transition: 'all 0.35s ease',
                }}
              >
                {done ? '✓' : n}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: active || done ? 500 : 400,
                  color: active
                    ? '#fff'
                    : done
                    ? 'rgba(235,235,245,0.65)'
                    : 'rgba(235,235,245,0.3)',
                  transition: 'color 0.35s ease',
                  letterSpacing: '-0.1px',
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MapPanel({
  coords,
  isLoading,
  loadingSatellite,
  loadingScene,
  onGetSatellite,
  onGenerate3D,
  error,
}: {
  coords: Coordinates | null;
  isLoading: boolean;
  loadingSatellite: boolean;
  loadingScene: boolean;
  onGetSatellite: () => void;
  onGenerate3D: () => void;
  error: string | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Coordinate card */}
      <div
        style={{
          background: 'rgba(255,255,255,0.045)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 16,
        }}
      >
        {coords ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <CoordPill
              label="Latitude"
              value={`${coords.lat >= 0 ? '+' : ''}${coords.lat.toFixed(5)}°`}
            />
            <Divider />
            <CoordPill
              label="Longitude"
              value={`${coords.lng >= 0 ? '+' : ''}${coords.lng.toFixed(5)}°`}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <MapPin
              style={{ color: 'rgba(235,235,245,0.2)', marginBottom: 8, width: 28, height: 28, display: 'block', margin: '0 auto 8px' }}
            />
            <p style={{ color: 'rgba(235,235,245,0.38)', fontSize: 13, lineHeight: 1.5 }}>
              Click on the map to
              <br />
              select a location
            </p>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(255, 69, 58, 0.1)',
            border: '1px solid rgba(255, 69, 58, 0.22)',
            borderRadius: 10,
            padding: '10px 12px',
            color: '#FF453A',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {coords && (
        <>
          <ActionButton
            icon={<Satellite className="w-4 h-4" />}
            label={loadingSatellite ? 'Fetching…' : 'Get Satellite Image'}
            onClick={onGetSatellite}
            disabled={isLoading}
            color="#0A84FF"
            loading={loadingSatellite}
          />
          <ActionButton
            icon={<Box className="w-4 h-4" />}
            label={loadingScene ? 'Generating…' : 'Generate 3D Scene'}
            onClick={onGenerate3D}
            disabled={isLoading}
            color="#30D158"
            loading={loadingScene}
          />
        </>
      )}

      {/* Usage hint */}
      <div
        style={{
          background: 'rgba(10,132,255,0.07)',
          border: '1px solid rgba(10,132,255,0.18)',
          borderRadius: 11,
          padding: '10px 13px',
        }}
      >
        <p style={{ color: 'rgba(235,235,245,0.55)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
          <span style={{ color: '#0A84FF', fontWeight: 600 }}>Point</span> — click once to pin a
          location.
          <br />
          <span style={{ color: '#0A84FF', fontWeight: 600 }}>Region</span> — click two corners to
          draw an area.
        </p>
      </div>
    </div>
  );
}

function SatellitePanel({
  data,
  isLoading,
  onRefresh,
  onGenerate3D,
  loadingScene,
}: {
  data: SatelliteImageData;
  isLoading: boolean;
  onRefresh: () => void;
  onGenerate3D: () => void;
  loadingScene: boolean;
}) {
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = data.url;
    a.download = `satellite-${new Date(data.date).toISOString().split('T')[0]}.jpg`;
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Thumbnail */}
      <div
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          aspectRatio: '1 / 1',
          background: '#0d0d0f',
          flexShrink: 0,
        }}
      >
        <img
          src={data.url}
          alt="Satellite imagery"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* Metadata */}
      <div
        style={{
          background: 'rgba(255,255,255,0.045)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(235,235,245,0.4)' }}>
            <Calendar className="w-3.5 h-3.5" />
            <span style={{ fontSize: 12 }}>Captured</span>
          </div>
          <span style={{ fontSize: 13, color: 'rgba(235,235,245,0.75)', fontWeight: 500 }}>
            {new Date(data.date).toLocaleDateString()}
          </span>
        </div>
        <Divider />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(235,235,245,0.4)' }}>
            <Cloud className="w-3.5 h-3.5" />
            <span style={{ fontSize: 12 }}>Cloud cover</span>
          </div>
          <span style={{ fontSize: 13, color: 'rgba(235,235,245,0.75)', fontWeight: 500 }}>
            {data.cloudCoverage.toFixed(0)}%
          </span>
        </div>
        <Divider />
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'rgba(235,235,245,0.35)', marginBottom: 5 }}>
            Coverage
          </p>
          <p
            style={{
              fontFamily: '"SF Mono", Menlo, Monaco, monospace',
              fontSize: 11,
              color: 'rgba(235,235,245,0.55)',
              lineHeight: 1.7,
            }}
          >
            {data.bounds.north.toFixed(3)}°N  {data.bounds.east.toFixed(3)}°E
            <br />
            {data.bounds.south.toFixed(3)}°S  {data.bounds.west.toFixed(3)}°W
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { icon: <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />, label: 'Refresh', fn: onRefresh },
          { icon: <Download className="w-3.5 h-3.5" />, label: 'Save', fn: handleDownload },
        ].map(({ icon, label, fn }) => (
          <button
            key={label}
            onClick={fn}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(235,235,245,0.75)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <ActionButton
        icon={<Box className="w-4 h-4" />}
        label={loadingScene ? 'Generating…' : 'Generate 3D Scene'}
        onClick={onGenerate3D}
        disabled={loadingScene}
        color="#30D158"
        loading={loadingScene}
      />
    </div>
  );
}

function ScenePanel({ coords, onBack }: { coords: Coordinates | null; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {coords && (
        <div
          style={{
            background: 'rgba(255,255,255,0.045)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <CoordPill
            label="Latitude"
            value={`${coords.lat >= 0 ? '+' : ''}${coords.lat.toFixed(5)}°`}
          />
          <Divider />
          <CoordPill
            label="Longitude"
            value={`${coords.lng >= 0 ? '+' : ''}${coords.lng.toFixed(5)}°`}
          />
        </div>
      )}

      <div
        style={{
          background: 'rgba(255,255,255,0.045)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 16,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.7px',
            textTransform: 'uppercase',
            color: 'rgba(235,235,245,0.35)',
            marginBottom: 12,
          }}
        >
          Camera Controls
        </p>
        {[
          ['Left drag', 'Rotate'],
          ['Scroll', 'Zoom'],
          ['Right drag', 'Pan'],
        ].map(([key, action]) => (
          <div
            key={key}
            style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}
          >
            <span style={{ fontSize: 12, color: '#0A84FF', fontWeight: 500 }}>{key}</span>
            <span style={{ fontSize: 12, color: 'rgba(235,235,245,0.5)' }}>{action}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onBack}
        style={{
          width: '100%',
          padding: '12px 0',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(235,235,245,0.75)',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Map
      </button>
    </div>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px',
        borderRadius: 20,
        background: active ? 'rgba(10,132,255,0.22)' : 'transparent',
        border: active
          ? '1px solid rgba(10,132,255,0.45)'
          : '1px solid rgba(255,255,255,0.1)',
        color: active ? '#0A84FF' : 'rgba(235,235,245,0.55)',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        transition: 'all 0.2s ease',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [satelliteData, setSatelliteData] = useState<SatelliteImageData | null>(null);
  const [sceneData, setSceneData] = useState<Scene3DData | null>(null);
  const [view, setView] = useState<ViewMode>('map');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('point');
  const [loadingSatellite, setLoadingSatellite] = useState(false);
  const [loadingScene, setLoadingScene] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCoordinateSelect = useCallback((c: Coordinates) => {
    setCoords(c);
    setSatelliteData(null);
    setSceneData(null);
    setError(null);
    setView('map');
  }, []);

  const handleRegionSelect = useCallback((r: Region) => {
    setRegion(r);
  }, []);

  const fetchSatellite = useCallback(async (c: Coordinates): Promise<SatelliteImageData | null> => {
    setLoadingSatellite(true);
    try {
      const kmToDegreesLat = 1 / 110.54;
      const kmToDegreesLng = 1 / (111.32 * Math.cos((c.lat * Math.PI) / 180));
      const halfKm = 5;
      const bounds = {
        west: c.lng - halfKm * kmToDegreesLng,
        south: c.lat - halfKm * kmToDegreesLat,
        east: c.lng + halfKm * kmToDegreesLng,
        north: c.lat + halfKm * kmToDegreesLat,
      };
      const params = new URLSearchParams({
        bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`,
        size: '1024,1024',
        bboxSR: '4326',
        imageSR: '4326',
        format: 'jpg',
        f: 'image',
      });
      const url = `https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?${params}`;
      return { url, date: new Date().toISOString(), cloudCoverage: 0, bounds };
    } catch {
      setError('Unable to fetch satellite image. Please try again.');
      return null;
    } finally {
      setLoadingSatellite(false);
    }
  }, []);

  const handleGetSatellite = useCallback(async () => {
    if (!coords) return;
    setError(null);
    const data = await fetchSatellite(coords);
    if (data) {
      setSatelliteData(data);
      setView('satellite');
    }
  }, [coords, fetchSatellite]);

  const handleGenerate3D = useCallback(async () => {
    if (!coords) return;
    setError(null);

    let sat = satelliteData;
    if (!sat) {
      sat = await fetchSatellite(coords);
      if (!sat) return;
      setSatelliteData(sat);
    }

    setLoadingScene(true);
    try {
      const { SceneGenerator } = await import('@/lib/sceneGenerator');
      const generator = new SceneGenerator();
      const data = await generator.generateScene3D(sat, coords);
      setSceneData(data);
      setView('scene');
    } catch {
      setError('Unable to generate 3D scene. Please try again.');
    } finally {
      setLoadingScene(false);
    }
  }, [coords, satelliteData, fetchSatellite]);

  const isLoading = loadingSatellite || loadingScene;
  const step = sceneData ? 3 : satelliteData ? 2 : coords ? 1 : 0;

  return (
    <>
      {/* Keyframe for spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {/* ── Full-screen background view ─────────────────────────────── */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {view === 'map' && (
            <MapSelector
              onCoordinateSelect={handleCoordinateSelect}
              selectedCoordinates={coords}
              onRegionSelect={handleRegionSelect}
              selectedRegion={region}
              selectionMode={selectionMode}
            />
          )}

          {view === 'satellite' && (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#060608',
              }}
            >
              {satelliteData && (
                <img
                  src={satelliteData.url}
                  alt="Satellite imagery"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              )}
            </div>
          )}

          {view === 'scene' && sceneData && (
            <Scene3DViewer
              sceneData={sceneData}
              coordinates={coords}
              onCameraMove={() => {}}
            />
          )}
        </div>

        {/* ── Floating header ─────────────────────────────────────────── */}
        <header
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 300,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <div style={{ margin: '16px 16px 0', pointerEvents: 'auto' }}>
            <div
              style={{
                ...glass,
                borderRadius: 18,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%)',
                    borderRadius: 10,
                    padding: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <span
                  style={{
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 16,
                    letterSpacing: '-0.4px',
                  }}
                >
                  Any Site on Earth
                </span>
              </div>

              {/* View segmented control */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  borderRadius: 12,
                  padding: 3,
                  display: 'flex',
                  gap: 2,
                }}
              >
                {(
                  [
                    { id: 'map', label: 'Map' },
                    { id: 'satellite', label: 'Satellite' },
                    { id: 'scene', label: '3D Scene' },
                  ] as { id: ViewMode; label: string }[]
                ).map(({ id, label }) => {
                  const enabled =
                    id === 'map' ||
                    (id === 'satellite' && !!satelliteData) ||
                    (id === 'scene' && !!sceneData);
                  const active = view === id;
                  return (
                    <button
                      key={id}
                      onClick={() => enabled && setView(id)}
                      disabled={!enabled}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 9,
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        color: active
                          ? '#fff'
                          : enabled
                          ? 'rgba(235,235,245,0.65)'
                          : 'rgba(235,235,245,0.22)',
                        background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
                        border: 'none',
                        cursor: enabled ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease',
                        letterSpacing: '-0.2px',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        {/* ── Right side panel ────────────────────────────────────────── */}
        <aside
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
            overflowY: 'auto',
            width: 300,
            background: 'rgba(12, 12, 14, 0.88)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            borderLeft: '1px solid rgba(255,255,255,0.07)',
            padding: '88px 18px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <StepIndicator step={step} />

          <div
            style={{
              height: 1,
              background: 'rgba(255,255,255,0.07)',
              marginTop: 4,
            }}
          />

          {view === 'map' && (
            <MapPanel
              coords={coords}
              isLoading={isLoading}
              loadingSatellite={loadingSatellite}
              loadingScene={loadingScene}
              onGetSatellite={handleGetSatellite}
              onGenerate3D={handleGenerate3D}
              error={error}
            />
          )}

          {view === 'satellite' && satelliteData && (
            <SatellitePanel
              data={satelliteData}
              isLoading={loadingSatellite}
              onRefresh={handleGetSatellite}
              onGenerate3D={handleGenerate3D}
              loadingScene={loadingScene}
            />
          )}

          {view === 'scene' && (
            <ScenePanel coords={coords} onBack={() => setView('map')} />
          )}
        </aside>

        {/* ── Mode selector (map view only) ───────────────────────────── */}
        {view === 'map' && (
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: 16,
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                pointerEvents: 'auto',
                ...glass,
                borderRadius: 24,
                padding: '8px 10px',
                display: 'flex',
                gap: 4,
              }}
            >
              <ModeButton
                active={selectionMode === 'point'}
                icon={<MapPin className="w-3.5 h-3.5" />}
                label="Point"
                onClick={() => setSelectionMode('point')}
              />
              <ModeButton
                active={selectionMode === 'region'}
                icon={<Layers className="w-3.5 h-3.5" />}
                label="Region"
                onClick={() => setSelectionMode('region')}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
