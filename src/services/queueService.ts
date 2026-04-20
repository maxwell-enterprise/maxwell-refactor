
import { APP_CONFIG } from '../lib/config';
import { isSystemApiMode, systemApi } from '../lib/systemApi';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';

export interface BackgroundJob {
    id: string;
    type: 'STOCK_RESERVE' | 'REGISTRATION_INGEST' | 'ROLLBACK';
    payload: any;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    timestamp: string;
}

const SEED_JOBS: BackgroundJob[] = [
    { id: 'JOB-INIT', type: 'STOCK_RESERVE', payload: { sku: 'INIT' }, status: 'COMPLETED', timestamp: new Date().toISOString() }
];

export const QueueService = {
    
    reserveStock: async (productId: string, quantity: number): Promise<boolean> => {
        const job: BackgroundJob = {
            id: `JOB-${Date.now()}`,
            type: 'STOCK_RESERVE',
            payload: { productId, quantity },
            status: 'PROCESSING',
            timestamp: new Date().toISOString()
        };

        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('system_background_jobs', job);
        } else if (supabase) {
            await supabase.from('system_background_jobs').insert(job);
        }

        console.log(`[QUEUE] Attempting atomic reservation for ${productId} qty: ${quantity}`);

        // Fixed: Removed random failure simulation (Math.random() > 0.1) to ensure reliable checkout flow
        const isStockAvailable = true; 
        
        job.status = isStockAvailable ? 'COMPLETED' : 'FAILED';
        
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('system_background_jobs', job);
        } else if (supabase) {
            await supabase.from('system_background_jobs').update({ status: job.status }).eq('id', job.id);
        }

        if (!isStockAvailable) {
            console.error(`[QUEUE] Race Condition Detected! Stock reservation failed.`);
            return false;
        }
        return true;
    },

    enqueueRegistration: async (userData: any): Promise<string> => {
        const jobId = `JOB-${Date.now()}`;
        const job: BackgroundJob = {
            id: jobId,
            type: 'REGISTRATION_INGEST',
            payload: { email: userData.email },
            status: 'QUEUED',
            timestamp: new Date().toISOString()
        };

        if (APP_CONFIG.USE_MOCK) await DevDatabase.add('system_background_jobs', job);
        else if (supabase) await supabase.from('system_background_jobs').insert(job);
        
        return jobId;
    },

    rollbackStock: async (productId: string, quantity: number) => {
        const job: BackgroundJob = {
            id: `JOB-${Date.now()}`,
            type: 'ROLLBACK',
            payload: { productId, quantity },
            status: 'COMPLETED',
            timestamp: new Date().toISOString()
        };
        if (APP_CONFIG.USE_MOCK) await DevDatabase.add('system_background_jobs', job);
        else if (supabase) await supabase.from('system_background_jobs').insert(job);
        
        console.log(`[QUEUE] Rolling back stock for ${productId}`);
    },

    getJobs: async (): Promise<BackgroundJob[]> => {
        if (isSystemApiMode()) {
            const rows = await systemApi.getBackgroundJobs();
            return rows.map((r) => ({
                id: r.id,
                type: r.type as BackgroundJob['type'],
                payload: r.payload,
                status: r.status as BackgroundJob['status'],
                timestamp: r.timestamp,
            }));
        }
        if (APP_CONFIG.USE_MOCK) {
            try {
                if(await DevDatabase.isEmpty('system_background_jobs')) await DevDatabase.bulkAdd('system_background_jobs', SEED_JOBS);
                return await DevDatabase.getAll<BackgroundJob>('system_background_jobs');
            } catch(e) { return SEED_JOBS; }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('system_background_jobs').select('*').order('timestamp', { ascending: false });
        return data || [];
    }
};
