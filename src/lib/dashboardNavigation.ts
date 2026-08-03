import { ViewState, UserRole } from '../types/index';

/** Last opened screen within `/dashboard` (same tab). */
export const VIEW_STORAGE_KEY = 'maxwell_current_view';

/** @deprecated Prefer `viewBeforeStorageKey(ViewState.SETTINGS)`. Kept for session cleanup. */
export const VIEW_BEFORE_SETTINGS_KEY = 'maxwell_view_before_settings';

/** Views that show an in-page back control and need a restore target. */
const VIEWS_WITH_BACK: ReadonlySet<ViewState> = new Set([
  ViewState.SETTINGS,
  ViewState.WALLET,
  ViewState.EVENT_MARKETPLACE,
  ViewState.AI_COACH,
  ViewState.MY_FORMS,
  ViewState.SOON_AVAILABLE,
]);

/** Workspace vs My Zone toggle for staff (members always My Zone). */
export const ZONE_STORAGE_KEY = 'maxwell_personal_zone';

function viewBeforeStorageKey(view: ViewState): string {
  if (view === ViewState.SETTINGS) return VIEW_BEFORE_SETTINGS_KEY;
  return `maxwell_view_before_${String(view).toLowerCase()}`;
}

/** Consumer routes — only in My Zone sidebar. */
export const MY_ZONE_ONLY_VIEWS: ReadonlySet<ViewState> = new Set([
  ViewState.WALLET,
  ViewState.STORE_CATALOG,
  ViewState.EVENT_MARKETPLACE,
  ViewState.ENABLEMENT,
  ViewState.AI_COACH,
  ViewState.MY_TRIBE,
  ViewState.SETTINGS,
  ViewState.MEMBER_ATTENDANCE,
  ViewState.SOON_AVAILABLE,
]);

/** Staff workspace routes — auto-select Workspace rail. */
export const WORKSPACE_ONLY_VIEWS: ReadonlySet<ViewState> = new Set([
  ViewState.ATTENDANCE_CONSOLE,
  ViewState.GATE_SCANNER,
  ViewState.MY_TASKS,
  ViewState.CRM,
  ViewState.LEADS,
  ViewState.PAID_CONVERSIONS,
  ViewState.MARKETING,
  ViewState.CMS_ADMIN,
  ViewState.COMMUNICATION,
  ViewState.GAMIFICATION,
  ViewState.YOUTH_ADMIN,
  ViewState.OPERATIONS,
  ViewState.EVENTS_ADMIN,
  ViewState.CERTIFICATION_GRID,
  ViewState.CERTIFICATION_RULES,
  ViewState.TAG_MANAGEMENT,
  ViewState.CONTRACTS,
  ViewState.STORE_ADMIN,
  ViewState.FINANCE,
  ViewState.COMMISSION_CONFIG,
  ViewState.AUTOMATION_CENTER,
  ViewState.SECURITY,
  ViewState.DB_SCHEMA,
  ViewState.AI_USAGE,
  ViewState.SYSTEM_MAINTENANCE,
]);

export function toFeatureSlug(view: ViewState): string {
  return String(view).toLowerCase().replace(/_/g, '-');
}

export function fromFeatureSlug(slug: string): ViewState | null {
  const normalized = slug.trim().toUpperCase().replace(/-/g, '_');
  if (normalized === 'STORE') {
    return ViewState.STORE_CATALOG;
  }
  const values = Object.values(ViewState) as string[];
  return values.includes(normalized) ? (normalized as ViewState) : null;
}

export function readStoredView(): ViewState {
  if (typeof window === 'undefined') return ViewState.DASHBOARD;
  try {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam) {
      const parsed = fromFeatureSlug(viewParam);
      if (parsed) return parsed;
    }
    const raw = sessionStorage.getItem(VIEW_STORAGE_KEY);
    if (raw && (Object.values(ViewState) as string[]).includes(raw)) {
      return raw as ViewState;
    }
  } catch {
    /* ignore */
  }
  return ViewState.DASHBOARD;
}

export function persistView(view: ViewState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    /* ignore */
  }
}

export function rememberViewBefore(target: ViewState, from: ViewState): void {
  if (typeof window === 'undefined') return;
  if (!VIEWS_WITH_BACK.has(target) || from === target) return;
  try {
    sessionStorage.setItem(viewBeforeStorageKey(target), from);
  } catch {
    /* ignore */
  }
}

export function readViewBefore(
  target: ViewState,
  fallback: ViewState = ViewState.DASHBOARD,
): ViewState {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = sessionStorage.getItem(viewBeforeStorageKey(target));
    if (raw && (Object.values(ViewState) as string[]).includes(raw)) {
      return raw as ViewState;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

/** @deprecated Use `rememberViewBefore(ViewState.SETTINGS, from)`. */
export function rememberViewBeforeSettings(from: ViewState): void {
  rememberViewBefore(ViewState.SETTINGS, from);
}

/** @deprecated Use `readViewBefore(ViewState.SETTINGS, fallback)`. */
export function readViewBeforeSettings(fallback: ViewState = ViewState.DASHBOARD): ViewState {
  return readViewBefore(ViewState.SETTINGS, fallback);
}

export function readStoredPersonalZone(fallback = false): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = sessionStorage.getItem(ZONE_STORAGE_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function persistPersonalZone(isPersonal: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ZONE_STORAGE_KEY, isPersonal ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function clearDashboardNavigationSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(VIEW_STORAGE_KEY);
    sessionStorage.removeItem(ZONE_STORAGE_KEY);
    for (const view of VIEWS_WITH_BACK) {
      sessionStorage.removeItem(viewBeforeStorageKey(view));
    }
  } catch {
    /* ignore */
  }
}

/** Initial zone: view-specific rails win; DASHBOARD uses last toggle. */
export function readInitialPersonalZone(view: ViewState, userRole: UserRole): boolean {
  if (userRole === UserRole.MEMBER) return true;
  if (MY_ZONE_ONLY_VIEWS.has(view)) return true;
  if (WORKSPACE_ONLY_VIEWS.has(view)) return false;
  return readStoredPersonalZone(false);
}

/**
 * Keep sidebar zone aligned with exclusive routes only.
 * DASHBOARD is shared — never force-flip zone (fixes My Zone bounce).
 */
export function resolvePersonalZoneForView(
  view: ViewState,
  userRole: UserRole,
): boolean | null {
  if (userRole === UserRole.MEMBER) return true;
  if (MY_ZONE_ONLY_VIEWS.has(view)) return true;
  if (WORKSPACE_ONLY_VIEWS.has(view)) return false;
  return null;
}
