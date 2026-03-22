import React from "react";

const FarmManagement: React.FC = () => {
  return (
    <div className="animate-fadeIn">
      <h3 className="text-2xl font-bold mb-6 gradient-text">My Farm</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-seedling text-green-600 text-2xl"></i>
          </div>
          <h4 className="font-semibold mb-2">Premium Seeds</h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">High-yield, disease-resistant varieties</p>
          <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Explore</button>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-microchip text-blue-600 text-2xl"></i>
          </div>
          <h4 className="font-semibold mb-2">IoT Sensors</h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Real-time monitoring equipment</p>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Explore</button>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 glass rounded-xl p-6 hover-lift text-center">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-robot text-purple-600 text-2xl"></i>
          </div>
          <h4 className="font-semibold mb-2">AI Analysis</h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Advanced crop prediction tools</p>
          <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">Explore</button>
        </div>
      </div>
    </div>
  );
};

export default FarmManagement;