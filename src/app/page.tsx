'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  MapPin,
  Layers,
  Satellite,
  Box,
  RefreshCw,
  Download,
  Calendar,
  Cloud,
  ArrowLeft,
  Sun,
  Moon,
  Check,
} from 'lucide-react';
import Scene3DViewer from '@/components/Scene3DViewer';
import { Coordinates, Region, SatelliteImageData, Scene3DData } from '@/types';

// Leaflet requires DOM — load client-side only
const MapSelector = dynamic(() => import('@/components/MapSelector'), {
  ssr: false,
  loading: () => {
    return (
      <div className="map-loading-shell">
        <div className="map-loading-inner">
          <div className="map-spinner" />
          <p className="map-loading-text">Loading satellite map…</p>
        </div>
      </div>
    );
  },
});

// ─── Theme ────────────────────────────────────────────────────────────────────

interface T {
  dark: boolean;
  logoSrc: string;

  // Chrome
  glassBg: string;
  glassBorder: string;
  glassBlur: string;
  glassShadow: string;
  asideBg: string;
  asideBorder: string;
  pageBg: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  // Cards
  cardBg: string;
  cardBorder: string;
  divider: string;

  // Segmented control
  segBg: string;
  segActiveBg: string;
  segActiveText: string;
  segInactiveText: string;
  segDisabledText: string;

  // Mode pill
  modeActiveBg: string;
  modeActiveBorder: string;
  modeActiveText: string;
  modeInactiveBorder: string;
  modeInactiveText: string;

  // Secondary button
  secBtnBg: string;
  secBtnBorder: string;
  secBtnText: string;

  // Hint
  hintBg: string;
  hintBorder: string;
  hintText: string;

  // Accents
  blue: string;
  green: string;
  red: string;

  // Step inactive
  stepInactiveBg: string;
  stepInactiveBorder: string;

  // Theme toggle
  toggleBg: string;
  toggleBorder: string;
  toggleText: string;
}

const dark: T = {
  dark: true,
  logoSrc: '/anysiteonearth_minimal_icon_dark.svg',

  glassBg: 'rgba(20, 20, 22, 0.82)',
  glassBorder: 'rgba(255, 255, 255, 0.09)',
  glassBlur: 'blur(32px) saturate(180%)',
  glassShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  asideBg: 'rgba(14, 14, 16, 0.90)',
  asideBorder: 'rgba(255, 255, 255, 0.07)',
  pageBg: '#000',

  textPrimary: '#ffffff',
  textSecondary: 'rgba(235, 235, 245, 0.60)',
  textTertiary: 'rgba(235, 235, 245, 0.35)',

  cardBg: 'rgba(255, 255, 255, 0.045)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  divider: 'rgba(255, 255, 255, 0.07)',

  segBg: 'rgba(255, 255, 255, 0.08)',
  segActiveBg: 'rgba(255, 255, 255, 0.16)',
  segActiveText: '#fff',
  segInactiveText: 'rgba(235, 235, 245, 0.65)',
  segDisabledText: 'rgba(235, 235, 245, 0.20)',

  modeActiveBg: 'rgba(10, 132, 255, 0.20)',
  modeActiveBorder: 'rgba(10, 132, 255, 0.42)',
  modeActiveText: '#0A84FF',
  modeInactiveBorder: 'rgba(255, 255, 255, 0.11)',
  modeInactiveText: 'rgba(235, 235, 245, 0.50)',

  secBtnBg: 'rgba(255, 255, 255, 0.07)',
  secBtnBorder: 'rgba(255, 255, 255, 0.10)',
  secBtnText: 'rgba(235, 235, 245, 0.75)',

  hintBg: 'rgba(10, 132, 255, 0.07)',
  hintBorder: 'rgba(10, 132, 255, 0.20)',
  hintText: 'rgba(235, 235, 245, 0.55)',

  blue: '#0A84FF',
  green: '#30D158',
  red: '#FF453A',

  stepInactiveBg: 'rgba(255, 255, 255, 0.08)',
  stepInactiveBorder: 'rgba(255, 255, 255, 0.18)',

  toggleBg: 'rgba(255, 255, 255, 0.08)',
  toggleBorder: 'rgba(255, 255, 255, 0.12)',
  toggleText: 'rgba(235, 235, 245, 0.70)',
};

