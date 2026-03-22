import React, { useRef, useState, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapDrawingTool: React.FC<{
  onBoundariesChange: (coordinates: number[][]) => void;
}> = ({ onBoundariesChange }) => {
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const [showToolHighlight, setShowToolHighlight] = useState(true);

  const toCoordinates = (layerType: string, layer: any): number[][] => {
    if (layerType === 'rectangle') {
      const bounds = layer.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      // Keep order aligned with manual coordinate entry: [longitude, latitude]
      return [
        [sw.lng, sw.lat],
        [ne.lng, ne.lat],
      ];
    }

    if (layerType === 'polygon') {
      return layer.getLatLngs()[0].map((latlng: L.LatLng) => [latlng.lng, latlng.lat]);
    }

    return [];
  };

  const handleCreate = (e: any) => {
    const { layerType, layer } = e;
    try {
      const coordinates = toCoordinates(layerType, layer);
      if (coordinates.length > 0) {
        onBoundariesChange(coordinates);
        setShowToolHighlight(false);
      }
    } catch (error) {
      console.error('Error extracting coordinates:', error);
    }
  };

  const handleEdit = (e: any) => {
    let latestCoordinates: number[][] = [];

    e.layers.eachLayer((layer: any) => {
      if (layer instanceof L.Rectangle) {
        latestCoordinates = toCoordinates('rectangle', layer);
      } else if (layer instanceof L.Polygon) {
        latestCoordinates = toCoordinates('polygon', layer);
      }
    });

    if (latestCoordinates.length > 0) {
      onBoundariesChange(latestCoordinates);
    }
  };

  const handleDelete = () => {
    onBoundariesChange([]);
  };

  // Auto-hide highlight after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowToolHighlight(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="map-drawing-tool">
      <div className="h-96 w-full rounded-lg overflow-hidden relative">
        <MapContainer
          center={[9.0820, 8.6753]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <FeatureGroup ref={featureGroupRef}>
            <EditControl
              position="topright"
              onCreated={handleCreate}
              draw={{
                polygon: {
                  shapeOptions: {
                    color: '#10B981',
                    weight: 3,
                    opacity: 0.8,
                    fillOpacity: 0.3
                  },
                  allowIntersection: false,
                  showArea: true
                },
                rectangle: {
                  shapeOptions: {
                    color: '#10B981',
                    weight: 3,
                    opacity: 0.8,
                    fillOpacity: 0.2,
                  },
                },
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false
              }}
              onEdited={handleEdit}
              onDeleted={handleDelete}
            />
          </FeatureGroup>
        </MapContainer>

        {/* Highlight for drawing tools */}
        {showToolHighlight && (
          <div className="absolute top-2 left-2 bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-400 rounded-lg p-2 z-[1000] animate-pulse pointer-events-none">
            <div className="flex items-center space-x-2">
              <i className="fas fa-hand-point-up text-yellow-600 text-lg"></i>
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Click here to draw!
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-300">
                  Use rectangle for quick setup
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 -mt-1 -mr-1">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg z-[999] border-2 border-blue-400">
          <div className="flex items-center space-x-2 text-sm">
            <i className="fas fa-info-circle text-blue-500"></i>
            <span className="font-medium text-blue-700 dark:text-blue-300">
              Tip: rectangle is fastest. You can still draw polygon for irregular farms.
            </span>
          </div>
        </div>
      </div>

      {/* Visual Guide */}
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow">
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded flex items-center justify-center">
              <span className="text-lg">▭</span>
            </div>
            <p className="text-xs text-center mt-1">Rectangle</p>
          </div>
          
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Look for these tools in the top-right corner of the map:
            </p>
            <div className="flex space-x-2 mt-1 text-xs text-blue-600 dark:text-blue-300">
              <span>▭ Rectangle</span>
              <span>◇ Polygon</span>
              <span>✎ Edit</span>
              <span>× Delete</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapDrawingTool;