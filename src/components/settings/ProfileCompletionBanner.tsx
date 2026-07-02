import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface ProfileCompletionBannerProps {
  missingLabels: string[];
  onGoToSettings: () => void;
  compact?: boolean;
}

const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  missingLabels,
  onGoToSettings,
  compact = false,
}) => {
  const preview =
    missingLabels.length > 0
      ? missingLabels.slice(0, 3).join(', ') +
        (missingLabels.length > 3 ? ` +${missingLabels.length - 3} more` : '')
      : 'Personal Information';

  if (compact) {
    return (
      <button
        type="button"
        onClick={onGoToSettings}
        className="flex w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-left text-sm text-amber-900 transition-colors hover:bg-amber-100"
      >
        <AlertCircle size={16} className="shrink-0 text-amber-600" />
        <span className="flex-1 font-medium">Complete your profile verification</span>
        <ArrowRight size={16} className="shrink-0 text-amber-700" />
      </button>
    );
  }

  return (
    <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-950">
              Complete your profile verification
            </p>
            <p className="mt-1 text-sm text-amber-900/80">
              Fill in{' '}
              <span className="font-semibold">{preview}</span> in Account Settings
              before using other features.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onGoToSettings}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-700"
        >
          Open Account Settings
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default ProfileCompletionBanner;
