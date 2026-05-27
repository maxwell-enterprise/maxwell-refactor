
import { InitiatePaymentPayload, PaymentTransaction, PaymentMethodType, InstallmentSchedule } from '../types/index';
import { ConfigService } from './configService';
import { QueueService } from './queueService';
import { CommunicationService } from './communicationService'; 
import { OpsService } from './opsService'; 
import { DataService } from './dataService'; 
import { EventBus } from './eventBus'; 
import { INVENTORY_DATA } from '../constants';
import { RepositoryFactory } from './repositories/index';
import { apiRequest } from '../repositories/api/apiClient';
import { APP_CONFIG } from '../lib/config';
import { invalidateWalletSessionCache } from '../lib/walletSessionCache';
import { invalidateMemberZoneSessionCache } from '../lib/memberZoneSessionCache';

/** Fired after payment settles so Wallet / My Tickets can refetch without a full page reload. */
export const WALLET_REFRESH_EVENT = 'maxwell-wallet-refresh';

function dispatchWalletRefresh(): void {
  if (typeof window === 'undefined') return;
  invalidateWalletSessionCache();
  invalidateMemberZoneSessionCache();
  window.dispatchEvent(new CustomEvent(WALLET_REFRESH_EVENT));
}

const buildPaymentIdempotencyKey = (): string => {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) {
    return `pay-${g.crypto.randomUUID()}`;
  }
  return `pay-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const toIsoOrNow = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export type CheckoutConfig = {
  ppnRatePercent: number;
};

export const PaymentService = {
  getCheckoutConfig: async (): Promise<CheckoutConfig> => {
    const res = await apiRequest<CheckoutConfig>('/transactions/checkout-config', {
      method: 'GET',
      skipBackendFailureTracking: true,
    });
    return {
      ppnRatePercent: Number.isFinite(Number(res?.ppnRatePercent))
        ? Math.max(0, Math.min(100, Number(res.ppnRatePercent)))
        : 0,
    };
  },

  updateCheckoutConfig: async (
    patch: CheckoutConfig,
  ): Promise<CheckoutConfig> => {
    const res = await apiRequest<CheckoutConfig>('/transactions/checkout-config', {
      method: 'PATCH',
      body: JSON.stringify({
        ppnRatePercent: patch.ppnRatePercent,
      }),
    });
    return {
      ppnRatePercent: Number.isFinite(Number(res?.ppnRatePercent))
        ? Math.max(0, Math.min(100, Number(res.ppnRatePercent)))
        : 0,
    };
  },

  initiateTransaction: async (
    payload: InitiatePaymentPayload,
  ): Promise<{ transaction: PaymentTransaction; snapToken: string }> => {
    // Client-side stock checks are skipped when Nest is the payment backend — snap/checkout
    // validates on the server and avoids two full catalog fetches before every pay click.
    const skipClientStockCheck =
      !APP_CONFIG.USE_MOCK && APP_CONFIG.DOMAINS.PAYMENTS === 'API';

    if (!skipClientStockCheck) {
    const [allEvents, allProducts] = await Promise.all([
      DataService.getEvents(),
      DataService.getProducts(),
    ]);

    for (const item of payload.items) {
        // A. Physical Goods Check (Warehouse)
        const productDef = allProducts.find((p) => p.id === item.id);
        
        if (productDef) {
            // Find specific variant items if variant selected
            let productItems = productDef.items;
            if (item.variantId) {
                const v = productDef.variants?.find(v => v.id === item.variantId);
                if (v && v.items.length > 0) productItems = v.items;
            }

            for (const pItem of productItems) {
                // If it's a TICKET, check Event Tier Quota (Shared Inventory)
                if (pItem.type === 'TICKET' && pItem.meta?.eventId && pItem.meta?.targetTier) {
                    const evt = allEvents.find(e => e.id === pItem.meta.eventId);
                    const tier = evt?.tiers?.find(t => t.id === pItem.meta.targetTier);
                    
                    if (evt && tier) {
                        const sold = tier.quotaSold || 0;
                        const needed = pItem.quantity * item.quantity;
                        
                        if (sold + needed > tier.quota) {
                            throw new Error(`Sold Out: ${evt.name} (${tier.name}) has insufficient seats.`);
                        }
                    }
                } 
                // If Physical, we assume Warehouse/QueueService handles it via SKU
                else if (pItem.type === 'PHYSICAL' && pItem.meta?.skuRef) {
                     const reserved = await QueueService.reserveStock(pItem.meta.skuRef, pItem.quantity * item.quantity);
                     if (!reserved) {
                        throw new Error(`High Demand Alert: Item "${pItem.name}" just went out of stock!`);
                     }
                }
            }
        }
    }
    }

    // 2. CREATE PAYMENT IN BACKEND (BE is source of truth for amount)
    // Each line must include variantId when the cart has a variant so `itemsSnapshot` matches the
    // correct BOM (VIP vs Regular, etc.). Nest persists this and CheckoutEntitlementsService expands
    // the right lines — not the legacy client `EntitlementService.processTransactionEntitlements`.
    const checkoutItems = payload.items.map((i) => {
      const productId = typeof i.id === 'string' ? i.id.trim() : '';
      if (!productId) {
        throw new Error('Invalid checkout item: missing product id');
      }
      if (!Number.isFinite(i.quantity) || i.quantity <= 0) {
        throw new Error(`Invalid checkout quantity for product ${productId}`);
      }
      const normalizedVariantId = isNonEmptyString(i.variantId)
        ? i.variantId.trim()
        : undefined;
      return {
        productId,
        quantity: i.quantity,
        ...(normalizedVariantId ? { variantId: normalizedVariantId } : {}),
      };
    });

    const normalizedGuestEmail = payload.customerEmail.trim();
    if (!normalizedGuestEmail) {
      throw new Error('Missing customer email for checkout');
    }

    const normalizedAttributionSource = isNonEmptyString(payload.attributionSource)
      ? payload.attributionSource.trim()
      : undefined;

    const res = await apiRequest<{ transaction: any; snapToken: string }>(
      '/transactions/midtrans/snap',
      {
        method: 'POST',
        headers: {
          'x-idempotency-key': buildPaymentIdempotencyKey(),
        },
        body: JSON.stringify({
          items: checkoutItems,
          voucherCode: payload.discountCode,
          paymentMethod: payload.method,
          // Controller uses `guestEmail` when userId is null.
          guestEmail: normalizedGuestEmail,
          ...(normalizedAttributionSource
            ? { attributionSource: normalizedAttributionSource }
            : {}),
        }),
      },
    );

    const backendTx = res.transaction;

    const createdAt = backendTx?.createdAt ? new Date(backendTx.createdAt) : new Date();
    const expiryTime = backendTx?.paymentExpiresAt
      ? new Date(backendTx.paymentExpiresAt)
      : new Date();

    const tx: PaymentTransaction = {
      id: backendTx.id,
      orderId: backendTx.transactionNumber,
      amount: backendTx.subtotalAmount,
      discountAmount: backendTx.discountAmount,
      totalAmount: backendTx.totalAmount,
      paidAmount: backendTx.paidAmount ?? 0,
      balanceDue: Math.max(
        0,
        (backendTx.totalAmount ?? 0) - (backendTx.paidAmount ?? 0),
      ),
      method: backendTx.paymentMethod as PaymentMethodType,
      status: backendTx.paymentStatus as any,
      createdAt: createdAt.toISOString(),
      expiryTime: expiryTime.toISOString(),
      customerEmail: backendTx.guestEmail ?? payload.customerEmail,
      attributionSource: backendTx.attributionSource,
      installmentPlan: undefined,
      itemsSnapshot: payload.items,
      virtualAccountNumber: backendTx.virtualAccountNumber ?? undefined,
      qrisUrl: backendTx.qrisUrl ?? undefined,
      bankDetails: backendTx.bankDetails ?? undefined,
      proofOfPaymentUrl: backendTx.proofOfPaymentUrl ?? undefined,
    };

    return { transaction: tx, snapToken: res.snapToken };
  },

  /** Server must have ALLOW_PAYMENT_SIMULATION=true. Marks PENDING → PAID like a successful gateway. */
  simulateSettle: async (
    transactionId: string,
    customerEmail: string,
  ): Promise<{ paymentStatus: string; totalAmount: number; orderId: string }> => {
    const res = await apiRequest<{
      paymentStatus: string;
      totalAmount: number;
      orderId: string;
    }>('/transactions/simulate-settle', {
      method: 'POST',
      body: JSON.stringify({ transactionId, customerEmail }),
    });
    dispatchWalletRefresh();
    return res;
  },

  /**
   * After server-side settle (simulate-settle / free checkout / webhook), the payment is already PAID.
   * Do not poll public-status — that added up to ~5s of artificial delay. Only emit local UI side effects.
   */
  notifyLocalPaymentSuccess: async (
    transactionId: string,
    totalAmount: number,
    itemsSnapshot?: PaymentTransaction['itemsSnapshot'],
    customerEmail?: string,
    walletUserId?: string,
  ): Promise<void> => {
    if (itemsSnapshot && itemsSnapshot.length > 0 && customerEmail?.includes('@')) {
      let memberId = walletUserId?.trim() ?? '';
      let memberName = '';
      let memberPhone = '';
      if (!memberId) {
        const members = await DataService.getMembers();
        const member = members.find(
          (m) => m.email.toLowerCase() === customerEmail.trim().toLowerCase(),
        );
        memberId = member?.id ?? '';
        memberName = member?.name ?? '';
        memberPhone = member?.phone ?? '';
      }
      await EventBus.emit('PAYMENT_SUCCESS', {
        transactionId,
        orderId: transactionId,
        amount: totalAmount,
        memberId,
        name: memberName,
        member_name: memberName,
        email: customerEmail,
        phone: memberPhone,
        product_name: itemsSnapshot.map((i) => i.name).join(', '),
      });
    }
    dispatchWalletRefresh();
  },

  confirmManualTransfer: async (
    transactionId: string,
    _amountReceived: number,
    itemsSnapshot?: PaymentTransaction['itemsSnapshot'],
    customerEmail?: string,
    /** Logged-in workspace / app user id when CRM `Member` row is missing (wallet is keyed by auth user). */
    walletUserId?: string,
  ): Promise<PaymentTransaction> => {
    // SECURITY: don't allow user to "simulate paid" unless backend says PAID.
    // Midtrans webhook is async, so we poll briefly.
    if (!customerEmail || !customerEmail.includes('@')) {
      throw new Error('Missing customer email for payment status verification');
    }
    let backendTx: { paymentStatus?: string; totalAmount?: number } | null = null;
    const maxAttempts = 6;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const statusRes = await apiRequest<{
        paymentStatus: string;
        totalAmount: number;
      }>('/transactions/public-status', {
        method: 'POST',
        body: JSON.stringify({
          transactionId,
          customerEmail: customerEmail || '',
        }),
      });
      backendTx = { paymentStatus: statusRes.paymentStatus, totalAmount: statusRes.totalAmount };
      if (statusRes.paymentStatus === 'PAID') break;
      await new Promise((r) => setTimeout(r, attempt === 0 ? 80 : 200));
    }

    if (!backendTx || backendTx.paymentStatus !== 'PAID') {
      throw new Error('Payment not completed yet');
    }

    // Wallet entitlements are granted by the Nest backend (webhook / simulate-settle / Rp 0 checkout).
    if (itemsSnapshot && itemsSnapshot.length > 0) {
      const members = await DataService.getMembers();
      const member = members.find(
        (m) => m.email.toLowerCase() === (customerEmail || '').toLowerCase(),
      );
      const memberId =
        (walletUserId && walletUserId.trim()) || member?.id || '';
      await EventBus.emit('PAYMENT_SUCCESS', {
        transactionId,
        orderId: transactionId,
        amount: backendTx.totalAmount,
        memberId,
        name: member?.name ?? '',
        member_name: member?.name ?? '',
        email: member?.email ?? customerEmail ?? '',
        phone: member?.phone ?? '',
        product_name: itemsSnapshot.map((i) => i.name).join(', '),
      });
    }

    // Return a minimal transaction object for UI consumers.
    const totalPaid = Number(backendTx.totalAmount ?? 0);

    dispatchWalletRefresh();

    return {
      id: transactionId,
      orderId: transactionId,
      amount: totalPaid,
      discountAmount: 0,
      totalAmount: totalPaid,
      paidAmount: totalPaid,
      balanceDue: 0,
      method: 'BANK_TRANSFER',
      status: (backendTx.paymentStatus ?? 'PAID') as any,
      createdAt: toIsoOrNow(undefined),
      expiryTime: toIsoOrNow(undefined),
      customerEmail: customerEmail || '',
      itemsSnapshot,
      virtualAccountNumber: undefined,
      qrisUrl: undefined,
      bankDetails: undefined,
      proofOfPaymentUrl: undefined,
      attributionSource: undefined,
      installmentPlan: undefined,
      refunds: undefined,
    };
  },
  
  uploadPaymentProof: async (transactionId: string, file: File): Promise<boolean> => {
    // No BE endpoint for proof upload is currently wired.
    // Keep UX intact by acknowledging the action.
    console.log(`(Mock) Upload proof ${file.name} for ${transactionId}`);
    await new Promise((resolve) => setTimeout(resolve, 80));
    return true;
  },

  checkStatus: async (transactionId: string): Promise<PaymentTransaction['status']> => {
    const repo = RepositoryFactory.getPaymentRepository();
    const tx = await repo.getById(transactionId);
    return tx ? tx.status : 'PENDING';
  },

  getGatewayLogs: async (): Promise<PaymentTransaction[]> => {
      return await RepositoryFactory.getPaymentRepository().getAll();
  }
};
