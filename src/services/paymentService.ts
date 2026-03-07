
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

export const PaymentService = {
  
  initiateTransaction: async (payload: InitiatePaymentPayload): Promise<PaymentTransaction> => {
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

    // 2. CONSTRUCT OBJECT
    const transactionId = `TRX-${Date.now()}`;
    const orderId = `ORD-${Math.floor(Math.random() * 10000)}`;
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);

    const paymentConfig = ConfigService.getPaymentConfig();

    // Partial Payment Logic
    let schedule: InstallmentSchedule[] = [];
    let initialPaymentAmount = payload.totalAmount;
    
    if (payload.isInstallment && payload.downPaymentAmount) {
        initialPaymentAmount = payload.downPaymentAmount;
        const balanceDue = payload.totalAmount - initialPaymentAmount;
        const monthlyAmount = Math.ceil(balanceDue / 3);
        
        for (let i = 1; i <= 3; i++) {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + i);
            schedule.push({
                id: `INS-${transactionId}-${i}`,
                dueDate: dueDate.toISOString(),
                amount: i === 3 ? (balanceDue - (monthlyAmount * 2)) : monthlyAmount, 
                status: 'PENDING'
            });
        }
    }

    let transaction: PaymentTransaction = {
      id: transactionId,
      orderId: orderId,
      amount: payload.subTotal,
      totalAmount: payload.totalAmount,
      paidAmount: 0, 
      balanceDue: payload.totalAmount, 
      
      method: payload.method,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      expiryTime: expiryDate.toISOString(),
      customerEmail: payload.customerEmail,
      attributionSource: payload.attributionSource,
      installmentPlan: schedule.length > 0 ? schedule : undefined,
      
      // PERSIST ITEMS so we know what to give them later
      itemsSnapshot: payload.items
    };

    if (payload.attributionSource) {
        CampaignService.trackConversion(payload.attributionSource, payload.totalAmount);
    }

    // Payment Method Specifics
    switch (payload.method) {
      case 'BANK_TRANSFER':
        const uniqueCode = Math.floor(Math.random() * 900) + 100;
        transaction = {
          ...transaction,
          uniqueCode: uniqueCode,
          bankDetails: {
            bankName: paymentConfig.bankName,
            accountNumber: paymentConfig.accountNumber,
            accountHolder: paymentConfig.accountHolder
          }
        };
        break;
      case 'VIRTUAL_ACCOUNT_BCA':
        transaction = { ...transaction, virtualAccountNumber: `8800${Math.floor(1000000000 + Math.random() * 9000000000)}` };
        break;
      case 'QRIS':
        transaction = { ...transaction, qrisUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg' };
        break;
    }

    // Mock Auto-Payment Logic (Credit Card/QRIS)
    if (['CREDIT_CARD', 'QRIS'].includes(payload.method)) {
        const paidNow = initialPaymentAmount;
        
        transaction.paidAmount = paidNow;
        transaction.balanceDue = transaction.totalAmount - paidNow;
        transaction.status = transaction.balanceDue > 0 ? 'PARTIAL' : 'PAID';
        
        const members = await DataService.getMembers();
        // Case insensitive match
        const member = members.find(m => m.email.toLowerCase() === payload.customerEmail.toLowerCase());
        const memberName = member ? member.name : 'Guest';

        // UPDATE INVENTORY / QUOTA (Real Commit)
        payload.items.forEach(async (cartItem) => {
            const inventoryMatch = INVENTORY_DATA.find(inv => cartItem.id === inv.sku || cartItem.name.includes(inv.name));
            if (inventoryMatch) {
                try {
                    await OpsService.updateStock(
                        inventoryMatch.sku,
                        cartItem.quantity,
                        'GI',
                        `Order ${orderId}`,
                        'System (Sales)'
                    );
                } catch (e) { console.warn("Auto-deduct failed", e); }
            }
        });
        
        // Entitlements
        if (member) {
             await EntitlementService.processTransactionEntitlements(member.id, payload.items.map(i => ({ 
                 id: i.id, 
                 variantId: i.variantId,
                 quantity: i.quantity 
             })));
        }

        // Event Bus
        const triggerType = transaction.status === 'PARTIAL' ? 'PAYMENT_PARTIAL' : 'PAYMENT_SUCCESS';
        await EventBus.emit(triggerType, {
            transactionId,
            orderId,
            amount: paidNow,
            memberId: member?.id, 
            name: memberName,
            member_name: memberName, 
            email: payload.customerEmail,
            phone: member?.phone, 
            product_name: payload.items.map(i => i.name).join(', ')
        });

    } else {
        CommunicationService.sendTransactionalEmail('TPL-INVOICE', payload.customerEmail, {
            name: 'Valued Member',
            amount: String(initialPaymentAmount), 
            orderId: orderId,
            transactionId: transactionId
        });
    }

    // 3. PERSISTENCE VIA REPOSITORY
    return await RepositoryFactory.getPaymentRepository().create(transaction);
  },
  
  confirmManualTransfer: async (transactionId: string, amountReceived: number): Promise<PaymentTransaction> => {
      const repo = RepositoryFactory.getPaymentRepository();
      const tx = await repo.getById(transactionId);
      
      if (!tx) throw new Error("Transaction not found");

      tx.paidAmount += amountReceived;
      tx.balanceDue = tx.totalAmount - tx.paidAmount;

      if (tx.balanceDue < 0) {
          tx.status = 'OVERPAID';
      } else if (tx.balanceDue > 0) {
          tx.status = 'PARTIAL';
      } else {
          tx.status = 'PAID';
      }

      await repo.update(tx);

      // --- GRANT ENTITLEMENTS ON MANUAL CONFIRMATION ---
      if (tx.status === 'PAID' && tx.itemsSnapshot && tx.itemsSnapshot.length > 0) {
          
          // Resolve Member from Email (Case Insensitive Fix)
          const members = await DataService.getMembers();
          const member = members.find(m => m.email.toLowerCase() === tx.customerEmail.toLowerCase());

          if (member) {
              console.log(`[PAYMENT] Manual confirm for ${transactionId}. Granting entitlements to ${member.id}`);
              
              await EntitlementService.processTransactionEntitlements(
                  member.id, 
                  tx.itemsSnapshot.map(i => ({ 
                     id: i.id, 
                     variantId: i.variantId,
                     quantity: i.quantity 
                  }))
              );

              // Fire Events for automation (WA/Email)
              await EventBus.emit('PAYMENT_SUCCESS', {
                  transactionId: tx.id,
                  orderId: tx.orderId,
                  amount: amountReceived,
                  memberId: member.id, 
                  name: member.name,
                  member_name: member.name, 
                  email: member.email,
                  phone: member.phone, 
                  product_name: tx.itemsSnapshot.map(i => i.name).join(', ')
              });
          } else {
              console.warn(`[PAYMENT] Manual confirm for ${transactionId}, but user with email ${tx.customerEmail} not found in CRM.`);
          }
      }
      
      return tx;
  },
  
  uploadPaymentProof: async (transactionId: string, file: File): Promise<boolean> => {
    console.log(`Uploading file ${file.name} for transaction ${transactionId}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const repo = RepositoryFactory.getPaymentRepository();
    const tx = await repo.getById(transactionId);
    
    if(tx) {
        tx.status = 'WAITING_FOR_VERIFICATION';
        tx.proofOfPaymentUrl = 'mock_url.jpg'; 
        await repo.update(tx);
        return true;
    }
    return false;
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
