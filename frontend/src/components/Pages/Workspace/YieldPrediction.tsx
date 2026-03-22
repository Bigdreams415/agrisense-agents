import React, { useState } from 'react';
import { useWallet } from '../../../contexts/WalletContext';
import { BACKEND_URL } from '../../../services/api/constants';

interface YieldRequest {
  Area: string;
  Year: number;
  avg_temp: number;
  average_rain_fall_mm_per_year: number;
  pesticides_tonnes: number;
  crop_type: string;
  farmer_id?: string;
}

interface YieldBackendResponse {
  status: string;
  prediction_id: string;
  type: string;
  result: {
    Area: string;
    Year: number;
    Crop_Type: string;
    Predicted_Yield_hg_per_ha: number;
    yield_quality?: string;
    advice?: string;
    advice_source?: string;
  };
  alternative: any[];
  metadata: {
    timestamp: string;
    farmer_id: string | null;
    model_version: string;
    latency_ms: number;
  };
  hedera_proof?: {
    consensusTimestamp: string;
    status: string;
    transactionId?: string;
  };
  reward_status?: any;
  nft?: {
    tokenId: string;
    serial: string;
    ipfs_cid: string;
  };
}

interface YieldResult {
  result: {
    Area: string;
    Year: number;
    Crop_Type: string;
    Predicted_Yield_hg_per_ha: number;
    yield_quality?: string;
    advice?: string;
    advice_source?: string;
  };
  hedera_proof?: {
    consensusTimestamp: string;
    status: string;
    transactionId?: string;
  };
  reward_status?: any;
  nft?: {
    tokenId: string;
    serial: string;
    ipfs_cid: string;
  };
  metadata?: {
    timestamp: string;
    farmer_id: string | null;
    model_version: string;
    latency_ms: number;
  };
}

