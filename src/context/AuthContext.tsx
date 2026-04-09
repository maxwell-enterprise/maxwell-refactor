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
import { parseAppRoleString } from '../lib/appRole';
import {
  getWorkspaceToken,
  getWorkspaceTokenChangedEventName,
  setWorkspaceToken,
} from '../lib/workspaceAuthToken';
import { workspaceFetch } from '../lib/workspaceApi';

/** Identity + RBAC live in Nest (`/fe/auth/*`). UI only stores JWT and calls session. */
const USE_WORKSPACE =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_USE_WORKSPACE_AUTH !== 'false';

interface AuthContextType {
  user: UserProfile | null;
  userRole: UserRole;
  login: (
    role: UserRole,
    email?: string,
    provider?: 'google' | 'email',
  ) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateWorkspaceSession = useCallback(async () => {
    if (APP_CONFIG.USE_MOCK_GLOBAL || !USE_WORKSPACE) return;

    setIsLoading(true);
    const token = getWorkspaceToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
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
          } | null;
        }
      | undefined;
    let lastStatus: number | undefined;

    // Retry once to smooth rapid account-switch timing after OAuth callback.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const res = await workspaceFetch('/auth/session');
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
      setIsLoading(false);
      return;
    }

    if (!data?.user) {
      setWorkspaceToken(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    const email = data.user.email;
    setUser({
      id: data.user.id,
      email,
      fullName: data.user.name?.trim() || email,
      role: parseAppRoleString(data.user.role),
      avatarUrl: data.user.image || undefined,
      provider: 'email',
    });
    setIsLoading(false);
  }, []);

  // --- Nest JWT session (default) ---
  useEffect(() => {
    if (APP_CONFIG.USE_MOCK_GLOBAL || !USE_WORKSPACE) return;

    let cancelled = false;
    void (async () => {
      await hydrateWorkspaceSession();
      if (cancelled) return;
    })();

    const onTokenChanged = () => {
      void hydrateWorkspaceSession();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'maxwell_workspace_jwt') {
        void hydrateWorkspaceSession();
      }
    };
    window.addEventListener(getWorkspaceTokenChangedEventName(), onTokenChanged);
    window.addEventListener('storage', onStorage);
    const onOnline = () => {
      void hydrateWorkspaceSession();
    };
    const onFocus = () => {
      void hydrateWorkspaceSession();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener(
        getWorkspaceTokenChangedEventName(),
        onTokenChanged,
      );
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
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

  const refreshSession = useCallback(async () => {
    if (USE_WORKSPACE && !APP_CONFIG.USE_MOCK_GLOBAL) {
      await hydrateWorkspaceSession();
    }
  }, [hydrateWorkspaceSession]);

  const isAuthenticated = user !== null;
  const userRole = user?.role || UserRole.GUEST;

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
