import { AnalysisRequest, AnalysisResponse } from './types';
import { API_CONFIG } from './constants';

export class AnalysisService {
  static async analyzeImage(request: AnalysisRequest): Promise<AnalysisResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    
    // Only append farmer_id if it exists 
    if (request.farmer_id) {
      formData.append('farmer_id', request.farmer_id);
    }
    
    if (request.model) {
      formData.append('model', request.model);
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}/predict`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}