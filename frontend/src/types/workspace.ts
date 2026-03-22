export interface AnalysisResult {
  status: string;
  prediction_id: string;
  result: {
    crop: string;
    disease: string;
    confidence: number;
    advice: string;
  };
  metadata: {
    timestamp: string;
  };

  hedera_proof?: {
    consensusTimestamp: string;
    status: string;
    transactionId?: string;   
  };
  nft?: {
    tokenId: string;
    serial: string;
    ipfs_cid: string;
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
}

export type AnalysisModel = 'pest' | 'yield' | 'irrigation';
export type DataSource = 'upload' | 'camera' | 'drone' | 'satellite';

export interface TypingPhrases {
  pest: string[];
  yield: string[];
  irrigation: string[];
}

// Streaming Settings
export interface StreamingSettings {
  isActive: boolean;
  interval: number; 
  lastCaptureTime: number;
  isCoolingDown: boolean;
}

// Drone Feed Settings
export type DroneConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';
export type StreamingProtocol = 'rtmp' | 'rtsp' | 'upload' | null;

export interface DroneSettings {
  mode: 'realtime' | 'upload';
  isConnected: boolean;
  isConnecting: boolean;
  interval: number;
  lastCaptureTime: number;
  signalStrength: number;
  batteryLevel: number;
  currentProtocol: StreamingProtocol;
  streamKey: string;
}