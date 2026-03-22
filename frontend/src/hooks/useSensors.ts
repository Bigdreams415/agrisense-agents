import { useState, useEffect, useRef } from 'react';
import { WS_BASE_URL } from '../services/api/constants';

export interface SensorDevice {
  id: string;
  name: string;
  type: 'soil_moisture' | 'temperature' | 'humidity';
  connected: boolean;
  battery: number;
  signal: number;
  lastSeen: Date;
}

export interface SensorData {
  soil_moisture?: number;
  temperature?: number;
  air_humidity?: number;
  timestamp?: string;
  farm_id?: string;
  source?: string;
  broker_type?: string;
}

interface UseSensorsConfig {
  farmId?: string;
  port?: string;
}

const sensorWsBaseUrl = WS_BASE_URL;

// Connection strategies in priority order
const CONNECTION_STRATEGIES = [
  { 
    type: 'local' as const, 
    name: 'Local Docker',
    url: `${sensorWsBaseUrl}/ws/sensor`,
    priority: 1,
    timeout: 3000
  },
  { 
    type: 'cloud' as const, 
    name: 'Cloud Broker', 
    url: `${sensorWsBaseUrl}/ws/sensor`,
    priority: 2, 
    timeout: 5000
  },
  { 
    type: 'simulation' as const, 
    name: 'Browser Simulation',
    url: null,
    priority: 3,
    timeout: 0
  }
];

// Demo farms for multi-tenancy
const DEMO_FARMS = [
  { id: 'demo', name: 'Demo Farm', location: 'Demo Location' },
  { id: 'farm_001', name: 'Green Valley Farm', location: 'California' },
  { id: 'farm_002', name: 'Sunrise Orchards', location: 'Florida' },
  { id: 'farm_003', name: 'Mountain View Ranch', location: 'Colorado' }
];

export const useSensors = (config?: UseSensorsConfig) => {
  const [devices, setDevices] = useState<SensorDevice[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected'
  >('disconnected');
  const [realData, setRealData] = useState<SensorData>({});
  const [currentStrategy, setCurrentStrategy] = useState<string>('none');
  const [connectionHistory, setConnectionHistory] = useState<string[]>([]);
  const [currentFarmId, setCurrentFarmId] = useState<string>(config?.farmId || 'demo');
  const [availableFarms] = useState(DEMO_FARMS);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const currentStrategyIndex = useRef<number>(0);
  const isManualConnect = useRef<boolean>(false);

  const addToHistory = (message: string) => {
    setConnectionHistory(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Farm management functions
  const switchFarm = async (newFarmId: string) => {
    if (newFarmId === currentFarmId) return;
    
    addToHistory(`Switching to farm: ${newFarmId}`);
    setCurrentFarmId(newFarmId);
    
    // If connected via WebSocket, send farm switch message
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'switch_farm',
        farm_id: newFarmId
      }));
    }
    
    // Reset data when switching farms
    setRealData({});
  };

  const getCurrentFarm = () => {
    return availableFarms.find(farm => farm.id === currentFarmId) || DEMO_FARMS[0];
  };

  // Smart connection manager with automatic fallback
  const connectWithStrategy = () => {
    const strategy = CONNECTION_STRATEGIES[currentStrategyIndex.current];
    
    // Clean up existing connection
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    setConnectionStatus('connecting');
    setCurrentStrategy(`trying_${strategy.type}`);
    addToHistory(`Trying ${strategy.name}...`);

    try {
      // Use farm-specific WebSocket URL
      const wsUrl = `${strategy.url}/${currentFarmId}`;
      ws.current = new WebSocket(wsUrl);
      
      const wsTimeout = setTimeout(() => {
        addToHistory(`${strategy.name} timeout - trying next strategy`);
        tryNextStrategy();
      }, strategy.timeout);

      ws.current.onopen = () => {
        clearTimeout(wsTimeout);
        setConnectionStatus('connected');
        setCurrentStrategy(strategy.type);
        addToHistory(`✅ Connected to ${strategy.name} for farm ${currentFarmId}`);
        
        // Send farm identification if available
        if (config?.farmId) {
          ws.current?.send(JSON.stringify({
            type: 'farm_identification',
            farmId: config.farmId
          }));
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Incoming sensor data:', data);
          
          // Only update data if it's for the current farm
          if (!data.farm_id || data.farm_id === currentFarmId) {
            setRealData(data);
          }

          // Update devices if backend sends info
          if (data.devices) {
            setDevices(data.devices);
          }

          // Handle farm switched message
          if (data.type === 'farm_switched') {
            addToHistory(`Successfully switched to farm: ${data.farm_id}`);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        clearTimeout(wsTimeout);
        if (currentStrategy === strategy.type) {
          setConnectionStatus('disconnected');
          addToHistory(` ${strategy.name} disconnected`);
          if (!isManualConnect.current) {
            setTimeout(tryNextStrategy, 2000);
          }
        }
      };

      ws.current.onerror = (error) => {
        clearTimeout(wsTimeout);
        addToHistory(`${strategy.name} connection error`);
        if (!isManualConnect.current) {
          tryNextStrategy();
        }
      };

    } catch (error) {
      console.error('WebSocket creation error:', error);
      if (!isManualConnect.current) {
        tryNextStrategy();
      }
    }
  };

  const tryNextStrategy = () => {
    if (currentStrategyIndex.current >= CONNECTION_STRATEGIES.length - 1) {
      // All strategies failed
      addToHistory('All connection strategies failed');
      setConnectionStatus('disconnected');
      return;
    }

    currentStrategyIndex.current++;
    connectWithStrategy();
  };

  const manualConnect = () => {
    isManualConnect.current = true;
    currentStrategyIndex.current = 0;   
    connectWithStrategy();
    
    setTimeout(() => {
      isManualConnect.current = false;
    }, 10000);
  };

  const resetToAutoMode = () => {
    isManualConnect.current = false;
    currentStrategyIndex.current = 0;
    connectWithStrategy();
  };

  useEffect(() => {
    if (!isManualConnect.current) {
      connectWithStrategy();
    }

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconnect when farm changes
  useEffect(() => {
    if (connectionStatus === 'connected' && ws.current) {
      switchFarm(currentFarmId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFarmId]);

  // Reconnect when config changes
  useEffect(() => {
    if (connectionStatus === 'connected' && config?.farmId) {
      addToHistory(`Farm configuration updated: ${config.farmId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.farmId, config?.port]);

  return {
    devices,
    realData,
    connectionStatus,
    isConnecting: connectionStatus === 'connecting',
    currentStrategy,
    connectionHistory,
    currentFarmId,
    availableFarms,
    getCurrentFarm,
    switchFarm,
    manualConnect,
    resetToAutoMode
  };
};