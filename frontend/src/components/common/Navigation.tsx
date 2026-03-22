// src/components/common/Navigation.tsx
import React from 'react';
import { PageProps } from '../../types';

const Navigation: React.FC<PageProps> = ({ onEnterApp }) => {
  return (
    <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <div className="text-2xl font-bold gradient-text bg-gradient-to-r from-green-500 to-blue-600 bg-clip-text text-transparent">
              AgriSense AI
            </div>
          </div>
          <button 
            onClick={onEnterApp}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Launch App
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;