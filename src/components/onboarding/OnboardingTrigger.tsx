'use client';

import { HelpCircle } from 'lucide-react';
import { useOnboardingOptional } from './OnboardingProvider';

export default function OnboardingTrigger() {
  const onboarding = useOnboardingOptional();

  if (!onboarding?.isEligible || !onboarding.hasTourForCurrentView) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onboarding.startTour}
      className="touch-target flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600"
      title="Show guide"
      aria-label="Show guide"
    >
      <HelpCircle size={20} />
    </button>
  );
}
