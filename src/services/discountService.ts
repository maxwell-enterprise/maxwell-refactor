
import { CartItem, Discount, Product, UserRole } from '../types/index';

function normalizeDiscountScope(scope: string | undefined): string {
  return String(scope ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
}
import { DISCOUNT_DATA } from '../constants';
import { APP_CONFIG, assertExternalApiMode, BackendMode } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { apiRequest } from '../repositories/api/apiClient';
import { PricingEngine } from './pricingEngine'; // Use Engine for ABAC
import { EntitlementService } from './entitlementService'; // To fetch user context
import { UserVoucherService } from './userVoucherService';

export interface DiscountRedemptionLog {
    id: string;
    discountCode: string;
    orderAmount: number;
    discountAmount: number;
    userId?: string;
    timestamp: string;
}

/** Discriminated result from `validateForCart`: precise reason on failure, applicable line-set on success. */
export type CartVoucherValidation =
  | { ok: true; reason?: undefined; applicableLines: number }
  | { ok: false; reason: string; code: VoucherFailureCode };

export type VoucherFailureCode =
  | 'EMPTY_CART'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'USAGE_EXHAUSTED'
  | 'BUDGET_EXHAUSTED'
  | 'ROLE_MISMATCH'
  | 'ABAC_INELIGIBLE'
  | 'PRODUCT_SCOPE_MISMATCH'
  | 'CATEGORY_SCOPE_MISMATCH'
  | 'EVENT_SCOPE_MISMATCH'
  | 'MIN_QTY_NOT_MET'
  | 'ALREADY_REDEEMED';

export type DeleteDiscountResult = {
  action: 'DELETED' | 'DEACTIVATED';
  code: string;
  message: string;
};

function formatDate(input: string): string {
  try {
    return new Date(input).toLocaleDateString();
  } catch {
    return input;
  }
}

function collectCartCategories(cart: CartItem[], products: Product[]): Set<string> {
  const out = new Set<string>();
  for (const item of cart) {
    const p = products.find((pp) => pp.id === item.productId);
    if (p?.category) out.add(p.category);
  }
  return out;
}

function collectCartProductIds(cart: CartItem[]): Set<string> {
  return new Set(cart.map((item) => item.productId));
}

function productHasEvent(product: Product, eventId: string): boolean {
  const matchInItems = (items: Product['items'] | undefined): boolean => {
    if (!Array.isArray(items)) return false;
    return items.some((entry) => {
      const meta = (entry?.meta ?? null) as { eventId?: string } | null;
      return meta?.eventId === eventId;
    });
  };
  if (matchInItems(product.items)) return true;
  if (product.hasVariants && Array.isArray(product.variants)) {
    for (const v of product.variants) {
      if (matchInItems(v.items)) return true;
    }
  }
  return false;
}

function collectCartEventIds(cart: CartItem[], products: Product[]): Set<string> {
  const ids = new Set<string>();
  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;
    const walk = (items: Product['items'] | undefined) => {
      if (!Array.isArray(items)) return;
      for (const entry of items) {
        const meta = (entry?.meta ?? null) as { eventId?: string } | null;
        if (meta?.eventId) ids.add(meta.eventId);
      }
    };
    walk(product.items);
    if (product.hasVariants && Array.isArray(product.variants)) {
      for (const v of product.variants) walk(v.items);
    }
  }
  return ids;
}

const SEED_LOGS: DiscountRedemptionLog[] = [
    { id: 'RED-1', discountCode: 'WELCOME20', orderAmount: 30000000, discountAmount: 6000000, userId: 'M002', timestamp: '2024-03-01T10:00:00Z' }
];

const shouldUseApi = () =>
    !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.OPS === 'API';

const getDiscountMode = (): BackendMode =>
    shouldUseApi() ? 'API' : APP_CONFIG.USE_MOCK ? 'MOCK' : 'SUPABASE';

/** Vouchers eligible for campaign dropdowns (not deactivated, in date range, quota/budget remaining). */
export function isDiscountSelectableForCampaign(
  discount: Discount,
  now: Date = new Date(),
): boolean {
  if (discount.conditions?.deactivatedBySystem === true) return false;
  if (new Date(discount.validFrom) > now) return false;
  if (new Date(discount.validUntil) < now) return false;
  if (
    discount.maxUsageLimit != null &&
    discount.currentUsageCount >= discount.maxUsageLimit
  ) {
    return false;
  }
  if (
    discount.maxBudgetLimit != null &&
    discount.currentBudgetBurned >= discount.maxBudgetLimit
  ) {
    return false;
  }
  return true;
}

