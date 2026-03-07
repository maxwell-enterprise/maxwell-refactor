
import { ICartRepository } from '../contracts';
import { ActiveCart } from '../../services/cartService';
import { supabase } from '../../lib/supabaseClient';

export class SupabaseCartRepository implements ICartRepository {
    async syncCart(cart: ActiveCart): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('active_shopping_carts').upsert(cart, { onConflict: 'sessionId' });
        if (error) throw error;
    }

    async getCarts(): Promise<ActiveCart[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('active_shopping_carts').select('*');
        if (error) return [];
        return data as ActiveCart[];
    }

    async getCartBySession(sessionId: string): Promise<ActiveCart | null> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('active_shopping_carts').select('*').eq('sessionId', sessionId).single();
        if (error) return null;
        return data as ActiveCart;
    }
}
