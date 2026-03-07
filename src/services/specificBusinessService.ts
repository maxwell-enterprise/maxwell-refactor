
import { RoundTableSession, TaxInvoiceDetails, RoyaltySplit, YouthMetric } from '../types/business_specifics';
import { APP_CONFIG } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';

const SEED_YOUTH_DATA: YouthMetric[] = [
    { id: 'SCH-001', schoolName: 'SMA Negeri 1 Jakarta', contactPerson: 'Bpk. Budi', status: 'MOU_SIGNED', studentsImpacted: 120, programType: 'iChoose' },
    { id: 'SCH-002', schoolName: 'Universitas Pelita Harapan', contactPerson: 'Ibu Sarah', status: 'PROGRAM_ACTIVE', studentsImpacted: 450, programType: 'iLead' },
    { id: 'SCH-003', schoolName: 'Binus School', contactPerson: 'Mr. James', status: 'LEAD', studentsImpacted: 0, programType: 'iDo' },
];

export const SpecificBusinessService = {
    
    // --- ROUND TABLE ---
    startRoundTable: async (data: Omit<RoundTableSession, 'id' | 'createdAt' | 'status'>): Promise<RoundTableSession> => {
        const session: RoundTableSession = {
            id: `RT-${Date.now()}`,
            ...data,
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
        };

        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('round_table_sessions', session); // Ensure store exists in DevDatabase.ts upgrade
        } else if (supabase) {
            await supabase.from('round_table_sessions').insert(session);
        }
        return session;
    },

    getRoundTables: async (facilitatorId: string): Promise<RoundTableSession[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                const all = await DevDatabase.getAll<RoundTableSession>('round_table_sessions');
                return all.filter(s => s.facilitatorId === facilitatorId);
            } catch(e) { return []; }
        }
        return [];
    },

    // --- TAX INVOICE ---
    generateFakturPajak: async (details: TaxInvoiceDetails): Promise<void> => {
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('tax_invoices', details);
        }
        // In real app, integrate with E-Faktur API here
    },

    // --- ROYALTY SPLIT ---
    calculateAndSaveRoyalties: async (transactionId: string, totalAmount: number): Promise<RoyaltySplit> => {
        // Business Rule: 10% DT, 5% John, Rest Org
        const amountDT = totalAmount * 0.10;
        const amountJohn = totalAmount * 0.05;
        const amountOrg = totalAmount - amountDT - amountJohn;

        const split: RoyaltySplit = {
            sourceTransactionId: transactionId,
            amountDT,
            amountJohn,
            amountOrg,
            calculatedAt: new Date().toISOString()
        };

        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('royalty_splits', split);
        }
        return split;
    },

    // --- YOUTH ---
    getYouthMetrics: async (): Promise<YouthMetric[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                if(await DevDatabase.isEmpty('youth_metrics')) await DevDatabase.bulkAdd('youth_metrics', SEED_YOUTH_DATA);
                return await DevDatabase.getAll<YouthMetric>('youth_metrics');
            } catch(e) { return SEED_YOUTH_DATA; }
        }
        return [];
    }
};
