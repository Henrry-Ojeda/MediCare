import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ViewId } from '../types/medical';

interface NavigationContextValue {
  currentView: ViewId;
  setCurrentView: (view: ViewId) => void;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

function readViewFromHash(fallback: ViewId): ViewId {
  if (typeof window === 'undefined') return fallback;
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  return (hash || fallback) as ViewId;
}

export const NavigationProvider: React.FC<{
  initialView?: ViewId;
  children: React.ReactNode;
}> = ({ initialView = 'login', children }) => {
  const [currentView, setCurrentViewState] = useState<ViewId>(() =>
    readViewFromHash(initialView)
  );

  const setCurrentView = useCallback((view: ViewId) => {
    setCurrentViewState(view);
    if (typeof window !== 'undefined') {
      const targetHash = `#/${view}`;
      if (window.location.hash !== targetHash) {
        window.history.pushState({ view }, '', targetHash);
      }
    }
  }, []);

  const goBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      setCurrentView('dashboard');
    }
  }, [setCurrentView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      setCurrentViewState(readViewFromHash('dashboard'));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <NavigationContext.Provider value={{ currentView, setCurrentView, goBack }}>
      {children}
    </NavigationContext.Provider>
  );
};

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation debe utilizarse dentro de NavigationProvider');
  }
  return ctx;
}
