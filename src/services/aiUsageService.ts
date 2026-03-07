import { AIUsageLog } from '../types/index';
import { DevDatabase } from '../utils/devDatabase';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';

const USD_TO_IDR_RATE = 16300;
const MODEL_PRICING_USD_PER_1M_TOKENS: Record<string, { input: number, output: number }> = {
    'gemini-3-pro-preview': { input: 2.0, output: 4.0 },
    'gemini-3-flash-preview': { input: 0.2, output: 0.4 },
    'gemini-3-flash-lite-latest': { input: 0.1, output: 0.2 },
    'default': { input: 1.0, output: 2.0 } 
};

export const AIUsageService = {

    logCall: async (data: Omit<AIUsageLog, 'id' | 'timestamp' | 'promptTokens' | 'completionTokens' | 'totalTokens' | 'costUSD' | 'costIDR'>) => {
        
        const estimateTokens = (text: string): number => Math.ceil((text || '').length / 4);

        const promptTokens = estimateTokens(data.prompt);
        const completionTokens = estimateTokens(data.response);
        const totalTokens = promptTokens + completionTokens;

        const pricing = MODEL_PRICING_USD_PER_1M_TOKENS[data.model] || MODEL_PRICING_USD_PER_1M_TOKENS['default'];
        const inputCost = (promptTokens / 1000000) * pricing.input;
        const outputCost = (completionTokens / 1000000) * pricing.output;
        const costUSD = inputCost + outputCost;
        const costIDR = costUSD * USD_TO_IDR_RATE;

        const logEntry: AIUsageLog = {
            id: `AI-LOG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            ...data,
            promptTokens,
            completionTokens,
            totalTokens,
            costUSD,
            costIDR
        };
        
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('ai_usage_logs', logEntry);
        } else if (supabase) {
            await supabase.from('ai_usage_logs').insert(logEntry);
        }
    },

    getLogs: async (): Promise<AIUsageLog[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                const logs = await DevDatabase.getAll<AIUsageLog>('ai_usage_logs');
                return logs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            } catch (e) {
                return [];
            }
        }

        if (!supabase) return [];
        const { data } = await supabase.from('ai_usage_logs').select('*').order('timestamp', { ascending: false });
        return data || [];
    }
};