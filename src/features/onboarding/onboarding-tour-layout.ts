import type { OnboardingPlacement, OnboardingStep } from './onboarding-types';

const MOBILE_MAX_WIDTH_PX = 1023;

export function isMobileTourViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= MOBILE_MAX_WIDTH_PX;
}

function isSidebarTourTarget(target: string): boolean {
  return (
    target.includes('myzone-sidebar') ||
    target.includes('myzone-nav-')
  );
}

export function resolveTourPlacement(step: OnboardingStep): OnboardingPlacement {
  if (isMobileTourViewport() && step.mobilePlacement) {
    return step.mobilePlacement;
  }
  if (isMobileTourViewport() && isSidebarTourTarget(step.target)) {
    return 'bottom';
  }
  return step.placement ?? 'bottom';
}

export function resolveTourAlign(step: OnboardingStep): 'start' | 'center' | 'end' {
  if (isMobileTourViewport() && isSidebarTourTarget(step.target)) {
    return 'center';
  }
  return 'start';
}

export function scrollTourTargetIntoView(element: Element | undefined | null): void {
  if (!element) return;
  element.scrollIntoView({
    block: 'center',
    inline: 'nearest',
    behavior: 'instant',
  });
}
