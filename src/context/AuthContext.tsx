'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { UserRole, UserProfile } from '../types/index';
import { AuthService } from '../services/authService';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import { parseAppRoleList, parseAppRoleString } from '../lib/appRole';
import {
  getWorkspaceToken,
  getWorkspaceTokenChangedEventName,
  setWorkspaceToken,
} from '../lib/workspaceAuthToken';
import { workspaceFetch } from '../lib/workspaceApi';
import { CampaignAttributionService } from '../services/campaignAttributionService';
import { PaidConversionService } from '../services/paidConversionService';
import { isProfileComplete as resolveProfileComplete } from '../lib/profileCompletion';

/** Identity + RBAC live in Nest (`/fe/auth/*`). UI only stores JWT and calls session. */
const USE_WORKSPACE =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_USE_WORKSPACE_AUTH !== 'false';

/**
 * After the tab was hidden this long, we may refresh session on return (silent).
 * Default 2m so gallery/file picker / short multitasking does not hit `/auth/session`.
 * Override: NEXT_PUBLIC_SESSION_RESUME_MIN_TAB_MS (milliseconds).
 */
const MIN_TAB_BACKGROUND_MS = (() => {
  const raw = Number(
    process.env.NEXT_PUBLIC_SESSION_RESUME_MIN_TAB_MS ?? 120_000,
  );
  if (!Number.isFinite(raw) || raw < 30_000) return 120_000;
  return Math.min(raw, 30 * 60_000);
})();

/** Extra delay after `visible` before hydrate (avoids burst on quick focus changes). */
const POST_VISIBLE_DEBOUNCE_MS = 5_000;

interface AuthContextType {
  user: UserProfile | null;
  userRole: UserRole;
  login: (
    role: UserRole,
    email?: string,
    provider?: 'google' | 'email',
  ) => Promise<void>;
  logout: () => void;
  refreshSession: (opts?: { silent?: boolean }) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  isProfileComplete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateWorkspaceSession = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (APP_CONFIG.USE_MOCK_GLOBAL || !USE_WORKSPACE) return;

    if (!silent) {
      setIsLoading(true);
    }
    const token = getWorkspaceToken();
    if (!token) {
      setUser(null);
      if (!silent) {
        setIsLoading(false);
      }
      return;
    }

    let data:
        | {
          user: {
            id: string;
            email: string;
            name: string | null;
            image: string | null;
            role: string;
            roles?: string[];
            phone?: string | null;
            jobTitle?: string | null;
            company?: string | null;
            domicile?: string | null;
            instagram?: string | null;
            linkedinUrl?: string | null;
            customRole?: {
              id: string;
              name: string;
              allowedFeatures: string[];
              createdAt: string;
              locked: true;
            } | null;
            activeCustomRoleId?: string | null;
          } | null;
        }
      | undefined;
    let lastStatus: number | undefined;

