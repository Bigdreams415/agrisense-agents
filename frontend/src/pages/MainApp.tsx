// src/pages/MainApp.tsx
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import { WalletProvider } from '../contexts/WalletContext';
import Sidebar from '../components/Layout/Sidebar/Sidebar';
import Header from '../components/Layout/Header/Header';
import MainContent from '../components/Pages/MainContent';
import '../styles/globals.css';

interface MainAppProps {
  onBackToHomepage: () => void;
}

const MainApp: React.FC<MainAppProps> = ({ onBackToHomepage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading completion
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <WalletProvider>
        <div className="relative"> {/* Added relative positioning for the back button */}
          {/* Back to Home button */}
          <button 
            onClick={onBackToHomepage}
            className="fixed top-4 left-4 z-50 bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded-lg shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back to Home</span>
          </button>
          
          <div className="flex h-screen">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
            <div className="flex-1 flex flex-col min-w-0">
              <Header toggleSidebar={toggleSidebar} />
              <MainContent />
            </div>
          </div>
        </div>
      </WalletProvider>
    </ThemeProvider>
  );
};

export default MainApp;