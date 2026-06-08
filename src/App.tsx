
import React, { useState, useEffect, useCallback, startTransition } from 'react';
import DashboardLayout from './layouts/DashboardLayout';
import { useAuth } from './context/AuthContext';
import { ViewState, UserRole } from './types/index';
import { SeedService } from './services/seedService';
import LandingPage from './components/LandingPage';
import BackgroundWorker from './components/system/BackgroundWorker';
import { resolveView } from './features/dashboard/logic/viewResolver';
import SessionLoadingScreen from './components/system/SessionLoadingScreen';
import { useToast } from './context/ToastContext';
import { CampaignAttributionService } from './services/campaignAttributionService';
import { CampaignService } from './services/campaignService';
import {
  ALWAYS_ON_CUSTOM_VIEWS,
  CUSTOM_VIEW_FEATURE_BY_VIEW,
  toViewFeatureId,
} from './constants/customRoleFeatures';
import {
  persistPersonalZone,
  persistView,
  readInitialPersonalZone,
  readStoredView,
  resolvePersonalZoneForView,
  toFeatureSlug,
} from './lib/dashboardNavigation';

const CAMPAIGN_QUERY_KEYS = [
  'product',
  'productId',
  'discount',
  'source',
  'checkout',
  'autocheckout',
] as const;

const App: React.FC = () => {
  const { user, userRole, isAuthenticated, isLoading, login, isProfileComplete } = useAuth();
  const { showToast } = useToast();
  const profileGateActive = isAuthenticated && !isProfileComplete;
  const [currentView, setCurrentViewState] = useState<ViewState>(readStoredView);
  const [redirectingGuestFromDashboard, setRedirectingGuestFromDashboard] =
    useState(false);

  const [isPersonalZone, setIsPersonalZoneState] = useState(() =>
    readInitialPersonalZone(readStoredView(), UserRole.GUEST),
  );

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

  const setPersonalZone = useCallback((isPersonal: boolean) => {
    persistPersonalZone(isPersonal);
    setIsPersonalZoneState(isPersonal);
  }, []);

  const setCurrentView = useCallback((v: ViewState) => {
    if (profileGateActive && v !== ViewState.SETTINGS) {
      showToast(
        'Lengkapi Personal Information di Account Settings terlebih dahulu.',
        'info',
      );
      return;
    }
    persistView(v);
    startTransition(() => {
      setCurrentViewState(v);
    });
  }, [profileGateActive, showToast]);

  /**
   * Align zone rail with exclusive routes only.
   * DASHBOARD is shared — keep last My Zone / Workspace toggle.
   */
  useEffect(() => {
    if (!isAuthenticated) return;
    const resolved = resolvePersonalZoneForView(currentView, userRole);
    if (resolved === null) return;
    setIsPersonalZoneState(resolved);
    persistPersonalZone(resolved);
  }, [isAuthenticated, userRole, currentView]);

  /** Incomplete profile: only Dashboard + Settings; deep links fall back to Dashboard. */
  useEffect(() => {
    if (!profileGateActive) return;
    if (
      currentView !== ViewState.SETTINGS &&
      currentView !== ViewState.DASHBOARD
    ) {
      setCurrentView(ViewState.DASHBOARD);
    }
  }, [profileGateActive, currentView, setCurrentView]);

  useEffect(() => {
    const customRole = user?.customRole;
    const activeId = user?.activeCustomRoleId;
    const customActive = !!customRole && !!activeId && customRole.id === activeId;
    if (!customActive) return;
    if (ALWAYS_ON_CUSTOM_VIEWS.has(currentView)) return;

    const viewFeature = CUSTOM_VIEW_FEATURE_BY_VIEW.get(currentView);
    // Views not part of workspace custom catalog are left untouched.
    if (!viewFeature) return;

    const keys = [
      ...(viewFeature.resourceId ? [viewFeature.resourceId] : []),
      toViewFeatureId(currentView),
    ];
    const allowed = keys.some((key) => customRole.allowedFeatures.includes(key));
    if (!allowed) {
      setCurrentView(ViewState.DASHBOARD);
    }
  }, [currentView, setCurrentView, user?.activeCustomRoleId, user?.customRole]);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;
    if (!window.location.pathname.startsWith('/dashboard')) return;

    const url = new URL(window.location.href);
    const prev = new URLSearchParams(window.location.search);

    url.searchParams.set('view', toFeatureSlug(currentView));
    if (user?.fullName?.trim()) {
      url.searchParams.set('user', user.fullName.trim());
    } else {
      url.searchParams.delete('user');
    }

    // Keep Storefront deep links (campaign checkout) — previously this effect dropped `product` / `discount` / `checkout`.
    if (currentView === ViewState.STORE_CATALOG) {
      for (const key of CAMPAIGN_QUERY_KEYS) {
        const v = prev.get(key);
        if (v != null && v !== '') url.searchParams.set(key, v);
      }
    } else {
      for (const key of CAMPAIGN_QUERY_KEYS) {
        url.searchParams.delete(key);
      }
    }

    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [isAuthenticated, currentView, user?.fullName]);

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
        onToggleZone={setPersonalZone}
        profileGateActive={profileGateActive}
      >
        {resolveView(currentView, userRole, isPersonalZone, setCurrentView)}
      </DashboardLayout>
    </>
  );
};

export default App;
