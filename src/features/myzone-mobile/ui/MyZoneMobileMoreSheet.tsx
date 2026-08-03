"use client";

import React, { useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { ViewState } from '../../../types/index';
import { MY_ZONE_MOBILE_MORE_LINKS } from '../logic/myZoneMobileNav';

interface MyZoneMobileMoreSheetProps {
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
}

const MyZoneMobileMoreSheet: React.FC<MyZoneMobileMoreSheetProps> = ({
  onClose,
  onNavigate,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="More in My Zone"
      className="fixed inset-0 z-[100] flex items-end justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />
      <div className="safe-area-bottom relative w-full max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl animate-fade-in-up">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              My Zone
            </p>
            <h3 className="text-base font-bold text-slate-900">More</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="touch-target flex items-center justify-center rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <ul className="divide-y divide-slate-100 px-2 py-2">
          {MY_ZONE_MOBILE_MORE_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.id}>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(link.view);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left transition-colors active:bg-slate-50"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                    <Icon size={20} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">
                      {link.label}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {link.description}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-slate-300" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default MyZoneMobileMoreSheet;
