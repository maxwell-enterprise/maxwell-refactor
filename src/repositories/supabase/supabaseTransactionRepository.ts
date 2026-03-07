
import { ITransactionRepository, TransactionQueryParams } from '../contracts';
import { Transaction } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';
import { DataUtils } from '../../utils/dataUtils';

export class SupabaseTransactionRepository implements ITransactionRepository {

    async getAll(): Promise<Transaction[]> {
        return this.find();
    }

    // "Query Pushdown" implementation
    async find(params?: TransactionQueryParams): Promise<Transaction[]> {
        if (!supabase) throw new Error("Supabase client not initialized");

        let query = supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });

        // Apply SQL Filters
        if (params) {
            if (params.type) query = query.eq('type', params.type);
            if (params.status) query = query.eq('status', params.status);
            if (params.startDate) query = query.gte('date', params.startDate);
            if (params.endDate) query = query.lte('date', params.endDate);

            if (params.limit) {
                const from = params.offset || 0;
                const to = from + params.limit - 1;
                query = query.range(from, to);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error("Supabase Transaction Fetch Error:", error);
            return [];
        }
        return data as Transaction[];
    }

    async create(transaction: Transaction): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");

        // Remove ID if empty so Postgres can generate it (if using UUID v4 default)
        // Or generate here if client-side UUID is preferred for optimistic UI
        const newTx = { ...transaction };
        if (!newTx.id) {
            // Optional: Let Postgres handle it if column is DEFAULT gen_random_uuid()
            // But for consistency with Mock we can generate it
            // delete newTx.id;
        }

        const { error } = await supabase.from('transactions').insert(newTx);
        if (error) throw error;
    }

    async updateStatus(id: string, status: 'Pending' | 'Approved' | 'Paid'): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('transactions')
            .update({ status, updatedAt: DataUtils.nowISO() })
            .eq('id', id);
        if (error) throw error;
    }
}