export function filterSelectableDiscounts(discounts: Discount[]): Discount[] {
  return discounts.filter((d) => isDiscountSelectableForCampaign(d));
}

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

  deleteDiscount: async (id: string): Promise<DeleteDiscountResult> => {
      assertExternalApiMode('Discount vouchers', getDiscountMode());
      if (shouldUseApi()) {
          return apiRequest<DeleteDiscountResult>(`/store/discounts/${encodeURIComponent(id)}`, {
              method: 'DELETE'
          });
      }

      if (APP_CONFIG.USE_MOCK) {
          await DevDatabase.delete('discounts', id);
          return {
              action: 'DELETED',
              code: id,
              message: 'Voucher deleted.',
          };
      }

      if (!supabase) {
          return {
              action: 'DELETED',
              code: id,
              message: 'Voucher deleted.',
          };
      }
      await supabase.from('discounts').delete().eq('id', id);
      return {
          action: 'DELETED',
          code: id,
          message: 'Voucher deleted.',
      };
  },

  findByCode: async (code: string): Promise<Discount | undefined> => {
    // Now async to fetch from DB
    const all = await DiscountService.getDiscounts();
    const needle = code.trim().toUpperCase();
    return all.find((d) => String(d.code).trim().toUpperCase() === needle);
  },

  // Refactored to be Async for Context Fetching
  isValid: async (discount: Discount, userRole: UserRole, userId?: string): Promise<{ valid: boolean; reason?: string }> => {
    const now = new Date();
    if (discount.conditions?.deactivatedBySystem === true) {
      return { valid: false, reason: 'Voucher ini sudah dinonaktifkan oleh sistem.' };
    }
    if (new Date(discount.validFrom) > now) {
      return { valid: false, reason: `Promo belum berlaku sampai ${formatDate(discount.validFrom)}.` };
    }
    if (new Date(discount.validUntil) < now) {
      return { valid: false, reason: `Voucher sudah berakhir pada ${formatDate(discount.validUntil)}.` };
    }
    if (discount.maxUsageLimit && discount.currentUsageCount >= discount.maxUsageLimit) {
      return { valid: false, reason: 'Kuota voucher sudah habis.' };
    }
    if (discount.maxBudgetLimit && discount.currentBudgetBurned >= discount.maxBudgetLimit) {
      return { valid: false, reason: 'Budget promo voucher ini sudah habis.' };
    }

    if (discount.scope === 'USER_ROLE_SPECIFIC' && discount.targetIds && !discount.targetIds.includes(userRole)) {
      return { valid: false, reason: `Voucher ini khusus role: ${discount.targetIds.join(', ')}.` };
    }

    if (discount.conditions && userId) {
      const userEntitlements = await EntitlementService.getUserEntitlements(userId);
      if (userEntitlements) {
        // AbacCondition shape differs between domains (string[] vs enum[]); cast is intentional.
        const isEligible = PricingEngine.evaluateABAC(discount.conditions as any, userEntitlements);
        if (!isEligible) {
          return { valid: false, reason: 'Kamu belum memenuhi syarat untuk voucher ini.' };
        }
      }
    }

    if (userId && shouldUseApi()) {
      try {
        const eligibility = await UserVoucherService.checkVoucherEligibility(
          discount.code,
        );
        if (!eligibility.eligible) {
          return {
            valid: false,
            reason:
              eligibility.reason ??
              'Kamu sudah pernah menggunakan voucher ini (maksimal 1x per akun).',
          };
        }
      } catch (err) {
        console.warn(
          '[DiscountService] Voucher eligibility check failed:',
          err instanceof Error ? err.message : err,
        );
      }
    }

    return { valid: true };
  },

  /**
   * Full per-cart validation: returns explicit reason per scope so the UI can tell users why a voucher
   * was rejected (product/category/event mismatch, not just a generic "not applicable").
   * Always run AFTER `isValid` (time/usage/role/ABAC) for full semantics.
   */
  validateForCart: async (
    discount: Discount,
    cart: CartItem[],
    products: Product[],
    userRole: UserRole,
    userId?: string,
  ): Promise<CartVoucherValidation> => {
    if (cart.length === 0) {
      return { ok: false, code: 'EMPTY_CART', reason: 'Keranjang masih kosong. Tambahkan produk dulu sebelum memakai voucher.' };
    }

    const baseValidity = await DiscountService.isValid(discount, userRole, userId);
    if (!baseValidity.valid) {
      const reason = baseValidity.reason ?? 'Voucher tidak berlaku.';
      const code: VoucherFailureCode =
        reason.toLowerCase().includes('sudah pernah')
          ? 'ALREADY_REDEEMED'
          : reason.includes('habis')
            ? reason.includes('Budget')
              ? 'BUDGET_EXHAUSTED'
              : 'USAGE_EXHAUSTED'
            : reason.toLowerCase().includes('belum berlaku')
              ? 'NOT_STARTED'
              : reason.toLowerCase().includes('berakhir')
                ? 'EXPIRED'
                : reason.toLowerCase().includes('role')
                  ? 'ROLE_MISMATCH'
                  : 'ABAC_INELIGIBLE';
      return { ok: false, code, reason };
    }

    const scope = normalizeDiscountScope(discount.scope);
    const targets = Array.isArray(discount.targetIds) ? discount.targetIds : [];

    if (scope === 'PRODUCT_SPECIFIC') {
      const cartProductIds = collectCartProductIds(cart);
      const hasTarget = targets.some((id) => cartProductIds.has(id));
      if (!hasTarget) {
        const titles = targets
          .map((id) => products.find((p) => p.id === id)?.title)
          .filter((t): t is string => !!t);
        const targetLabel = titles.length > 0 ? titles.join(', ') : targets.join(', ');
        return {
          ok: false,
          code: 'PRODUCT_SCOPE_MISMATCH',
          reason: targetLabel
            ? `Voucher ${discount.code} hanya berlaku untuk produk: ${targetLabel}. Tambahkan produk tersebut ke keranjangmu.`
            : `Voucher ${discount.code} tidak berlaku untuk produk di keranjangmu.`,
        };
      }
    }

    if (scope === 'CATEGORY_SPECIFIC') {
      const cartCategories = collectCartCategories(cart, products);
      const hasTarget = targets.some((cat) => cartCategories.has(cat));
      if (!hasTarget) {
        return {
          ok: false,
          code: 'CATEGORY_SCOPE_MISMATCH',
          reason: `Voucher ${discount.code} hanya berlaku untuk kategori: ${targets.join(', ')}.`,
        };
      }
    }

    if (scope === 'EVENT_SPECIFIC') {
      const cartProductIds = collectCartProductIds(cart);
      const cartEventIds = collectCartEventIds(cart, products);
      const matchByProductId = targets.some((id) => cartProductIds.has(id));
      const matchByEventId = targets.some((id) => cartEventIds.has(id));
      if (!matchByProductId && !matchByEventId) {
        return {
          ok: false,
          code: 'EVENT_SCOPE_MISMATCH',
          reason: `Voucher ${discount.code} hanya berlaku untuk event tertentu.`,
        };
      }
    }

    if (discount.type === 'BUNDLE_VOLUME' && discount.minQty) {
      const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
      if (totalQty < discount.minQty) {
        return {
          ok: false,
          code: 'MIN_QTY_NOT_MET',
          reason: `Minimum pembelian ${discount.minQty} item untuk pakai voucher ${discount.code}.`,
        };
      }
    }

    let applicableLines = 0;
    for (const item of cart) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;

      const unit = (() => {
        if (product.hasVariants && item.variantId) {
          const v = product.variants?.find((vv) => vv.id === item.variantId);
          if (v) return v.priceIdr;
        }
        return product.priceIdr;
      })();

      const eventMatch =
        scope === 'EVENT_SPECIFIC' &&
        (targets.includes(product.id) ||
          targets.some((eventId) => productHasEvent(product, eventId)));

      // calculateDiscount only checks the literal targetIds; EVENT_SPECIFIC needs us to expand via product items.
      if (eventMatch) {
        applicableLines += 1;
        continue;
      }

      const lineDiscount = DiscountService.calculateDiscount(
        discount,
        unit,
        item.quantity,
        product.category,
        product.id,
        userRole,
      );
      if (lineDiscount > 0) applicableLines += 1;
    }

    if (applicableLines === 0) {
      return {
        ok: false,
        code: 'PRODUCT_SCOPE_MISMATCH',
        reason: `Voucher ${discount.code} tidak bisa diterapkan ke produk yang ada di keranjangmu.`,
      };
    }

    return { ok: true, applicableLines };
  },

  calculateDiscount: (
    discount: Discount,
    productPrice: number,
    qty: number,
    productCategory?: string,
    productId?: string,
    userRole?: UserRole,
  ): number => {
    const sc = normalizeDiscountScope(discount.scope);
    let isApplicable = false;
    if (sc === 'GLOBAL' || sc === 'ABAC_COMPLEX') isApplicable = true; // Assume ABAC verified in isValid
    if (
      sc === 'USER_ROLE_SPECIFIC' &&
      userRole &&
      discount.targetIds?.some(
        (t) => String(t).trim().toUpperCase() === String(userRole).trim().toUpperCase(),
      )
    ) {
      isApplicable = true;
    }
    if (sc === 'CATEGORY_SPECIFIC' && productCategory && discount.targetIds?.includes(productCategory)) isApplicable = true;
    if (sc === 'EVENT_SPECIFIC' && productId && discount.targetIds?.includes(productId)) isApplicable = true;
    if (sc === 'PRODUCT_SPECIFIC' && productId && discount.targetIds?.includes(productId)) isApplicable = true;
    // Legacy string from older seeds / imports
    if (
      !isApplicable &&
      discount.scope === 'Product_SPECIFIC' &&
      productId &&
      discount.targetIds?.includes(productId)
    ) {
      isApplicable = true;
    }

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

  /**
   * Server-side recording is the source of truth (Nest `recordVoucherRedemptionForPayment` + DB
   * trigger). The client must not double-count: this is intentionally a no-op kept for callers
   * that still reference the symbol so we fail loudly if something invokes it again.
   */
  recordRedemption: async (
    _code: string,
    _orderAmount: number,
    _discountAmount: number,
    _userId?: string,
  ): Promise<void> => {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(
        '[DiscountService.recordRedemption] No-op on the client; redemption is recorded server-side after PAID.',
      );
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