const light: T = {
  dark: false,
  logoSrc: '/anysiteonearth_minimal_icon_light.svg',

  glassBg: 'rgba(255, 255, 255, 0.82)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  glassBlur: 'blur(32px) saturate(180%)',
  glassShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
  asideBg: 'rgba(242, 242, 247, 0.93)',
  asideBorder: 'rgba(0, 0, 0, 0.08)',
  pageBg: '#e8e8ed',

  textPrimary: '#1c1c1e',
  textSecondary: 'rgba(60, 60, 67, 0.60)',
  textTertiary: 'rgba(60, 60, 67, 0.40)',

  cardBg: 'rgba(0, 0, 0, 0.03)',
  cardBorder: 'rgba(0, 0, 0, 0.07)',
  divider: 'rgba(0, 0, 0, 0.07)',

  segBg: 'rgba(0, 0, 0, 0.06)',
  segActiveBg: 'rgba(255, 255, 255, 0.90)',
  segActiveText: '#1c1c1e',
  segInactiveText: 'rgba(60, 60, 67, 0.65)',
  segDisabledText: 'rgba(60, 60, 67, 0.25)',

  modeActiveBg: 'rgba(0, 122, 255, 0.12)',
  modeActiveBorder: 'rgba(0, 122, 255, 0.35)',
  modeActiveText: '#007AFF',
  modeInactiveBorder: 'rgba(0, 0, 0, 0.12)',
  modeInactiveText: 'rgba(60, 60, 67, 0.55)',

  secBtnBg: 'rgba(0, 0, 0, 0.05)',
  secBtnBorder: 'rgba(0, 0, 0, 0.09)',
  secBtnText: 'rgba(60, 60, 67, 0.80)',

  hintBg: 'rgba(0, 122, 255, 0.06)',
  hintBorder: 'rgba(0, 122, 255, 0.18)',
  hintText: 'rgba(60, 60, 67, 0.65)',

  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',

  stepInactiveBg: 'rgba(0, 0, 0, 0.06)',
  stepInactiveBorder: 'rgba(0, 0, 0, 0.15)',

  toggleBg: 'rgba(0, 0, 0, 0.06)',
  toggleBorder: 'rgba(0, 0, 0, 0.10)',
  toggleText: 'rgba(60, 60, 67, 0.75)',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'map' | 'satellite' | 'scene';
type SelectionMode = 'point' | 'region';

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ size = 16, color = 'rgba(255,255,255,0.35)', topColor = 'white' }: { size?: number; color?: string; topColor?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        borderTopColor: topColor,
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

function ActionButton({
  icon, label, onClick, disabled, color, loading, t: tk,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color: string;
  loading?: boolean;
  t: T;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '12px 16px',
        borderRadius: 13,
        background: disabled ? `${color}66` : color,
        border: 'none',
        color: 'white',
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        transition: 'opacity 0.18s ease, transform 0.1s ease',
        letterSpacing: '-0.18px',
        boxShadow: disabled ? 'none' : `0 2px 8px ${color}44`,
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      onMouseDown={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.975)'; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
    >
      {loading ? <Spinner size={15} color="rgba(255,255,255,0.30)" topColor="white" /> : icon}
      {label}
    </button>
  );
}

function CoordPill({ label, value, t: tk }: { label: string; value: string; t: T }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.65px', textTransform: 'uppercase', color: tk.textTertiary }}>
        {label}
      </span>
      <span style={{ fontFamily: '"SF Mono", Menlo, Monaco, "Courier New", monospace', fontSize: 16, fontWeight: 300, color: tk.textPrimary, letterSpacing: '-0.2px' }}>
        {value}
      </span>
    </div>
  );
}

