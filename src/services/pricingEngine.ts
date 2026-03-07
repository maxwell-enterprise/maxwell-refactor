
import { Product } from '../types/index';
import { UserEntitlements } from '../types/access';
import { PricingRule, PriceCalculationResult, DiscountFinancialLog, AbacCondition } from '../types/pricing';
import { APP_CONFIG } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';

// INITIAL SEED
const SEED_RULES: PricingRule[] = [
    {
        id: 'RULE-VIP-ABAC',
        name: 'VIP Founder Benefit',
        description: 'Auto-applied for Certified members with Founder tag',
        type: 'MEMBER_TIER',
        priority: 10,
        isActive: true,
        isStackable: true,
        condition: {
            targetLifecycle: ['CERTIFIED', 'FACILITATOR'],
            targetTags: ['FOUNDER', 'PARTNER'],
            minEngagementScore: 50
        },
        budget: {
            maxBudget: 100000000, 
            currentSpend: 15000000,
            autoDisableOnDepletion: true
        },
        action: { type: 'PERCENTAGE_OFF', value: 15 }
    },
    {
        id: 'RULE-ENGAGEMENT',
        name: 'High Engagement Reward',
        description: 'For users with score > 80',
        type: 'LOYALTY_REWARD',
        priority: 5,
        isActive: true,
        isStackable: false,
        condition: {
            minEngagementScore: 80
        },
        budget: {
            maxBudget: 50000000,
            currentSpend: 0,
            autoDisableOnDepletion: true
        },
        action: { type: 'FIXED_OFF', value: 500000 }
    }
];

