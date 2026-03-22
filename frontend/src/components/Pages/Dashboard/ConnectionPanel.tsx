import React, { useState } from 'react';
import { BACKEND_URL } from '../../../services/api/constants';

interface ConnectionPanelProps {
  onConnect: (mode: { type: 'real' | 'simulation'; farmId?: string; port?: string }) => void;
  currentMode: { type: 'real' | 'simulation'; farmId?: string; port?: string };
}

type HardwareType = 'arduino_rpi' | 'esp32' | 'custom_mqtt' | 'existing' | 'demo';
type ConnectionStep = 'mode_select' | 'hardware_select' | 'setup_guide' | 'connection_test';

const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ onConnect, currentMode }) => {
  const [currentStep, setCurrentStep] = useState<ConnectionStep>('mode_select');
  const [selectedHardware, setSelectedHardware] = useState<HardwareType | null>(null);
  const [farmId, setFarmId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'listening' | 'connected' | 'failed'>('idle');
  const [detectionResult, setDetectionResult] = useState<any>(null);

  // Generate a unique Farm ID
  const generateFarmId = () => {
    const prefix = 'farm';
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${random}`;
  };

  const handleModeSelect = (mode: 'real' | 'demo') => {
    if (mode === 'demo') {
      // Direct to demo mode
      onConnect({ 
        type: 'simulation', 
        farmId: 'demo_farm'
      });
    } else {
      setCurrentStep('hardware_select');
    }
  };

  const handleHardwareSelect = (hardware: HardwareType) => {
    setSelectedHardware(hardware);
    
    if (hardware === 'existing') {
      setCurrentStep('connection_test');
    } else {
      setFarmId(generateFarmId());
      setCurrentStep('setup_guide');
    }
  };

  const handleConnect = async () => {
    if (selectedHardware === 'existing' && !farmId.trim()) {
      return; 
    }

    setIsConnecting(true);
    setConnectionStatus('listening');
    setDetectionResult(null);

    try {
      const targetFarmId = selectedHardware === 'existing' ? farmId : farmId; 
      const response = await fetch(`${BACKEND_URL}/api/hardware/detect?farm_id=${targetFarmId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setDetectionResult(result);

      if (result.status === 'connected') {
        setConnectionStatus('connected');
        setTimeout(() => {
          onConnect({ 
            type: 'real', 
            farmId: targetFarmId
          });
          setIsConnecting(false);
        }, 1500);
        
      } else {
        setConnectionStatus('failed');
        setIsConnecting(false);
      }

    } catch (error) {
      console.error('Hardware detection failed:', error);
      setConnectionStatus('failed');
      setIsConnecting(false);
    }
  };

  const getHardwareSetupGuide = () => {
    switch (selectedHardware) {
      case 'arduino_rpi':
        return {
          title: 'Arduino + Raspberry Pi Setup',
          steps: [
            'Wire your sensors:',
            '• Soil Moisture → Pin A0',
            '• Temperature/Humidity → Pin D2', 
            '• Light Sensor → Pin A1',
            'Connect Arduino to Raspberry Pi via USB',
            `Download and upload the Arduino code with your Farm ID: ${farmId}`
          ],
          code: `// Auto-generated Arduino sketch for Farm ID: ${farmId}
            #include <WiFi.h>
            #include <PubSubClient.h>

            // Your Farm ID - Keep this secure!
            const String FARM_ID = "${farmId}";

            void setup() {
              // Sensor setup code here
              pinMode(A0, INPUT); // Soil moisture
              pinMode(2, INPUT);  // Temperature
            }

            void loop() {
              // Read sensors and publish to MQTT
              // Topic: agrisenseai/farms/${farmId}/sensor_data
              delay(5000);
            }`
        };
      case 'esp32':
        return {
          title: 'ESP32/ESP8266 Setup',
          steps: [
            'Connect sensors directly to ESP32:',
            '• Soil Moisture → GPIO 32',
            '• Temperature → GPIO 33',
            '• Power via USB or 3.3V',
            `Flash the firmware with your Farm ID: ${farmId}`,
            'Configure WiFi credentials in the code'
          ],
          code: `// ESP32 Sensor Code - Farm ID: ${farmId}
            #include <WiFi.h>
            #include <PubSubClient.h>

            const char* FARM_ID = "${farmId}";
            const char* MQTT_TOPIC = "agrisenseai/farms/${farmId}/sensor_data";

            void setup() {
              // Initialize sensors and WiFi
            }

            void publishSensorData() {
              // Publish to: agrisenseai/farms/${farmId}/sensor_data
            }`
        };
      case 'custom_mqtt':
        return {
          title: 'Custom MQTT Device',
          steps: [
            'Configure your MQTT client:',
            `Broker: broker.hivemq.com:1883`,
            `Topic: agrisenseai/farms/${farmId}/sensor_data`,
            `Farm ID: ${farmId} (include in your messages)`,
            'Publish JSON data with sensor readings',
            'Ensure proper QoS and retained messages'
          ],
          code: `// MQTT Configuration for Farm ID: ${farmId}
          MQTT Broker: broker.hivemq.com
          Port: 1883
          Topic: agrisenseai/farms/${farmId}/sensor_data

          // Message format:
          {
            "soil_moisture": 45.6,
            "temperature": 24.3,
            "air_humidity": 62.1,
            "farm_id": "${farmId}"
          }`
        };
      default:
        return { title: '', steps: [], code: '' };
    }
  };

  const renderModeSelection = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
          Connect Your Sensors
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Choose how you want to connect to AgriSenseAI
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Real Hardware Card */}
        <div className="group cursor-pointer">
          <div 
            onClick={() => handleModeSelect('real')}
            className="p-8 h-full border-2 border-gray-300 dark:border-gray-600 rounded-2xl hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all duration-300 hover-lift"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-microchip text-white text-2xl"></i>
              </div>
              <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
                Real Hardware
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Connect actual sensors and controllers for live data streaming
              </p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <i className="fas fa-check text-green-500"></i>
                  <span>Real-time sensor data</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <i className="fas fa-check text-green-500"></i>
                  <span>Physical hardware setup</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <i className="fas fa-check text-green-500"></i>
                  <span>Live monitoring</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Mode Card */}
        <div className="group cursor-pointer">
          <div 
            onClick={() => handleModeSelect('demo')}
            className="p-8 h-full border-2 border-gray-300 dark:border-gray-600 rounded-2xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all duration-300 hover-lift"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-flask text-white text-2xl"></i>
              </div>
              <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
                Demo Mode
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Test the platform with simulated data - perfect for evaluation and demonstrations
              </p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <i className="fas fa-check text-purple-500"></i>
                  <span>No hardware required</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <i className="fas fa-check text-purple-500"></i>
                  <span>Perfect for judges</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <i className="fas fa-check text-purple-500"></i>
                  <span>Realistic simulated data</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 mt-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <i className="fas fa-info-circle text-blue-600 text-xl"></i>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
              Not sure which to choose?
            </h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              <strong>Demo Mode</strong> is perfect for testing, evaluation, and when you don't have physical hardware available. 
              <strong> Real Hardware</strong> connects to actual sensors for live agricultural monitoring.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHardwareSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          Select Your Hardware
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Choose your controller type to get started
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleHardwareSelect('arduino_rpi')}
          className="p-6 text-left border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
              <i className="fas fa-microchip text-blue-600 text-xl"></i>
            </div>
            <div>
              <div className="font-semibold text-gray-800 dark:text-white">Arduino + Raspberry Pi</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Most common setup</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Soil moisture, temperature, humidity sensors
          </div>
        </button>

        <button
          onClick={() => handleHardwareSelect('esp32')}
          className="p-6 text-left border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:bg-green-200">
              <i className="fas fa-wifi text-green-600 text-xl"></i>
            </div>
            <div>
              <div className="font-semibold text-gray-800 dark:text-white">ESP32/ESP8266</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Wireless IoT board</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Built-in WiFi, direct sensor connection
          </div>
        </button>

        <button
          onClick={() => handleHardwareSelect('custom_mqtt')}
          className="p-6 text-left border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:bg-purple-200">
              <i className="fas fa-code text-purple-600 text-xl"></i>
            </div>
            <div>
              <div className="font-semibold text-gray-800 dark:text-white">Custom MQTT Device</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Your own implementation</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Already have MQTT-capable hardware
          </div>
        </button>

        <button
          onClick={() => handleHardwareSelect('existing')}
          className="p-6 text-left border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center group-hover:bg-orange-200">
              <i className="fas fa-plug text-orange-600 text-xl"></i>
            </div>
            <div>
              <div className="font-semibold text-gray-800 dark:text-white">Existing Controller</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Already running</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Connect to already configured hardware
          </div>
        </button>
      </div>

      <div className="flex justify-center mt-6">
        <button
          onClick={() => setCurrentStep('mode_select')}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Back to Mode Selection
        </button>
      </div>
    </div>
  );

  const renderSetupGuide = () => {
    const guide = getHardwareSetupGuide();
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {guide.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Follow these steps to set up your hardware
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="fas fa-id-card text-white text-sm"></i>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white">Your Farm ID</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Keep this secure - it identifies your farm
              </p>
              <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800">
                <code className="text-blue-600 dark:text-blue-400 font-mono text-lg">{farmId}</code>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800 dark:text-white">Setup Steps:</h4>
            {guide.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">{index + 1}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{step}</p>
              </div>
            ))}
          </div>

          {guide.code && (
            <div className="mt-6">
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Code Template:</h4>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-green-400 text-sm font-mono">
                  {guide.code}
                </pre>
              </div>
              <div className="mt-3 flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                  <i className="fas fa-download"></i>
                  Download Code
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                  <i className="fas fa-copy"></i>
                  Copy to Clipboard
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep('hardware_select')}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back
          </button>
          <button
            onClick={() => setCurrentStep('connection_test')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Continue to Connection
            <i className="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
    );
  };

  const renderConnectionTest = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          {selectedHardware === 'existing' ? 'Connect Existing Controller' : 'Test Connection'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {selectedHardware === 'existing' 
            ? 'Enter your Farm ID to connect' 
            : 'Verify your hardware is sending data'
          }
        </p>
      </div>

      {selectedHardware === 'existing' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Farm ID
            </label>
            <input
              type="text"
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              placeholder="Enter your existing Farm ID"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            connectionStatus === 'idle' ? 'bg-gray-200 dark:bg-gray-700' :
            connectionStatus === 'listening' ? 'bg-yellow-200 dark:bg-yellow-900/30' :
            connectionStatus === 'connected' ? 'bg-green-200 dark:bg-green-900/30' :
            'bg-red-200 dark:bg-red-900/30'
          }`}>
            <i className={`text-2xl ${
              connectionStatus === 'idle' ? 'fas fa-plug text-gray-500' :
              connectionStatus === 'listening' ? 'fas fa-satellite-dish text-yellow-600 animate-pulse' :
              connectionStatus === 'connected' ? 'fas fa-check text-green-600' :
              'fas fa-times text-red-600'
            }`}></i>
          </div>
          
          <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
            {connectionStatus === 'idle' && 'Ready to Connect'}
            {connectionStatus === 'listening' && 'Listening for Sensor Data...'}
            {connectionStatus === 'connected' && 'Connected Successfully!'}
            {connectionStatus === 'failed' && 'Connection Failed'}
          </h4>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {connectionStatus === 'idle' && 'Click connect to start listening for your sensor data'}
            {connectionStatus === 'listening' && 'Waiting for data from your hardware...'}
            {connectionStatus === 'connected' && 'Your sensors are now streaming data to the dashboard'}
            {connectionStatus === 'failed' && 'No sensor data detected. Check your hardware setup'}
          </p>

          {/* SHOW REAL DETECTION RESULTS */}
          {detectionResult && (
            <div className={`mt-4 p-3 rounded-lg ${
              detectionResult.status === 'connected' 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <p className={`text-sm ${
                detectionResult.status === 'connected' 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {detectionResult.status === 'connected' ? (
                  <>
                    <strong>Success!</strong> Detected {detectionResult.sensors_detected} sensors sending data from Farm ID: {detectionResult.farm_id}
                  </>
                ) : (
                  <>
                    <strong>No hardware detected.</strong> {detectionResult.message}
                  </>
                )}
              </p>
            </div>
          )}

          {connectionStatus === 'failed' && !detectionResult && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                💡 <strong>Troubleshooting tips:</strong> Check wiring, power, and ensure your code is running with the correct Farm ID.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(selectedHardware === 'existing' ? 'hardware_select' : 'setup_guide')}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Back
        </button>
        
        <button
          onClick={handleConnect}
          disabled={isConnecting || (selectedHardware === 'existing' && !farmId.trim())}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              {connectionStatus === 'listening' ? 'Detecting Hardware...' : 'Connecting...'}
            </>
          ) : (
            <>
              <i className="fas fa-plug mr-2"></i>
              Connect to Hardware
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-2xl p-8 w-full max-w-4xl hover-lift">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-seedling text-white text-3xl"></i>
          </div>
          <h2 className="text-3xl font-bold gradient-text mb-3">Hardware Connection Wizard</h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Connect your agricultural sensors in a few simple steps
          </p>
          
          {/* Progress Steps */}
          <div className="flex justify-center mt-6">
            <div className="flex items-center">
              {['mode_select', 'hardware_select', 'setup_guide', 'connection_test'].map((step, index) => (
                <React.Fragment key={step}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === step ? 'bg-blue-600 text-white' :
                    ['hardware_select', 'setup_guide', 'connection_test'].includes(currentStep) && index < ['mode_select', 'hardware_select', 'setup_guide', 'connection_test'].indexOf(currentStep) ? 
                    'bg-green-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div className={`w-12 h-1 mx-2 ${
                      ['hardware_select', 'setup_guide', 'connection_test'].includes(currentStep) && index < 2 ? 
                      'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            {currentStep === 'mode_select' && renderModeSelection()}
            {currentStep === 'hardware_select' && renderHardwareSelection()}
            {currentStep === 'setup_guide' && renderSetupGuide()}
            {currentStep === 'connection_test' && renderConnectionTest()}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="flex justify-center gap-8 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <i className="fas fa-microchip text-blue-500 text-sm"></i>
            <span className="text-gray-600 dark:text-gray-400 text-sm">Hardware Integration</span>
          </div>
          <div className="flex items-center gap-2">
            <i className="fas fa-flask text-purple-500 text-sm"></i>
            <span className="text-gray-600 dark:text-gray-400 text-sm">Demo Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <i className="fas fa-satellite text-green-500 text-sm"></i>
            <span className="text-gray-600 dark:text-gray-400 text-sm">Real-time MQTT</span>
          </div>
          <div className="flex items-center gap-2">
            <i className="fas fa-shield-alt text-orange-500 text-sm"></i>
            <span className="text-gray-600 dark:text-gray-400 text-sm">Secure Farm ID</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionPanel;