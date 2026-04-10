
import { Discount, Product, UserRole } from '../types/index';
import { UserEntitlements } from '../types/access';
import { DISCOUNT_DATA } from '../constants';
import { APP_CONFIG, assertExternalApiMode, BackendMode } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { apiRequest } from '../repositories/api/apiClient';
import { PricingEngine } from './pricingEngine'; // Use Engine for ABAC
import { EntitlementService } from './entitlementService'; // To fetch user context

export interface DiscountRedemptionLog {
    id: string;
    discountCode: string;
    orderAmount: number;
    discountAmount: number;
    userId?: string;
    timestamp: string;
}

const SEED_LOGS: DiscountRedemptionLog[] = [
    { id: 'RED-1', discountCode: 'WELCOME20', orderAmount: 30000000, discountAmount: 6000000, userId: 'M002', timestamp: '2024-03-01T10:00:00Z' }
];

const shouldUseApi = () =>
    !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.OPS === 'API';

const getDiscountMode = (): BackendMode =>
    shouldUseApi() ? 'API' : APP_CONFIG.USE_MOCK ? 'MOCK' : 'SUPABASE';

export const DiscountService = {
  
  getDiscounts: async (): Promise<Discount[]> => {
      assertExternalApiMode('Discount vouchers', getDiscountMode());
      if (shouldUseApi()) {
          return await apiRequest<Discount[]>('/store/discounts');
      }

      if (APP_CONFIG.USE_MOCK) {
          try {
              if (await DevDatabase.isEmpty('discounts')) {
                  await DevDatabase.bulkAdd('discounts', DISCOUNT_DATA);
                  return DISCOUNT_DATA;
              }
              return await DevDatabase.getAll<Discount>('discounts');
          } catch(e) { return DISCOUNT_DATA; }
      }
      if (!supabase) return DISCOUNT_DATA;
      const { data } = await supabase.from('discounts').select('*');
      return data || [];
  },

  createDiscount: async (discount: Discount): Promise<void> => {
      assertExternalApiMode('Discount vouchers', getDiscountMode());
      if (shouldUseApi()) {
          await apiRequest<void>(`/store/discounts/${encodeURIComponent(discount.id)}`, {
              method: 'PUT',
              body: JSON.stringify(discount)
          });
          return;
      }

      if (APP_CONFIG.USE_MOCK) {
          await DevDatabase.add('discounts', discount);
          return;
      }
      if (!supabase) return;
      await supabase.from('discounts').insert(discount);
  },

  // NEW: Support updating discount
  upsertDiscount: async (discount: Discount): Promise<void> => {
      assertExternalApiMode('Discount vouchers', getDiscountMode());
      if (shouldUseApi()) {
          await apiRequest<void>(`/store/discounts/${encodeURIComponent(discount.id)}`, {
              method: 'PUT',
              body: JSON.stringify(discount)
          });
          return;
      }

      if (APP_CONFIG.USE_MOCK) {
          await DevDatabase.add('discounts', discount);
          return;
      }
      if (!supabase) return;
      await supabase.from('discounts').upsert(discount);
  },

  deleteDiscount: async (id: string): Promise<void> => {
      assertExternalApiMode('Discount vouchers', getDiscountMode());
      if (shouldUseApi()) {
          await apiRequest<void>(`/store/discounts/${encodeURIComponent(id)}`, {
              method: 'DELETE'
          });
          return;
      }

      if (APP_CONFIG.USE_MOCK) {
          await DevDatabase.delete('discounts', id);
          return;
      }

      if (!supabase) return;
      await supabase.from('discounts').delete().eq('id', id);
  },

  findByCode: async (code: string): Promise<Discount | undefined> => {
    // Now async to fetch from DB
    const all = await DiscountService.getDiscounts();
    return all.find(d => d.code === code.toUpperCase());
  },

  // Refactored to be Async for Context Fetching
  isValid: async (discount: Discount, userRole: UserRole, userId?: string): Promise<{ valid: boolean; reason?: string }> => {
    const now = new Date();
    if (new Date(discount.validFrom) > now) return { valid: false, reason: 'Promotion has not started yet.' };
    if (new Date(discount.validUntil) < now) return { valid: false, reason: 'Promotion has expired.' };
    if (discount.maxUsageLimit && discount.currentUsageCount >= discount.maxUsageLimit) return { valid: false, reason: 'Voucher usage limit reached.' };
    if (discount.maxBudgetLimit && discount.currentBudgetBurned >= discount.maxBudgetLimit) return { valid: false, reason: 'Promo budget exhausted.' };
    
    // Legacy Scope check
    if (discount.scope === 'USER_ROLE_SPECIFIC' && discount.targetIds && !discount.targetIds.includes(userRole)) {
         return { valid: false, reason: `Exclusive for ${discount.targetIds.join(', ')}s only.` };
    }

    // NEW: ABAC Check using Pricing Engine logic
    if (discount.conditions && userId) {
        const userEntitlements = await EntitlementService.getUserEntitlements(userId);
        if (userEntitlements) {
            // Casting to any to bridge type mismatch between general AbacCondition (string[]) and strict Pricing AbacCondition (Enum[])
            const isEligible = PricingEngine.evaluateABAC(discount.conditions as any, userEntitlements);
            if (!isEligible) {
                return { valid: false, reason: 'You do not meet the criteria for this voucher.' };
            }
        }
    }

    return { valid: true };
  },

  calculateDiscount: (discount: Discount, productPrice: number, qty: number, productCategory?: string, productId?: string): number => {
    let isApplicable = false;
    if (discount.scope === 'GLOBAL' || discount.scope === 'ABAC_COMPLEX') isApplicable = true; // Assume ABAC verified in isValid
    if (discount.scope === 'CATEGORY_SPECIFIC' && productCategory && discount.targetIds?.includes(productCategory)) isApplicable = true;
    if (discount.scope === 'EVENT_SPECIFIC' && productId && discount.targetIds?.includes(productId)) isApplicable = true;
    if (discount.scope === 'Product_SPECIFIC' && productId && discount.targetIds?.includes(productId)) isApplicable = true;

    if (!isApplicable) return 0;
    if (discount.type === 'BUNDLE_VOLUME' && (!discount.minQty || qty < discount.minQty)) return 0;

    let discountAmount = 0;
    if (discount.type === 'FIXED_AMOUNT') {
        discountAmount = discount.value; 
    } else if (discount.type === 'PERCENTAGE' || discount.type === 'BUNDLE_VOLUME') {
        discountAmount = productPrice * (discount.value / 100);
    }
    return Math.min(discountAmount, productPrice);
  },

  recordRedemption: async (code: string, orderAmount: number, discountAmount: number, userId?: string) => {
      const log: DiscountRedemptionLog = {
          id: `RED-${Date.now()}`,
          discountCode: code,
          orderAmount,
          discountAmount,
          userId,
          timestamp: new Date().toISOString()
      };

      assertExternalApiMode('Discount vouchers', getDiscountMode());

      if (APP_CONFIG.USE_MOCK) {
          await DevDatabase.add('discount_redemption_logs', log);
          
          // Update actual record in DB
          const all = await DiscountService.getDiscounts();
          const discount = all.find(d => d.code === code);
          if(discount) {
              discount.currentUsageCount++;
              discount.currentBudgetBurned += discountAmount;
              await DevDatabase.add('discounts', discount);
          }
          return;
      }

      if (supabase) {
          await supabase.from('discount_redemption_logs').insert(log);
          await supabase.rpc('increment_discount_usage', { 
              code_input: code, 
              amount: discountAmount 
          });
      }
  },

  getLogs: async (): Promise<DiscountRedemptionLog[]> => {
      assertExternalApiMode('Discount vouchers', getDiscountMode());
      if (APP_CONFIG.USE_MOCK) {
          try {
              if (await DevDatabase.isEmpty('discount_redemption_logs')) await DevDatabase.bulkAdd('discount_redemption_logs', SEED_LOGS);
              return await DevDatabase.getAll<DiscountRedemptionLog>('discount_redemption_logs');
          } catch(e) { return SEED_LOGS; }
      }
      if (!supabase) return [];
      const { data } = await supabase.from('discount_redemption_logs').select('*').order('timestamp', { ascending: false });
      return data || [];
  }
};
