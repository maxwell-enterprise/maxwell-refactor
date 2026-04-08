import { ResearchResult } from '../types/research';
import { DevDatabase } from '../utils/devDatabase';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import { DataService } from './dataService';

const STORE_NAME = 'research_results';
const RESEARCH_BLOCK_START = '\n<!-- AI_RESEARCH_RESULT_START -->\n';
const RESEARCH_BLOCK_END = '\n<!-- AI_RESEARCH_RESULT_END -->\n';

function extractEmbeddedResult(notes?: string): ResearchResult | undefined {
    if (!notes) return undefined;

    const startIndex = notes.indexOf(RESEARCH_BLOCK_START);
    const endIndex = notes.indexOf(RESEARCH_BLOCK_END);
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        return undefined;
    }

    const json = notes
        .slice(startIndex + RESEARCH_BLOCK_START.length, endIndex)
        .trim();

    if (!json) return undefined;

    try {
        return JSON.parse(json) as ResearchResult;
    } catch (error) {
        console.error('Failed to parse embedded research result from member notes', error);
        return undefined;
    }
}

function stripEmbeddedResult(notes?: string): string {
    if (!notes) return '';

    const startIndex = notes.indexOf(RESEARCH_BLOCK_START);
    const endIndex = notes.indexOf(RESEARCH_BLOCK_END);
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        return notes.trim();
    }

    return `${notes.slice(0, startIndex)}${notes.slice(endIndex + RESEARCH_BLOCK_END.length)}`.trim();
}

function withEmbeddedResult(notes: string | undefined, result: ResearchResult): string {
    const cleanNotes = stripEmbeddedResult(notes);
    const serializedResult = JSON.stringify(result);
    const suffix = `${RESEARCH_BLOCK_START}${serializedResult}${RESEARCH_BLOCK_END}`.trim();

    return cleanNotes ? `${cleanNotes}\n\n${suffix}` : suffix;
}

/**
 * Service to handle persistence of AI research data.
 */
export const ResearchPersistenceService = {
    mergeNotesWithResult: (notes: string | undefined, result: ResearchResult): string => {
        return withEmbeddedResult(notes, result);
    },

    stripResultFromNotes: (notes?: string): string => {
        return stripEmbeddedResult(notes);
    },

    /**
     * Saves or updates a research result for a specific member.
     */
    saveResult: async (result: ResearchResult): Promise<void> => {
        if (APP_CONFIG.EXTERNAL_API_ONLY) {
            const member = await DataService.getMembers().then(members =>
                members.find(memberItem => memberItem.id === result.memberId),
            );
            if (!member) throw new Error('Member not found');

            await DataService.updateMember(result.memberId, {
                notes: withEmbeddedResult(member.notes, result),
            });
            return;
        }

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
        if (APP_CONFIG.EXTERNAL_API_ONLY) {
            const member = await DataService.getMembers().then(members =>
                members.find(memberItem => memberItem.id === memberId),
            );
            return extractEmbeddedResult(member?.notes);
        }

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
        if (APP_CONFIG.EXTERNAL_API_ONLY) {
            const members = await DataService.getMembers();
            return members
                .map(member => extractEmbeddedResult(member.notes))
                .filter((result): result is ResearchResult => !!result);
        }

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
