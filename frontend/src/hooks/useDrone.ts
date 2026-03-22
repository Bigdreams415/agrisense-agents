import { useState, useRef, useEffect } from 'react';
import { DroneSettings, DroneConnectionStatus} from '../types/workspace';
import { BACKEND_URL, WS_BASE_URL } from '../services/api/constants';

interface DroneAnalysisResult {
  status?: string;
  prediction_id?: string;
  type?: string;
  result?: {
    crop: string;
    disease: string;
    confidence: number;
    advice: string;
  };
  metadata?: any;
  alternative?: any[];
  hedera_proof?: {
    consensusTimestamp: string;
    status: string;
    transactionId?: string;
  };
  reward_status?: {
    amount: string;
    type: string;
    status: string;
    message: string;
  };
  bonus_status?: {
    type: string;
    status: string;
    message: string;
  };
  nft?: {
    tokenId: string;
    serial: string;
    ipfs_cid: string;
  };
  frame_id?: string;
  detections?: string[];
  confidence?: number;
  advice?: string;
  timestamp?: string;
  thumbnail_b64?: string;
  blockchain_proof?: any;
  [key: string]: any;
}

interface DroneConnection {
  drone_id: string;
  status: string;
}

interface JobCreation {
  job_id: string;
  ws_url: string;
  status: string;
}

