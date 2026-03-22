// src/App.tsx
import React, { useState } from 'react';
import Homepage from './pages/Homepage';
import MainApp from './pages/MainApp';

type CurrentPage = 'homepage' | 'app';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<CurrentPage>('homepage');

  return (
    <div className="App">
      {currentPage === 'homepage' ? (
        <Homepage
          onEnterApp={() => setCurrentPage('app')}
          onBackToHomepage={() => setCurrentPage('homepage')}
        />
      ) : (
        <MainApp onBackToHomepage={() => setCurrentPage('homepage')} />
      )}
    </div>
  );
};

export default App;