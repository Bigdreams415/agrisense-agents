import React, { useState, useRef, useEffect } from 'react';
import { useTypingAnimation } from '../../../hooks/useTypingAnimation';
import { useCamera } from '../../../hooks/useCamera';
import { useDrone } from '../../../hooks/useDrone';
import { useWallet } from '../../../contexts/WalletContext';
import { AnalysisService } from '../../../services/api/analysisService';
import { AnalysisResponse } from '../../../services/api/types';
import { AnalysisModel, DataSource, AnalysisResult, StreamingSettings} from '../../../types/workspace';
import { MODELS, DATA_SOURCES } from '../../../utils/workspaceConstants';

import YieldPrediction from './YieldPrediction';
import SmartIrrigation from './SmartIrrigation';

import MapDrawingTool from '../../../components/Map/MapDrawingTool';
import CropSelector from '../../../components/Forms/CropSelector';
import FarmDetailsForm from '../../../components/Forms/FarmDetailsForm';

// Satellite imagery imports
import { analyzeSatelliteImagery } from '../../../services/api/satellite';
import { SatelliteAnalysisResponse } from '../../../services/api/satellite';

import './Workspace.css';

const Workspace: React.FC = () => {
  const { accountId } = useWallet();
  const [currentModel, setCurrentModel] = useState<AnalysisModel>('pest');
  const [currentSource, setCurrentSource] = useState<DataSource>('upload');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDroneStreaming] = useState(false);
  const [nextDroneCapture, setNextDroneCapture] = useState<number | null>(null);
  const [showBlockchainDetails, setShowBlockchainDetails] = useState(false);
  const [droneConnectionError, setDroneConnectionError] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Satellite state
  const [farmBoundaries, setFarmBoundaries] = useState<number[][]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [plantingDate, setPlantingDate] = useState<string>('');
  const [isAnalyzingSatellite, setIsAnalyzingSatellite] = useState(false);
  const [satelliteResult, setSatelliteResult] = useState<SatelliteAnalysisResponse | null>(null);
  const [satelliteError, setSatelliteError] = useState<string | null>(null);
  const [showSatelliteBlockchainDetails, setShowSatelliteBlockchainDetails] = useState(false);
  // eslint-disable-next-line
  const [savedFarms, setSavedFarms] = useState<any[]>([]); 
  // eslint-disable-next-line
  const [manualCoordinates, setManualCoordinates] = useState<string>('');

  // Protocol useState
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<'rtmp' | 'rtsp' | null>(null);
  const [rtspInputUrl, setRtspInputUrl] = useState('');

  const typingText = useTypingAnimation(currentModel);
  const { cameraState, videoRef: cameraVideoRef, canvasRef, startCamera, stopCamera, captureImage } = useCamera();
  const {
    droneSettings,
    connectionStatus,
    videoRef: droneVideoRef,
    currentStreamUrl: droneStreamUrl,
    currentJobId,
    wsConnection,
    error: droneError,
    droneAnalysisResults,
    latestDroneResult,
    isVideoAnalyzing,
    videoAnalysisProgress, 
    videoAnalysisResults,
    connectViaRTMP,
    connectViaRTSP,
    connectViaUpload,
    startAnalysis,
    stopAnalysis,
    disconnectDrone,
    updateInterval,
    analyzeUploadedVideo,
    stopVideoAnalysis
  } = useDrone();
  const fileInputRef = useRef<HTMLInputElement>(null);

  //Streaming mode
  const [streamingSettings, setStreamingSettings] = useState<StreamingSettings>({
    isActive: false,
    interval: 10, 
    lastCaptureTime: 0,
    isCoolingDown: false
  });


  const streamingIntervalRef = useRef<number | null>(null);

  // Handler for model source
  const handleModelChange = (model: AnalysisModel) => {
    setCurrentModel(model);
  };

  const handleSourceChange = (source: DataSource) => {
    setCurrentSource(source);
    if (source === 'camera' && !cameraState.isActive) {
      startCamera();
    } else if (source !== 'camera' && cameraState.isActive) {
      stopCamera();
    }
    
    if (source !== 'drone' && connectionStatus !== 'disconnected') {
      disconnectDrone();
    }
  };

  //File upload /drag-drop / preview 
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleCaptureFromCamera = () => {
    const imageData = captureImage();
    if (imageData) {
      setFilePreview(imageData);
      fetch(imageData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          setSelectedFile(file);
        });
    }
  };
  // capture frame from drone
  const captureFrameFromDrone = async (): Promise<File | null> => {
    if (!droneVideoRef.current) return null;
    
    const video = droneVideoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });
      
      if (blob) {
        return new File([blob], `drone-capture-${Date.now()}.jpg`, { 
          type: 'image/jpeg' 
        });
      }
      return null;
    } catch (error) {
      console.error('Error capturing frame from drone:', error);
      return null;
    }
  };

  const analyzeImage = async (file: File): Promise<AnalysisResponse> => {
    setAnalysisError(null); // Clear previous errors
    setIsAnalyzing(true);
    setAnalysisResult(null); // Clear previous results

    try {
      const isBackendAvailable = await AnalysisService.healthCheck();
      
      if (!isBackendAvailable) {
        throw new Error('Analysis service is currently unavailable. Please try again later.');
      }

      const response = await AnalysisService.analyzeImage({
        file,
        farmer_id: accountId,
        model: currentModel
      });
      
      setAnalysisResult(response);
      return response;
      
    } catch (error) {
      console.error('Analysis Error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to analyze image. Please check your connection and try again.';
      
      setAnalysisError(errorMessage);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };
  // Handle Satellite coordinates
  const handleCoordinatesChange = (boundingBox: number[][]) => {
    setFarmBoundaries(boundingBox);
    
    const [sw, ne] = boundingBox;
    const coordString = `SW: ${sw[0]}, ${sw[1]} | NE: ${ne[0]}, ${ne[1]}`;
    setManualCoordinates(coordString);
  };

  const handleSatelliteAnalysis = async () => {
    if (!farmBoundaries.length || !selectedCrop || !plantingDate) {
      setSatelliteError('Please complete all required fields: draw boundary, select crop, and set planting date');
      return;
    }

    setIsAnalyzingSatellite(true);
    setSatelliteError(null);

    try {
      const formattedBoundaries = farmBoundaries;

      const requestData = {
        boundaries: formattedBoundaries,
        crop_type: selectedCrop,
        planting_date: plantingDate,
        farmer_id: accountId, 
      };

      const result = await analyzeSatelliteImagery(requestData);
      setSatelliteResult(result);
      
    } catch (error) {
      setSatelliteError(error instanceof Error ? error.message : 'Satellite analysis failed');
    } finally {
      setIsAnalyzingSatellite(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (selectedFile) {
      await analyzeImage(selectedFile);
    }
  };

  // STREAMING LOGIC with Preserved  cooldown state
  const captureAndAnalyze = async () => {
    if (isAnalyzing || streamingSettings.isCoolingDown) return;

    setStreamingSettings(prev => ({ ...prev, isCoolingDown: true }));

    const imageData = captureImage();
    if (!imageData) {
      setStreamingSettings(prev => ({ ...prev, isCoolingDown: false }));
      return;
    }

    try {
      const res = await fetch(imageData);
      const blob = await res.blob();
      const file = new File([blob], `live-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });

      setSelectedFile(file);
      setFilePreview(imageData);

      await analyzeImage(file);

      // Update lastCaptureTime and reset cooldown
      setStreamingSettings(prev => ({
        ...prev,
        lastCaptureTime: Date.now(),
        isCoolingDown: false
      }));
    } catch (err) {
      console.error('Streaming capture error:', err);
      setStreamingSettings(prev => ({ ...prev, isCoolingDown: false }));
    }
  };

  const startStreamingAnalysis = () => {
    if (streamingIntervalRef.current) {
      window.clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }

    streamingIntervalRef.current = window.setInterval(() => {
      if (!streamingSettings.isCoolingDown) {
        captureAndAnalyze();
      }
    }, streamingSettings.interval * 1000);
  };

  const stopStreamingAnalysis = () => {
    if (streamingIntervalRef.current) {
      window.clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    // reset cooldown
    setStreamingSettings(prev => ({ ...prev, isCoolingDown: false }));
  };

  useEffect(() => {
  if (latestDroneResult) {
    console.log('Latest drone result received:', latestDroneResult);
    console.log('All drone results:', droneAnalysisResults);
  }
  }, [latestDroneResult, droneAnalysisResults]);

  // start/stop streaming based on settings + camera state
  useEffect(() => {
    if (streamingSettings.isActive && cameraState.isActive) {
      startStreamingAnalysis();
    } else {
      stopStreamingAnalysis();
    }

    return () => {
      stopStreamingAnalysis();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamingSettings.isActive, streamingSettings.interval, cameraState.isActive]);

  // UseEffect for Drone
  useEffect(() => {
  let droneInterval: number | null = null;
  let countdownInterval: number | null = null;

  if (currentSource === 'drone' && isDroneStreaming) {
    setNextDroneCapture(null);
    
    droneInterval = window.setInterval(async () => {
      if (!isAnalyzing) {
        const droneFrame = await captureFrameFromDrone();
        if (droneFrame) {
          await analyzeImage(droneFrame);
        }
        setNextDroneCapture(null);
      }
    }, droneSettings.interval * 1000);

    countdownInterval = window.setInterval(() => {
      if (nextDroneCapture === null) {
        setNextDroneCapture(droneSettings.interval);
      } else if (nextDroneCapture > 0) {
        setNextDroneCapture(prev => prev !== null ? prev - 1 : null);
      }
    }, 1000);
  }

  return () => {
    if (droneInterval) {
      window.clearInterval(droneInterval);
    }
    if (countdownInterval) {
      window.clearInterval(countdownInterval);
    }
    setNextDroneCapture(null);  
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSource, isDroneStreaming, droneSettings.interval, isAnalyzing]);

  const handleStreamingToggle = () => {
    setStreamingSettings(prev => ({
      ...prev,
      isActive: !prev.isActive,
      isCoolingDown: false
    }));
  };

  const handleIntervalChange = (newInterval: number) => {
    setStreamingSettings(prev => ({
      ...prev,
      interval: newInterval
    }));
  };

  //RENDER
  return (
    <div className="animate-fadeIn">
      <h3 className="text-2xl font-bold mb-6 gradient-text">AgriSense AI Analysis</h3>

      {/* Model Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Select Analysis Mode
        </label>
        <div className="flex flex-wrap gap-2">
          {MODELS.map((model) => (
            <button
              key={model.id}
              className={`model-btn ${currentModel === model.id ? 'active' : ''}`}
              onClick={() => handleModelChange(model.id as AnalysisModel)}
            >
              <i className={`fas ${model.icon} mr-2`}></i>
              {model.name}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Typing Status */}
      <div className="typing-header mb-6">
        <div className="text-lg font-semibold text-center gradient-text">
          {typingText}
        </div>
      </div>
      {currentModel === 'yield' && <YieldPrediction />}
      {currentModel === 'irrigation' && <SmartIrrigation />}
      {currentModel === 'pest' && (
        <>
          {/* Main Analysis Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Input Sources */}
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6">
          <h4 className="font-semibold mb-4 text-gray-800 dark:text-white">Data Input Sources</h4>

          {/* Source Selection */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {DATA_SOURCES.map((source) => (
              <button
                key={source.id}
                className={`source-btn ${currentSource === source.id ? 'active' : ''}`}
                onClick={() => handleSourceChange(source.id as DataSource)}
              >
                <i className={`fas ${source.icon} mr-2`}></i>
                {source.name}
              </button>
            ))}
          </div>

          {/* Upload Zone */}
          {currentSource === 'upload' && (
            <div className="source-section">
              <div 
                className="drop-zone mb-4"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <i className="fas fa-cloud-upload-alt text-3xl text-blue-500 mb-3"></i>
                <p className="text-gray-600 dark:text-gray-400 mb-2">Drag & drop crop images</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Supports: JPG, PNG</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept=".jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
              </div>
              {filePreview && (
                <div className="mb-4 text-center">
                  <img 
                    src={filePreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-lg mb-2"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedFile?.name}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button 
                  className="action-btn"
                  onClick={() => handleSourceChange('camera')}
                >
                  <i className="fas fa-camera mr-2"></i>Take Photo
                </button>
                <button 
                  className="action-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fas fa-folder mr-2"></i>Browse Files
                </button>
              </div>
            </div>
          )}

          {/* Live Camera Feed + Streaming Controls */}
          {currentSource === 'camera' && (
            <div className="source-section">
              <div className="camera-preview mb-4">
                <video 
                  ref={cameraVideoRef}
                  autoPlay 
                  playsInline 
                  className="w-full rounded-lg"
                  style={{ display: cameraState.isActive ? 'block' : 'none' }}
                />
                <canvas ref={canvasRef} className="hidden" />
                {!cameraState.isActive && (
                  <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <i className="fas fa-camera text-3xl text-gray-400"></i>
                  </div>
                )}
              </div>

              {/* Streaming Mode Controls */}
              <div className="glass rounded-xl p-4 mb-4 border border-white/10 backdrop-blur-md">
                {/* Streaming Toggle */}
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={streamingSettings.isActive}
                        onChange={handleStreamingToggle}
                        className="sr-only"
                      />
                      <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                        streamingSettings.isActive 
                          ? 'bg-gradient-to-r from-green-400 to-cyan-400' 
                          : 'bg-gray-600/30'
                      }`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-300 transform ${
                          streamingSettings.isActive 
                            ? 'translate-x-6 bg-white' 
                            : 'translate-x-0 bg-gray-400'
                        }`} />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {streamingSettings.isActive ? 'Live Analysis' : 'Snapshot Mode'}
                    </span>
                  </label>

                  {/* Live Indicator */}
                  {streamingSettings.isActive && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-400 font-medium">Analyzing Live</span>
                    </div>
                  )}
                </div>

                {/* Interval Slider */}
                {streamingSettings.isActive && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400">
                      Capture every: {streamingSettings.interval}s
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={30}
                      value={streamingSettings.interval}
                      onChange={(e) => handleIntervalChange(Number(e.target.value))}
                      className="w-full h-2 bg-gray-600/30 rounded-lg appearance-none cursor-pointer slider-thumb"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>10s</span>
                      <span>30s</span>
                    </div>
                  </div>
                )}

                {/* Cooldown Indicator */}
                {streamingSettings.isCoolingDown && (
                  <div className="mt-2 text-center">
                    <span className="text-xs text-cyan-400">
                      ⏳ Next capture in {Math.ceil((streamingSettings.interval * 1000 - (Date.now() - streamingSettings.lastCaptureTime)) / 1000)}s...
                    </span>
                  </div>
                )}
              </div>

              {/* Camera Control Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  className="action-btn"
                  onClick={cameraState.isActive ? stopCamera : startCamera}
                >
                  <i className={`fas ${cameraState.isActive ? 'fa-stop' : 'fa-play'} mr-2`}></i>
                  {cameraState.isActive ? 'Stop Camera' : 'Start Camera'}
                </button>
                <button 
                  className="action-btn"
                  onClick={handleCaptureFromCamera}
                  disabled={!cameraState.isActive || streamingSettings.isActive}
                >
                  <i className="fas fa-camera mr-2"></i>Capture
                </button>
              </div>
            </div>
          )}

          {/* Drone Feed Section */}
          {currentSource === 'drone' && (
            <div className="source-section">
              {/* Protocol Selection Modal */}
              {showProtocolModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                      Connect Your Drone
                    </h3>
                    
                    {/* Protocol Selection */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <button
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedProtocol === 'rtmp' 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                        }`}
                        onClick={() => setSelectedProtocol('rtmp')}
                      >
                        <div className="text-lg mb-2">📤</div>
                        <div className="font-medium text-sm">RTMP Stream</div>
                        <div className="text-xs text-gray-500 mt-1">Drone pushes to cloud</div>
                      </button>
                      
                      <button
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedProtocol === 'rtsp' 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                        }`}
                        onClick={() => setSelectedProtocol('rtsp')}
                      >
                        <div className="text-lg mb-2">📥</div>
                        <div className="font-medium text-sm">RTSP Stream</div>
                        <div className="text-xs text-gray-500 mt-1">Cloud pulls from drone</div>
                      </button>
                    </div>

                    {/* RTMP */}
                    {selectedProtocol === 'rtmp' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          RTMP Stream URL
                        </label>
                        <input
                          type="text"
                          placeholder="rtmp://your-server/live/stream-key"
                          value={rtspInputUrl}
                          onChange={(e) => setRtspInputUrl(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter your drone's RTMP output URL
                        </p>
                      </div>
                    )}

                    {/* RTSP */}
                    {selectedProtocol === 'rtsp' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          RTSP Stream URL
                        </label>
                        <input
                          type="text"
                          placeholder="rtsp://your-drone-ip:554/stream"
                          value={rtspInputUrl}
                          onChange={(e) => setRtspInputUrl(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter your drone's RTSP stream URL
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowProtocolModal(false);
                          setSelectedProtocol(null);
                          setRtspInputUrl('');
                          setDroneConnectionError('');  
                        }}
                        className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!selectedProtocol) {
                            setDroneConnectionError('Please select a connection method');
                            return;
                          }
                          
                          if (!rtspInputUrl.trim()) {
                            setDroneConnectionError('Please enter your drone stream URL');
                            return;
                          }

                          setShowProtocolModal(false);
                          setDroneConnectionError('');  
                          
                          let success = false;
                          if (selectedProtocol === 'rtmp') {
                            success = await connectViaRTMP(rtspInputUrl);
                          } else if (selectedProtocol === 'rtsp') {
                            success = await connectViaRTSP(rtspInputUrl);
                          }
                          
                          if (!success) {
                          }
                          
                          setSelectedProtocol(null);
                          setRtspInputUrl('');
                        }}
                        className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-medium"
                      >
                        Connect
                      </button>
                    </div>

                    {/* Modal Error Display */}
                    {droneConnectionError && (
                      <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        <div className="flex items-center">
                          <i className="fas fa-exclamation-triangle mr-2"></i>
                          <span className="text-sm">{droneConnectionError}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Main Error Display */}
              {droneError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  <div className="flex items-center">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    <span className="text-sm">{droneError}</span>
                  </div>
                </div>
              )}

              {/* Drone Video Feed */}
              <div className="camera-preview mb-4">
                <video
                  ref={droneVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full rounded-lg"
                  style={{ display: droneStreamUrl ? 'block' : 'none' }}
                />
                {!droneStreamUrl && (
                  <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <i className="fas fa-drone text-3xl text-gray-400 mb-2"></i>
                      <p className="text-gray-500">Upload a video to view live feed or use Live Drone features</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Drone Connection Status Card */}
              <div className="glass rounded-xl p-4 mb-4 border border-white/10 backdrop-blur-md">
                {/* Connection Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                      connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                      connectionStatus === 'failed' ? 'bg-red-400' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {connectionStatus === 'connected' ? `Live Drone Connected${droneSettings.currentProtocol ? ` via ${droneSettings.currentProtocol.toUpperCase()}` : ''}` :
                      connectionStatus === 'connecting' ? 'Connecting to Drone...' :
                      connectionStatus === 'failed' ? 'Connection Failed' : 'Ready to Connect'}
                    </span>
                  </div>
                  
                  {/* Performance Metrics */}
                  {connectionStatus === 'connected' && (
                    <div className="flex items-center space-x-3 text-xs">
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-signal text-blue-400"></i>
                        <span>{Math.round(droneSettings.signalStrength)}%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-battery-three-quarters text-green-400"></i>
                        <span>{Math.round(droneSettings.batteryLevel)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Analysis Indicator */}
                {(currentJobId || isVideoAnalyzing) && connectionStatus === 'connected' && (
                  <div className="flex items-center space-x-2 mt-2 mb-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-400 font-medium">
                      {droneSettings.currentProtocol === 'upload' 
                        ? `Video Analysis Active - ${videoAnalysisResults.length} frames analyzed`
                        : `Live Analysis Active - ${droneAnalysisResults.length} frames analyzed`
                      }
                    </span>
                  </div>
                )}

                {/* Connection Controls */}
                {connectionStatus === 'disconnected' || connectionStatus === 'failed' ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowProtocolModal(true)}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all"
                    >
                      <i className="fas fa-satellite-dish mr-2"></i>
                      Connect Drone
                    </button>
                    
                    {/* Upload Drone Footage */}
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'video/*,image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            connectViaUpload(file);
                          }
                        };
                        input.click();
                      }}
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all"
                    >
                      <i className="fas fa-upload mr-2"></i>
                      Upload Drone Footage
                    </button>
                  </div>
                ) : connectionStatus === 'connecting' ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-blue-500">Connecting to drone stream...</p>
                    <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {droneSettings.currentProtocol === 'upload' ? (
                        // Uploaded Video Analysis
                        <>
                          {!isVideoAnalyzing ? (
                            <button
                              onClick={() => {
                                if (!accountId) {
                                  setDroneConnectionError('Please connect your wallet first');
                                  return;
                                }
                                analyzeUploadedVideo(accountId);
                              }}
                              disabled={!accountId}
                              className={`flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all ${
                                !accountId ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              <i className="fas fa-play mr-2"></i>
                              {!accountId ? 'Connect Wallet' : 'Analyze Video'}
                            </button>
                          ) : (
                            <button
                              onClick={stopVideoAnalysis}
                              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all"
                            >
                              <i className="fas fa-stop mr-2"></i>
                              Stop Analysis
                            </button>
                          )}
                        </>
                      ) : (
                        // Live Drone Analysis
                        <>
                          {!currentJobId ? (
                            <button
                              onClick={() => {
                                if (!accountId) {
                                  setDroneConnectionError('Please connect your wallet first');
                                  return;
                                }
                                startAnalysis(accountId);  
                              }}
                              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all"
                            >
                              <i className="fas fa-play mr-2"></i>
                              Start Analysis
                            </button>
                          ) : (
                            <button
                              onClick={stopAnalysis}
                              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all"
                            >
                              <i className="fas fa-stop mr-2"></i>
                              Stop Analysis
                            </button>
                          )}
                        </>
                      )}
                      
                      <button
                        onClick={disconnectDrone}
                        className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all"
                      >
                        <i className="fas fa-disconnect mr-2"></i>
                        Disconnect
                      </button>
                    </div>

                    {/* Video Analysis Progress */}
                    {isVideoAnalyzing && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>Analyzing video...</span>
                          <span>{Math.round(videoAnalysisProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${videoAnalysisProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Interval Control */}
                    {droneSettings.currentProtocol !== 'upload' && (
                      <div className="mt-4 space-y-2">
                        <label className="text-xs text-gray-600 dark:text-gray-400">
                          Analysis interval: {droneSettings.interval}s
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="30"
                          value={droneSettings.interval}
                          onChange={(e) => updateInterval(Number(e.target.value))}
                          className="w-full h-2 bg-gray-600/30 rounded-lg appearance-none cursor-pointer slider-thumb"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>5s</span>
                          <span>30s</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* WebSocket Connection Status */}
                {wsConnection && (
                  <div className="mt-3 p-2 bg-green-500/20 rounded-lg">
                    <div className="flex items-center space-x-2 text-green-400 text-xs">
                      <i className="fas fa-wifi"></i>
                      <span>Real-time updates connected</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Analysis Status */}
              {currentJobId && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-microchip text-blue-500"></i>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Analysis Job: {currentJobId.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                      <i className="fas fa-clock"></i>
                      <span>Every {droneSettings.interval}s</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Satellite Imagery */}
          {currentSource === 'satellite' && (
            <div className="source-section">
              <div className="mb-4">
                <h5 className="font-semibold mb-3">Setup Farm Monitoring</h5>
                
                {/* Farm Selection */}
                {savedFarms.length > 0 && (
                  <div className="glass rounded-xl p-4 mb-4">
                    <label className="block text-sm font-medium mb-2">Select Existing Farm</label>
                    <select className="w-full p-2 border rounded-lg">
                      <option value="">Choose a farm...</option>
                      {savedFarms.map(farm => (
                        <option key={farm.id} value={farm.id}>{farm.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Map Drawing */}
                <div className="glass rounded-xl p-4 mb-4">
                  <MapDrawingTool onBoundariesChange={setFarmBoundaries} />
                </div>

                {/* Crop Selection */}
                <div className="glass rounded-xl p-4 mb-4">
                  <CropSelector selectedCrop={selectedCrop} onCropSelect={setSelectedCrop} />
                </div>

                {/* Farm Details */}
                <div className="glass rounded-xl p-4 mb-4">
                  <FarmDetailsForm
                    plantingDate={plantingDate}
                    onPlantingDateChange={setPlantingDate}
                    onCoordinatesChange={handleCoordinatesChange}
                  />
                </div>

                {/* Analysis Button */}
                <button
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSatelliteAnalysis}
                  disabled={!farmBoundaries.length || !selectedCrop || !plantingDate || isAnalyzingSatellite}
                >
                  {isAnalyzingSatellite ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Analyzing Satellite Data...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-satellite mr-2"></i>
                      Start Monitoring Farm
                    </>
                  )}
                </button>

                {/* Show current boundaries for debugging */}
                {farmBoundaries.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    Farm area: {JSON.stringify(farmBoundaries)}
                  </div>
                )}

                {/* Add error display below the button */}
                {satelliteError && (
                  <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                    <div className="flex items-center">
                      <i className="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                      <span className="text-red-700">{satelliteError}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Analysis Button for non-drone sources */}
          {currentSource !== 'drone' && currentSource !== 'satellite' && (
            <button 
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all mt-4"
              onClick={handleRunAnalysis}
              disabled={!selectedFile || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Analyzing...
                </>
              ) : (
                <>
                  <i className="fas fa-brain mr-2"></i>
                  Analyze Now
                </>
              )}
            </button>
          )}
        </div>

        {/* Results Display */}
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6">
          <h4 className="font-semibold mb-4 text-gray-800 dark:text-white">
            {currentSource === 'satellite' && satelliteResult 
              ? 'Satellite Analysis Results' 
              : currentSource === 'drone' && latestDroneResult
              ? 'Live Drone Analysis Results'
              : 'Analysis Results'
            }
          </h4>

          {analysisError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <i className="fas fa-exclamation-triangle text-red-500 mr-3"></i>
                <div>
                  <p className="text-red-800 dark:text-red-200 font-medium">
                    Analysis Failed
                  </p>
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                    {analysisError}
                  </p>
                  <button 
                    onClick={() => setAnalysisError(null)}
                    className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="results-container">
            {/* Show satellite results if available and satellite source is selected */}
              {currentSource === 'satellite' && satelliteResult ? (
              <div className="results-content">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">Vegetation Health:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        satelliteResult.result.vegetation_health === 'excellent' ? 'bg-green-500 text-white' :
                        satelliteResult.result.vegetation_health === 'good' ? 'bg-green-400 text-white' :
                        satelliteResult.result.vegetation_health === 'moderate' ? 'bg-yellow-500 text-white' :
                        'bg-red-500 text-white'
                      }`}>
                        {satelliteResult.result.vegetation_health.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      NDVI: {satelliteResult.result.ndvi.mean.toFixed(3)}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">Drought Risk:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        satelliteResult.result.drought_risk === 'low' ? 'bg-green-500 text-white' :
                        satelliteResult.result.drought_risk === 'moderate' ? 'bg-yellow-500 text-white' :
                        satelliteResult.result.drought_risk === 'high' ? 'bg-orange-500 text-white' :
                        'bg-red-500 text-white'
                      }`}>
                        {satelliteResult.result.drought_risk.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      NDWI: {satelliteResult.result.ndwi.mean.toFixed(3)}
                    </p>
                  </div>
                </div>

                {/* Enhanced Hedera Proof Section for Satellite */}
                {satelliteResult.hedera_proof && (
                  <div className="mt-4 glass-card rounded-xl border border-white/20 backdrop-blur-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-all duration-200 rounded-xl"
                      onClick={() => setShowSatelliteBlockchainDetails(!showSatelliteBlockchainDetails)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm ${
                          satelliteResult.insurance_payout?.status === 'approved' 
                            ? 'bg-green-400/20' 
                            : satelliteResult.insurance_payout?.status === 'already_claimed'
                            ? 'bg-yellow-400/20'
                            : satelliteResult.insurance_payout?.status === 'no_insurance'
                            ? 'bg-red-400/20'
                            : 'bg-blue-400/20' 
                        }`}>
                          <i className={`text-lg ${
                            satelliteResult.insurance_payout?.status === 'approved' 
                              ? 'fas fa-check-circle text-green-300'
                              : satelliteResult.insurance_payout?.status === 'already_claimed'
                              ? 'fas fa-clock text-yellow-300'
                              : satelliteResult.insurance_payout?.status === 'no_insurance'
                              ? 'fas fa-times-circle text-red-300'
                              : 'fas fa-leaf text-blue-300' 
                          }`}></i>
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {satelliteResult.insurance_payout?.status === 'approved' 
                              ? 'Insurance Claim Approved'
                              : satelliteResult.insurance_payout?.status === 'already_claimed'
                              ? 'Already Claimed This Season'
                              : satelliteResult.insurance_payout?.status === 'no_insurance'
                              ? 'No Insurance Policy'
                              : 'Already Claimed This Season'}
                          </div>
                          <div className="text-purple-200 text-sm">
                            {new Date(satelliteResult.hedera_proof.consensusTimestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className={`transform transition-transform duration-300 ${showSatelliteBlockchainDetails ? 'rotate-180' : ''}`}>
                        <i className="fas fa-chevron-down text-purple-300 text-lg"></i>
                      </div>
                    </div>

                    {/* Expandable Content */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      showSatelliteBlockchainDetails ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      <div className="px-4 pb-4 space-y-3">
                        {/* Insurance Payout Status */}
                        {satelliteResult.insurance_payout && (
                          <div className={`p-3 rounded-lg backdrop-blur-sm ${
                            satelliteResult.insurance_payout.status === 'approved' 
                              ? 'bg-green-400/10 border border-green-400/20'
                              : satelliteResult.insurance_payout.status === 'already_claimed'
                              ? 'bg-yellow-400/10 border border-yellow-400/20'
                              : satelliteResult.insurance_payout.status === 'no_insurance'
                              ? 'bg-red-400/10 border border-red-400/20'
                              : 'bg-blue-400/10 border border-blue-400/20'
                          }`}>
                            <div className="flex items-center space-x-2 mb-2">
                              <i className={`text-sm ${
                                satelliteResult.insurance_payout.status === 'approved' 
                                  ? 'fas fa-coins text-green-300'
                                  : satelliteResult.insurance_payout.status === 'already_claimed'
                                  ? 'fas fa-history text-yellow-300'
                                  : satelliteResult.insurance_payout.status === 'no_insurance'
                                  ? 'fas fa-shield-alt text-red-300'
                                  : 'fas fa-seedling text-blue-300'
                              }`}></i>
                              <span className={`text-sm font-medium ${
                                satelliteResult.insurance_payout.status === 'approved' 
                                  ? 'text-green-200'
                                  : satelliteResult.insurance_payout.status === 'already_claimed'
                                  ? 'text-yellow-200'
                                  : satelliteResult.insurance_payout.status === 'no_insurance'
                                  ? 'text-red-200'
                                  : 'text-blue-200'
                              }`}>
                                {satelliteResult.insurance_payout.status === 'approved' 
                                  ? 'Payout Approved'
                                  : satelliteResult.insurance_payout.status === 'already_claimed'
                                  ? 'Claim Status'
                                  : satelliteResult.insurance_payout.status === 'no_insurance'
                                  ? 'Insurance Status'
                                  : 'Health Status'}
                              </span>
                            </div>
                            
                            {/* Payout Amount */}
                            {satelliteResult.insurance_payout.status === 'approved' && typeof satelliteResult.insurance_payout.amount_hbar === 'number' && satelliteResult.insurance_payout.amount_hbar > 0 && (
                              <div className="mb-2">
                                <div className="text-2xl font-bold text-green-100">
                                  {satelliteResult.insurance_payout.amount_hbar} HBAR
                                </div>
                                <div className="text-xs text-green-200 opacity-80">
                                  ≈ ${(satelliteResult.insurance_payout.amount_hbar * 0.25).toFixed(2)} USD
                                </div>
                              </div>
                            )}
                            
                            {/* Status Message */}
                            <div className={`text-sm ${
                              satelliteResult.insurance_payout.status === 'approved' 
                                ? 'text-green-100'
                                : satelliteResult.insurance_payout.status === 'already_claimed'
                                ? 'text-yellow-100'
                                : satelliteResult.insurance_payout.status === 'no_insurance'
                                ? 'text-red-100'
                                : 'text-blue-100'
                            }`}>
                              {satelliteResult.insurance_payout.message}
                            </div>
                          </div>
                        )}

                        {/* Transaction Status */}
                        <div className="flex items-center justify-between p-3 bg-purple-400/10 rounded-lg backdrop-blur-sm">
                          <span className="text-purple-200 text-sm">Blockchain Status</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                            satelliteResult.hedera_proof.status === 'SUCCESS' 
                              ? 'bg-green-500/30 text-green-100'
                              : 'bg-red-500/30 text-red-100'
                          }`}>
                            {satelliteResult.hedera_proof.status}
                          </span>
                        </div>

                        {/* Transaction ID */}
                        {satelliteResult.hedera_proof.transactionId && (
                          <div className="p-3 bg-indigo-400/10 rounded-lg backdrop-blur-sm">
                            <div className="flex items-center space-x-2 mb-2">
                              <i className="fas fa-receipt text-indigo-300 text-sm"></i>
                              <span className="text-indigo-200 text-sm font-medium">Transaction ID</span>
                            </div>
                            <div className="text-xs text-indigo-100 font-mono break-all">
                              {satelliteResult.hedera_proof.transactionId}
                            </div>
                          </div>
                        )}

                        {/* NFT Token ID */}
                        {satelliteResult.nft && (
                          <div className="p-3 bg-blue-400/10 rounded-lg backdrop-blur-sm">
                            <div className="flex items-center space-x-2 mb-2">
                              <i className="fas fa-certificate text-blue-300 text-sm"></i>
                              <span className="text-blue-200 text-sm font-medium">Digital Certificate</span>
                            </div>
                            <div className="text-xs text-blue-100 font-mono">
                              Token: {satelliteResult.nft.tokenId} • Serial: {satelliteResult.nft.serial}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex space-x-2">
                          {/* View on HashScan */}
                          <button 
                            className="flex-1 bg-gradient-to-r from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 text-white py-2 px-3 rounded-lg text-sm transition-all duration-200 backdrop-blur-sm border border-white/10"
                            onClick={() => {
                              if (satelliteResult.hedera_proof?.transactionId) {
                                window.open(`https://hashscan.io/testnet/transaction/${satelliteResult.hedera_proof.transactionId}`, '_blank');
                              } else {
                                window.open(`https://hashscan.io/testnet/account/${satelliteResult.metadata.farmer_id}`, '_blank');
                              }
                            }}
                          >
                            <i className="fas fa-external-link-alt mr-2"></i>
                            {satelliteResult.hedera_proof.transactionId ? 'View Transaction' : 'View Account'}
                          </button>

                          {/* Buy Insurance */}
                          {satelliteResult.insurance_payout?.status === 'no_insurance' && (
                            <button 
                              className="flex-1 bg-gradient-to-r from-green-500/30 to-emerald-500/30 hover:from-green-500/40 hover:to-emerald-500/40 text-white py-2 px-3 rounded-lg text-sm transition-all duration-200 backdrop-blur-sm border border-white/10"
                              onClick={() => {}}
                            >
                              <i className="fas fa-shield-alt mr-2"></i>
                              Get Insurance
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              ) : currentSource === 'drone' && latestDroneResult ? (
                <div className="results-content">

                  {/* Real-time Analysis Status */}
                  <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {droneSettings.currentProtocol === 'upload' ? 'Video Analysis Active' : 'Live Analysis Active'}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      {droneSettings.currentProtocol === 'upload' 
                        ? `${videoAnalysisResults.length} frames analyzed`
                        : `${droneAnalysisResults.length} frames analyzed`
                      }
                    </div>
                  </div>

                  {/* Latest Detection Results */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">Detection Confidence:</span>
                      <span className="confidence-badge">
                        {Math.round((latestDroneResult.result?.confidence || latestDroneResult.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="confidence-bar h-2 rounded-full"
                        style={{ width: `${(latestDroneResult.result?.confidence || latestDroneResult.confidence || 0) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Crop:</span>
                      <p className="font-semibold">
                        {latestDroneResult.result?.crop || 'Unknown'}
                      </p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Disease:</span>
                      <p className="font-semibold">
                        {latestDroneResult.result?.disease || latestDroneResult.detections?.[0] || 'No detection'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h5 className="font-semibold mb-2">Expert Advice:</h5>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {latestDroneResult.result?.advice || latestDroneResult.advice || 'No advice available'}
                    </p>
                  </div>

                  {/* Enhanced Hedera Proof Section for Drone */}
                  {(latestDroneResult.blockchain_proof || latestDroneResult.hedera_proof) && (
                    <div className="mt-4 glass-card rounded-xl border border-white/20 backdrop-blur-lg">
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
                              {new Date(
                                latestDroneResult.blockchain_proof?.consensusTimestamp || 
                                latestDroneResult.hedera_proof?.consensusTimestamp
                              ).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className={`transform transition-transform duration-300 ${showBlockchainDetails ? 'rotate-180' : ''}`}>
                          <i className="fas fa-chevron-down text-purple-300 text-lg"></i>
                        </div>
                      </div>
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        showBlockchainDetails ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="px-4 pb-4 space-y-3">
                          {/* Status Badge */}
                          <div className="flex items-center justify-between p-3 bg-green-400/10 rounded-lg backdrop-blur-sm">
                            <span className="text-green-200 text-sm">Transaction Status</span>
                            <span className="px-2 py-1 bg-green-500/30 text-green-100 rounded-full text-xs font-medium backdrop-blur-sm">
                              {latestDroneResult.blockchain_proof?.status || latestDroneResult.hedera_proof?.status}
                            </span>
                          </div>

                          {/* Reward Status */}
                          {latestDroneResult.reward_status && (
                            <div className="p-3 bg-yellow-400/10 rounded-lg backdrop-blur-sm">
                              <div className="flex items-center space-x-2 mb-2">
                                <i className="fas fa-gift text-yellow-300 text-sm"></i>
                                <span className="text-yellow-200 text-sm font-medium">Reward Earned</span>
                              </div>
                              <div className="space-y-1 text-xs text-yellow-100">
                                <div className="flex justify-between">
                                  <span>Amount:</span>
                                  <span className="font-semibold">{latestDroneResult.reward_status.amount}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Type:</span>
                                  <span>{latestDroneResult.reward_status.type}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Status:</span>
                                  <span className="capitalize">{latestDroneResult.reward_status.status}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Bonus Status */}
                          {latestDroneResult.bonus_status && (
                            <div className="p-3 bg-green-400/10 rounded-lg backdrop-blur-sm">
                              <div className="flex items-center space-x-2 mb-2">
                                <i className="fas fa-star text-green-300 text-sm"></i>
                                <span className="text-green-200 text-sm font-medium">Bonus Status</span>
                              </div>
                              <div className="space-y-1 text-xs text-green-100">
                                <div className="flex justify-between">
                                  <span>Type:</span>
                                  <span className="capitalize">{latestDroneResult.bonus_status.type}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Status:</span>
                                  <span className="capitalize">{latestDroneResult.bonus_status.status}</span>
                                </div>
                                <div className="text-green-200 mt-1">
                                  {latestDroneResult.bonus_status.message}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* NFT Token ID */}
                          {latestDroneResult.nft && (
                            <div className="p-3 bg-blue-400/10 rounded-lg backdrop-blur-sm">
                              <div className="flex items-center space-x-2 mb-2">
                                <i className="fas fa-certificate text-blue-300 text-sm"></i>
                                <span className="text-blue-200 text-sm font-medium">Digital Certificate</span>
                              </div>
                              <div className="text-xs text-blue-100 font-mono">
                                {latestDroneResult.nft.tokenId}
                              </div>
                            </div>
                          )}

                          {/* Action Button */}
                          <button 
                            className="w-full bg-gradient-to-r from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 text-white py-2 px-3 rounded-lg text-sm transition-all duration-200 backdrop-blur-sm border border-white/10"
                            onClick={() => {
                              const transactionId = latestDroneResult.blockchain_proof?.transactionId || 
                                                  latestDroneResult.hedera_proof?.transactionId;
                              const farmerId = latestDroneResult.metadata?.farmer_id;
                              
                              if (transactionId) {
                                const txId = transactionId.replace('@', '-').replace(/\.(?=[^.]*$)/, '-'); 
                                window.open(`https://hashscan.io/testnet/transaction/${txId}`, '_blank');
                              } else if (farmerId) {
                                window.open(`https://hashscan.io/testnet/account/${farmerId}`, '_blank');
                              } else {
                                window.open('https://hashscan.io/testnet', '_blank');
                              }
                            }}
                          >
                            <i className="fas fa-external-link-alt mr-2"></i>
                            {latestDroneResult.blockchain_proof?.transactionId || latestDroneResult.hedera_proof?.transactionId 
                              ? 'View Transaction' 
                              : 'View Account'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Frame Thumbnail */}
                  {latestDroneResult.thumbnail_b64 && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                      <h5 className="font-semibold mb-2">Latest Frame Analyzed:</h5>
                      <img 
                        src={`data:image/jpeg;base64,${latestDroneResult.thumbnail_b64}`}
                        alt="Latest drone frame"
                        className="w-full max-w-xs rounded-lg mx-auto"
                      />
                    </div>
                  )}
                </div>
              ) : 
            /* Show regular analysis results */
            !analysisResult ? (
              <div className="result-placeholder text-center">
                <i className="fas fa-microscope text-4xl text-gray-400 mb-4"></i>
                <p className="text-gray-500 dark:text-gray-400">
                  {currentSource === 'satellite' 
                    ? 'Start monitoring your farm to see satellite analysis results' 
                    : 'Upload an image to detect pests and diseases'}
                </p>
              </div>
            ) : (
              <div className="results-content">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Detection Confidence:</span>
                    <span className="confidence-badge">
                      {Math.round(analysisResult.result.confidence * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="confidence-bar h-2 rounded-full"
                      style={{ width: `${analysisResult.result.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Crop:</span>
                    <p className="font-semibold">{analysisResult.result.crop}</p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Disease:</span>
                    <p className="font-semibold">{analysisResult.result.disease}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <h5 className="font-semibold mb-2">Expert Advice:</h5>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {analysisResult.result.advice}
                  </p>
                </div>

                {/* Updated Hedera Proof Section */}
                {analysisResult.hedera_proof && (
                  <div className="mt-4 glass-card rounded-xl border border-white/20 backdrop-blur-lg">
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
                            {new Date(analysisResult.hedera_proof.consensusTimestamp).toLocaleString()}
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
                          <span className="text-green-200 text-sm">Transaction Status</span>
                          <span className="px-2 py-1 bg-green-500/30 text-green-100 rounded-full text-xs font-medium backdrop-blur-sm">
                            {analysisResult.hedera_proof.status}
                          </span>
                        </div>

                        {/* Reward Status */}
                        {analysisResult.reward_status && (
                          <div className="p-3 bg-yellow-400/10 rounded-lg backdrop-blur-sm">
                            <div className="flex items-center space-x-2 mb-2">
                              <i className="fas fa-gift text-yellow-300 text-sm"></i>
                              <span className="text-yellow-200 text-sm font-medium">Reward Earned</span>
                            </div>
                            <div className="space-y-1 text-xs text-yellow-100">
                              <div className="flex justify-between">
                                <span>Amount:</span>
                                <span className="font-semibold">{analysisResult.reward_status.amount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Type:</span>
                                <span>{analysisResult.reward_status.type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Status:</span>
                                <span className="capitalize">{analysisResult.reward_status.status}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Bonus Status */}
                        {analysisResult.bonus_status && (
                          <div className="p-3 bg-green-400/10 rounded-lg backdrop-blur-sm">
                            <div className="flex items-center space-x-2 mb-2">
                              <i className="fas fa-star text-green-300 text-sm"></i>
                              <span className="text-green-200 text-sm font-medium">Bonus Status</span>
                            </div>
                            <div className="space-y-1 text-xs text-green-100">
                              <div className="flex justify-between">
                                <span>Type:</span>
                                <span className="capitalize">{analysisResult.bonus_status.type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Status:</span>
                                <span className="capitalize">{analysisResult.bonus_status.status}</span>
                              </div>
                              <div className="text-green-200 mt-1">
                                {analysisResult.bonus_status.message}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* NFT Token ID */}
                        {analysisResult.nft && (
                          <div className="p-3 bg-blue-400/10 rounded-lg backdrop-blur-sm">
                            <div className="flex items-center space-x-2 mb-2">
                              <i className="fas fa-certificate text-blue-300 text-sm"></i>
                              <span className="text-blue-200 text-sm font-medium">Digital Certificate</span>
                            </div>
                            <div className="text-xs text-blue-100 font-mono">
                              {analysisResult.nft.tokenId}
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        <button 
                          className="w-full bg-gradient-to-r from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 text-white py-2 px-3 rounded-lg text-sm transition-all duration-200 backdrop-blur-sm border border-white/10"
                          onClick={() => {
                            const transactionId = analysisResult.hedera_proof?.transactionId;
                            const farmerId = (analysisResult.metadata as any)?.farmer_id || 
                                            (analysisResult as any)?.metadata?.farmer_id;
                            
                            if (transactionId) {
                              const txId = transactionId.replace('@', '-').replace(/\.(?=[^.]*$)/, '-'); 
                              window.open(`https://hashscan.io/testnet/transaction/${txId}`, '_blank');
                            } else if (farmerId) {
                              window.open(`https://hashscan.io/testnet/account/${farmerId}`, '_blank');
                            } else {
                              window.open('https://hashscan.io/testnet', '_blank');
                            }
                          }}
                        >
                          <i className="fas fa-external-link-alt mr-2"></i>
                          {analysisResult.hedera_proof?.transactionId ? 'View Transaction' : 'View Account'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default Workspace;