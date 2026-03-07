
import { IPaymentRepository } from '../contracts';
import { PaymentTransaction } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';

export class SupabasePaymentRepository implements IPaymentRepository {
    async getAll(): Promise<PaymentTransaction[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('payment_transactions').select('*').order('createdAt', { ascending: false });
        if (error) {
            console.error("Supabase Payment Fetch Error:", error);
            return [];
        }
        return data as PaymentTransaction[];
    }

    async getById(id: string): Promise<PaymentTransaction | null> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('payment_transactions').select('*').eq('id', id).single();
        if (error) return null;
        return data as PaymentTransaction;
    }

    async create(transaction: PaymentTransaction): Promise<PaymentTransaction> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('payment_transactions').insert(transaction).select().single();
        if (error) throw error;
        return data as PaymentTransaction;
    }

    async update(transaction: PaymentTransaction): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('payment_transactions').upsert(transaction);
        if (error) throw error;
    }

    async updateStatus(id: string, status: string): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('payment_transactions').update({ status }).eq('id', id);
        if (error) throw error;
    }
}
