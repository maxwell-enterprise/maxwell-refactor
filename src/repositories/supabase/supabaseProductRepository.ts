
import {
  IProductRepository,
  ProductListQuery,
  ProductUpsertOptions,
} from '../contracts';
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

    async listProducts(
        query: ProductListQuery,
    ): Promise<{ data: Product[]; total: number }> {
        if (!supabase) throw new Error('Supabase client not initialized');

        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;

        let q = supabase.from('products').select('*', { count: 'exact' });

        const s = query.search?.trim();
        if (s) {
            q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
        }
        if (query.category) {
            q = q.eq('category', query.category);
        }
        if (typeof query.isActive === 'boolean') {
            q = q.eq('isActive', query.isActive);
        }

        const sortCol =
            query.sortBy === 'priceIdr'
                ? 'priceIdr'
                : query.sortBy === 'category'
                  ? 'category'
                  : 'title';
        const ascending = (query.sortOrder ?? 'asc') === 'asc';

        const { data, error, count } = await q
            .order(sortCol, { ascending })
            .range(from, to);

        if (error) {
            console.error('Supabase Product Page Fetch Error:', error);
            return { data: [], total: 0 };
        }

        return {
            data: (data ?? []) as Product[],
            total: count ?? 0,
        };
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

    async upsert(
        product: Product,
        _options?: ProductUpsertOptions,
    ): Promise<Product> {
        if (!supabase) throw new Error("Supabase client not initialized");

        // Supabase upsert requires the object to match the table schema.
        // We assume the 'product' object passed here matches the 'products' table columns (jsonb for variants/items).
        const { error } = await supabase.from('products').upsert(product);

        if (error) {
            console.error("Supabase Upsert Product Error:", error);
            throw error;
        }
        return product;
    }

    async delete(id: string): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
    }
}
