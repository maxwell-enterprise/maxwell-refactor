"use client";

import React, { useEffect, useState } from 'react';
import { Clock, Sparkles } from 'lucide-react';
import { ViewState } from '../../../types/index';
import PageBackButton from '../../../components/common/PageBackButton';

export const SOON_AVAILABLE_FEATURE_KEY = 'maxwell_soon_available_feature';

interface SoonAvailablePageProps {
  onNavigate?: (view: ViewState) => void;
}

function readFeatureLabel(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SOON_AVAILABLE_FEATURE_KEY)?.trim();
    return raw || null;
  } catch {
    return null;
  }
}

const SoonAvailablePage: React.FC<SoonAvailablePageProps> = ({ onNavigate }) => {
  const [featureLabel, setFeatureLabel] = useState<string | null>(null);

  useEffect(() => {
    setFeatureLabel(readFeatureLabel());
  }, []);

  return (
    <div className="page-container animate-fade-in relative min-w-0">
      <div className="mb-6 flex items-center gap-2">
        <PageBackButton view={ViewState.SOON_AVAILABLE} onNavigate={onNavigate} />
        <h1 className="min-w-0 text-xl font-bold text-slate-900 sm:text-2xl">
          Soon Available
        </h1>
      </div>

      <div className="mx-auto flex max-w-md flex-col items-center rounded-[2rem] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
          <Clock size={32} aria-hidden />
        </span>
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700 ring-1 ring-amber-100">
          <Sparkles size={11} aria-hidden />
          Coming soon
        </span>
        <h2 className="text-lg font-bold text-slate-900">
          {featureLabel ? `${featureLabel} is almost ready` : 'This feature is almost ready'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          We&apos;re still polishing this experience. Check back later — it will show up here
          as soon as it launches.
        </p>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate(ViewState.DASHBOARD)}
            className="mt-8 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition-colors active:bg-slate-800"
          >
            Back to Home
          </button>
        )}
      </div>
    </div>
  );
};

export default SoonAvailablePage;