function Divider({ t: tk }: { t: T }) {
  return <div style={{ height: 1, background: tk.divider }} />;
}

function SectionLabel({ children, t: tk }: { children: React.ReactNode; t: T }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.75px', textTransform: 'uppercase', color: tk.textTertiary, marginBottom: 10 }}>
      {children}
    </p>
  );
}

function Card({ children, t: tk, style }: { children: React.ReactNode; t: T; style?: React.CSSProperties }) {
  return (
    <div style={{ background: tk.cardBg, border: `1px solid ${tk.cardBorder}`, borderRadius: 14, padding: 15, ...style }}>
      {children}
    </div>
  );
}

function StepIndicator({ step, t: tk }: { step: number; t: T }) {
  const steps = [
    { label: 'Select Location', icon: <MapPin size={11} strokeWidth={2.5} /> },
    { label: 'Satellite Image', icon: <Satellite size={11} strokeWidth={2.5} /> },
    { label: '3D Scene',        icon: <Box size={11} strokeWidth={2.5} /> },
  ];
  return (
    <div>
      <SectionLabel t={tk}>Workflow</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map(({ label, icon }, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n || (step === 0 && n === 1);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'white',
                  background: done ? tk.green : active ? tk.blue : tk.stepInactiveBg,
                  border: done || active ? 'none' : `1.5px solid ${tk.stepInactiveBorder}`,
                  transition: 'all 0.3s ease',
                }}
              >
                {done ? <Check size={11} strokeWidth={3} /> : active ? icon : <span style={{ color: tk.textTertiary, fontWeight: 500, fontSize: 10 }}>{n}</span>}
              </div>
              <span
                style={{
                  fontSize: 13, fontWeight: active || done ? 500 : 400,
                  color: active ? tk.textPrimary : done ? tk.textSecondary : tk.textTertiary,
                  transition: 'color 0.3s ease', letterSpacing: '-0.1px',
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

function MapPanel({ coords, isLoading, loadingSatellite, loadingScene, onGetSatellite, onGenerate3D, error, t: tk }: {
  coords: Coordinates | null;
  isLoading: boolean;
  loadingSatellite: boolean;
  loadingScene: boolean;
  onGetSatellite: () => void;
  onGenerate3D: () => void;
  error: string | null;
  t: T;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Coordinate card */}
      <Card t={tk}>
        {coords ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <CoordPill t={tk} label="Latitude"  value={`${coords.lat >= 0 ? '+' : ''}${coords.lat.toFixed(5)}°`} />
            <Divider t={tk} />
            <CoordPill t={tk} label="Longitude" value={`${coords.lng >= 0 ? '+' : ''}${coords.lng.toFixed(5)}°`} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '18px 0' }}>
            <MapPin style={{ color: tk.textTertiary, margin: '0 auto 9px', width: 26, height: 26, display: 'block' }} />
            <p style={{ color: tk.textTertiary, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
              Click on the map to<br />select a location
            </p>
          </div>
        )}
      </Card>

      {error && (
        <div style={{ background: `${tk.red}18`, border: `1px solid ${tk.red}33`, borderRadius: 11, padding: '10px 13px', color: tk.red, fontSize: 12, lineHeight: 1.5 }}>
          {error}
        </div>
      )}

      {coords && (
        <>
          <ActionButton t={tk} icon={<Satellite size={15} strokeWidth={2.2} />} label={loadingSatellite ? 'Fetching…' : 'Get Satellite Image'} onClick={onGetSatellite} disabled={isLoading} color={tk.blue} loading={loadingSatellite} />
          <ActionButton t={tk} icon={<Box size={15} strokeWidth={2.2} />} label={loadingScene ? 'Generating…' : 'Generate 3D Scene'} onClick={onGenerate3D} disabled={isLoading} color={tk.green} loading={loadingScene} />
        </>
      )}

      {/* Hint */}
      <div style={{ background: tk.hintBg, border: `1px solid ${tk.hintBorder}`, borderRadius: 11, padding: '10px 13px' }}>
        <p style={{ color: tk.hintText, fontSize: 12, lineHeight: 1.65, margin: 0 }}>
          <span style={{ color: tk.blue, fontWeight: 600 }}>Point</span> — click once to pin a location.<br />
          <span style={{ color: tk.blue, fontWeight: 600 }}>Region</span> — click two corners to draw an area.
        </p>
      </div>
    </div>
  );
}

function SatellitePanel({ data, isLoading, onRefresh, onGenerate3D, loadingScene, t: tk }: {
  data: SatelliteImageData;
  isLoading: boolean;
  onRefresh: () => void;
  onGenerate3D: () => void;
  loadingScene: boolean;
  t: T;
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
      <div style={{ borderRadius: 13, overflow: 'hidden', aspectRatio: '1/1', background: tk.dark ? '#0a0a0c' : '#d1d1d6', flexShrink: 0 }}>
        <img src={data.url} alt="Satellite imagery" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>

      {/* Metadata */}
      <Card t={tk} style={{ gap: 9, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tk.textSecondary }}>
            <Calendar size={13} strokeWidth={2} />
            <span style={{ fontSize: 12 }}>Captured</span>
          </div>
          <span style={{ fontSize: 13, color: tk.textSecondary, fontWeight: 500 }}>
            {new Date(data.date).toLocaleDateString()}
          </span>
        </div>
        <Divider t={tk} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tk.textSecondary }}>
            <Cloud size={13} strokeWidth={2} />
            <span style={{ fontSize: 12 }}>Cloud cover</span>
          </div>
          <span style={{ fontSize: 13, color: tk.textSecondary, fontWeight: 500 }}>
            {data.cloudCoverage.toFixed(0)}%
          </span>
        </div>
        <Divider t={tk} />
        <div>
          <SectionLabel t={tk}>Coverage</SectionLabel>
          <p style={{ fontFamily: '"SF Mono", Menlo, Monaco, monospace', fontSize: 11, color: tk.textSecondary, lineHeight: 1.75, margin: 0 }}>
            {data.bounds.north.toFixed(3)}°N &nbsp;{data.bounds.east.toFixed(3)}°E<br />
            {data.bounds.south.toFixed(3)}°S &nbsp;{data.bounds.west.toFixed(3)}°W
          </p>
        </div>
      </Card>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { icon: <RefreshCw size={13} strokeWidth={2} className={isLoading ? 'animate-spin' : ''} />, label: 'Refresh', fn: onRefresh },
          { icon: <Download size={13} strokeWidth={2} />, label: 'Save', fn: handleDownload },
        ].map(({ icon, label, fn }) => (
          <button
            key={label}
            onClick={fn}
            disabled={isLoading}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12,
              background: tk.secBtnBg, border: `1px solid ${tk.secBtnBorder}`,
              color: tk.secBtnText, fontSize: 13, fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'opacity 0.18s ease',
            }}
            onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      <ActionButton t={tk} icon={<Box size={15} strokeWidth={2.2} />} label={loadingScene ? 'Generating…' : 'Generate 3D Scene'} onClick={onGenerate3D} disabled={loadingScene} color={tk.green} loading={loadingScene} />
    </div>
  );
}

