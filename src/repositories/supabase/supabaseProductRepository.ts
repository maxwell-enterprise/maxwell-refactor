
import { IProductRepository } from '../contracts';
import { Product } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';

export class SupabaseProductRepository implements IProductRepository {
    async getAll(): Promise<Product[]> {
        if (!supabase) throw new Error("Supabase client not initialized");

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('title', { ascending: true });

        if (error) {
            console.error("Supabase Product Fetch Error:", error);
            return [];
        }

        return data as Product[];
    }

    async getById(id: string): Promise<Product | null> {
        if (!supabase) throw new Error("Supabase client not initialized");

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data as Product;
    }

    async upsert(product: Product): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");

        // Supabase upsert requires the object to match the table schema.
        // We assume the 'product' object passed here matches the 'products' table columns (jsonb for variants/items).
        const { error } = await supabase.from('products').upsert(product);

        if (error) {
            console.error("Supabase Upsert Product Error:", error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
    }
}
