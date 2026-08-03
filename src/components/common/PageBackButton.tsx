"use client";

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { ViewState } from '../../types/index';
import { readViewBefore } from '../../lib/dashboardNavigation';

interface PageBackButtonProps {
  view: ViewState;
  onNavigate?: (view: ViewState) => void;
  className?: string;
}

/** Shared left-edge back control for My Zone / nested dashboard pages. */
const PageBackButton: React.FC<PageBackButtonProps> = ({
  view,
  onNavigate,
  className = '',
}) => {
  if (!onNavigate) return null;

  return (
    <button
      type="button"
      onClick={() => onNavigate(readViewBefore(view))}
      aria-label="Back"
      className={`touch-target -ml-1 flex shrink-0 items-center justify-center rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 ${className}`}
    >
      <ArrowLeft size={22} aria-hidden />
    </button>
  );
};

export default PageBackButton;
