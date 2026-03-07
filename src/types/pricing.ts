
import { LifecycleStage, ServiceLevel } from './access';

export type PricingRuleType = 'EARLY_BIRD' | 'LAST_MINUTE' | 'MEMBER_TIER' | 'BULK_VOLUME' | 'LOYALTY_REWARD';

export interface AbacCondition {
    // Identity & Access
    targetLifecycle?: LifecycleStage[]; // e.g. ['CERTIFIED', 'FACILITATOR']
    targetServiceLevel?: ServiceLevel[]; // e.g. ['VIP']
    targetTags?: string[]; // e.g. ['FOUNDER', 'HIGH_NET_WORTH']
    
    // Demographics & Geography
    targetRegions?: ('US' | 'ID' | 'SG')[]; // NEW: Regional pricing
    targetCompanies?: string[]; // NEW: Corporate specific (e.g. "BCA", "Pertamina")
    
    // Engagement & History
    minEngagementScore?: number; // e.g. 80+
    minTenureMonths?: number; // NEW: Loyalty check (e.g. Member > 2 years)
    
    // Time & Product Scope
    dateStart?: string;
    dateEnd?: string;
    targetProductIds?: string[];
    minQuantity?: number;
}

export interface BudgetConfig {
    maxBudget: number; // Absolute amount (e.g., 50.000.000 IDR)
    currentSpend: number; // Real-time usage tracking
    autoDisableOnDepletion: boolean;
}

export interface PricingRule {
    id: string;
    name: string;
    description?: string;
    type: PricingRuleType;
    priority: number; 
    isActive: boolean;
    isStackable: boolean;
    
    // NEW: Attribute-Based Access Control logic
    condition: AbacCondition;
    
    // NEW: Financial Controls
    budget: BudgetConfig;

    action: {
        type: 'PERCENTAGE_OFF' | 'FIXED_OFF' | 'FIXED_PRICE';
        value: number;
    };
}

export interface PriceCalculationResult {
    originalPrice: number;
    finalPrice: number;
    appliedRules: PricingRule[];
    totalDiscountAmount: number;
    isDiscounted: boolean;
}

export interface DiscountFinancialLog {
    id: string;
    transactionId: string; // Link to sales transaction
    ruleId: string;
    ruleName: string;
    userId: string;
    productId: string;
    productPrice: number;
    discountAmount: number;
    timestamp: string;
}
