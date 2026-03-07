
import { IGamificationRepository } from '../contracts';
import { Badge, PointRule, UserGamificationProfile } from '../../types/gamification';
import { supabase } from '../../lib/supabaseClient';

export class SupabaseGamificationRepository implements IGamificationRepository {
    // --- BADGES ---
    async getBadges(): Promise<Badge[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('gamification_badges').select('*');
        if (error) {
            console.error("Supabase Badge Fetch Error:", error);
            return [];
        }
        return data as Badge[];
    }

    async upsertBadge(badge: Badge): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('gamification_badges').upsert(badge);
        if (error) throw error;
    }

    // --- RULES ---
    async getRules(): Promise<PointRule[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('gamification_rules').select('*');
        if (error) return [];
        return data as PointRule[];
    }

    async upsertRule(rule: PointRule): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('gamification_rules').upsert(rule);
        if (error) throw error;
    }

    // --- PROFILES ---
    async getProfile(userId: string): Promise<UserGamificationProfile | null> {
        if (!supabase) throw new Error("Supabase client not initialized");
        // In real Supabase, rank is usually a view or computed column.
        // For simplicity, we fetch the row. Rank might need separate calculation or view.
        const { data, error } = await supabase.from('gamification_profiles').select('*').eq('userId', userId).single();
        if (error) return null;

        // Note: Real-time rank calculation in SQL is better, but here we assume the FE or View handles it
        return data as UserGamificationProfile;
    }

    async getAllProfiles(): Promise<UserGamificationProfile[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('gamification_profiles').select('*');
        if (error) return [];
        return data as UserGamificationProfile[];
    }

    async upsertProfile(profile: UserGamificationProfile): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('gamification_profiles').upsert(profile);
        if (error) throw error;
    }
}
