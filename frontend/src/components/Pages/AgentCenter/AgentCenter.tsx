import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../../../contexts/WalletContext';
import { BACKEND_URL } from '../../../services/api/constants';
import MapDrawingTool from '../../Map/MapDrawingTool';
import CropWatchProgress from './CropWatchProgress';

interface AgentLogEntry {
  agent: string;
  action: string;
  status: 'success' | 'failed' | 'running';
  hedera_proof?: { consensusTimestamp?: string; status?: string };
  disease?: string;
  advice_source?: string;
  error?: string;
}

interface FarmReport {
  session_id: string;
  farmer_id: string;
  status: string;
  timestamp: string;
  farm_summary: {
    vegetation_health: string;
    drought_risk: string;
    ndvi_mean: number | null;
    disease_detected: string | null;
    advice: string | null;
  };
  satellite_analysis: {
    ndvi: { mean: number; min: number; max: number };
    ndwi: { mean: number; min: number; max: number };
    vegetation_health: string;
    drought_risk: string;
  } | null;
  disease_analysis: {
    crop: string;
    disease: string;
    confidence: number;
    advice: string | null;
    advice_source: string | null;
  } | null;
  agent_log: AgentLogEntry[];
}

interface AgentStatus {
  agents: {
    name: string;
    type: string;
    description: string;
    status: string;
    hedera_integration: string;
    active_farm_loops?: string[];
  }[];
  total_active_oracle_loops: number;
}

interface OracleResult {
  agent: string;
  session_id: string;
  farmer_id: string;
  timestamp: string;
  oracle_decision: {
    should_trigger_claim: boolean;
    ndvi_mean: number;
    vegetation_health: string;
    drought_risk: string;
  };
  insurance_outcome: {
    scenario: string;
    message: string;
    payoutAmount: number;
    transactionId: string | null;
  };
  hedera_proof?: { consensusTimestamp?: string; status?: string };
  status: string;
}

const AGENT_ICONS: Record<string, string> = {
  CropWatchAgent: 'fa-satellite',
  AdvisoryAgent: 'fa-brain',
  InsuranceOracleAgent: 'fa-shield-alt',
  DataMarketplaceAgent: 'fa-coins',
};

const AGENT_COLORS: Record<string, string> = {
  CropWatchAgent: 'text-blue-400',
  AdvisoryAgent: 'text-purple-400',
  InsuranceOracleAgent: 'text-green-400',
  DataMarketplaceAgent: 'text-amber-400',
};

