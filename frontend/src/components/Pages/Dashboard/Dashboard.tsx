import React, { useState, useEffect } from 'react';
import { SENSOR_CARDS, STAT_CARDS } from '../../../utils/constants';
import LineChart from '../../UI/LineChart/LineChart';
import { useSensors } from '../../../hooks/useSensors';
import ConnectionPanel from './ConnectionPanel';

interface DashboardMode {
  type: 'real' | 'simulation';
  farmId?: string;
  port?: string;
}

// Farm Switcher Component
const FarmSwitcher: React.FC = () => {
  const { 
    currentFarmId, 
    availableFarms, 
    switchFarm, 
    getCurrentFarm,
    connectionStatus 
  } = useSensors();
  const [isOpen, setIsOpen] = useState(false);

  const currentFarm = getCurrentFarm();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
          <i className="fas fa-tractor text-white text-sm"></i>
        </div>
        <div className="text-left">
          <div className="font-semibold text-gray-800 dark:text-white text-sm">
            {currentFarm.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {connectionStatus === 'connected' ? 'Live' : 'Offline'}
          </div>
        </div>
        <i className={`fas fa-chevron-down text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm font-semibold text-gray-800 dark:text-white">Switch Farm</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Select a farm to monitor</div>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {availableFarms.map((farm) => (
              <button
                key={farm.id}
                onClick={() => {
                  switchFarm(farm.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  farm.id === currentFarmId ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' : ''
                }`}
              >
                <div className="font-medium text-gray-800 dark:text-white">{farm.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                  <span>{farm.location}</span>
                  <span className="text-green-500">• {farm.id}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {availableFarms.length} farms available
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>({ type: 'simulation' });
  const [showConnectionPanel, setShowConnectionPanel] = useState(true);
  
  const [sensorData, setSensorData] = useState({
    soil_moisture: '45',
    temperature: '24',
    air_humidity: '60',
  });
  
  // Chart data states
  const [moistureTrend, setMoistureTrend] = useState<number[]>([45, 46, 44, 45, 47, 46]);
  const [tempTrend, setTempTrend] = useState<number[]>([24, 23, 25, 24, 24, 25]);
  const [humidityTrend, setHumidityTrend] = useState<number[]>([60, 62, 59, 61, 60, 63]);
  const chartLabels = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
  
  const [rainfall] = useState('800');
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const { 
    devices, 
    connectionStatus, 
    manualConnect,
    realData,
    getCurrentFarm 
  } = useSensors();

  const getDisplayData = () => {
    if (dashboardMode.type === 'simulation') {
      return sensorData;
    }
    
    if (connectionStatus === 'connected' && realData) {
      return {
        soil_moisture: realData.soil_moisture?.toString() || '0',
        temperature: realData.temperature?.toString() || '0',
        air_humidity: realData.air_humidity?.toString() || '0',
      };
    }
    
    return {
      soil_moisture: '0',
      temperature: '0',
      air_humidity: '0',
    };
  };

  const displayData = getDisplayData();

  const getChartData = () => {
    if (dashboardMode.type === 'simulation') {
      return {
        moisture: moistureTrend,
        temperature: tempTrend,
        humidity: humidityTrend,
      };
    }

    if (connectionStatus === 'connected' && realData) {
      const newMoisture = realData.soil_moisture || 0;
      const newTemp = realData.temperature || 0;
      const newHumidity = realData.air_humidity || 0;
      
      return {
        moisture: [...moistureTrend.slice(1), newMoisture],
        temperature: [...tempTrend.slice(1), newTemp],
        humidity: [...humidityTrend.slice(1), newHumidity],
      };
    }
    
    return {
      moisture: [],
      temperature: [],
      humidity: [],
    };
  };

  const chartData = getChartData();

  useEffect(() => {
    if (dashboardMode.type !== 'simulation') return;

    const mockInterval = setInterval(() => {
      setSensorData((prev) => ({
        soil_moisture: Math.max(20, Math.min(80, parseFloat(prev.soil_moisture) + (Math.random() * 2 - 1))).toFixed(1),
        temperature: Math.max(15, Math.min(35, parseFloat(prev.temperature) + (Math.random() * 1 - 0.5))).toFixed(1),
        air_humidity: Math.max(30, Math.min(90, parseFloat(prev.air_humidity) + (Math.random() * 2 - 1))).toFixed(1),
      }));
      setMoistureTrend(prev => [...prev.slice(1), parseFloat(sensorData.soil_moisture)]);
      setTempTrend(prev => [...prev.slice(1), parseFloat(sensorData.temperature)]);
      setHumidityTrend(prev => [...prev.slice(1), parseFloat(sensorData.air_humidity)]);
      
      setLastUpdated(new Date().toLocaleTimeString());
    }, 5000);

    return () => clearInterval(mockInterval);
  }, [dashboardMode.type, sensorData]);

  useEffect(() => {
    if (dashboardMode.type === 'real' && connectionStatus === 'connected' && realData) {
      const newMoisture = realData.soil_moisture || 0;
      const newTemp = realData.temperature || 0;
      const newHumidity = realData.air_humidity || 0;
      
      setMoistureTrend(prev => [...prev.slice(1), newMoisture]);
      setTempTrend(prev => [...prev.slice(1), newTemp]);
      setHumidityTrend(prev => [...prev.slice(1), newHumidity]);
      
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [realData, dashboardMode.type, connectionStatus]);

  // Handle connection panel results
  const handleConnectionSetup = (mode: DashboardMode) => {
    setDashboardMode(mode);
    setShowConnectionPanel(false);
    
    if (mode.type === 'real') {
      setMoistureTrend([]);
      setTempTrend([]);
      setHumidityTrend([]);
      manualConnect();
    }
  };

  const getSensorStatus = (title: string, value: string) => {
    const numValue = parseFloat(value);

    if (dashboardMode.type === 'real' && connectionStatus !== 'connected') {
      return 'Offline';
    }
    
    if (title === 'Soil Moisture') return numValue < 30 ? 'Low' : numValue > 70 ? 'High' : 'Optimal';
    if (title === 'Temperature') return numValue < 15 ? 'Low' : numValue > 30 ? 'High' : 'Normal';
    if (title === 'Air Humidity') return numValue < 40 ? 'Low' : numValue > 80 ? 'High' : 'Optimal';
    return 'Normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Optimal': return 'text-green-600';
      case 'Normal': return 'text-blue-600';
      case 'Low': return 'text-yellow-600';
      case 'High': return 'text-orange-600';
      case 'Offline': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (showConnectionPanel) {
    return (
      <ConnectionPanel 
        onConnect={handleConnectionSetup}
        currentMode={dashboardMode}
      />
    );
  }

  const currentFarm = getCurrentFarm();

  return (
    <div className="animate-fadeIn p-6">
      {/* Header with Connection Status */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div>
            <h3 className="text-2xl font-bold gradient-text">Farm Monitoring Dashboard</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {dashboardMode.type === 'real' 
                ? `Live sensor data from ${currentFarm.name}` 
                : 'Demo Mode - Simulated Data'
              }
            </p>
          </div>
          
          {/* Farm Switcher */}
          <FarmSwitcher />
        </div>
        
        {/* Connection Status & Mode Switcher */}
        <div className="flex items-center gap-4">
          {/* Mode Badge */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            dashboardMode.type === 'real' 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
          }`}>
            <i className={`fas ${dashboardMode.type === 'real' ? 'fa-satellite' : 'fa-desktop'}`}></i>
            {dashboardMode.type === 'real' ? 'Live Sensors' : 'Demo Mode'}
          </div>

          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            connectionStatus === 'connected' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
              : connectionStatus === 'connecting'
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            {dashboardMode.type === 'real' ? (
              <>
                {connectionStatus === 'connected' && `${devices.length} Sensors Connected`}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'disconnected' && 'Sensors Offline'}
              </>
            ) : (
              'Simulation Active'
            )}
          </div>

          <button 
            onClick={() => setShowConnectionPanel(true)}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
          >
            <i className="fas fa-cog mr-2"></i>
            Settings
          </button>
        </div>
      </div>

      {/* Connection Status Message for Real Mode */}
      {dashboardMode.type === 'real' && connectionStatus !== 'connected' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle text-yellow-500 mr-3"></i>
            <div>
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                {connectionStatus === 'connecting' ? 'Connecting to farm sensors...' : 'Sensors are disconnected'}
              </p>
              <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">
                {connectionStatus === 'connecting' 
                  ? 'Trying different connection methods automatically...' 
                  : 'No sensor data available. Check your hardware connection and try reconnecting.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Demo Mode Info Banner */}
      {dashboardMode.type === 'simulation' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <i className="fas fa-info-circle text-blue-500 mr-3"></i>
            <div>
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                Demo Mode Active - Simulated Data
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                You're viewing simulated sensor data. To connect real sensors, click Settings and choose "Real Sensors".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Farm Information Card  */}
      {dashboardMode.type === 'real' && connectionStatus === 'connected' && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                <i className="fas fa-tractor text-white text-lg"></i>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-white">{currentFarm.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Farm ID: {currentFarm.id} • Location: {currentFarm.location}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-green-600 dark:text-green-400">
                Live Data Streaming
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {lastUpdated}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sensor Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {SENSOR_CARDS.map((card, index) => {
          const dataKey = card.title.toLowerCase().replace(' ', '_') as keyof typeof sensorData;
          const value = displayData[dataKey];
          const status = getSensorStatus(card.title, String(value));
          const statusColor = getStatusColor(status);
          
          return (
            <div key={index} className={`bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift ${
              dashboardMode.type === 'real' && connectionStatus !== 'connected' ? 'opacity-80' : ''
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-700 dark:text-gray-300 font-medium">{card.title}</h3>
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center ${
                  dashboardMode.type === 'real' && connectionStatus !== 'connected' ? 'opacity-50' : ''
                }`}>
                  <i className={`fas ${card.icon} ${card.color} text-lg`}></i>
                </div>
              </div>
              <p className={`text-3xl font-bold mb-2 ${
                dashboardMode.type === 'real' && connectionStatus !== 'connected' 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : 'text-gray-800 dark:text-white'
              }`}>
                {value}{card.unit}
              </p>
              <p className={`text-sm font-medium ${statusColor}`}>
                Status: {status}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {dashboardMode.type === 'real' && connectionStatus === 'connected' 
                  ? `Live • Farm: ${currentFarm.id}` 
                  : dashboardMode.type === 'simulation'
                  ? `Simulated • ${lastUpdated}`
                  : 'Waiting for connection...'
                }
              </p>
            </div>
          );
        })}
      </div>

      {/* Farm Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {STAT_CARDS.map((card, index) => (
          <div key={index} className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-700 dark:text-gray-300 font-medium">{card.title}</h3>
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <i className={`fas ${card.icon} ${card.color} text-lg`}></i>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              {card.title === 'Annual Rainfall' ? rainfall : card.value} {card.unit}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {card.title === 'Predicted Yield' ? 'Based on current conditions' : 'Historical average'}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Soil Moisture Trend</h3>
          <LineChart 
            data={chartData.moisture} 
            labels={chartLabels} 
            title="Soil Moisture (%)"
          />
        </div>
        
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Temperature Trend</h3>
          <LineChart 
            data={chartData.temperature} 
            labels={chartLabels} 
            title="Temperature (°C)"
          />
        </div>
        
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Air Humidity Trend</h3>
          <LineChart 
            data={chartData.humidity} 
            labels={chartLabels} 
            title="Humidity (%)"
          />
        </div>
        
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Farm Health Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-green-700 dark:text-green-300">Crop Health</span>
              <span className="font-semibold text-green-600">Excellent</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-blue-700 dark:text-blue-300">Irrigation Status</span>
              <span className="font-semibold text-blue-600">Optimal</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <span className="text-amber-700 dark:text-amber-300">Pest Alert Level</span>
              <span className="font-semibold text-amber-600">Low</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;