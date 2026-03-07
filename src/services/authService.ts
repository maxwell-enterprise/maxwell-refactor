
import { UserRole, UserProfile } from '../types/index';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import { DataService } from './dataService'; // To lookup members
import { UserService } from './userService'; // To lookup staff

export interface AuthSession {
  user: UserProfile | null;
  token: string | null;
}

export const AuthService = {
  signInWithEmail: async (email: string): Promise<{ user: UserProfile | null, error: any }> => {
    
    // 1. MOCK STRATEGY (Intelligent Lookup)
    if (APP_CONFIG.USE_MOCK_GLOBAL || !APP_CONFIG.FEATURES.AUTH) {
        await new Promise(resolve => setTimeout(resolve, 800));

        const normalizedEmail = email.toLowerCase().trim();

        // A. Check Internal Staff First
        const staff = await UserService.getAllUsers();
        const foundStaff = staff.find(u => u.email.toLowerCase() === normalizedEmail);

        if (foundStaff) {
            return { user: foundStaff, error: null };
        }

        // B. Check CRM Members
        const members = await DataService.getMembers();
        const foundMember = members.find(m => m.email.toLowerCase() === normalizedEmail);

        if (foundMember) {
            // Convert Member to UserProfile
            const userProfile: UserProfile = {
                id: foundMember.id,
                email: foundMember.email,
                fullName: foundMember.name,
                role: (foundMember.lifecycleStage === 'FACILITATOR') ? UserRole.FACILITATOR : UserRole.MEMBER,
                avatarUrl: `https://ui-avatars.com/api/?name=${foundMember.name.replace(' ','+')}&background=random`,
                provider: 'email'
            };
            return { user: userProfile, error: null };
        }

        // C. Fallback for Generic Dev/Test Emails (Legacy support)
        if (normalizedEmail.includes('admin')) {
            return { 
                user: { id: 'admin-1', fullName: 'Super Admin', email, role: UserRole.SUPER_ADMIN, provider: 'email' }, 
                error: null 
            };
        }

        // D. Fallback: If email format is valid but not found, auto-create a Guest (Simulation)
        // This mimics "Sign Up" flow in a mock environment
        if (normalizedEmail.includes('@')) {
             const guestUser: UserProfile = {
                id: `guest-${Date.now()}`,
                fullName: normalizedEmail.split('@')[0],
                email: normalizedEmail,
                role: UserRole.GUEST,
                avatarUrl: `https://ui-avatars.com/api/?name=${normalizedEmail.split('@')[0]}&background=eee`,
                provider: 'email'
            };
            return { user: guestUser, error: null };
        }

        return { user: null, error: "Invalid email format" };
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
