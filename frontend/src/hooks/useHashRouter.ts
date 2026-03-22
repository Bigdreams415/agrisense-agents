import { useState, useEffect } from 'react';

export const useHashRouter = () => {
  const [currentRoute, setCurrentRoute] = useState('workspace');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      setCurrentRoute(hash || 'workspace');
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (route: string) => {
    window.location.hash = route;
  };

  return { currentRoute, navigate };
};