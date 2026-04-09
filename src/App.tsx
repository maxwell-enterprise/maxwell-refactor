
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from './layouts/DashboardLayout';
import { useAuth } from './context/AuthContext';
import { ViewState, UserRole } from './types/index';
import { SeedService } from './services/seedService';
import LandingPage from './components/LandingPage';
import BackgroundWorker from './components/system/BackgroundWorker';
import { resolveView } from './features/dashboard/logic/viewResolver';
import SessionLoadingScreen from './components/system/SessionLoadingScreen';
import { CampaignAttributionService } from './services/campaignAttributionService';
import { CampaignService } from './services/campaignService';

/** Persists last admin screen so refresh on `/dashboard` returns to the same view (same tab). */
const VIEW_STORAGE_KEY = 'maxwell_current_view';

const App: React.FC = () => {
  const { userRole, isAuthenticated, isLoading, login } = useAuth();
  const [currentView, setCurrentViewState] = useState<ViewState>(ViewState.DASHBOARD);
  const [redirectingGuestFromDashboard, setRedirectingGuestFromDashboard] =
    useState(false);

  const [isPersonalZone, setIsPersonalZone] = useState(false);

  useEffect(() => {
    SeedService.init().catch(err => console.error("Seeding failed", err));
  }, []);

  // Fallback tracker for non-app-router entry: record click before auth/dashboard.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source')?.trim();
    if (!source) return;

    const normalized = CampaignAttributionService.saveSource(source);
    if (!normalized) return;
    if (!CampaignAttributionService.shouldTrackClick(normalized)) return;

    CampaignService.trackClick(normalized).catch((error) => {
      console.warn('[Campaign] app-level click tracking failed:', error);
    });
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

  useEffect(() => {
    if (isLoading || isAuthenticated || typeof window === 'undefined') return;
    if (window.location.pathname.startsWith('/dashboard')) {
      setRedirectingGuestFromDashboard(true);
      window.location.replace('/');
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return <SessionLoadingScreen />;
  }

  if (redirectingGuestFromDashboard) {
    return <SessionLoadingScreen />;
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
