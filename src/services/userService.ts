
import { UserProfile, UserRole } from '../types/index';
import { APP_CONFIG, assertExternalApiMode } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { DataService } from './dataService'; 
import { apiRequest } from '../repositories/api/apiClient';
import { parseAppRoleList, parseAppRoleString } from '../lib/appRole';

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
  { id: 'gate-1', fullName: 'Front Gate Scanner', email: 'gate1@maxwell.com', role: UserRole.GATE_KEEPER, avatarUrl: 'https://ui-avatars.com/api/?name=Gate+One&background=6366f1&color=fff', provider: 'email' },
  { id: 'gate-2', fullName: 'Media Gate Scanner', email: 'gate2@maxwell.com', role: UserRole.GATE_KEEPER, avatarUrl: 'https://ui-avatars.com/api/?name=Gate+Two&background=8b5cf6&color=fff', provider: 'email' },
  
  // --- SALES ---
  { id: 'sales-1', fullName: 'Kezia (Sales)', email: 'kezia.sales@maxwell.com', role: UserRole.SALES, avatarUrl: 'https://ui-avatars.com/api/?name=Kezia+S&background=f59e0b&color=fff', provider: 'email' },
];

export type GetAllUsersOptions = {
  /** If true, API failures (403, network, …) propagate instead of returning []. */
  rethrowApiError?: boolean;
};

export const UserService = {
    getAllUsers: async (opts?: GetAllUsersOptions): Promise<UserProfile[]> => {
        const internalUsersMode = APP_CONFIG.EXTERNAL_API_ONLY
            ? 'API'
            : (APP_CONFIG.USE_MOCK ? 'MOCK' : 'SUPABASE');

        assertExternalApiMode('Internal users', internalUsersMode);

        if (APP_CONFIG.EXTERNAL_API_ONLY) {
            try {
                const rows = await apiRequest<Array<{
                    id: string;
                    email: string;
                    fullName: string;
                    role: string;
                    roles?: string[];
                    customRole?: {
                        id: string;
                        name: string;
                        allowedFeatures: string[];
                        createdAt: string;
                        locked: true;
                    } | null;
                    activeCustomRoleId?: string | null;
                    avatarUrl?: string | null;
                    provider?: 'email' | 'google';
                }>>('/admin/internal-users');
                const list = Array.isArray(rows) ? rows : [];
                return list.map((r) => {
                    const roles = Array.isArray(r.roles) && r.roles.length > 0
                        ? r.roles.map((role) => parseAppRoleString(role))
                        : parseAppRoleList(r.role);
                    return {
                        id: r.id,
                        email: r.email,
                        fullName: r.fullName,
                        role: parseAppRoleString(r.role),
                        roles,
                        customRole: r.customRole ?? null,
                        activeCustomRoleId:
                          typeof r.activeCustomRoleId === 'string'
                            ? r.activeCustomRoleId
                            : null,
                        avatarUrl: r.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.fullName)}&background=random`,
                        provider: r.provider ?? 'email',
                    };
                });
            } catch (e) {
                console.error('UserService API-only fallback error', e);
                if (opts?.rethrowApiError) throw e;
                return [];
            }
        }

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
    },

    /** Batch-resolve Prisma workspace `User` rows (wallet owners / purchasers). */
    lookupWorkspaceUsers: async (ids: string[]): Promise<UserProfile[]> => {
        const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
        if (unique.length === 0) return [];

        if (APP_CONFIG.EXTERNAL_API_ONLY) {
            const q = new URLSearchParams({ ids: unique.join(',') });
            const rows = await apiRequest<
                Array<{ id: string; name: string; email: string; phone?: string | null }>
            >(`/wallet/workspace-users/lookup?${q.toString()}`);
            return (Array.isArray(rows) ? rows : []).map((row) => {
                const email = row.email?.trim() || '';
                const fullName =
                    row.name?.trim() ||
                    (email ? email.split('@')[0].replace(/[._-]+/g, ' ') : 'User');
                return {
                    id: row.id,
                    email,
                    fullName,
                    phone: row.phone?.trim() || undefined,
                    role: UserRole.MEMBER,
                    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
                    provider: 'email' as const,
                };
            });
        }

        if (APP_CONFIG.USE_MOCK) {
            const members = await DataService.getMembers();
            return members
                .filter((member) => unique.includes(member.id))
                .map((member) => ({
                    id: member.id,
                    email: member.email,
                    fullName: member.name,
                    phone: member.phone,
                    role: UserRole.MEMBER,
                    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`,
                    provider: 'email' as const,
                }));
        }

        return [];
    },
};
