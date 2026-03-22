import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useHashRouter } from '../../../hooks/useHashRouter';
import { useWallet } from '../../../contexts/WalletContext'; 

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { currentRoute } = useHashRouter();
  const { account, accountId, isConnected, isResolvingAccount, connectWallet, disconnectWallet } = useWallet(); 

  const handleWalletAction = () => {
    if (isConnected) {
      disconnectWallet();
    } else {
      connectWallet();
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatHederaId = (accountId: string) => {
    return accountId; 
  };

  const pageTitle = currentRoute.charAt(0).toUpperCase() + currentRoute.slice(1).replace("-", " ");

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 glass border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={toggleSidebar}
          >
            <i className="fas fa-bars"></i>
          </button>
          <h2 className="text-xl font-semibold gradient-text">{pageTitle}</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search Bar */}
          <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
            <i className="fas fa-search text-gray-500 mr-2"></i>
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none focus:outline-none w-40"
            />
          </div>

          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative">
            <i className="fas fa-bell"></i>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          </button>

          {/* Theme Toggle */}
          <button 
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={toggleTheme}
          >
            <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'}></i>
          </button>

          {/* Wallet Info & Button */}
          <div className="flex items-center space-x-2">
            {/* Resolving Indicator */}
            {isConnected && isResolvingAccount && (
              <div className="hidden md:flex items-center bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-lg">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Resolving ID...
                </span>
              </div>
            )}

            {/* Wallet Button - Now shows Hedera ID on desktop */}
            <button 
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl ${
                isConnected 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
              }`}
              onClick={handleWalletAction}
            >
              <i className={`fas ${isConnected ? 'fa-check-circle' : 'fa-wallet'} mr-2`}></i>
              <span>
                {isConnected ? (
                  <>
                    {/* Show Hedera ID on desktop, EVM on mobile */}
                    <span className="hidden md:inline">
                      {accountId ? formatHederaId(accountId) : formatAddress(account!)}
                    </span>
                    <span className="md:hidden">
                      {formatAddress(account!)}
                    </span>
                  </>
                ) : (
                  'Connect Wallet'
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Account Info - Show Hedera ID below */}
      {isConnected && accountId && (
        <div className="md:hidden mt-3 flex items-center justify-center bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-lg">
          <i className="fas fa-id-card text-green-600 mr-2 text-sm"></i>
          <span className="text-sm text-green-700 dark:text-green-300 font-medium">
            Hedera ID: {formatHederaId(accountId)}
          </span>
        </div>
      )}

      {isConnected && isResolvingAccount && (
        <div className="md:hidden mt-3 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-lg">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Resolving Hedera ID...
          </span>
        </div>
      )}
    </header>
  );
};

export default Header;