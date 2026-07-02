'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ViewState } from '@/types/index';
import { useAuth } from '@/context/AuthContext';
import { isMyZoneOnboardingEligible } from '@/features/onboarding/onboarding-eligibility';
import {
  getTourConfigById,
  resolveAutoStartTourId,
  resolveManualTourId,
} from '@/features/onboarding/onboarding-view-map';
import {
  isOnboardingCompleted,
  setOnboardingCompleted,
} from '@/features/onboarding/onboarding-storage';
import { ONBOARDING_TOUR_IDS } from '@/features/onboarding/onboarding-tour-ids';
import type { OnboardingTourId } from '@/features/onboarding/onboarding-tour-ids';
import type { OnboardingEndReason } from '@/features/onboarding/onboarding-types';
import { closeSidebarForOnboarding } from '@/features/onboarding/onboarding-sidebar-events';
import ProductTour from './ProductTour';

type OnboardingProviderProps = {
  currentView: ViewState;
  isPersonalZone: boolean;
  children: React.ReactNode;
};

type OnboardingContextValue = {
  isEligible: boolean;
  hasTourForCurrentView: boolean;
  startTour: () => void;
  markViewReady: () => void;
  notifyProfileSaved: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  currentView,
  isPersonalZone,
  children,
}: OnboardingProviderProps) {
  const { user, userRole, isProfileComplete } = useAuth();
  const userId = user?.id;

  const [run, setRun] = useState(false);
  const [viewReady, setViewReady] = useState(false);
  const [activeTourId, setActiveTourId] = useState<OnboardingTourId | null>(null);
  const [manualStart, setManualStart] = useState(false);
  const [autoStartBlocked, setAutoStartBlocked] = useState(false);
  const [completedTours, setCompletedTours] = useState<
    ReadonlySet<OnboardingTourId>
  >(() => new Set());

  const isEligible = isMyZoneOnboardingEligible(userRole, isPersonalZone);

  const isTourCompleted = useCallback(
    (tourId: OnboardingTourId) => completedTours.has(tourId),
    [completedTours],
  );

  const markTourCompleted = useCallback(
    (tourId: OnboardingTourId) => {
      setOnboardingCompleted(tourId, userId);
      setCompletedTours((prev) => {
        if (prev.has(tourId)) return prev;
        const next = new Set(prev);
        next.add(tourId);
        return next;
      });
    },
    [userId],
  );

  useEffect(() => {
    if (!userId) {
      setCompletedTours(new Set());
      return;
    }
    const hydrated = new Set<OnboardingTourId>();
    for (const tourId of Object.values(ONBOARDING_TOUR_IDS)) {
      if (isOnboardingCompleted(tourId, userId)) {
        hydrated.add(tourId);
      }
    }
    setCompletedTours(hydrated);
  }, [userId]);

  const onboardingCtx = useMemo(
    () => ({
      view: currentView,
      userId,
      isPersonalZone,
      isProfileComplete,
      isTourCompleted,
    }),
    [currentView, userId, isPersonalZone, isProfileComplete, isTourCompleted],
  );

  const activeConfig = activeTourId
    ? getTourConfigById(activeTourId)
    : undefined;

  const autoStartTourId = useMemo(() => {
    if (!isEligible || !viewReady || manualStart) return null;
    return resolveAutoStartTourId(onboardingCtx, { autoStartBlocked });
  }, [isEligible, viewReady, manualStart, onboardingCtx, autoStartBlocked]);

  useEffect(() => {
    setViewReady(false);
    setRun(false);
    setManualStart(false);
    setActiveTourId(null);
    setAutoStartBlocked(false);
  }, [currentView]);

  useEffect(() => {
    if (!isEligible) return;
    if (isProfileComplete) {
      markTourCompleted(ONBOARDING_TOUR_IDS.PROFILE_SETTINGS);
    }
  }, [isEligible, isProfileComplete, markTourCompleted]);

  useEffect(() => {
    if (!isEligible || !isProfileComplete) return;
    if (isTourCompleted(ONBOARDING_TOUR_IDS.MEMBER_SIDEBAR)) return;
    if (currentView !== ViewState.WALLET) return;
    // User opened Wallet — they already used the nav; skip re-running sidebar tour.
    markTourCompleted(ONBOARDING_TOUR_IDS.MEMBER_SIDEBAR);
  }, [
    isEligible,
    isProfileComplete,
    currentView,
    isTourCompleted,
    markTourCompleted,
  ]);

  useEffect(() => {
    if (!autoStartTourId || run) return;
    const config = getTourConfigById(autoStartTourId);
    if (!config) return;
    if (config.shouldAutoStart && !config.shouldAutoStart(onboardingCtx)) {
      return;
    }
    setActiveTourId(autoStartTourId);
    setRun(true);
  }, [autoStartTourId, run, onboardingCtx]);

  const handleTourEnd = useCallback(
    (reason: OnboardingEndReason) => {
      closeSidebarForOnboarding();
      const config = activeConfig;
      setRun(false);
      setManualStart(false);
      setActiveTourId(null);

      if (!config) return;

      const shouldPersist =
        reason === 'finish' ||
        (reason === 'skip' && config.persistOnSkip) ||
        (config.tourId === ONBOARDING_TOUR_IDS.PROFILE_SETTINGS &&
          isProfileComplete);

      if (shouldPersist) {
        markTourCompleted(config.tourId);
      } else {
        setAutoStartBlocked(true);
      }
    },
    [activeConfig, isProfileComplete, markTourCompleted],
  );

  const startTour = useCallback(() => {
    if (!isEligible) return;
    const tourId = resolveManualTourId(onboardingCtx);
    if (!tourId || !getTourConfigById(tourId)) return;
    setActiveTourId(tourId);
    setManualStart(true);
    setAutoStartBlocked(false);
    setRun(true);
  }, [isEligible, onboardingCtx]);

  const markViewReady = useCallback(() => {
    setViewReady(true);
  }, []);

  const notifyProfileSaved = useCallback(() => {
    markTourCompleted(ONBOARDING_TOUR_IDS.PROFILE_SETTINGS);
    setAutoStartBlocked(false);
    setActiveTourId(ONBOARDING_TOUR_IDS.MEMBER_SIDEBAR);
    setManualStart(false);
    setRun(true);
  }, [markTourCompleted]);

  const hasTourForCurrentView = useMemo(() => {
    if (!isEligible) return false;
    return !!resolveManualTourId(onboardingCtx);
  }, [isEligible, onboardingCtx]);

  const contextValue = useMemo<OnboardingContextValue>(
    () => ({
      isEligible,
      hasTourForCurrentView,
      startTour,
      markViewReady,
      notifyProfileSaved,
    }),
    [isEligible, hasTourForCurrentView, startTour, markViewReady, notifyProfileSaved],
  );

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      {isEligible && activeConfig && (
        <ProductTour
          steps={activeConfig.steps}
          run={run}
          onEnd={handleTourEnd}
        />
      )}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return ctx;
}

export function useOnboardingOptional(): OnboardingContextValue | null {
  return useContext(OnboardingContext);
}