export const useDrone = () => {
  const [droneSettings, setDroneSettings] = useState<DroneSettings>({
    mode: 'realtime',
    isConnected: false,
    isConnecting: false,
    interval: 10,
    lastCaptureTime: 0,
    signalStrength: 0,
    batteryLevel: 0,
    currentProtocol: null,
    streamKey: ''
  });

  const [isVideoAnalyzing, setIsVideoAnalyzing] = useState(false);
  const [videoAnalysisProgress, setVideoAnalysisProgress] = useState(0);
  const [videoAnalysisResults, setVideoAnalysisResults] = useState<DroneAnalysisResult[]>([]);

  const [connectionStatus, setConnectionStatus] = useState<DroneConnectionStatus>('disconnected');
  const [currentDroneId, setCurrentDroneId] = useState<string>('');
  const [currentJobId, setCurrentJobId] = useState<string>('');
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [droneAnalysisResults, setDroneAnalysisResults] = useState<DroneAnalysisResult[]>([]);
  const [latestDroneResult, setLatestDroneResult] = useState<DroneAnalysisResult | null>(null);
  const [isDroneAnalyzing, setIsDroneAnalyzing] = useState(false);

const connectViaRTMP = async (streamUrl: string): Promise<boolean> => {
  setConnectionStatus('connecting');
  setDroneSettings(prev => ({ ...prev, isConnecting: true }));
  setError('');

  try {
    // Use environment variable for backend URL
    const backendUrl = BACKEND_URL;
    
    const response = await fetch(`${backendUrl}/api/drones/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'rtmp', url: streamUrl })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'RTMP connection failed');
    }

    const data: DroneConnection = await response.json();
    setCurrentDroneId(data.drone_id);
    
    setConnectionStatus('connected');
    setDroneSettings(prev => ({
      ...prev,
      isConnected: true,
      isConnecting: false,
      mode: 'realtime',
      currentProtocol: 'rtmp',
      streamKey: data.drone_id
    }));
    
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'RTMP connection failed';
    setError(errorMsg);
    setConnectionStatus('failed');
    setDroneSettings(prev => ({ 
      ...prev, 
      isConnected: false, 
      isConnecting: false 
    }));
    return false;
  }
};

const connectViaRTSP = async (rtspUrl: string): Promise<boolean> => {
  setConnectionStatus('connecting');
  setDroneSettings(prev => ({ ...prev, isConnecting: true }));
  setError('');

  try {
    // Use environment variable for backend URL
    const backendUrl = BACKEND_URL;
    
    const response = await fetch(`${backendUrl}/api/drones/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'rtsp', url: rtspUrl })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'RTSP connection failed');
    }

    const data: DroneConnection = await response.json();
    setCurrentDroneId(data.drone_id);
    
    setConnectionStatus('connected');
    setDroneSettings(prev => ({
      ...prev,
      isConnected: true,
      isConnecting: false,
      mode: 'realtime',
      currentProtocol: 'rtsp',
      streamKey: data.drone_id
    }));
    
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'RTSP connection failed';
    setError(errorMsg);
    setConnectionStatus('failed');
    setDroneSettings(prev => ({ 
      ...prev, 
      isConnected: false, 
      isConnecting: false 
    }));
    return false;
  }
};

  const connectViaUpload = async (file: File): Promise<boolean> => {
    setConnectionStatus('connecting');
    setError('');

    try {
      const videoUrl = URL.createObjectURL(file);
      setCurrentStreamUrl(videoUrl);
      
      if (videoRef.current) {
        videoRef.current.src = videoUrl;
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadeddata = resolve;
          }
        });
        
        setConnectionStatus('connected');
        setDroneSettings(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          mode: 'upload',
          currentProtocol: 'upload'
        }));
        return true;
      }
      return false;
    } catch (error) {
      setError('Failed to load uploaded video');
      setConnectionStatus('failed');
      return false;
    }
  };

  const startAnalysis = async (farmerId: string): Promise<boolean> => {
    if (!currentDroneId) {
      setError('No drone connected');
      return false;
    }

    try {
      // Use environment variable for backend URL
      const backendUrl = BACKEND_URL;
      
      const response = await fetch(`${backendUrl}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drone_id: currentDroneId,
          interval_s: droneSettings.interval,
          farmer_id: farmerId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start analysis');
      }

      const data: JobCreation = await response.json();
      setCurrentJobId(data.job_id);
      
      setDroneAnalysisResults([]);
      setLatestDroneResult(null);
      setIsDroneAnalyzing(true);
      
      // Use environment variable for WebSocket URL transformation
      const wsUrl = WS_BASE_URL
        ? data.ws_url.replace(/^wss?:\/\/[^/]+/, WS_BASE_URL)
        : data.ws_url;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setWsConnection(ws);
      };
      
      ws.onmessage = (event) => {
        try {
          const frameData: DroneAnalysisResult = JSON.parse(event.data);
          setLatestDroneResult(frameData);
          setDroneAnalysisResults(prev => [...prev, frameData].slice(-10));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = () => {
        setError('Real-time connection failed');
        setIsDroneAnalyzing(false);
      };
      
      ws.onclose = () => {
        setWsConnection(null);
        setIsDroneAnalyzing(false);
      };
      
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start analysis';
      setError(errorMsg);
      setIsDroneAnalyzing(false);
      return false;
    }
  };

  const stopAnalysis = async (): Promise<void> => {
    if (currentJobId) {
      try {
        const backendUrl = BACKEND_URL;
        
        await fetch(`${backendUrl}/api/jobs/${currentJobId}/stop`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Error stopping job:', error);
      }
    }
    
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
    }
    setCurrentJobId('');
    setIsDroneAnalyzing(false);
  };

  const clearDroneResults = (): void => {
    setDroneAnalysisResults([]);
    setLatestDroneResult(null);
  };

  const disconnectDrone = async (): Promise<void> => {
    await stopAnalysis();
    clearDroneResults();
    
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.load();
    }

    if (currentStreamUrl && currentStreamUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentStreamUrl);
    }
    
    setConnectionStatus('disconnected');
    setCurrentStreamUrl('');
    setCurrentDroneId('');
    setError('');
    setDroneSettings(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      mode: 'realtime',
      currentProtocol: null,
      streamKey: ''
    }));
  };

  const updateInterval = (interval: number): void => {
    setDroneSettings(prev => ({ ...prev, interval }));
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (connectionStatus === 'connected') {
      interval = setInterval(() => {
        setDroneSettings(prev => ({
          ...prev,
          signalStrength: Math.max(50, Math.min(100, prev.signalStrength + (Math.random() - 0.5) * 2)),
          batteryLevel: Math.max(0, prev.batteryLevel - 0.01)
        }));
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connectionStatus]);


  // Add this with your other state declarations
  const isAnalyzingRef = useRef(false);

  // Then update analyzeUploadedVideo:
  const analyzeUploadedVideo = async (farmerId: string): Promise<boolean> => {
    console.log('🎬 Starting video analysis for farmer:', farmerId);
    
    if (!videoRef.current || !currentStreamUrl) {
      setError('No video available for analysis');
      return false;
    }

    const video = videoRef.current;
    
    // Wait for video to be ready
    if (video.readyState < 2) {
      await new Promise((resolve) => {
        video.onloadeddata = resolve;
      });
    }

    setIsVideoAnalyzing(true);
    isAnalyzingRef.current = true;
    setVideoAnalysisProgress(0);
    setVideoAnalysisResults([]);
    setError('');

    try {
      const duration = video.duration;
      const interval = droneSettings.interval;
      const totalFrames = Math.floor(duration / interval);
      let processedFrames = 0;

      console.log(`🎬 Video duration: ${duration}s, Frames to process: ${totalFrames}`);

      // Create canvas for frame capture
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not create canvas context');
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      for (let currentTime = 0; currentTime < duration; currentTime += interval) {
        // Check if analysis was stopped
        if (!isAnalyzingRef.current) {
          console.log('⏹️ Analysis stopped by user');
          break;
        }

        console.log(`🕒 Processing frame at ${currentTime}s`);
        
        // Seek to frame time
        video.currentTime = currentTime;
        
        // Wait for seek to complete
        await new Promise((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve(null);
          };
          video.addEventListener('seeked', onSeeked);
        });

        // Wait a bit for frame to be rendered
        await new Promise(resolve => setTimeout(resolve, 100));

        // Capture frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 0.8);
        });

        if (blob) {
          console.log(`📸 Captured frame at ${currentTime}s, sending for analysis...`);
          
          // Send frame to predict endpoint
          const formData = new FormData();
          formData.append('file', blob, `frame_${currentTime}.jpg`);
          if (farmerId) {
            formData.append('farmer_id', farmerId);
          }

          try {
            const response = await fetch(
              `${BACKEND_URL}/predict`, 
              {
                method: 'POST',
                body: formData,
              }
            );
            if (response.ok) {
              const result: DroneAnalysisResult = await response.json();
              console.log('Frame analysis result:', result);
              
              // Add video-specific fields
              const videoResult = {
                ...result,
                timestamp: new Date().toISOString(),
                frame_time: currentTime,
                type: 'video_frame_analysis'
              };

              setVideoAnalysisResults(prev => [...prev, videoResult]);
              setLatestDroneResult(videoResult);
            } else {
              console.error('Frame analysis failed with status:', response.status);
            }
          } catch (error) {
            console.error('Frame analysis error:', error);
          }
        }

        processedFrames++;
        const progress = (processedFrames / totalFrames) * 100;
        setVideoAnalysisProgress(progress);
        console.log(`Progress: ${Math.round(progress)}%`);

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(' Video analysis completed!');
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Video analysis failed';
      console.error('Video analysis error:', errorMsg);
      setError(errorMsg);
      return false;
    } finally {
      setIsVideoAnalyzing(false);
      isAnalyzingRef.current = false;
      setVideoAnalysisProgress(0);
      console.log('🧹 Video analysis cleaned up');
    }
  };

  const stopVideoAnalysis = (): void => {
    setIsVideoAnalyzing(false);
    isAnalyzingRef.current = false;  
    setVideoAnalysisProgress(0);
  };

  return {
    droneSettings,
    connectionStatus,
    videoRef,
    currentStreamUrl,
    currentDroneId,
    currentJobId,
    wsConnection,
    error,
    droneAnalysisResults,
    latestDroneResult,
    isDroneAnalyzing,
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
    clearDroneResults,
    analyzeUploadedVideo,
    stopVideoAnalysis
  };
};