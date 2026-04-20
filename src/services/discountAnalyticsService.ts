
import { DiscountFinancialLog, PricingRule } from '../types/pricing';
import { DevDatabase } from '../utils/devDatabase';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import { PricingEngine } from './pricingEngine';

export interface RulePerformance {
    ruleId: string;
    ruleName: string;
    totalDiscountGiven: number;
    transactionsCount: number;
    revenueDriven: number; // Total price of items sold with this rule
    budgetUtilization: number; // Percentage
    roi: number; // Revenue / Discount
}

export const DiscountAnalyticsService = {
    
    getLogs: async (): Promise<DiscountFinancialLog[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                return await DevDatabase.getAll<DiscountFinancialLog>('discount_redemption_logs');
            } catch(e) { return []; }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('discount_redemption_logs').select('*');
        return data || [];
    },

    analyzePerformance: async (): Promise<RulePerformance[]> => {
        let logs: DiscountFinancialLog[] = [];
        let rules: PricingRule[] = [];
        try {
            [logs, rules] = await Promise.all([
                DiscountAnalyticsService.getLogs(),
                PricingEngine.getRules(),
            ]);
        } catch {
            return [];
        }

        const stats: Record<string, RulePerformance> = {};

        // Initialize from rules (so we see unused ones too)
        rules.forEach(rule => {
            stats[rule.id] = {
                ruleId: rule.id,
                ruleName: rule.name,
                totalDiscountGiven: 0,
                transactionsCount: 0,
                revenueDriven: 0,
                budgetUtilization: 0,
                roi: 0
            };
        });

        // Aggregate Logs
        logs.forEach(log => {
            if (!stats[log.ruleId]) return; // Rule might be deleted
            stats[log.ruleId].totalDiscountGiven += log.discountAmount;
            stats[log.ruleId].transactionsCount += 1;
            stats[log.ruleId].revenueDriven += log.productPrice; // Simple attribution
        });

        // Calculate Derived Metrics
        Object.values(stats).forEach(stat => {
            const rule = rules.find(r => r.id === stat.ruleId);
            if (rule) {
                stat.budgetUtilization = (stat.totalDiscountGiven / rule.budget.maxBudget) * 100;
                stat.roi = stat.totalDiscountGiven > 0 ? (stat.revenueDriven / stat.totalDiscountGiven) : 0;
            }
        });

        return Object.values(stats).sort((a,b) => b.totalDiscountGiven - a.totalDiscountGiven);
    }
};
