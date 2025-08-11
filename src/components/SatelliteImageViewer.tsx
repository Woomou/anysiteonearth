'use client';

import React, { useState } from 'react';
import { Calendar, Cloud, Download, RefreshCw } from 'lucide-react';
import { SatelliteImageData } from '@/types';

interface SatelliteImageViewerProps {
  imageData: SatelliteImageData | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function SatelliteImageViewer({ imageData, isLoading, onRefresh }: SatelliteImageViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!imageData) {
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-6 text-center">
        <div className="w-full h-64 bg-gray-800 rounded-lg flex items-center justify-center">
          <p className="text-gray-400">No satellite image selected</p>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageData.url;
    link.download = `satellite-image-${new Date(imageData.date).toISOString().split('T')[0]}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg overflow-hidden">
      {/* Image Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10">
            <div className="flex items-center space-x-2 text-white">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading satellite image...</span>
            </div>
          </div>
        )}
        
        <div className="relative w-full h-64 bg-gray-800">
          <img
            src={imageData.url}
            alt="Satellite imagery"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
          
          {!imageLoaded && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Image Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Satellite Image</h3>
          <div className="flex space-x-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
              title="Refresh image"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-gray-300">
            <Calendar className="w-4 h-4 mr-2 text-blue-400" />
            <span>{new Date(imageData.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <Cloud className="w-4 h-4 mr-2 text-gray-400" />
            <span>{imageData.cloudCoverage.toFixed(1)}% clouds</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Coverage Area</div>
          <div className="text-xs font-mono text-gray-300">
            N: {imageData.bounds.north.toFixed(4)}° | S: {imageData.bounds.south.toFixed(4)}°<br/>
            E: {imageData.bounds.east.toFixed(4)}° | W: {imageData.bounds.west.toFixed(4)}°
          </div>
        </div>
      </div>
    </div>
  );
}