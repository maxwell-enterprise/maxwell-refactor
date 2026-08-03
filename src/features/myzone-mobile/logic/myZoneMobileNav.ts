import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  CalendarDays,
  Coins,
  GraduationCap,
  Home,
  LayoutGrid,
  Newspaper,
  ScanLine,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Ticket,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { ViewState } from '../../../types/index';

export interface MyZoneMobileTab {
  id: string;
  label: string;
  icon: LucideIcon;
  view: ViewState;
}

export interface MyZoneMobileShortcut {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Accent tokens follow the dashboard palette (light theme). */
  tone: 'blue' | 'indigo' | 'emerald' | 'amber' | 'slate';
  view?: ViewState;
  /** Opens the overflow sheet instead of navigating. */
  opensMore?: boolean;
}

export interface MyZoneMobileMoreLink {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  view: ViewState;
}

export const MY_ZONE_MOBILE_TABS: readonly MyZoneMobileTab[] = [
  { id: 'home', label: 'Home', icon: Home, view: ViewState.DASHBOARD },
  { id: 'store', label: 'Store', icon: ShoppingCart, view: ViewState.STORE_CATALOG },
  { id: 'scan', label: 'Scan', icon: ScanLine, view: ViewState.MEMBER_ATTENDANCE },
  { id: 'tools', label: 'Tools', icon: Wrench, view: ViewState.ENABLEMENT },
  { id: 'tribe', label: 'My Tribe', icon: Users, view: ViewState.MY_TRIBE },
] as const;

export const MY_ZONE_MOBILE_SHORTCUTS: readonly MyZoneMobileShortcut[] = [
  { id: 'event', label: 'Event', icon: CalendarDays, tone: 'blue', view: ViewState.EVENT_MARKETPLACE },
  { id: 'tickets', label: 'My Tickets', icon: Ticket, tone: 'indigo', view: ViewState.WALLET },
  { id: 'news', label: 'News', icon: Newspaper, tone: 'emerald', view: ViewState.SOON_AVAILABLE },
  { id: 'lms', label: 'LMS', icon: GraduationCap, tone: 'amber', view: ViewState.SOON_AVAILABLE },
  { id: 'credits', label: 'Credits', icon: Coins, tone: 'amber', view: ViewState.WALLET },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, tone: 'blue', view: ViewState.STORE_CATALOG },
  { id: 'activity', label: 'Activity', icon: Activity, tone: 'emerald', view: ViewState.SOON_AVAILABLE },
  { id: 'more', label: 'More', icon: LayoutGrid, tone: 'slate', opensMore: true },
] as const;

/** Everything reachable from the sidebar that the five tabs do not cover. */
export const MY_ZONE_MOBILE_MORE_LINKS: readonly MyZoneMobileMoreLink[] = [
  {
    id: 'events',
    label: 'Event Catalogue',
    description: 'Browse and register for upcoming events',
    icon: CalendarDays,
    view: ViewState.EVENT_MARKETPLACE,
  },
  {
    id: 'wallet',
    label: 'My Wallet',
    description: 'Tickets, credits and gifts',
    icon: Wallet,
    view: ViewState.WALLET,
  },
  {
    id: 'toolkit',
    label: 'Success Toolkit',
    description: 'Articles and quizzes to keep growing',
    icon: GraduationCap,
    view: ViewState.ENABLEMENT,
  },
  {
    id: 'coach',
    label: 'AI Coach',
    description: 'Personal guidance on demand',
    icon: Sparkles,
    view: ViewState.AI_COACH,
  },
  {
    id: 'forms',
    label: 'My Forms',
    description: 'Submitted forms and quiz history',
    icon: Newspaper,
    view: ViewState.MY_FORMS,
  },
  {
    id: 'settings',
    label: 'Account Settings',
    description: 'Profile, security and preferences',
    icon: Settings,
    view: ViewState.SETTINGS,
  },
] as const;

export const MY_ZONE_MOBILE_SHORTCUT_TONES: Record<
  MyZoneMobileShortcut['tone'],
  string
> = {
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/** Tabs highlight for their own view plus the views they logically own. */
const TAB_VIEW_ALIASES: Partial<Record<string, ReadonlySet<ViewState>>> = {
  home: new Set([ViewState.DASHBOARD]),
  store: new Set([ViewState.STORE_CATALOG]),
  scan: new Set([ViewState.MEMBER_ATTENDANCE]),
  tools: new Set([ViewState.ENABLEMENT, ViewState.MY_FORMS, ViewState.AI_COACH]),
  tribe: new Set([ViewState.MY_TRIBE]),
};

export function isTabActive(tab: MyZoneMobileTab, currentView: ViewState): boolean {
  const aliases = TAB_VIEW_ALIASES[tab.id];
  if (aliases) return aliases.has(currentView);
  return tab.view === currentView;
}
