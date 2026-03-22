import React from 'react';
import { ROUTES } from '../../../utils/constants';
import { useHashRouter } from '../../../hooks/useHashRouter';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { currentRoute } = useHashRouter();

  return (
    <>
      <div 
        className={`overlay ${isOpen ? 'active' : ''} lg:hidden`} 
        onClick={toggleSidebar}
      />
      <aside 
        id="sidebar" 
        className={`w-64 bg-white/80 dark:bg-gray-800/80 glass border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col transition-all duration-300 z-50 ${
          isOpen ? 'mobile-open' : ''
        }`}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
              <i className="fas fa-seedling text-white text-sm"></i>
            </div>
            <h1 className="text-xl font-bold gradient-text">AgriSense AI</h1>
          </div>
          <button 
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
            onClick={toggleSidebar}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {ROUTES.map((route) => (
            <a
              key={route.id}
              href={`#${route.id}`}
              className={`nav-link flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 hover:bg-green-50 dark:hover:bg-green-900/20 hover:shadow-md group ${
                currentRoute === route.id 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                  : ''
              }`}
              onClick={() => window.innerWidth < 1024 && toggleSidebar()}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <i className={`fas ${route.icon} ${
                  currentRoute === route.id 
                    ? 'text-green-600' 
                    : 'text-gray-500 group-hover:text-green-600'
                }`}></i>
              </div>
              <span className="font-medium">{route.name}</span>
            </a>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">FU</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">Farmer User</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Premium Member</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;