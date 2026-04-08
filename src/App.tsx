
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from './layouts/DashboardLayout';
import { useAuth } from './context/AuthContext';
import { ViewState, UserRole } from './types/index';
import { SeedService } from './services/seedService';
import LandingPage from './components/LandingPage';
import BackgroundWorker from './components/system/BackgroundWorker';
import { resolveView } from './features/dashboard/logic/viewResolver';

/** Persists last admin screen so refresh on `/dashboard` returns to the same view (same tab). */
const VIEW_STORAGE_KEY = 'maxwell_current_view';

const App: React.FC = () => {
  const { userRole, isAuthenticated, isLoading, login } = useAuth();
  const [currentView, setCurrentViewState] = useState<ViewState>(ViewState.DASHBOARD);

  const [isPersonalZone, setIsPersonalZone] = useState(false);

  useEffect(() => {
    SeedService.init().catch(err => console.error("Seeding failed", err));
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(VIEW_STORAGE_KEY);
      if (raw && (Object.values(ViewState) as string[]).includes(raw)) {
        setCurrentViewState(raw as ViewState);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setCurrentView = useCallback((v: ViewState) => {
    try {
      sessionStorage.setItem(VIEW_STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
    setCurrentViewState(v);
  }, []);

  useEffect(() => {
    if (userRole === UserRole.MEMBER) {
      setIsPersonalZone(true);
    }
  }, [userRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-2">
        <div className="h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" aria-hidden />
        <p className="text-sm">Memuat sesi…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage onLogin={login} />;
  }

  return (
    <>
      <BackgroundWorker /> 
      <DashboardLayout 
        currentView={currentView} 
        onNavigate={setCurrentView}
        isPersonalZone={isPersonalZone}
        onToggleZone={setIsPersonalZone}
      >
        {resolveView(currentView, userRole, isPersonalZone, setCurrentView)}
      </DashboardLayout>
    </>
  );
};

export default App;