export const PricingEngine = {
    
    // --- CRUD ---
    getRules: async (): Promise<PricingRule[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                if (await DevDatabase.isEmpty('pricing_rules')) {
                    await DevDatabase.bulkAdd('pricing_rules', SEED_RULES);
                    return SEED_RULES;
                }
                return await DevDatabase.getAll<PricingRule>('pricing_rules');
            } catch(e) { return SEED_RULES; }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('pricing_rules').select('*');
        return data || [];
    },

    saveRule: async (rule: PricingRule): Promise<void> => {
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('pricing_rules', rule);
            return;
        }
        if (!supabase) return;
        await supabase.from('pricing_rules').upsert(rule);
    },

    deleteRule: async (id: string): Promise<void> => {
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.delete('pricing_rules', id);
            return;
        }
        if (!supabase) return;
        await supabase.from('pricing_rules').delete().eq('id', id);
    },

    // --- CORE ABAC LOGIC ---
    evaluateABAC: (condition: AbacCondition, userContext?: UserEntitlements): boolean => {
        if (!userContext) {
            // Guest logic: Only allow rules with NO specific requirements
            const hasReqs = condition.targetLifecycle?.length || 
                            condition.targetTags?.length || 
                            condition.minEngagementScore || 
                            condition.targetCompanies?.length ||
                            condition.targetRegions?.length;
            return !hasReqs;
        }
        
        const attr = userContext.attributes;

        // 1. Lifecycle Check
        if (condition.targetLifecycle && condition.targetLifecycle.length > 0) {
            if (!condition.targetLifecycle.includes(attr.lifecycle)) return false;
        }

        // 2. Service Level Check
        if (condition.targetServiceLevel && condition.targetServiceLevel.length > 0) {
            if (!condition.targetServiceLevel.includes(attr.serviceLevel)) return false;
        }

        // 3. Tags Check (User must have AT LEAST ONE of the target tags)
        if (condition.targetTags && condition.targetTags.length > 0) {
            const hasTag = condition.targetTags.some(tag => attr.tags.includes(tag));
            if (!hasTag) return false;
        }

        // 4. Engagement Score Check
        if (condition.minEngagementScore && attr.engagement) {
            if (attr.engagement.communityReputationScore < condition.minEngagementScore && 
                attr.engagement.contentCompletionRate < condition.minEngagementScore) return false;
        }

        // 5. NEW: Region Check
        if (condition.targetRegions && condition.targetRegions.length > 0) {
            if (!condition.targetRegions.includes(attr.region)) return false;
        }

        // 6. NEW: Company Check (Mock implementation assuming User has company field in attributes or we infer)
        // Note: attributes currently doesn't store company name directly, we might need to fetch Member profile or store it in attributes.
        // For now, let's assume 'tags' might contain company ID or specific Company attribute exists. 
        // We will assume tags for simplicity: e.g. "CORP_BCA"
        if (condition.targetCompanies && condition.targetCompanies.length > 0) {
            // Check if user has a tag that matches "CORP_[COMPANY]"
            const hasCompanyTag = condition.targetCompanies.some(comp => 
                attr.tags.includes(`CORP_${comp.toUpperCase()}`) || attr.tags.includes(comp)
            );
            if (!hasCompanyTag) return false;
        }

        // 7. NEW: Tenure Check
        if (condition.minTenureMonths) {
            const joinDate = new Date(attr.joinDate);
            const now = new Date();
            const months = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
            if (months < condition.minTenureMonths) return false;
        }

        return true;
    },

    // --- BUDGET CHECK ---
    checkBudget: (rule: PricingRule): boolean => {
        if (!rule.isActive) return false;
        if (rule.budget.autoDisableOnDepletion && rule.budget.currentSpend >= rule.budget.maxBudget) {
            console.warn(`[PRICING] Rule ${rule.name} exceeded budget. Skipping.`);
            return false;
        }
        return true;
    },

    // --- CALCULATION ---
    calculatePrice: (
        product: Product, 
        userContext: UserEntitlements | undefined | null, // Now takes full entitlements
        qty: number,
        activeRules: PricingRule[]
    ): PriceCalculationResult => {
        let currentPrice = product.priceIdr;
        const now = new Date();
        const appliedRules: PricingRule[] = [];

        // Sort by Priority
        const rules = [...activeRules].sort((a,b) => b.priority - a.priority);
        let hasExclusiveRuleApplied = false;

        for (const rule of rules) {
            // 0. Pre-flight Checks
            if (!PricingEngine.checkBudget(rule)) continue;
            if (hasExclusiveRuleApplied && !rule.isStackable) continue;

            let isMatch = true;

            // 1. Product & Time Scope
            if (rule.condition.targetProductIds?.length && !rule.condition.targetProductIds.includes(product.id)) isMatch = false;
            if (rule.condition.dateStart && new Date(rule.condition.dateStart) > now) isMatch = false;
            if (rule.condition.dateEnd && new Date(rule.condition.dateEnd) < now) isMatch = false;
            if (rule.condition.minQuantity && qty < rule.condition.minQuantity) isMatch = false;

            // 2. ABAC Evaluation (The Heavy Lifting)
            if (isMatch && !PricingEngine.evaluateABAC(rule.condition, userContext || undefined)) {
                isMatch = false;
            }

            // 3. Apply Discount
            if (isMatch) {
                let discountAmount = 0;
                if (rule.action.type === 'PERCENTAGE_OFF') {
                    discountAmount = currentPrice * (rule.action.value / 100);
                } else if (rule.action.type === 'FIXED_OFF') {
                    discountAmount = rule.action.value;
                } else if (rule.action.type === 'FIXED_PRICE') {
                    discountAmount = currentPrice - rule.action.value;
                }

                // Prevent negative price
                if (currentPrice - discountAmount < 0) discountAmount = currentPrice;

                // Apply
                currentPrice -= discountAmount;
                appliedRules.push(rule);

                if (!rule.isStackable) hasExclusiveRuleApplied = true;
            }
        }

        return {
            originalPrice: product.priceIdr,
            finalPrice: Math.round(currentPrice),
            appliedRules,
            totalDiscountAmount: product.priceIdr - Math.round(currentPrice),
            isDiscounted: currentPrice < product.priceIdr
        };
    },

    // --- FINANCIAL RECORDING (The "Engine") ---
    recordTransactionUsage: async (
        transactionId: string,
        userId: string,
        product: Product,
        calculation: PriceCalculationResult
    ) => {
        // 1. Log each rule usage
        for (const rule of calculation.appliedRules) {
            let specificDiscount = 0;
            
            // Re-calculate specific impact of this rule (simplified approximation for logging)
            if (rule.action.type === 'PERCENTAGE_OFF') {
                specificDiscount = product.priceIdr * (rule.action.value / 100); 
            } else if (rule.action.type === 'FIXED_OFF') {
                specificDiscount = rule.action.value;
            }
            
            // Cap at total discount
            specificDiscount = Math.min(specificDiscount, calculation.totalDiscountAmount);

            // 1. Create Log Entry
            const log: DiscountFinancialLog = {
                id: `DL-${Date.now()}-${Math.random()}`,
                transactionId,
                ruleId: rule.id,
                ruleName: rule.name,
                userId,
                productId: product.id,
                productPrice: product.priceIdr,
                discountAmount: specificDiscount,
                timestamp: new Date().toISOString()
            };

            if (APP_CONFIG.USE_MOCK) {
                await DevDatabase.add('discount_redemption_logs', log);
                
                // 2. Update Budget Spend (Atomic-like)
                const storedRules = await DevDatabase.getAll<PricingRule>('pricing_rules');
                const ruleToUpdate = storedRules.find(r => r.id === rule.id);
                if (ruleToUpdate) {
                    ruleToUpdate.budget.currentSpend += specificDiscount;
                    // Auto Disable Check
                    if (ruleToUpdate.budget.autoDisableOnDepletion && ruleToUpdate.budget.currentSpend >= ruleToUpdate.budget.maxBudget) {
                        ruleToUpdate.isActive = false;
                        console.log(`[PRICING ENGINE] Rule ${rule.name} budget exhausted. Auto-disabling.`);
                    }
                    await DevDatabase.add('pricing_rules', ruleToUpdate);
                }
            } else if (supabase) {
                await supabase.from('discount_redemption_logs').insert(log);
                await supabase.rpc('increment_rule_spend', { rule_id: rule.id, amount: specificDiscount });
            }
        }
    }
};
