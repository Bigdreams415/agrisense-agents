export interface SensorReading {
  sensorId: string;
  type: 'soil_moisture' | 'temperature' | 'humidity';
  value: number;
  unit: string;
  timestamp: Date;
  confidence?: number;
}

export interface SensorConnection {
  isConnected: boolean;
  lastConnected: Date | null;
  connectionMethod: 'bluetooth' | 'wifi' | 'lora' | null;
  signalStrength: number;
  batteryLevel: number;
}