const YieldPrediction: React.FC = () => {
  const { accountId } = useWallet();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [yieldResult, setYieldResult] = useState<YieldResult | null>(null);
  const [showBlockchainDetails, setShowBlockchainDetails] = useState(false);
  const [formData, setFormData] = useState({
    Area: '',
    Year: new Date().getFullYear(),
    avg_temp: '',
    average_rain_fall_mm_per_year: '',
    pesticides_tonnes: '',
    crop_type: ''
  });

  const cropOptions = [
    'maize', 'rice', 'cassava', 'yam', 'groundnut', 
    'sorghum', 'millet', 'beans', 'wheat'
  ];

  const areaSuggestions = [
    'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Ethiopia',
    'Tanzania', 'Uganda', 'Zambia', 'Zimbabwe', 'Malawi'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleYieldPrediction = async () => {
    const currentYear = new Date().getFullYear();
    const parsedYear = parseInt(formData.Year.toString(), 10);

    // Validate required fields
    if (!formData.Area || !formData.crop_type || !formData.avg_temp || 
        !formData.average_rain_fall_mm_per_year || !formData.pesticides_tonnes) {
      alert('Please fill in all required fields');
      return;
    }

    if (Number.isNaN(parsedYear) || parsedYear > currentYear) {
      alert(`Year must be ${currentYear} or earlier.`);
      return;
    }

    setIsAnalyzing(true);
    try {
      // Prepare request data
      const requestData: YieldRequest = {
        Area: formData.Area,
        Year: parsedYear,
        avg_temp: parseFloat(formData.avg_temp),
        average_rain_fall_mm_per_year: parseFloat(formData.average_rain_fall_mm_per_year),
        pesticides_tonnes: parseFloat(formData.pesticides_tonnes),
        crop_type: formData.crop_type,
        farmer_id: accountId || undefined
      };

      // Use environment variable for backend URL
      const backendUrl = BACKEND_URL;
      
      // Call your backend API
      const response = await fetch(`${backendUrl}/yield/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Failed to get yield prediction');
      }

      const backendResult: YieldBackendResponse = await response.json();
      
      // Transform backend response to frontend format
      const frontendResult: YieldResult = {
        result: backendResult.result,
        hedera_proof: backendResult.hedera_proof,
        reward_status: backendResult.reward_status,
        nft: backendResult.nft,
        metadata: backendResult.metadata
      };
      
      setYieldResult(frontendResult);
      
    } catch (error) {
      console.error('Yield prediction error:', error);
      // Fallback to simulation if backend is not available
      simulateYieldPrediction();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const simulateYieldPrediction = () => {
    // Simulate API call delay
    setTimeout(() => {
      const baseYield = Math.random() * 50000 + 20000;  
      const simulatedResult: YieldResult = {
        result: {
          Area: formData.Area,
          Year: parseInt(formData.Year.toString()),
          Crop_Type: formData.crop_type,
          Predicted_Yield_hg_per_ha: Math.round(baseYield)
        }
      };
      
      setYieldResult(simulatedResult);
    }, 2500);
  };

  const formatYield = (yieldValue: number) => {
    if (yieldValue >= 1000) {
      return `${(yieldValue / 1000).toFixed(1)}k hg/ha`;
    }
    return `${yieldValue} hg/ha`;
  };

  const getCropIcon = (cropType: string) => {
    const icons: { [key: string]: string } = {
      maize: 'fa-corn',
      rice: 'fa-wheat-alt',
      cassava: 'fa-leaf',
      yam: 'fa-carrot',
      groundnut: 'fa-seedling',
      sorghum: 'fa-wheat-awn',
      millet: 'fa-wheat-awn-circle-exclamation',
      beans: 'fa-seedling',
      wheat: 'fa-wheat-alt'
    };
    return icons[cropType] || 'fa-seedling';
  };

  // Render markdown-formatted advice with bold text and numbered borders
  const renderAdvice = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n').filter(l => l.trim());
    return (
      <div className="space-y-2">
        {lines.map((line, i) => {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          const rendered = parts.map((part, j) =>
            j % 2 === 1
              ? <strong key={j} className="font-semibold text-gray-800 dark:text-gray-100">{part}</strong>
              : part
          );
          const isNumbered = /^\d+\./.test(line.trim());
          return (
            <p key={i} className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${
              isNumbered ? 'pl-3 border-l-2 border-green-400/50' : ''
            }`}>
              {rendered}
            </p>
          );
        })}
      </div>
    );
  };

  // Hedera Proof Display Component
  const renderHederaProof = () => {
    if (!yieldResult?.hedera_proof) return null;

    return (
      <div className="mt-4 glass-card rounded-xl border border-white/20 backdrop-blur-lg">
        {/* Clickable Header */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-all duration-200 rounded-xl"
          onClick={() => setShowBlockchainDetails(!showBlockchainDetails)}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400/20 to-blue-400/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <i className="fas fa-link text-purple-300 text-lg"></i>
            </div>
            <div>
              <div className="font-semibold text-white">Verified on Hedera</div>
              <div className="text-purple-200 text-sm">
                {new Date(yieldResult.hedera_proof.consensusTimestamp).toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className={`transform transition-transform duration-300 ${showBlockchainDetails ? 'rotate-180' : ''}`}>
            <i className="fas fa-chevron-down text-purple-300 text-lg"></i>
          </div>
        </div>

        {/* Expandable Content */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
          showBlockchainDetails ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="px-4 pb-4 space-y-3">
            {/* Status Badge */}
            <div className="flex items-center justify-between p-3 bg-green-400/10 rounded-lg backdrop-blur-sm">
              <span className="text-green-200 text-sm">Blockchain Status</span>
              <span className="px-2 py-1 bg-green-500/30 text-green-100 rounded-full text-xs font-medium backdrop-blur-sm">
                {yieldResult.hedera_proof.status}
              </span>
            </div>

            {/* Consensus Timestamp */}
            <div className="p-3 bg-blue-400/10 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <i className="fas fa-clock text-blue-300 text-sm"></i>
                <span className="text-blue-200 text-sm font-medium">Timestamp</span>
              </div>
              <div className="text-xs text-blue-100">
                {new Date(yieldResult.hedera_proof.consensusTimestamp).toLocaleString()}
              </div>
            </div>

            {/* NFT Certificate */}
            {yieldResult.nft && (
              <div className="p-3 bg-purple-400/10 rounded-lg backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <i className="fas fa-certificate text-purple-300 text-sm"></i>
                  <span className="text-purple-200 text-sm font-medium">Digital Certificate</span>
                </div>
                <div className="text-xs text-purple-100 font-mono space-y-1">
                  <div>Token: {yieldResult.nft.tokenId}</div>
                  {/* <div>Serial: {yieldResult.nft.serial}</div>
                  <div className="break-all">IPFS: {yieldResult.nft.ipfs_cid}</div> */}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                className="py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg text-xs transition-all text-left"
                onClick={() => window.open('https://hashscan.io/testnet/topic/0.0.8308943', '_blank')}
              >
                <i className="fas fa-coins mr-1"></i>
                Marketplace Topic
              </button>
              <button
                className="py-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 rounded-lg text-xs transition-all text-left"
                onClick={() => window.open('https://hashscan.io/testnet/topic/0.0.8308941', '_blank')}
              >
                <i className="fas fa-brain mr-1"></i>
                Advisory Topic
              </button>
              <button
                className="col-span-2 py-2 px-3 bg-gradient-to-r from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 text-white rounded-lg text-xs transition-all backdrop-blur-sm border border-white/10"
                onClick={() => {
                  if (yieldResult.hedera_proof?.transactionId) {
                    const txId = yieldResult.hedera_proof.transactionId
                      .replace('@', '-')
                      .replace(/\.(?=[^.]*$)/, '-');
                    window.open(`https://hashscan.io/testnet/transaction/${txId}`, '_blank');
                  } else if (yieldResult.metadata?.farmer_id) {
                    window.open(`https://hashscan.io/testnet/account/${yieldResult.metadata.farmer_id}`, '_blank');
                  }
                }}
              >
                <i className="fas fa-external-link-alt mr-1"></i>
                {yieldResult.hedera_proof?.transactionId ? 'View Transaction' : 'View Account'}
              </button>
              {yieldResult.nft && (
                <button
                  className="col-span-2 py-2 px-3 bg-gradient-to-r from-green-500/30 to-emerald-500/30 hover:from-green-500/40 hover:to-emerald-500/40 text-white rounded-lg text-xs transition-all backdrop-blur-sm border border-white/10"
                  onClick={() => window.open(`https://hashscan.io/testnet/token/${yieldResult.nft?.tokenId}`, '_blank')}
                >
                  <i className="fas fa-eye mr-1"></i>
                  View NFT Certificate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Input Form */}
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift">
          <h3 className="text-xl font-bold mb-4 text-green-600 flex items-center">
            <i className="fas fa-chart-line mr-3 text-green-500"></i>
            Crop Yield Prediction
          </h3>
          
          <div className="space-y-4">
            {/* Area Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <i className="fas fa-map-marker-alt mr-2 text-red-500"></i>
                Farm Area/Country *
              </label>
              <input
                type="text"
                name="Area"
                value={formData.Area}
                onChange={handleInputChange}
                placeholder="Enter country or region"
                list="area-suggestions"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
              />
              <datalist id="area-suggestions">
                {areaSuggestions.map(area => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            </div>

            {/* Year Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <i className="fas fa-calendar-alt mr-2 text-blue-500"></i>
                Year *
              </label>
              <input
                type="number"
                name="Year"
                value={formData.Year}
                onChange={handleInputChange}
                min="2000"
                max={new Date().getFullYear()}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
              />
            </div>

            {/* Crop Type Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <i className="fas fa-seedling mr-2 text-green-500"></i>
                Crop Type *
              </label>
              <select
                name="crop_type"
                value={formData.crop_type}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
              >
                <option value="">Select a crop type</option>
                {cropOptions.map(crop => (
                  <option key={crop} value={crop}>
                    {crop.charAt(0).toUpperCase() + crop.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Temperature Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <i className="fas fa-thermometer-three-quarters mr-2 text-orange-500"></i>
                Average Temperature (°C) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="avg_temp"
                  value={formData.avg_temp}
                  onChange={handleInputChange}
                  placeholder="Enter average temperature"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                  min="-10"
                  max="50"
                  step="0.1"
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  °C
                </div>
              </div>
            </div>

            {/* Rainfall Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <i className="fas fa-cloud-rain mr-2 text-blue-400"></i>
                Annual Rainfall (mm/year) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="average_rain_fall_mm_per_year"
                  value={formData.average_rain_fall_mm_per_year}
                  onChange={handleInputChange}
                  placeholder="Enter annual rainfall"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                  min="0"
                  max="5000"
                  step="1"
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  mm
                </div>
              </div>
            </div>

            {/* Pesticides Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <i className="fas fa-spray-can mr-2 text-purple-500"></i>
                Pesticides Used (tonnes) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="pesticides_tonnes"
                  value={formData.pesticides_tonnes}
                  onChange={handleInputChange}
                  placeholder="Enter pesticides quantity"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                  min="0"
                  max="1000"
                  step="0.1"
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  tonnes
                </div>
              </div>
            </div>

            {/* Analysis Button */}
            <button
              onClick={handleYieldPrediction}
              disabled={isAnalyzing || !formData.Area || !formData.crop_type || !formData.avg_temp || !formData.average_rain_fall_mm_per_year || !formData.pesticides_tonnes}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
            >
              {isAnalyzing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Predicting Crop Yield...
                </>
              ) : (
                <>
                  <i className="fas fa-chart-bar mr-2"></i>
                  Predict Yield
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Display */}
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift">
          <h4 className="font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
            <i className="fas fa-chart-pie mr-2 text-purple-500"></i>
            Yield Prediction Results
          </h4>
          
          <div className="results-container">
            {!yieldResult ? (
              <div className="result-placeholder text-center py-12">
                <i className="fas fa-seedling text-4xl text-gray-400 mb-4"></i>
                <p className="text-gray-500 dark:text-gray-400">
                  Enter farm data to predict crop yield potential
                </p>
              </div>
            ) : (
              <div className="results-content space-y-6">
                {/* Main Yield Card */}
                <div className="p-6 rounded-lg border-2 border-green-400/30 bg-green-500/10 text-center transition-all duration-300">
                  <div className="flex justify-center mb-3">
                    <i className={`fas ${getCropIcon(yieldResult.result.Crop_Type)} text-4xl text-green-500`}></i>
                  </div>
                  <div className="text-3xl font-bold mb-2 gradient-text">
                    {formatYield(yieldResult.result.Predicted_Yield_hg_per_ha)}
                  </div>
                </div>

                {/* Hedera Proof Section */}
                {renderHederaProof()}

                {/* Gemini Advisory */}
                {yieldResult.result.advice && (
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-lg border border-green-200 dark:border-green-700/30">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-green-700 dark:text-green-300 flex items-center">
                        <i className="fas fa-robot mr-2"></i>
                        Advisory Agent
                      </h5>
                      <span className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                        {yieldResult.result.advice_source === 'gemini' ? 'Powered by Gemini' : 'Fallback'}
                      </span>
                    </div>
                    {renderAdvice(yieldResult.result.advice)}
                  </div>
                )}

                {/* Recommendations */}
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700/30">
                  <h5 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2 flex items-center">
                    <i className="fas fa-lightbulb mr-2"></i>
                    Farming Recommendations
                  </h5>
                  <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                    {yieldResult.result.Predicted_Yield_hg_per_ha > 60000 && (
                      <li>• Maintain current practices - excellent yield potential!</li>
                    )}
                    {yieldResult.result.Predicted_Yield_hg_per_ha <= 60000 && yieldResult.result.Predicted_Yield_hg_per_ha > 40000 && (
                      <>
                        <li>• Consider soil enrichment with organic compost</li>
                        <li>• Optimize irrigation schedule for 10% yield increase</li>
                      </>
                    )}
                    {yieldResult.result.Predicted_Yield_hg_per_ha <= 40000 && yieldResult.result.Predicted_Yield_hg_per_ha > 25000 && (
                      <>
                        <li>• Implement precision farming techniques</li>
                        <li>• Consider crop rotation strategies</li>
                        <li>• Review pest management practices</li>
                      </>
                    )}
                    {yieldResult.result.Predicted_Yield_hg_per_ha <= 25000 && (
                      <>
                        <li>• Conduct soil nutrient analysis</li>
                        <li>• Consider switching to more suitable crops</li>
                        <li>• Implement advanced irrigation systems</li>
                        <li>• Consult agricultural expert for soil treatment</li>
                      </>
                    )}
                  </ul>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Information Card */}
      <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 mt-6 hover-lift">
        <h4 className="font-semibold mb-3 text-gray-800 dark:text-white flex items-center">
          <i className="fas fa-chart-line mr-2 text-green-500"></i>
          About Yield Prediction
        </h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-4">
          <p>
            This module estimates expected crop output from your farm inputs and weather conditions,
            then logs the prediction on Hedera for transparent traceability.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30">
              <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Input Signals</div>
              <div>Area, crop type, rainfall, temperature, and pesticide usage are analyzed together.</div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30">
              <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Prediction Engine</div>
              <div>The model computes a yield estimate in hg/ha to support planning and decision-making.</div>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/30">
              <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Advisory Layer</div>
              <div>Advisory guidance is generated separately, so this section focuses on the predicted yield value.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YieldPrediction;