function ScenePanel({ coords, onBack, t: tk }: { coords: Coordinates | null; onBack: () => void; t: T }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {coords && (
        <Card t={tk} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <CoordPill t={tk} label="Latitude"  value={`${coords.lat >= 0 ? '+' : ''}${coords.lat.toFixed(5)}°`} />
          <Divider t={tk} />
          <CoordPill t={tk} label="Longitude" value={`${coords.lng >= 0 ? '+' : ''}${coords.lng.toFixed(5)}°`} />
        </Card>
      )}

      <Card t={tk}>
        <SectionLabel t={tk}>Camera Controls</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[['Left drag', 'Rotate'], ['Scroll', 'Zoom'], ['Right drag', 'Pan']].map(([key, action]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: tk.blue, fontWeight: 500 }}>{key}</span>
              <span style={{ fontSize: 12, color: tk.textSecondary }}>{action}</span>
            </div>
          ))}
        </div>
      </Card>

      <button
        onClick={onBack}
        style={{
          width: '100%', padding: '11px 0', borderRadius: 12,
          background: tk.secBtnBg, border: `1px solid ${tk.secBtnBorder}`,
          color: tk.secBtnText, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'opacity 0.18s ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back to Map
      </button>
    </div>
  );
}

function ModeButton({ active, icon, label, onClick, t: tk }: {
  active: boolean; icon: React.ReactNode; label: string; onClick: () => void; t: T;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px', borderRadius: 20,
        background: active ? tk.modeActiveBg : 'transparent',
        border: `1px solid ${active ? tk.modeActiveBorder : tk.modeInactiveBorder}`,
        color: active ? tk.modeActiveText : tk.modeInactiveText,
        fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 5,
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
  const [isDark, setIsDark] = useState(true);

  // Persist theme preference
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') setIsDark(false);
  }, []);
  const toggleTheme = useCallback(() => {
    setIsDark((d) => {
      localStorage.setItem('theme', d ? 'light' : 'dark');
      return !d;
    });
  }, []);

  const t = isDark ? dark : light;

  const handleCoordinateSelect = useCallback((c: Coordinates) => {
    setCoords(c); setSatelliteData(null); setSceneData(null); setError(null); setView('map');
  }, []);

  const handleRegionSelect = useCallback((r: Region) => { setRegion(r); }, []);

  const fetchSatellite = useCallback(async (c: Coordinates): Promise<SatelliteImageData | null> => {
    setLoadingSatellite(true);
    try {
      const kmToDegreesLat = 1 / 110.54;
      const kmToDegreesLng = 1 / (111.32 * Math.cos((c.lat * Math.PI) / 180));
      const halfKm = 5;
      const bounds = {
        west:  c.lng - halfKm * kmToDegreesLng,
        south: c.lat - halfKm * kmToDegreesLat,
        east:  c.lng + halfKm * kmToDegreesLng,
        north: c.lat + halfKm * kmToDegreesLat,
      };
      const params = new URLSearchParams({
        bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`,
        size: '1024,1024', bboxSR: '4326', imageSR: '4326', format: 'jpg', f: 'image',
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
    if (data) { setSatelliteData(data); setView('satellite'); }
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

  // Glass panel shared style
  const glass: React.CSSProperties = {
    background: t.glassBg,
    backdropFilter: t.glassBlur,
    WebkitBackdropFilter: t.glassBlur,
    border: `1px solid ${t.glassBorder}`,
    boxShadow: t.glassShadow,
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .map-loading-shell {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          background: ${t.dark ? '#0d1117' : '#e8e8ed'};
        }
        .map-loading-inner { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .map-spinner {
          width: 28px; height: 28px; border-radius: 50%;
          border: 2.5px solid ${t.dark ? 'rgba(10,132,255,0.25)' : 'rgba(0,122,255,0.25)'};
          border-top-color: ${t.blue};
          animation: spin 0.85s linear infinite;
        }
        .map-loading-text { color: ${t.textTertiary}; font-size: 13px; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div
        style={{
          position: 'fixed', inset: 0, overflow: 'hidden',
          background: t.pageBg,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
          WebkitFontSmoothing: 'antialiased',
          colorScheme: t.dark ? 'dark' : 'light',
        }}
      >
        {/* ── Full-screen background view ───────────────────────────── */}
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
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.dark ? '#060608' : '#d1d1d6' }}>
              {satelliteData && (
                <img src={satelliteData.url} alt="Satellite imagery" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              )}
            </div>
          )}

          {view === 'scene' && sceneData && (
            <Scene3DViewer sceneData={sceneData} coordinates={coords} onCameraMove={() => {}} />
          )}
        </div>

        {/* ── Floating header ──────────────────────────────────────── */}
        <header style={{ position: 'absolute', top: 0, left: 0, right: 300, zIndex: 1000, pointerEvents: 'none' }}>
          <div style={{ margin: '14px 14px 0', pointerEvents: 'auto' }}>
            <div style={{ ...glass, borderRadius: 18, padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

              {/* Logo + wordmark */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}>
                  <Image
                    src={t.logoSrc}
                    alt="Any Site on Earth"
                    width={34}
                    height={34}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    priority
                  />
                </div>
                <span style={{ color: t.textPrimary, fontWeight: 600, fontSize: 15.5, letterSpacing: '-0.35px' }}>
                  Any Site on Earth
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* View segmented control */}
                <div style={{ background: t.segBg, borderRadius: 11, padding: 3, display: 'flex', gap: 2 }}>
                  {([
                    { id: 'map',       label: 'Map' },
                    { id: 'satellite', label: 'Satellite' },
                    { id: 'scene',     label: '3D Scene' },
                  ] as { id: ViewMode; label: string }[]).map(({ id, label }) => {
                    const enabled = id === 'map' || (id === 'satellite' && !!satelliteData) || (id === 'scene' && !!sceneData);
                    const active = view === id;
                    return (
                      <button
                        key={id}
                        onClick={() => enabled && setView(id)}
                        disabled={!enabled}
                        style={{
                          padding: '5px 13px', borderRadius: 8, fontSize: 13,
                          fontWeight: active ? 600 : 400,
                          color: active ? t.segActiveText : enabled ? t.segInactiveText : t.segDisabledText,
                          background: active ? t.segActiveBg : 'transparent',
                          border: 'none',
                          boxShadow: active ? (t.dark ? '0 1px 4px rgba(0,0,0,0.35)' : '0 1px 3px rgba(0,0,0,0.14)') : 'none',
                          cursor: enabled ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s ease',
                          letterSpacing: '-0.18px',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Theme toggle */}
                <button
                  onClick={toggleTheme}
                  title={isDark ? 'Switch to Light' : 'Switch to Dark'}
                  style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: t.toggleBg,
                    border: `1px solid ${t.toggleBorder}`,
                    color: t.toggleText,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >
                  {isDark
                    ? <Sun  size={15} strokeWidth={2} />
                    : <Moon size={15} strokeWidth={2} />
                  }
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Right side panel ─────────────────────────────────────── */}
        <aside
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 999,
            width: 296, overflowY: 'auto',
            background: t.asideBg,
            backdropFilter: t.glassBlur,
            WebkitBackdropFilter: t.glassBlur,
            borderLeft: `1px solid ${t.asideBorder}`,
            padding: '84px 16px 28px',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}
        >
          <StepIndicator t={t} step={step} />
          <Divider t={t} />

          {view === 'map' && (
            <MapPanel
              t={t} coords={coords} isLoading={isLoading}
              loadingSatellite={loadingSatellite} loadingScene={loadingScene}
              onGetSatellite={handleGetSatellite} onGenerate3D={handleGenerate3D}
              error={error}
            />
          )}

          {view === 'satellite' && satelliteData && (
            <SatellitePanel
              t={t} data={satelliteData} isLoading={loadingSatellite}
              onRefresh={handleGetSatellite} onGenerate3D={handleGenerate3D}
              loadingScene={loadingScene}
            />
          )}

          {view === 'scene' && (
            <ScenePanel t={t} coords={coords} onBack={() => setView('map')} />
          )}
        </aside>

        {/* ── Mode selector (map view only) ────────────────────────── */}
        {view === 'map' && (
          <div style={{ position: 'absolute', bottom: 22, left: 14, zIndex: 1000, pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto', ...glass, borderRadius: 24, padding: '7px 9px', display: 'flex', gap: 4 }}>
              <ModeButton t={t} active={selectionMode === 'point'}  icon={<MapPin size={13} strokeWidth={2.2} />} label="Point"  onClick={() => setSelectionMode('point')} />
              <ModeButton t={t} active={selectionMode === 'region'} icon={<Layers size={13} strokeWidth={2.2} />} label="Region" onClick={() => setSelectionMode('region')} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
