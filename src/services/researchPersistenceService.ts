import { ResearchResult } from '../types/research';
import { DevDatabase } from '../utils/devDatabase';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';

const STORE_NAME = 'research_results';

/**
 * Service to handle persistence of AI research data.
 */
export const ResearchPersistenceService = {

    /**
     * Saves or updates a research result for a specific member.
     */
    saveResult: async (result: ResearchResult): Promise<void> => {
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add(STORE_NAME, result);
            return;
        }

        if (!supabase) throw new Error("Supabase not configured");
        const { error } = await supabase.from('research_results').upsert(result);
        if (error) throw error;
    },

    /**
     * Retrieves a saved research result by member ID.
     */
    getResultByMemberId: async (memberId: string): Promise<ResearchResult | undefined> => {
        if (APP_CONFIG.USE_MOCK) {
            const db = await DevDatabase.open();
            return new Promise((resolve, reject) => {
                try {
                    const tx = db.transaction(STORE_NAME, 'readonly');
                    const store = tx.objectStore(STORE_NAME);
                    const request = store.get(memberId);
                    request.onsuccess = () => {
                        resolve(request.result as ResearchResult | undefined);
                    };
                    request.onerror = () => {
                        reject(request.error);
                    };
                } catch (e) {
                    console.error(`Error getting item from IndexedDB store '${STORE_NAME}':`, e);
                    reject(e);
                }
            });
        }

        if (!supabase) return undefined;
        const { data, error } = await supabase.from('research_results').select('*').eq('memberId', memberId).single();
        if (error) return undefined;
        return data as ResearchResult;
    },

    /**
     * Retrieves all saved research results.
     */
    getAllResults: async (): Promise<ResearchResult[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                return await DevDatabase.getAll<ResearchResult>(STORE_NAME);
            } catch (e) {
                console.error("Failed to fetch research results", e);
                return [];
            }
        }

        if (!supabase) return [];
        const { data, error } = await supabase.from('research_results').select('*');
        if (error) throw error;
        return data || [];
    }
};