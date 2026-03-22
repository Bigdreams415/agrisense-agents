export interface AnalysisRequest {
  file: File;
  farmer_id: string | null; 
  model?: string;
}

export interface AnalysisResponse {
  status: string;
  prediction_id: string;
  result: {
    crop: string;
    disease: string;
    confidence: number;
    advice: string;
  };
  alternative: Array<{
    disease: string;
    confidence: number;
  }>;
  metadata: {
    timestamp: string;
    farmer_id: string | null; 
    image_filename: string;
    image_size_bytes: number;
    image_hash_sha256: string;
    latency_ms: number;
    model_version: string;
  };
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
}