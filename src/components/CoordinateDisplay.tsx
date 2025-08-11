'use client';

import React from 'react';
import { MapPin, Globe, Satellite } from 'lucide-react';
import { Coordinates } from '@/types';

interface CoordinateDisplayProps {
  coordinates: Coordinates | null;
  isLoading?: boolean;
  onGetSatelliteImage?: () => void;
  onGenerate3DScene?: () => void;
}

export default function CoordinateDisplay({ 
  coordinates, 
  isLoading, 
  onGetSatelliteImage,
  onGenerate3DScene 
}: CoordinateDisplayProps) {
  if (!coordinates) {
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-6 text-center">
        <Globe className="w-12 h-12 mx-auto mb-4 text-blue-400" />
        <p className="text-gray-300">Click on the Earth to select a location</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-6">
      <div className="flex items-center mb-4">
        <MapPin className="w-6 h-6 text-red-400 mr-2" />
        <h3 className="text-xl font-semibold text-white">Selected Location</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Latitude
          </label>
          <div className="text-lg font-mono text-white bg-gray-800 rounded px-3 py-2">
            {coordinates.lat.toFixed(6)}°
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Longitude
          </label>
          <div className="text-lg font-mono text-white bg-gray-800 rounded px-3 py-2">
            {coordinates.lng.toFixed(6)}°
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={onGetSatelliteImage}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors"
        >
          <Satellite className="w-5 h-5 mr-2" />
          {isLoading ? 'Loading...' : 'Get Satellite Image'}
        </button>
        
        <button
          onClick={onGenerate3DScene}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-medium rounded-lg transition-colors"
        >
          <Globe className="w-5 h-5 mr-2" />
          {isLoading ? 'Processing...' : 'Generate 3D Scene'}
        </button>
      </div>
    </div>
  );
}