    // Retry once to smooth rapid account-switch timing after OAuth callback.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const res = await workspaceFetch('/auth/session', {
          skipBackendFailureTracking: true,
        });
        lastStatus = res.status;
        if (!res.ok) {
          throw new Error(`session_http_${res.status}`);
        }
        data = (await res.json()) as {
          user: {
            id: string;
            email: string;
            name: string | null;
            image: string | null;
            role: string;
            roles?: string[];
            phone?: string | null;
            jobTitle?: string | null;
            company?: string | null;
            domicile?: string | null;
            instagram?: string | null;
            linkedinUrl?: string | null;
            customRole?: {
              id: string;
              name: string;
              allowedFeatures: string[];
              createdAt: string;
              locked: true;
            } | null;
            activeCustomRoleId?: string | null;
          } | null;
        };
        break;
      } catch {
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 250));
          continue;
        }
      }
    }

    // Keep existing session state when backend is temporarily unreachable.
    // Only clear local token on explicit auth failure from server.
    if (!data && lastStatus !== 401 && lastStatus !== 403) {
      if (!silent) {
        setIsLoading(false);
      }
      return;
    }

    if (!data?.user) {
      setWorkspaceToken(null);
      setUser(null);
      if (!silent) {
        setIsLoading(false);
      }
      return;
    }

    const email = data.user.email;
    const assignedRoles = Array.isArray(data.user.roles) && data.user.roles.length > 0
      ? data.user.roles.map((role) => parseAppRoleString(role))
      : parseAppRoleList(data.user.role);
    const phone =
      typeof data.user.phone === 'string' && data.user.phone.trim()
        ? data.user.phone.trim()
        : undefined;
    const optionalText = (value: string | null | undefined) =>
      typeof value === 'string' && value.trim() ? value.trim() : undefined;
    setUser({
      id: data.user.id,
      email,
      fullName: data.user.name?.trim() || email,
      role: parseAppRoleString(data.user.role),
      roles: assignedRoles,
      customRole: data.user.customRole ?? null,
      activeCustomRoleId:
        typeof data.user.activeCustomRoleId === 'string'
          ? data.user.activeCustomRoleId
          : null,
      avatarUrl: data.user.image || undefined,
      phone,
      jobTitle: optionalText(data.user.jobTitle),
      company: optionalText(data.user.company),
      domicile: optionalText(data.user.domicile),
      instagram: optionalText(data.user.instagram),
      linkedinUrl: optionalText(data.user.linkedinUrl),
      provider: 'email',
    });
    if (!silent) {
      setIsLoading(false);
    }
  }, []);

  /** After sign-in, record campaign attribution once per browser session (even without purchase). */
  useEffect(() => {
    if (!user?.email || APP_CONFIG.USE_MOCK_GLOBAL || !USE_WORKSPACE) return;
    if (!getWorkspaceToken()) return;

    const sessionKey = 'maxwell_campaign_signin_tracked';
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) return;

    const source = CampaignAttributionService.getSource();
    if (!source) return;

    void PaidConversionService.trackSignIn({
      campaignSourceCode: source,
      name: user.fullName,
    })
      .then(() => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(sessionKey, '1');
        }
      })
      .catch(() => {
        /* best-effort; do not block session */
      });
  }, [user?.email]);

  // --- Nest JWT session (default) ---
  useEffect(() => {
    if (APP_CONFIG.USE_MOCK_GLOBAL || !USE_WORKSPACE) return;

    let cancelled = false;
    void (async () => {
      await hydrateWorkspaceSession();
      if (cancelled) return;
    })();

    const onTokenChanged = () => {
      void hydrateWorkspaceSession({ silent: true });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'maxwell_workspace_jwt') {
        void hydrateWorkspaceSession({ silent: true });
      }
    };
    window.addEventListener(getWorkspaceTokenChangedEventName(), onTokenChanged);
    window.addEventListener('storage', onStorage);

    const onOnline = () => {
      void hydrateWorkspaceSession({ silent: true });
    };
    window.addEventListener('online', onOnline);

    let hiddenAtMs: number | null = null;
    let resumeTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

    const clearResumeTimer = () => {
      if (resumeTimer !== undefined) {
        globalThis.clearTimeout(resumeTimer);
        resumeTimer = undefined;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtMs = Date.now();
        clearResumeTimer();
        return;
      }
      const away = hiddenAtMs != null ? Date.now() - hiddenAtMs : 0;
      hiddenAtMs = null;
      if (away < MIN_TAB_BACKGROUND_MS) {
        return;
      }
      clearResumeTimer();
      resumeTimer = globalThis.setTimeout(() => {
        resumeTimer = undefined;
        if (cancelled) return;
        void hydrateWorkspaceSession({ silent: true });
      }, POST_VISIBLE_DEBOUNCE_MS);
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearResumeTimer();
      window.removeEventListener(
        getWorkspaceTokenChangedEventName(),
        onTokenChanged,
      );
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hydrateWorkspaceSession]);

  // --- Mock + Supabase (legacy) ---
  useEffect(() => {
    if (!APP_CONFIG.USE_MOCK_GLOBAL && USE_WORKSPACE) return;

    const initSession = async () => {
      if (APP_CONFIG.USE_MOCK_GLOBAL || !APP_CONFIG.FEATURES.AUTH) {
        const storedUser = localStorage.getItem('mock_user_session');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
        return;
      }

      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const sbUser = data.session.user;
          const profile: UserProfile = {
            id: sbUser.id,
            email: sbUser.email!,
            fullName: sbUser.user_metadata?.full_name || sbUser.email!,
            role: (sbUser.user_metadata?.role as UserRole) || UserRole.MEMBER,
            provider: 'email',
          };
          setUser(profile);
        }

        const { data: listener } = supabase.auth.onAuthStateChange(
          async (event, sess) => {
            if (event === 'SIGNED_IN' && sess) {
              const sbUser = sess.user;
              const profile: UserProfile = {
                id: sbUser.id,
                email: sbUser.email!,
                fullName: sbUser.user_metadata?.full_name || sbUser.email!,
                role:
                  (sbUser.user_metadata?.role as UserRole) || UserRole.MEMBER,
                provider: 'email',
              };
              setUser(profile);
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
            }
          },
        );

        setIsLoading(false);

        return () => listener.subscription.unsubscribe();
      }
      setIsLoading(false);
    };
    void initSession();
  }, []);

  const login = async (
    role: UserRole,
    email: string = 'user@gmail.com',
    provider: 'google' | 'email' | string = 'email',
  ) => {
    if (USE_WORKSPACE && !APP_CONFIG.USE_MOCK_GLOBAL) {
      return;
    }

    setIsLoading(true);

    if (APP_CONFIG.USE_MOCK_GLOBAL || !APP_CONFIG.FEATURES.AUTH) {
      const { user: loggedInUser } = await AuthService.signInWithEmail(email);

      if (loggedInUser) {
        const finalUser = { ...loggedInUser };
        localStorage.setItem('mock_user_session', JSON.stringify(finalUser));
        setUser(finalUser);
      }
      setIsLoading(false);
      return;
    }

    await AuthService.signInWithEmail(email);
    setIsLoading(false);
  };

  const logout = async () => {
    if (USE_WORKSPACE && !APP_CONFIG.USE_MOCK_GLOBAL) {
      setWorkspaceToken(null);
      setUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return;
    }

    await AuthService.signOut();
    localStorage.removeItem('mock_user_session');
    setUser(null);
  };

  const refreshSession = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (USE_WORKSPACE && !APP_CONFIG.USE_MOCK_GLOBAL) {
        await hydrateWorkspaceSession({
          silent: opts?.silent !== false,
        });
      }
    },
    [hydrateWorkspaceSession],
  );

  const isAuthenticated = user !== null;
  const userRole = user?.role || UserRole.GUEST;
  const isProfileComplete = resolveProfileComplete(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        login,
        logout,
        refreshSession,
        isAuthenticated,
        isLoading,
        isProfileComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
