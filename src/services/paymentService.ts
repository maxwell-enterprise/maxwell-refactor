
import { InitiatePaymentPayload, PaymentTransaction, PaymentMethodType, InstallmentSchedule } from '../types/index';
import { ConfigService } from './configService';
import { CampaignService } from './campaignService';
import { QueueService } from './queueService';
import { CommunicationService } from './communicationService'; 
import { OpsService } from './opsService'; 
import { DataService } from './dataService'; 
import { EntitlementService } from './entitlementService'; 
import { EventBus } from './eventBus'; 
import { INVENTORY_DATA } from '../constants';
import { RepositoryFactory } from './repositories/index';
import { apiRequest } from '../repositories/api/apiClient';

export const PaymentService = {
  
  initiateTransaction: async (
    payload: InitiatePaymentPayload,
  ): Promise<{ transaction: PaymentTransaction; snapToken: string }> => {
    // 1. BUSINESS LOGIC: Stock Reservation & SHARED INVENTORY CHECK
    const allEvents = await DataService.getEvents();

    for (const item of payload.items) {
        // A. Physical Goods Check (Warehouse)
        const productDef = (await DataService.getProducts()).find(p => p.id === item.id);
        
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

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. CREATE PAYMENT IN BACKEND (BE is source of truth for amount)
    // Endpoint creates a Midtrans Snap token so FE can open hosted payment page.
    const res = await apiRequest<{ transaction: any; snapToken: string }>(
      '/transactions/midtrans/snap',
      {
        method: 'POST',
        body: JSON.stringify({
          items: payload.items.map((i) => ({
            productId: i.id,
            quantity: i.quantity,
          })),
          voucherCode: payload.discountCode,
          paymentMethod: payload.method,
          // Controller uses `guestEmail` when userId is null.
          guestEmail: payload.customerEmail,
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
  
  confirmManualTransfer: async (
    transactionId: string,
    _amountReceived: number,
    itemsSnapshot?: PaymentTransaction['itemsSnapshot'],
  ): Promise<PaymentTransaction> => {
    // SECURITY: don't allow user to "simulate paid" unless backend says PAID.
    // Midtrans webhook is async, so we poll briefly.
    let backendTx: any = null;
    const maxAttempts = 12;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      backendTx = await apiRequest<any>(
        `/transactions/${encodeURIComponent(transactionId)}`,
      );
      if (backendTx?.paymentStatus === 'PAID') break;
      await new Promise((r) => setTimeout(r, 1500));
    }

    if (!backendTx || backendTx.paymentStatus !== 'PAID') {
      throw new Error('Payment not completed yet');
    }

    const members = await DataService.getMembers();
    const member = members.find(
      (m) => m.email.toLowerCase() === (backendTx.guestEmail ?? '').toLowerCase(),
    );

    if (member && itemsSnapshot && itemsSnapshot.length > 0) {
      await EntitlementService.processTransactionEntitlements(
        member.id,
        itemsSnapshot.map((i) => ({
          id: i.id,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      );
      await EventBus.emit('PAYMENT_SUCCESS', {
        transactionId: backendTx.id,
        orderId: backendTx.transactionNumber,
        amount: backendTx.totalAmount,
        memberId: member.id,
        name: member.name,
        member_name: member.name,
        email: member.email,
        phone: member.phone,
        product_name: itemsSnapshot.map((i) => i.name).join(', '),
      });
    }

    // Return a minimal transaction object for UI consumers.
    return {
      id: backendTx.id,
      orderId: backendTx.transactionNumber,
      amount: backendTx.subtotalAmount,
      discountAmount: backendTx.discountAmount,
      totalAmount: backendTx.totalAmount,
      paidAmount: backendTx.totalAmount,
      balanceDue: 0,
      method: backendTx.paymentMethod as PaymentMethodType,
      status: backendTx.paymentStatus as any,
      createdAt: new Date(backendTx.createdAt).toISOString(),
      expiryTime: backendTx.paymentExpiresAt
        ? new Date(backendTx.paymentExpiresAt).toISOString()
        : new Date().toISOString(),
      customerEmail: backendTx.guestEmail ?? '',
      itemsSnapshot,
      virtualAccountNumber: backendTx.virtualAccountNumber ?? undefined,
      qrisUrl: backendTx.qrisUrl ?? undefined,
      bankDetails: backendTx.bankDetails ?? undefined,
      proofOfPaymentUrl: undefined,
      attributionSource: backendTx.attributionSource,
      installmentPlan: undefined,
      refunds: undefined,
    };
  },
  
  uploadPaymentProof: async (transactionId: string, file: File): Promise<boolean> => {
    // No BE endpoint for proof upload is currently wired.
    // Keep UX intact by acknowledging the action.
    console.log(`(Mock) Upload proof ${file.name} for ${transactionId}`);
    await new Promise((resolve) => setTimeout(resolve, 800));
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