const AgentCenter: React.FC = () => {
  const { accountId } = useWallet();
  const [farmBoundaries, setFarmBoundaries] = useState<number[][]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [swLongitude, setSwLongitude] = useState('');
  const [swLatitude, setSwLatitude] = useState('');
  const [neLongitude, setNeLongitude] = useState('');
  const [neLatitude, setNeLatitude] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);
  const [coordNotice, setCoordNotice] = useState<string | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [cropType, setCropType] = useState('');
  const [locationHint, setLocationHint] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [farmReport, setFarmReport] = useState<FarmReport | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);

  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [oracleResult, setOracleResult] = useState<OracleResult | null>(null);
  const [isOracleRunning, setIsOracleRunning] = useState(false);
  const [isOracleChecking, setIsOracleChecking] = useState(false);
  const [oracleError, setOracleError] = useState<string | null>(null);
  const [intervalHours, setIntervalHours] = useState(6);
  const [showHederaDetails, setShowHederaDetails] = useState(false);

  const cropOptions = [
    'maize', 'rice', 'cassava', 'yam', 'groundnut',
    'sorghum', 'millet', 'beans', 'wheat'
  ];

  useEffect(() => {
    fetchAgentStatus();
    const interval = setInterval(fetchAgentStatus, 15000);
    return () => clearInterval(interval);
    }, []);

    useEffect(() => {
    if (!accountId) return;
    fetch(`${BACKEND_URL}/agent/oracle/status`)
      .then(res => res.json())
      .then(data => {
        if (data.active_oracles?.includes(accountId)) {
        setIsOracleRunning(true);
        }
      })
      .catch(() => {});
    }, [accountId]);

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

    const boundingBox: number[][] = [
      [swLon, swLat],
      [neLon, neLat],
    ];

    setFarmBoundaries(boundingBox);
    setCoordError(null);
    setCoordNotice('Coordinates applied. Boundary updated successfully.');
    setTimeout(() => setCoordNotice(null), 2200);
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

      setFarmBoundaries([
        [swLon, swLat],
        [neLon, neLat],
      ]);
      setCoordError(null);
    }, 400);

    return () => clearTimeout(timer);
  }, [swLongitude, swLatitude, neLongitude, neLatitude]);

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

        setFarmBoundaries([
          [parseFloat(swLon), parseFloat(swLat)],
          [parseFloat(neLon), parseFloat(neLat)],
        ]);

        setCoordError(null);
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

  const fetchAgentStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/agent/status`);
      if (res.ok) {
        const data = await res.json();
        setAgentStatus(data);
        const oracleAgent = data.agents?.find((a: any) => a.name === 'InsuranceOracleAgent');
        if (oracleAgent?.active_farm_loops?.length > 0) {
          setIsOracleRunning(true);
        }
      }
    } catch (e) {
      console.error('Failed to fetch agent status:', e);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRunAnalysis = async () => {
    if (!farmBoundaries.length) {
      setAnalysisError('Please draw your farm boundary on the map or enter coordinates manually first.');
      return;
    }
    if (!accountId) {
      setAnalysisError('Please connect your wallet first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setFarmReport(null);
    setActiveAgents(['CropWatchAgent']);

    try {
      const formData = new FormData();
      formData.append('farmer_id', accountId);
      formData.append('boundaries', JSON.stringify(farmBoundaries));
      if (cropType) formData.append('crop_type', cropType);
      if (locationHint) formData.append('location_hint', locationHint);
      if (selectedImage) formData.append('image', selectedImage);

      setTimeout(() => {
        setActiveAgents(['CropWatchAgent', 'AdvisoryAgent']);
      }, 3000);

      const res = await fetch(`${BACKEND_URL}/agent/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Agent analysis failed');
      }

      const data: FarmReport = await res.json();
      setFarmReport(data);
      setActiveAgents([]);
    } catch (e: any) {
      setAnalysisError(e.message || 'Agent analysis failed. Please try again.');
      setActiveAgents([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOracleCheck = async () => {
    if (!farmBoundaries.length || !accountId) {
      setOracleError('Wallet and farm boundary required (map or manual coordinates).');
      return;
    }

    setIsOracleChecking(true);
    setOracleError(null);
    setOracleResult(null);

    try {
      const formData = new FormData();
      formData.append('farmer_id', accountId);
      formData.append('boundaries', JSON.stringify(farmBoundaries));
      if (cropType) formData.append('crop_type', cropType);

      const res = await fetch(`${BACKEND_URL}/agent/oracle/check`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Oracle check failed');
      const data: OracleResult = await res.json();
      setOracleResult(data);
    } catch (e: any) {
      setOracleError(e.message || 'Oracle check failed.');
    } finally {
      setIsOracleChecking(false);
    }
  };

  const handleOracleStart = async () => {
    if (!farmBoundaries.length || !accountId) {
      setOracleError('Wallet and farm boundary required (map or manual coordinates).');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('farmer_id', accountId);
      formData.append('boundaries', JSON.stringify(farmBoundaries));
      if (cropType) formData.append('crop_type', cropType);
      formData.append('interval_hours', intervalHours.toString());

      const res = await fetch(`${BACKEND_URL}/agent/oracle/start`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to start oracle');
      setIsOracleRunning(true);
      setOracleError(null);
      await fetchAgentStatus();
    } catch (e: any) {
      setOracleError(e.message || 'Failed to start oracle loop.');
    }
  };

  const handleOracleStop = async () => {
    if (!accountId) return;
    try {
      await fetch(`${BACKEND_URL}/agent/oracle/stop/${accountId}`, { method: 'POST' });
      setIsOracleRunning(false);
      await fetchAgentStatus();
    } catch (e) {
      console.error('Failed to stop oracle:', e);
    }
  };

  const getHealthBadge = (health: string) => {
    const map: Record<string, string> = {
      excellent: 'bg-green-500 text-white',
      good: 'bg-green-400 text-white',
      moderate: 'bg-yellow-500 text-white',
      poor: 'bg-red-500 text-white',
      unknown: 'bg-gray-500 text-white',
    };
    return map[health?.toLowerCase()] || map.unknown;
  };

  const getDroughtBadge = (risk: string) => {
    const map: Record<string, string> = {
      low: 'bg-green-500 text-white',
      moderate: 'bg-yellow-500 text-white',
      high: 'bg-orange-500 text-white',
      severe: 'bg-red-500 text-white',
      unknown: 'bg-gray-500 text-white',
    };
    return map[risk?.toLowerCase()] || map.unknown;
  };

  const renderAdvice = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n').filter(l => l.trim());

    return (
      <div className="space-y-2">
        {lines.map((line, i) => {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          const rendered = parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="font-semibold text-gray-800 dark:text-gray-100">
                {part}
              </strong>
            ) : (
              part
            )
          );
          const isNumbered = /^\d+\./.test(line.trim());

          return (
            <p
              key={i}
              className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${isNumbered ? 'pl-2 border-l-2 border-green-400/50' : ''}`}
            >
              {rendered}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Page Header */}
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
          <i className="fas fa-robot text-white text-xl"></i>
        </div>
        <div>
          <h2 className="text-2xl font-bold gradient-text">Farm Intelligence Center</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Multi-agent AI system — every decision logged immutably on Hedera
          </p>
        </div>
      </div>

      {/* Agent Status Bar */}
      {agentStatus && (
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800 dark:text-white text-sm">
              <i className="fas fa-network-wired mr-2 text-green-500"></i>
              Agent Network Status
            </h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Auto-refreshes every 15s
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {agentStatus.agents.map((agent) => (
              <div
                key={agent.name}
                className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <i className={`fas ${AGENT_ICONS[agent.name] || 'fa-robot'} ${AGENT_COLORS[agent.name] || 'text-gray-400'} text-sm`}></i>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate text-gray-700 dark:text-gray-300">
                    {agent.name.replace('Agent', '')}
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                    <span className="text-xs text-gray-500 capitalize">{agent.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT: Farm Setup */}
        <div className="space-y-4">
          <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6">
            <h4 className="font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
              <i className="fas fa-map-marked-alt mr-2 text-green-500"></i>
              Farm Setup
            </h4>

            {/* Map */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Draw Farm Boundary *
              </label>
              <div className="glass rounded-xl overflow-hidden">
                <MapDrawingTool onBoundariesChange={setFarmBoundaries} />
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
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

              {farmBoundaries.length > 0 && (
                <p className="text-xs text-green-500 mt-1">
                  <i className="fas fa-check-circle mr-1"></i>
                  Boundary set: {JSON.stringify(farmBoundaries)}
                </p>
              )}
            </div>

            {/* Crop Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                <i className="fas fa-seedling mr-2 text-green-500"></i>
                Crop Type
              </label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-green-500 transition-all"
              >
                <option value="">Select crop type (optional)</option>
                {cropOptions.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Location Hint */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                <i className="fas fa-map-marker-alt mr-2 text-red-500"></i>
                Location Hint
              </label>
              <input
                type="text"
                value={locationHint}
                onChange={(e) => setLocationHint(e.target.value)}
                placeholder="e.g. Abuja, Nigeria"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-green-500 transition-all"
              />
            </div>

            {/* Optional Image Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                <i className="fas fa-leaf mr-2 text-green-500"></i>
                Crop Image for Disease Detection (optional)
              </label>
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-green-400 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <div>
                    <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />
                    <p className="text-xs text-gray-500">{selectedImage?.name}</p>
                  </div>
                ) : (
                  <div>
                    <i className="fas fa-cloud-upload-alt text-2xl text-gray-400 mb-2"></i>
                    <p className="text-sm text-gray-500">Click to upload a leaf image</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG supported</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            {/* Run Analysis Button */}
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !farmBoundaries.length || !accountId}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Agents Working...
                </>
              ) : (
                <>
                  <i className="fas fa-rocket mr-2"></i>
                  Run Full Farm Analysis
                </>
              )}
            </button>

            {!accountId && (
              <p className="text-xs text-red-400 text-center mt-2">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                Connect your wallet to run analysis
              </p>
            )}

            {analysisError && (
              <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
                <p className="text-red-700 dark:text-red-300 text-sm">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  {analysisError}
                </p>
              </div>
            )}
          </div>

          {/* Insurance Oracle Panel */}
          <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6">
            <h4 className="font-semibold mb-1 text-gray-800 dark:text-white flex items-center">
              <i className="fas fa-shield-alt mr-2 text-green-500"></i>
              Insurance Oracle Agent
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Autonomously monitors your farm and triggers HBAR insurance payouts when drought conditions are detected
            </p>

            {/* Interval Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Monitoring Interval
              </label>
              <select
                value={intervalHours}
                onChange={(e) => setIntervalHours(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 text-sm"
                disabled={isOracleRunning}
              >
                <option value={1}>Every 1 hour</option>
                <option value={3}>Every 3 hours</option>
                <option value={6}>Every 6 hours</option>
                <option value={12}>Every 12 hours</option>
                <option value={24}>Every 24 hours</option>
              </select>
            </div>

            {/* Oracle Trigger Conditions */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Auto-trigger conditions:</p>
              <div className="flex items-center space-x-2">
                <i className="fas fa-circle text-red-400 text-xs"></i>
                <span>NDVI below 20% (critical vegetation index)</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-circle text-red-400 text-xs"></i>
                <span>Vegetation health = poor</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-circle text-red-400 text-xs"></i>
                <span>Drought risk = high or severe</span>
              </div>
            </div>

            {/* Oracle Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={isOracleRunning ? handleOracleStop : handleOracleStart}
                disabled={!farmBoundaries.length || !accountId}
                className={`py-2 px-3 rounded-lg font-medium text-sm transition-all disabled:opacity-50 ${
                  isOracleRunning
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                <i className={`fas ${isOracleRunning ? 'fa-stop' : 'fa-play'} mr-1`}></i>
                {isOracleRunning ? 'Stop Oracle' : 'Start Oracle'}
              </button>

              <button
                onClick={handleOracleCheck}
                disabled={isOracleChecking || !farmBoundaries.length || !accountId}
                className="py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50"
              >
                {isOracleChecking ? (
                  <><i className="fas fa-spinner fa-spin mr-1"></i>Checking...</>
                ) : (
                  <><i className="fas fa-search mr-1"></i>Check Now</>
                )}
              </button>
            </div>

            {isOracleRunning && (
              <div className="flex items-center space-x-2 p-2 bg-green-500/10 rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400 font-medium">
                  Oracle monitoring every {intervalHours}h — auto-payout enabled
                </span>
              </div>
            )}

            {oracleError && (
              <p className="text-red-400 text-xs mt-2">
                <i className="fas fa-exclamation-triangle mr-1"></i>{oracleError}
              </p>
            )}

            {/* Oracle Result */}
            {oracleResult && (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Oracle Decision</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      oracleResult.oracle_decision.should_trigger_claim
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {oracleResult.oracle_decision.should_trigger_claim ? 'Claim Triggered' : 'No Claim Needed'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="block text-gray-500">NDVI</span>
                      <span className="font-medium">{oracleResult.oracle_decision.ndvi_mean.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Health</span>
                      <span className="font-medium capitalize">{oracleResult.oracle_decision.vegetation_health}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Drought</span>
                      <span className="font-medium capitalize">{oracleResult.oracle_decision.drought_risk}</span>
                    </div>
                  </div>
                </div>

                {oracleResult.insurance_outcome && (
                  <div className={`p-3 rounded-lg text-sm ${
                    oracleResult.insurance_outcome.scenario === 'approved'
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-blue-500/10 border border-blue-500/20'
                  }`}>
                    <p className={`font-medium mb-1 ${
                      oracleResult.insurance_outcome.scenario === 'approved'
                        ? 'text-green-400'
                        : 'text-blue-400'
                    }`}>
                      <i className="fas fa-info-circle mr-1"></i>
                      {oracleResult.insurance_outcome.scenario === 'approved'
                        ? 'Insurance Payout Processed'
                        : 'Insurance Status'}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">
                      {oracleResult.insurance_outcome.message}
                    </p>
                    {oracleResult.insurance_outcome.payoutAmount > 0 && (
                      <p className="text-green-400 font-bold mt-1">
                        {oracleResult.insurance_outcome.payoutAmount} HBAR paid out
                      </p>
                    )}
                  </div>
                )}

                {oracleResult.hedera_proof && (
                  <div className="p-2 bg-purple-500/10 rounded-lg text-xs text-purple-300">
                    <i className="fas fa-link mr-1"></i>
                    HCS logged — {oracleResult.hedera_proof.consensusTimestamp
                      ? new Date(oracleResult.hedera_proof.consensusTimestamp).toLocaleString()
                      : 'Confirmed'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Agent Activity + Results */}
        <div className="space-y-4">
          {/* Agent Activity Feed */}
          <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6">
            <h4 className="font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
              <i className="fas fa-stream mr-2 text-blue-500"></i>
              Agent Activity Feed
            </h4>

            {/* Running agents */}
            {isAnalyzing && activeAgents.length > 0 && (
              <div className="space-y-2 mb-4">
                {['CropWatchAgent', 'AdvisoryAgent'].map((agentName) => {
                  const isActive = activeAgents.includes(agentName);
                  const isCropWatch = agentName === 'CropWatchAgent';

                  return (
                    <div
                      key={agentName}
                      className={`p-3 rounded-lg transition-all border ${
                        isActive
                          ? 'bg-blue-500/10 border-blue-500/20'
                          : 'bg-gray-50 dark:bg-gray-700/30 border-transparent opacity-40'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isActive ? 'bg-blue-500/20' : 'bg-gray-200 dark:bg-gray-700'
                        }`}>
                          <i className={`fas ${AGENT_ICONS[agentName] || 'fa-robot'} text-sm ${
                            isActive ? AGENT_COLORS[agentName] : 'text-gray-400'
                          }`}></i>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {agentName}
                            </span>
                            {isActive && (
                              <div className="flex items-center space-x-1">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {isActive
                              ? (isCropWatch ? 'Pulling NASA satellite data...' : 'Running CNN detection + Gemini advisory...')
                              : 'Waiting...'}
                          </p>
                        </div>
                      </div>

                      {/* CropWatch gets the animated progress */}
                      {isActive && isCropWatch && (
                        <CropWatchProgress />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed agent log */}
            {farmReport?.agent_log && farmReport.agent_log.length > 0 ? (
              <div className="space-y-3">
                {farmReport.agent_log.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      entry.status === 'success'
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-red-500/5 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        entry.status === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        <i className={`fas ${AGENT_ICONS[entry.agent] || 'fa-robot'} text-sm ${AGENT_COLORS[entry.agent] || 'text-gray-400'}`}></i>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{entry.agent}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            entry.status === 'success'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {entry.status === 'success' ? '✅ Complete' : '❌ Failed'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">
                          {entry.action.replace(/_/g, ' ')}
                          {entry.disease && ` — ${entry.disease}`}
                          {entry.advice_source && ` (${entry.advice_source})`}
                        </p>
                        {entry.hedera_proof?.consensusTimestamp && (
                          <p className="text-xs text-purple-400 mt-1">
                            <i className="fas fa-link mr-1"></i>
                            HCS: {new Date(entry.hedera_proof.consensusTimestamp).toLocaleString()}
                          </p>
                        )}
                        {entry.error && (
                          <p className="text-xs text-red-400 mt-1">{entry.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !isAnalyzing ? (
              <div className="text-center py-8">
                <i className="fas fa-robot text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Run a farm analysis to see agents working in real time
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  Each agent logs its decision immutably to Hedera HCS
                </p>
              </div>
            ) : null}
          </div>

          {/* Unified Farm Report */}
          {farmReport && (
            <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-800 dark:text-white flex items-center">
                  <i className="fas fa-file-alt mr-2 text-green-500"></i>
                  Farm Intelligence Report
                </h4>
                <span className="text-xs text-gray-500">
                  Session: {farmReport.session_id.slice(0, 8)}...
                </span>
              </div>

              {/* Farm Summary Badges */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">Vegetation Health</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getHealthBadge(farmReport.farm_summary.vegetation_health)}`}>
                    {farmReport.farm_summary.vegetation_health?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">Drought Risk</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getDroughtBadge(farmReport.farm_summary.drought_risk)}`}>
                    {farmReport.farm_summary.drought_risk?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
                {farmReport.farm_summary.ndvi_mean !== null && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-xs text-gray-500 block mb-1">NDVI Index</span>
                    <span className="text-sm font-bold text-blue-600">
                      {farmReport.farm_summary.ndvi_mean.toFixed(3)}
                    </span>
                  </div>
                )}
                {farmReport.satellite_analysis?.ndwi && (
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                    <span className="text-xs text-gray-500 block mb-1">NDWI Index</span>
                    <span className="text-sm font-bold text-cyan-600">
                      {farmReport.satellite_analysis.ndwi.mean.toFixed(3)}
                    </span>
                  </div>
                )}
              </div>

              {/* Disease Analysis */}
              {farmReport.disease_analysis && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <i className="fas fa-bug text-red-500 text-sm"></i>
                    <span className="font-semibold text-red-700 dark:text-red-400 text-sm">Disease Detected</span>
                    <span className="ml-auto text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                      {Math.round(farmReport.disease_analysis.confidence * 100)}% confidence
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div>
                      <span className="text-xs text-gray-500">Crop</span>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{farmReport.disease_analysis.crop}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Disease</span>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{farmReport.disease_analysis.disease}</p>
                    </div>
                  </div>
                    {farmReport.disease_analysis.advice && (
                    <div>
                        <div className="flex items-center space-x-1 mb-2">
                        <i className="fas fa-brain text-purple-400 text-xs"></i>
                        <span className="text-xs text-purple-400 font-medium">
                            Gemini Advisory {farmReport.disease_analysis.advice_source === 'gemini' ? '(AI Generated)' : '(Fallback)'}
                        </span>
                        </div>
                        {renderAdvice(farmReport.disease_analysis.advice)}
                    </div>
                    )}
                </div>
              )}

              {/* Hedera Proof Section */}
              <div className="glass-card rounded-xl border border-white/20 backdrop-blur-lg">
                <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 rounded-xl"
                    onClick={() => setShowHederaDetails(!showHederaDetails)}
                >
                    <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <i className="fas fa-link text-purple-300 text-sm"></i>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-white">Verified on Hedera</div>
                        <div className="text-xs text-purple-300">
                        {farmReport.agent_log.length} agent decisions logged on-chain
                        </div>
                    </div>
                    </div>
                    <i className={`fas fa-chevron-down text-purple-300 transition-transform ${showHederaDetails ? 'rotate-180' : ''}`}></i>
                </div>

                {showHederaDetails && (
                    <div className="px-4 pb-4 space-y-3">
                    {/* Agent timestamps */}
                    {farmReport.agent_log.filter(l => l.hedera_proof?.consensusTimestamp).map((entry, idx) => (
                        <div key={idx} className="p-2 bg-purple-500/10 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                            <i className={`fas ${AGENT_ICONS[entry.agent] || 'fa-robot'} ${AGENT_COLORS[entry.agent]} text-xs`}></i>
                            <span className="text-xs font-medium text-purple-200">{entry.agent}</span>
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${entry.status === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {entry.status === 'success' ? '✅' : '❌'}
                            </span>
                        </div>
                        <p className="text-xs text-purple-300 mt-1 pl-5">
                            <i className="fas fa-clock mr-1 opacity-60"></i>
                            On-chain timestamp: {new Date(entry.hedera_proof!.consensusTimestamp!).toLocaleString('en-GB', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })} UTC
                        </p>
                        </div>
                    ))}

                    {/* Topic links */}
                    <div className="pt-1">
                        <p className="text-xs text-gray-400 mb-2 font-medium">
                        <i className="fas fa-satellite-dish mr-1"></i>
                        Dedicated HCS Topics (Hedera Consensus Service)
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                        <button
                            className="py-2 px-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg text-xs transition-all text-left"
                            onClick={() => window.open(`https://hashscan.io/testnet/topic/0.0.8308940`, '_blank')}
                        >
                          <i className="fas fa-satellite mr-1"></i>
                            CropWatch Topic
                        </button>
                        <button
                            className="py-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 rounded-lg text-xs transition-all text-left"
                            onClick={() => window.open(`https://hashscan.io/testnet/topic/0.0.8308941`, '_blank')}
                        >
                            <i className="fas fa-brain mr-1"></i>
                            Advisory Topic
                        </button>
                        <button
                            className="py-2 px-3 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded-lg text-xs transition-all text-left"
                            onClick={() => window.open(`https://hashscan.io/testnet/topic/0.0.8308942`, '_blank')}
                        >
                            <i className="fas fa-shield-alt mr-1"></i>
                            Insurance Oracle Topic
                        </button>
                        <button
                            className="py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg text-xs transition-all text-left"
                            onClick={() => window.open(`https://hashscan.io/testnet/topic/0.0.8308943`, '_blank')}
                        >
                            <i className="fas fa-coins mr-1"></i>
                            Marketplace Topic
                        </button>
                        </div>
                    </div>

                    {/* View account */}
                    <button
                        className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs transition-all"
                        onClick={() => window.open(`https://hashscan.io/testnet/account/${farmReport.farmer_id}`, '_blank')}
                    >
                        <i className="fas fa-external-link-alt mr-1"></i>
                        View Farmer Account on HashScan
                    </button>
                    </div>
                )}
                </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentCenter;