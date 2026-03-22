import React from 'react';
import { useHashRouter } from '../../hooks/useHashRouter';
import Dashboard from './Dashboard/Dashboard';
import Marketplace from './Marketplace/Marketplace';
import FarmManagement from './FarmManagement/FarmManagement';
import Settings from './Settings/Settings';
import Workspace from './Workspace/Workspace';
import RewardsCenter from './RewardCenter/RewardCenter';
import AgentCenter from './AgentCenter/AgentCenter';

const MainContent: React.FC = () => {
  const { currentRoute } = useHashRouter();

  const renderContent = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <Dashboard />;
      case 'marketplace':
        return <Marketplace />;
      case 'rewards':
        return <RewardsCenter />;
      case 'farm-management':
        return <FarmManagement />;
      case 'settings':
        return <Settings />;
      case 'agents':
        return <AgentCenter />;
      default:
        return <Workspace />;
    }
  };

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </main>
  );
};

export default MainContent;