import { SensorReading, SensorConnection } from '../../types/sensors';

export class SensorService {
  static async connectToSensor(sensorId: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);  
      }, 1000);
    });
  }

  static async getSensorReadings(sensorId: string): Promise<SensorReading[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([]);
      }, 500);
    });
  }

  static async discoverSensors(): Promise<string[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(['sensor-1', 'sensor-2', 'sensor-3']);
      }, 1500);
    });
  }
}