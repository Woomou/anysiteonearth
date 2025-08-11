'use client';

import React, { useState, useCallback } from 'react';
import { Globe, Satellite, Eye, Settings } from 'lucide-react';
import EarthModel from '@/components/EarthModel';
import CoordinateDisplay from '@/components/CoordinateDisplay';
import SatelliteImageViewer from '@/components/SatelliteImageViewer';
import Scene3DViewer from '@/components/Scene3DViewer';
import { Coordinates, SatelliteImageData, Scene3DData } from '@/types';

export default function Home() {
  const [selectedCoordinates, setSelectedCoordinates] = useState<Coordinates | null>(null);
  const [satelliteData, setSatelliteData] = useState<SatelliteImageData | null>(null);
  const [scene3DData, setScene3DData] = useState<Scene3DData | null>(null);
  const [isLoadingSatellite, setIsLoadingSatellite] = useState(false);
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [currentView, setCurrentView] = useState<'earth' | 'satellite' | 'scene'>('earth');

  const handleCoordinateSelect = useCallback((coordinates: Coordinates) => {
    setSelectedCoordinates(coordinates);
    // Reset previous data when new coordinates are selected
    setSatelliteData(null);
    setScene3DData(null);
    setCurrentView('earth');
  }, []);

  const handleGetSatelliteImage = useCallback(async () => {
    if (!selectedCoordinates) return;

    setIsLoadingSatellite(true);
    try {
      const response = await fetch('/api/satellite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coordinates: selectedCoordinates }),
      });

      if (!response.ok) throw new Error('Failed to fetch satellite image');

      const data = await response.json();
      setSatelliteData(data);
      setCurrentView('satellite');
    } catch (error) {
      console.error('Error fetching satellite image:', error);
      alert('Failed to fetch satellite image. Please try again.');
    } finally {
      setIsLoadingSatellite(false);
    }
  }, [selectedCoordinates]);

  const handleGenerate3DScene = useCallback(async () => {
    if (!satelliteData || !selectedCoordinates) {
      // If no satellite data, fetch it first
      if (selectedCoordinates) {
        await handleGetSatelliteImage();
      }
      return;
    }

    setIsGeneratingScene(true);
    try {
      const response = await fetch('/api/generate-scene', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          satelliteData, 
          coordinates: selectedCoordinates 
        }),
      });

      if (!response.ok) throw new Error('Failed to generate 3D scene');

      const data = await response.json();
      setScene3DData(data);
      setCurrentView('scene');
    } catch (error) {
      console.error('Error generating 3D scene:', error);
      alert('Failed to generate 3D scene. Please try again.');
    } finally {
      setIsGeneratingScene(false);
    }
  }, [satelliteData, selectedCoordinates, handleGetSatelliteImage]);

  const handleRefreshSatelliteImage = useCallback(async () => {
    await handleGetSatelliteImage();
  }, [handleGetSatelliteImage]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'satellite':
        return (
          <SatelliteImageViewer
            imageData={satelliteData}
            isLoading={isLoadingSatellite}
            onRefresh={handleRefreshSatelliteImage}
          />
        );
      case 'scene':
        return (
          <Scene3DViewer
            sceneData={scene3DData}
            coordinates={selectedCoordinates}
            onCameraMove={(position, rotation) => {
              // Could implement camera position tracking here
            }}
          />
        );
      default:
        return (
          <EarthModel
            onCoordinateSelect={handleCoordinateSelect}
            selectedCoordinates={selectedCoordinates}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Any Site on Earth</h1>
            </div>
            
            {/* View Toggle */}
            <div className="flex space-x-2 bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => setCurrentView('earth')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  currentView === 'earth'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Earth</span>
              </button>
              <button
                onClick={() => setCurrentView('satellite')}
                disabled={!satelliteData}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  currentView === 'satellite'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Satellite className="w-4 h-4" />
                <span>Satellite</span>
              </button>
              <button
                onClick={() => setCurrentView('scene')}
                disabled={!scene3DData}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  currentView === 'scene'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>3D Scene</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
          {/* Main View */}
          <div className="lg:col-span-3 bg-gray-900/30 rounded-lg overflow-hidden">
            {renderCurrentView()}
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Coordinate Display & Controls */}
            <CoordinateDisplay
              coordinates={selectedCoordinates}
              isLoading={isLoadingSatellite || isGeneratingScene}
              onGetSatelliteImage={handleGetSatelliteImage}
              onGenerate3DScene={handleGenerate3DScene}
            />

            {/* Status Panel */}
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Location Selected</span>
                  <div className={`w-3 h-3 rounded-full ${selectedCoordinates ? 'bg-green-400' : 'bg-gray-500'}`} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Satellite Image</span>
                  <div className={`w-3 h-3 rounded-full ${satelliteData ? 'bg-green-400' : 'bg-gray-500'}`} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">3D Scene</span>
                  <div className={`w-3 h-3 rounded-full ${scene3DData ? 'bg-green-400' : 'bg-gray-500'}`} />
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Instructions</h3>
              <div className="text-sm text-gray-300 space-y-2">
                <p>1. Click anywhere on Earth to select coordinates</p>
                <p>2. Get high-resolution Sentinel-2 satellite imagery</p>
                <p>3. Generate realistic 3D terrain from satellite data</p>
                <p>4. Explore the 3D scene with mouse controls</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}