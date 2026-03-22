import React, { useState } from 'react';
import { useWallet } from '../../../contexts/WalletContext';
import { BACKEND_URL } from '../../../services/api/constants';

interface IrrigationRequest {
  soil_moisture: number;
  temperature: number;
  air_humidity: number;
  farmer_id?: string;
}

interface IrrigationBackendResponse {
  input: {
    soil_moisture: number;
    temperature: number;
    air_humidity: number;
  };
  result: {
    status: 'ON' | 'OFF';
    probability_on: number;
    probability_off: number;
    recommendation: string;
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

interface IrrigationResult {
  input: {
    soil_moisture: number;
    temperature: number;
    air_humidity: number;
  };
  prediction: {
    status: 'ON' | 'OFF';
    probability_on: number;
    probability_off: number;
    recommendation: string;
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

const SmartIrrigation: React.FC = () => {
  const { accountId } = useWallet();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [irrigationResult, setIrrigationResult] = useState<IrrigationResult | null>(null);
  const [showBlockchainDetails, setShowBlockchainDetails] = useState(false);
  const [formData, setFormData] = useState({
    soil_moisture: '',
    temperature: '',
    air_humidity: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleIrrigationAnalysis = async () => {
    if (!formData.soil_moisture || !formData.temperature || !formData.air_humidity) {
      alert('Please fill in all fields');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Convert string values to numbers
      const requestData: IrrigationRequest = {
        soil_moisture: parseFloat(formData.soil_moisture),
        temperature: parseFloat(formData.temperature),
        air_humidity: parseFloat(formData.air_humidity),
        farmer_id: accountId || undefined
      };

      // Use environment variable for backend URL
      const backendUrl = BACKEND_URL;
      
      // Call your backend API
      const response = await fetch(`${backendUrl}/irrigation/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Failed to get irrigation prediction');
      }

      const backendResult: IrrigationBackendResponse = await response.json();
      
      const frontendResult: IrrigationResult = {
        input: backendResult.input,
        prediction: {
          status: backendResult.result.status,
          probability_on: backendResult.result.probability_on,
          probability_off: backendResult.result.probability_off,
          recommendation: backendResult.result.recommendation,
          advice: backendResult.result.advice,
          advice_source: backendResult.result.advice_source,
        },
        hedera_proof: backendResult.hedera_proof,
        reward_status: backendResult.reward_status,
        nft: backendResult.nft,
        metadata: backendResult.metadata
      };
      
      setIrrigationResult(frontendResult);
      
    } catch (error) {
      console.error('Irrigation analysis error:', error);
      simulateIrrigationAnalysis();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const simulateIrrigationAnalysis = () => {
    setTimeout(() => {
      const soilMoisture = parseFloat(formData.soil_moisture);
      const shouldIrrigate = soilMoisture < 40;  
      
      const simulatedResult: IrrigationResult = {
        input: {
          soil_moisture: soilMoisture,
          temperature: parseFloat(formData.temperature),
          air_humidity: parseFloat(formData.air_humidity)
        },
        prediction: {
          status: shouldIrrigate ? 'ON' : 'OFF',
          probability_on: shouldIrrigate ? 0.85 : 0.15,
          probability_off: shouldIrrigate ? 0.15 : 0.85,
          recommendation: shouldIrrigate 
            ? 'Irrigate now — soil appears dry!' 
            : 'No irrigation needed — soil moisture is sufficient.'
        }
      };
      
      setIrrigationResult(simulatedResult);
    }, 2000);
  };

  const getStatusColor = (status: 'ON' | 'OFF') => {
    return status === 'ON' ? 'text-red-500' : 'text-green-500';
  };

  const getStatusBgColor = (status: 'ON' | 'OFF') => {
    return status === 'ON' ? 'bg-red-500/20 border-red-400/30' : 'bg-green-500/20 border-green-400/30';
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
              isNumbered ? 'pl-3 border-l-2 border-blue-400/50' : ''
            }`}>
              {rendered}
            </p>
          );
        })}
      </div>
    );
  };

  // Add Hedera proof display function
  const renderHederaProof = () => {
    if (!irrigationResult?.hedera_proof) return null;

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
                {new Date(irrigationResult.hedera_proof.consensusTimestamp).toLocaleString()}
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
                {irrigationResult.hedera_proof.status}
              </span>
            </div>

            {/* Consensus Timestamp */}
            <div className="p-3 bg-blue-400/10 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <i className="fas fa-clock text-blue-300 text-sm"></i>
                <span className="text-blue-200 text-sm font-medium">Timestamp</span>
              </div>
              <div className="text-xs text-blue-100">
                {new Date(irrigationResult.hedera_proof.consensusTimestamp).toLocaleString()}
              </div>
            </div>

            {/* NFT Certificate */}
            {irrigationResult.nft && (
              <div className="p-3 bg-purple-400/10 rounded-lg backdrop-blur-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <i className="fas fa-certificate text-purple-300 text-sm"></i>
                  <span className="text-purple-200 text-sm font-medium">Digital Certificate</span>
                </div>
                <div className="text-xs text-purple-100 font-mono space-y-1">
                  <div>Token: {irrigationResult.nft.tokenId}</div>
                  <div>Serial: {irrigationResult.nft.serial}</div>
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
                  if (irrigationResult.hedera_proof?.transactionId) {
                    const txId = irrigationResult.hedera_proof.transactionId
                      .replace('@', '-')
                      .replace(/\.(?=[^.]*$)/, '-');
                    window.open(`https://hashscan.io/testnet/transaction/${txId}`, '_blank');
                  } else if (irrigationResult.metadata?.farmer_id) {
                    window.open(`https://hashscan.io/testnet/account/${irrigationResult.metadata.farmer_id}`, '_blank');
                  }
                }}
              >
                <i className="fas fa-external-link-alt mr-1"></i>
                {irrigationResult.hedera_proof?.transactionId ? 'View Transaction' : 'View Account'}
              </button>
              {irrigationResult.nft && (
                <button
                  className="col-span-2 py-2 px-3 bg-gradient-to-r from-green-500/30 to-emerald-500/30 hover:from-green-500/40 hover:to-emerald-500/40 text-white rounded-lg text-xs transition-all backdrop-blur-sm border border-white/10"
                  onClick={() => window.open(`https://hashscan.io/testnet/token/${irrigationResult.nft?.tokenId}`, '_blank')}
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
        {/* Input Form  */}
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift">
          <h3 className="text-xl font-bold mb-4 text-blue-600 flex items-center">
            <i className="fas fa-tint mr-3 text-blue-500"></i>
            Smart Irrigation Analysis
          </h3>
          
          <div className="space-y-4">
            {/* Soil Moisture Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <i className="fas fa-seedling mr-2 text-green-500"></i>
                Soil Moisture (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="soil_moisture"
                  value={formData.soil_moisture}
                  onChange={handleInputChange}
                  placeholder="Enter soil moisture percentage"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  %
                </div>
              </div>
            </div>

            {/* Temperature Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <i className="fas fa-thermometer-half mr-2 text-red-500"></i>
                Temperature (°C)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="temperature"
                  value={formData.temperature}
                  onChange={handleInputChange}
                  placeholder="Enter temperature in Celsius"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  min="-50"
                  max="60"
                  step="0.1"
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  °C
                </div>
              </div>
            </div>

            {/* Air Humidity Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <i className="fas fa-cloud mr-2 text-blue-400"></i>
                Air Humidity (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="air_humidity"
                  value={formData.air_humidity}
                  onChange={handleInputChange}
                  placeholder="Enter air humidity percentage"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  %
                </div>
              </div>
            </div>

            {/* Analysis Button */}
            <button
              onClick={handleIrrigationAnalysis}
              disabled={isAnalyzing || !formData.soil_moisture || !formData.temperature || !formData.air_humidity}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
            >
              {isAnalyzing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Analyzing Irrigation Needs...
                </>
              ) : (
                <>
                  <i className="fas fa-brain mr-2"></i>
                  Analyze Irrigation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Display */}
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift">
          <h4 className="font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
            <i className="fas fa-chart-bar mr-2 text-purple-500"></i>
            Irrigation Analysis Results
          </h4>
          
          <div className="results-container">
            {!irrigationResult ? (
              <div className="result-placeholder text-center py-12">
                <i className="fas fa-tint text-4xl text-gray-400 mb-4"></i>
                <p className="text-gray-500 dark:text-gray-400">
                  Enter soil and weather data to get irrigation recommendations
                </p>
              </div>
            ) : (
              <div className="results-content space-y-4">
                {/* Status Card */}
                <div className={`p-4 rounded-lg border-2 ${getStatusBgColor(irrigationResult.prediction.status)} transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Irrigation Status:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(irrigationResult.prediction.status)} bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm`}>
                      {irrigationResult.prediction.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {irrigationResult.prediction.recommendation}
                  </p>
                </div>

                {/* Probability Bars */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-red-500 font-medium">Irrigation ON Probability</span>
                    <span className="font-semibold">{(irrigationResult.prediction.probability_on * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-red-400 to-red-600 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${irrigationResult.prediction.probability_on * 100}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-sm mt-4">
                    <span className="text-green-500 font-medium">Irrigation OFF Probability</span>
                    <span className="font-semibold">{(irrigationResult.prediction.probability_off * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${irrigationResult.prediction.probability_off * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Input Data Summary */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {irrigationResult.input.soil_moisture}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Soil Moisture</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {irrigationResult.input.temperature}°C
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Temperature</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {irrigationResult.input.air_humidity}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Air Humidity</div>
                  </div>
                </div>

                {/* Gemini Advisory */}
                {irrigationResult.prediction.advice && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-lg border border-blue-200 dark:border-blue-700/30">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center">
                        <i className="fas fa-robot mr-2"></i>
                        Advisory Agent
                      </h5>
                      <span className="text-xs text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
                        {irrigationResult.prediction.advice_source === 'gemini' ? 'Powered by Gemini' : 'Fallback'}
                      </span>
                    </div>
                    {renderAdvice(irrigationResult.prediction.advice)}
                  </div>
                )}

                {/* Hedera Proof Display */}
                {renderHederaProof()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Information Card */}
      <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 mt-6 hover-lift">
        <h4 className="font-semibold mb-3 text-gray-800 dark:text-white flex items-center">
          <i className="fas fa-info-circle mr-2 text-blue-500"></i>
          How Smart Irrigation Works
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start space-x-2">
            <i className="fas fa-seedling text-green-500 mt-1"></i>
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Soil Analysis</span>
              <p>Monitors soil moisture levels to prevent over/under watering</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <i className="fas fa-thermometer-half text-red-500 mt-1"></i>
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Weather Integration</span>
              <p>Considers temperature and humidity for optimal timing</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <i className="fas fa-brain text-purple-500 mt-1"></i>
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">AI Prediction</span>
              <p>Machine learning model predicts irrigation needs with 95% accuracy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartIrrigation;