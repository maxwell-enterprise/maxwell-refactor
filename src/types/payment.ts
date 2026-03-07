
import { InstallmentSchedule } from './index';

export type PaymentMethodType = 'BANK_TRANSFER' | 'VIRTUAL_ACCOUNT_BCA' | 'QRIS' | 'CREDIT_CARD';

export type PaymentStatus = 'PENDING' | 'WAITING_FOR_VERIFICATION' | 'PAID' | 'EXPIRED' | 'FAILED' | 'PARTIAL' | 'OVERPAID' | 'REFUNDED';

export interface RefundRecord {
  id: string;
  amount: number;
  reason: string;
  processedAt: string;
  status: 'PROCESSED' | 'PENDING';
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  amount: number; // Base amount before fees/unique code
  discountAmount?: number; // New field
  uniqueCode?: number; // For manual bank transfer
  totalAmount: number; // Final amount to pay
  
  // New Fields for Finance/Installment logic
  paidAmount: number;
  balanceDue: number;
  installmentPlan?: InstallmentSchedule[];
  refunds?: RefundRecord[];

  method: PaymentMethodType;
  status: PaymentStatus;
  createdAt: string;
  expiryTime: string; // ISO String
  customerEmail: string; // Stored email for this transaction
  attributionSource?: string; // Campaign Source (e.g., "ig_ads")
  
  // Method Specific Data
  virtualAccountNumber?: string;
  qrisUrl?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  proofOfPaymentUrl?: string;
  
  // CRITICAL: Snapshot of what was bought to allow delayed entitlement granting
  itemsSnapshot?: { id: string; name: string; price: number; quantity: number; variantId?: string }[];
}

export interface InitiatePaymentPayload {
  items: { id: string; name: string; price: number; quantity: number; variantId?: string }[];
  subTotal: number;
  tax: number;
  discountCode?: string;
  discountAmount?: number;
  totalAmount: number;
  customerEmail: string;
  method: PaymentMethodType;
  attributionSource?: string;
  
  // Installment Config
  isInstallment?: boolean;
  downPaymentAmount?: number;
}
