import React, { useState, useEffect } from 'react';

const Settings: React.FC = () => {
  const [farmName, setFarmName] = useState(localStorage.getItem('farmName') || '');
  const [farmLocation, setFarmLocation] = useState(localStorage.getItem('farmLocation') || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(localStorage.getItem('notificationsEnabled') === 'true');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Load theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSave = () => {
    localStorage.setItem('farmName', farmName);
    localStorage.setItem('farmLocation', farmLocation);
    localStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
    alert('Settings saved! Refresh the app to see changes.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      {/* RESPONSIVE CONTAINER - WIDER ON DESKTOP, PROPER ON MOBILE */}
      <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-2xl p-6 w-full max-w-2xl mx-auto hover-lift shadow-xl">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-cog text-white text-2xl"></i>
          </div>
          <h2 className="text-3xl font-bold gradient-text mb-2">Farm Settings</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Configure your farm details and application preferences
          </p>
        </div>

        {/* Settings Grid - Responsive Layout */}
        <div className="space-y-8">
          {/* Farm Information Section */}
          <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-tractor text-green-600 text-lg"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Farm Information</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Basic details about your farm</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Farm Name
                </label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g., My Family Farm"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Farm Location
                </label>
                <input
                  type="text"
                  value={farmLocation}
                  onChange={(e) => setFarmLocation(e.target.value)}
                  placeholder="e.g., Abuja, Nigeria"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-sliders-h text-blue-600 text-lg"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Preferences</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customize your experience</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Notifications Toggle */}
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                    <i className="fas fa-bell text-orange-600 text-sm"></i>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">Notifications</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Alerts for low soil moisture & pest detection
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <i className="fas fa-palette text-purple-600 text-sm"></i>
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">Dark Mode</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Switch between light and dark themes
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={theme === 'dark'}
                    onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-save"></i>
            Save Settings
          </button>
          <button
            onClick={() => {
              setFarmName('');
              setFarmLocation('');
              setNotificationsEnabled(true);
              setTheme('light');
            }}
            className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-undo"></i>
            Reset to Defaults
          </button>
        </div>

        {/* Information Card */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Settings Information
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Your farm details help personalize recommendations. Theme changes apply immediately, while farm details update after refresh.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-800 dark:text-white">2</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Settings Groups</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800 dark:text-white">4</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Options</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800 dark:text-white">
                {notificationsEnabled ? 'On' : 'Off'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Notifications</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800 dark:text-white capitalize">
                {theme}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Theme</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;