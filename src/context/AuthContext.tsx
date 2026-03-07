
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, UserProfile } from '../types/index';
import { AuthService } from '../services/authService';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: UserProfile | null;
  userRole: UserRole;
  login: (role: UserRole, email?: string, provider?: 'google' | 'email') => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // SUPABASE SESSION LISTENER
  useEffect(() => {
      const initSession = async () => {
          if (APP_CONFIG.USE_MOCK_GLOBAL || !APP_CONFIG.FEATURES.AUTH) {
              // Check local storage for persistent mock session
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
                      provider: 'email'
                  };
                  setUser(profile);
              }

              const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
                  if (event === 'SIGNED_IN' && session) {
                      const sbUser = session.user;
                      const profile: UserProfile = {
                          id: sbUser.id,
                          email: sbUser.email!,
                          fullName: sbUser.user_metadata?.full_name || sbUser.email!,
                          role: (sbUser.user_metadata?.role as UserRole) || UserRole.MEMBER,
                          provider: 'email'
                      };
                      setUser(profile);
                  } else if (event === 'SIGNED_OUT') {
                      setUser(null);
                  }
                  setIsLoading(false);
              });

              return () => listener.subscription.unsubscribe();
          }
          setIsLoading(false);
      };
      initSession();
  }, []);

  const login = async (role: UserRole, email: string = 'user@gmail.com', provider: 'google' | 'email' | string = 'email') => {
    setIsLoading(true);
    
    // MOCK LOGIN PATH
    if (APP_CONFIG.USE_MOCK_GLOBAL || !APP_CONFIG.FEATURES.AUTH) {
        // Use the improved AuthService to find the REAL user based on email
        const { user: loggedInUser } = await AuthService.signInWithEmail(email);
        
        if (loggedInUser) {
            // Force role override only if explicitly requested and different (e.g. Dev switching)
            // But prefer the actual role from the DB if it matches the context
            const finalUser = { ...loggedInUser };
            
            // Persist mock session
            localStorage.setItem('mock_user_session', JSON.stringify(finalUser));
            setUser(finalUser);
        }
        setIsLoading(false);
        return;
    }

    // REAL LOGIN PATH (Supabase)
    await AuthService.signInWithEmail(email);
    // Note: User state update happens via onAuthStateChange listener
    setIsLoading(false);
  };

  const logout = async () => {
    await AuthService.signOut();
    localStorage.removeItem('mock_user_session');
    setUser(null);
  };

  const isAuthenticated = user !== null;
  const userRole = user?.role || UserRole.GUEST;

  return (
    <AuthContext.Provider value={{ user, userRole, login, logout, isAuthenticated, isLoading }}>
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
