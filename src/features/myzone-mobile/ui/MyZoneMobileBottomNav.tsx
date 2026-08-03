"use client";

import React from 'react';
import { ViewState } from '../../../types/index';
import { MY_ZONE_MOBILE_TABS, isTabActive } from '../logic/myZoneMobileNav';

interface MyZoneMobileBottomNavProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

const MyZoneMobileBottomNav: React.FC<MyZoneMobileBottomNavProps> = ({
  currentView,
  onNavigate,
}) => (
  <nav
    aria-label="My Zone"
    data-tour="myzone-sidebar-nav"
    className="safe-area-bottom sticky bottom-0 z-40 shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_-8px_30px_rgb(0,0,0,0.06)]"
  >
    <ul className="flex items-stretch justify-between px-1 pt-1 pb-1">
      {MY_ZONE_MOBILE_TABS.map((tab) => {
        const active = isTabActive(tab, currentView);
        const Icon = tab.icon;
        return (
          <li key={tab.id} className="flex-1">
            <button
              type="button"
              onClick={() => onNavigate(tab.view)}
              aria-current={active ? 'page' : undefined}
              data-tour={`myzone-nav-${tab.id}`}
              className={`touch-target flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition-colors ${
                active ? 'text-blue-600' : 'text-slate-400 active:bg-slate-100'
              }`}
            >
              <span
                className={`flex h-8 w-full max-w-[64px] items-center justify-center rounded-xl transition-colors ${
                  active ? 'bg-blue-50' : 'bg-transparent'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden />
              </span>
              <span
                className={`text-[10px] leading-none tracking-tight ${
                  active ? 'font-bold' : 'font-semibold'
                }`}
              >
                {tab.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);

export default MyZoneMobileBottomNav;
