
import { UserRole, UserProfile } from '../types/index';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import { resolveUserFromEmail } from '../lib/resolveUserFromEmail';

export interface AuthSession {
  user: UserProfile | null;
  token: string | null;
}

export const AuthService = {
  signInWithEmail: async (email: string): Promise<{ user: UserProfile | null, error: any }> => {
    
    // 1. MOCK STRATEGY (Intelligent Lookup) — same rules as Nest session resolution
    if (APP_CONFIG.USE_MOCK_GLOBAL || !APP_CONFIG.FEATURES.AUTH) {
        await new Promise(resolve => setTimeout(resolve, 800));
        const user = await resolveUserFromEmail(email);
        return { user, error: null };
    }

    // 2. REAL STRATEGY (Supabase Auth Magic Link)
    if (!supabase) return { user: null, error: "Supabase not configured" };
    
    const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
            emailRedirectTo: window.location.origin,
        },
    });

    return { user: null, error };
  },

  signOut: async () => {
    if (APP_CONFIG.USE_MOCK_GLOBAL || !APP_CONFIG.FEATURES.AUTH) {
        return { error: null };
    }
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getSession: async (): Promise<AuthSession> => {
      // Mock Check
      if (APP_CONFIG.USE_MOCK_GLOBAL || !APP_CONFIG.FEATURES.AUTH) {
          const stored = localStorage.getItem('sb-session');
          if (stored) return JSON.parse(stored);
          return { user: null, token: null };
      }

      if (!supabase) return { user: null, token: null };
      
      const { data } = await supabase.auth.getSession();
      if (data.session) {
          const sbUser = data.session.user;
          const role = (sbUser.user_metadata?.role as UserRole) || UserRole.MEMBER;
          const fullName = sbUser.user_metadata?.full_name || sbUser.email!;

          const userProfile: UserProfile = {
              id: sbUser.id,
              email: sbUser.email!,
              fullName: fullName,
              role: role,
              avatarUrl: sbUser.user_metadata?.avatar_url,
              provider: 'email'
          };
          return { user: userProfile, token: data.session.access_token };
      }
      return { user: null, token: null };
  }
};
