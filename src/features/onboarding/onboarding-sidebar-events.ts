export const ONBOARDING_OPEN_SIDEBAR_EVENT = 'maxwell:onboarding-open-sidebar';
export const ONBOARDING_CLOSE_SIDEBAR_EVENT = 'maxwell:onboarding-close-sidebar';

export function openSidebarForOnboarding(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_OPEN_SIDEBAR_EVENT));
}

export function closeSidebarForOnboarding(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_CLOSE_SIDEBAR_EVENT));
}
