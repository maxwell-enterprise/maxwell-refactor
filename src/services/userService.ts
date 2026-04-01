
import { UserProfile, UserRole } from '../types/index';
import { APP_CONFIG, assertExternalApiMode } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { DataService } from './dataService'; 

// INITIAL SEED DATA BASED ON ORG CHART
const SEED_USERS: UserProfile[] = [
  // --- LEADERSHIP ---
  { id: 'admin-1', fullName: 'Super Admin', email: 'admin@maxwell.com', role: UserRole.SUPER_ADMIN, avatarUrl: 'https://ui-avatars.com/api/?name=Super+Admin&background=0f172a&color=fff', provider: 'email' },
  
  // --- FINANCE ---
  { id: 'fin-1', fullName: 'Steven (Finance)', email: 'steven.finance@maxwell.com', role: UserRole.FINANCE, avatarUrl: 'https://ui-avatars.com/api/?name=Steven+F&background=10b981&color=fff', provider: 'email' },
  
  // --- OPERATIONS & EVENTS ---
  { id: 'ops-1', fullName: 'Bella (Events Admin)', email: 'bella.events@maxwell.com', role: UserRole.OPERATIONS, avatarUrl: 'https://ui-avatars.com/api/?name=Bella+E&background=3b82f6&color=fff', provider: 'email' },
  
  // --- GATE KEEPERS (Scanners) ---
  // Matches IDs used in Event Gate Config
  { id: 'gate-1', fullName: 'Petugas Pintu Depan', email: 'gate1@maxwell.com', role: UserRole.GATE_KEEPER, avatarUrl: 'https://ui-avatars.com/api/?name=Gate+One&background=6366f1&color=fff', provider: 'email' },
  { id: 'gate-2', fullName: 'Petugas Pintu Media', email: 'gate2@maxwell.com', role: UserRole.GATE_KEEPER, avatarUrl: 'https://ui-avatars.com/api/?name=Gate+Two&background=8b5cf6&color=fff', provider: 'email' },
  
  // --- SALES ---
  { id: 'sales-1', fullName: 'Kezia (Sales)', email: 'kezia.sales@maxwell.com', role: UserRole.SALES, avatarUrl: 'https://ui-avatars.com/api/?name=Kezia+S&background=f59e0b&color=fff', provider: 'email' },
];

export const UserService = {
    getAllUsers: async (): Promise<UserProfile[]> => {
        assertExternalApiMode('Internal users', APP_CONFIG.USE_MOCK ? 'MOCK' : 'SUPABASE');
        if (APP_CONFIG.USE_MOCK) {
            try {
                // 1. Get Internal Staff from DB (or Seed)
                let staffUsers: UserProfile[] = [];
                if (await DevDatabase.isEmpty('sys_internal_users')) {
                    await DevDatabase.bulkAdd('sys_internal_users', SEED_USERS);
                    staffUsers = SEED_USERS;
                } else {
                    staffUsers = await DevDatabase.getAll<UserProfile>('sys_internal_users');
                }

                // 2. Fetch CRM Members
                const crmMembers = await DataService.getMembers();
                
                // 3. Transform Members into UserProfiles
                const memberUsers: UserProfile[] = crmMembers.map(m => {
                    let role = UserRole.MEMBER;
                    if (m.lifecycleStage === 'FACILITATOR') role = UserRole.FACILITATOR;
                    if (m.lifecycleStage === 'GUEST' || m.lifecycleStage === 'IDENTIFIED') role = UserRole.MEMBER;

                    return {
                        id: m.id,
                        fullName: m.name,
                        email: m.email,
                        role: role,
                        avatarUrl: `https://ui-avatars.com/api/?name=${m.name.replace(' ','+')}&background=random`,
                        provider: 'email'
                    };
                });

                const uniqueMembers = memberUsers.filter(m => !staffUsers.some(s => s.email === m.email));
                
                return [...staffUsers, ...uniqueMembers];

            } catch(e) { 
                console.error("UserService Error", e);
                return SEED_USERS; 
            }
        }

        if (!supabase) return [];
        const { data, error } = await supabase.from('sys_internal_users').select('*');
        if (error) throw error;
        return data || [];
    },

    updateUserRole: async (userId: string, newRole: UserRole): Promise<void> => {
        assertExternalApiMode('Internal users', APP_CONFIG.USE_MOCK ? 'MOCK' : 'SUPABASE');
        if (APP_CONFIG.USE_MOCK) {
            const users = await DevDatabase.getAll<UserProfile>('sys_internal_users');
            const user = users.find(u => u.id === userId);
            if (user) {
                user.role = newRole;
                await DevDatabase.add('sys_internal_users', user);
            }
            return;
        }

        if (!supabase) return;
        const { error } = await supabase.from('sys_internal_users').update({ role: newRole }).eq('id', userId);
        if (error) throw error;
    },

    updateUserProfile: async (userId: string, updates: Partial<UserProfile>): Promise<void> => {
        assertExternalApiMode('Internal users', APP_CONFIG.USE_MOCK ? 'MOCK' : 'SUPABASE');
        if (APP_CONFIG.USE_MOCK) {
            const users = await UserService.getAllUsers(); 
            const user = users.find(u => u.id === userId);
            
            if (user && (user.id.startsWith('admin') || user.id.startsWith('fin') || user.id.startsWith('ops') || user.id.startsWith('gate'))) {
                 const updatedUser = { ...user, ...updates };
                 await DevDatabase.add('sys_internal_users', updatedUser);
            } 
            else {
                 await DataService.updateMember(userId, { 
                     name: updates.fullName, 
                     email: updates.email 
                 });
            }
            return;
        }

        if (!supabase) return;
        const { error } = await supabase.from('sys_internal_users').update(updates).eq('id', userId);
        if (error) throw error;
    },

    addUser: async (user: UserProfile): Promise<void> => {
        assertExternalApiMode('Internal users', APP_CONFIG.USE_MOCK ? 'MOCK' : 'SUPABASE');
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('sys_internal_users', user);
            return;
        }

        if (!supabase) return;
        const { error } = await supabase.from('sys_internal_users').insert(user);
        if (error) throw error;
    }
};
