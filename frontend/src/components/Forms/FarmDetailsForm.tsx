import React, { useState, useEffect } from 'react';

const FarmDetailsForm: React.FC<{
  plantingDate: string;
  onPlantingDateChange: (date: string) => void;
  onCoordinatesChange: (coords: number[][]) => void;
}> = ({ plantingDate, onPlantingDateChange, onCoordinatesChange }) => {
  const [swLongitude, setSwLongitude] = useState('');
  const [swLatitude, setSwLatitude] = useState('');
  const [neLongitude, setNeLongitude] = useState('');
  const [neLatitude, setNeLatitude] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [coordError, setCoordError] = useState<string | null>(null);
  const [coordNotice, setCoordNotice] = useState<string | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  const todayIso = new Date().toISOString().split('T')[0];

  const applyManualCoordinates = () => {
    setCoordNotice(null);

    if (!swLongitude || !swLatitude || !neLongitude || !neLatitude) {
      setCoordError('Please fill all coordinate fields');
      return;
    }

    const swLon = parseFloat(swLongitude);
    const swLat = parseFloat(swLatitude);
    const neLon = parseFloat(neLongitude);
    const neLat = parseFloat(neLatitude);

    if (isNaN(swLon) || isNaN(swLat) || isNaN(neLon) || isNaN(neLat)) {
      setCoordError('Please enter valid numbers for coordinates');
      return;
    }

    if (swLon >= neLon || swLat >= neLat) {
      setCoordError('Southwest must be bottom-left and Northeast top-right (lon1 < lon2, lat1 < lat2)');
      return;
    }

    onCoordinatesChange([
      [swLon, swLat],
      [neLon, neLat],
    ]);
    setCoordError(null);
    setCoordNotice('Coordinates applied. Boundary updated successfully.');
    setTimeout(() => setCoordNotice(null), 2200);
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setCoordError('Geolocation is not supported by this browser.');
      return;
    }

    setIsGpsLoading(true);
    setCoordError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const margin = 0.003;

        const swLon = (longitude - margin).toFixed(6);
        const swLat = (latitude - margin).toFixed(6);
        const neLon = (longitude + margin).toFixed(6);
        const neLat = (latitude + margin).toFixed(6);

        setSwLongitude(swLon);
        setSwLatitude(swLat);
        setNeLongitude(neLon);
        setNeLatitude(neLat);

        onCoordinatesChange([
          [parseFloat(swLon), parseFloat(swLat)],
          [parseFloat(neLon), parseFloat(neLat)],
        ]);

        setCoordNotice('GPS location applied. Boundary updated successfully.');
        setTimeout(() => setCoordNotice(null), 2200);
        setIsGpsLoading(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied. Please allow GPS access in your browser.'
            : 'Unable to get your location. Please try again or enter coordinates manually.';
        setCoordError(message);
        setIsGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (!swLongitude || !swLatitude || !neLongitude || !neLatitude) {
      return;
    }

    const timer = setTimeout(() => {
      const swLon = parseFloat(swLongitude);
      const swLat = parseFloat(swLatitude);
      const neLon = parseFloat(neLongitude);
      const neLat = parseFloat(neLatitude);

      if (isNaN(swLon) || isNaN(swLat) || isNaN(neLon) || isNaN(neLat)) {
        return;
      }

      if (swLon >= neLon || swLat >= neLat) {
        return;
      }

      onCoordinatesChange([
        [swLon, swLat],
        [neLon, neLat],
      ]);
      setCoordError(null);
    }, 400);

    return () => clearTimeout(timer);
  }, [swLongitude, swLatitude, neLongitude, neLatitude, onCoordinatesChange]);

  const setRelativePlantingDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    onPlantingDateChange(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Planting Date *
          </label>
          <button
            type="button"
            onClick={() => onPlantingDateChange(todayIso)}
            className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
          >
            Use Today
          </button>
        </div>
        <input
          type="date"
          value={plantingDate}
          max={todayIso}
          onChange={(e) => onPlantingDateChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setRelativePlantingDate(7)}
            className="px-2 py-1 text-xs rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
          >
            7 days ago
          </button>
          <button
            type="button"
            onClick={() => setRelativePlantingDate(30)}
            className="px-2 py-1 text-xs rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
          >
            30 days ago
          </button>
          <button
            type="button"
            onClick={() => setRelativePlantingDate(90)}
            className="px-2 py-1 text-xs rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
          >
            90 days ago
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Pick the approximate planting date to improve growth-stage interpretation.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Enter coordinates manually (alternative)
          </label>
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            {showManualInput ? 'Hide' : 'Enter manually'}
          </button>
        </div>

        {showManualInput && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleUseCurrentGps}
              disabled={isGpsLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGpsLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Locating...
                </>
              ) : (
                <>
                  <i className="fas fa-location-crosshairs mr-2"></i>
                  Use Current GPS
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                  Southwest Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={swLongitude}
                  onChange={(e) => setSwLongitude(e.target.value)}
                  placeholder="e.g., 3.914"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                  Southwest Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={swLatitude}
                  onChange={(e) => setSwLatitude(e.target.value)}
                  placeholder="e.g., 7.424"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                  Northeast Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={neLongitude}
                  onChange={(e) => setNeLongitude(e.target.value)}
                  placeholder="e.g., 3.926"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                  Northeast Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={neLatitude}
                  onChange={(e) => setNeLatitude(e.target.value)}
                  placeholder="e.g., 7.436"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={applyManualCoordinates}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Apply Now (Optional)
            </button>

            {coordNotice && (
              <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-700 dark:text-green-300">
                <i className="fas fa-check-circle mr-1"></i>
                {coordNotice}
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Use decimal degrees. This creates a boundary box from SW to NE.
            </p>

            {coordError && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                {coordError}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-start space-x-2">
          <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Tip:</strong> Draw on the map first, then optionally fine-tune the same boundary with GPS/manual coordinates.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FarmDetailsForm;
