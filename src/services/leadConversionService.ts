import { apiRequest } from '../repositories/api/apiClient';

export type ManualLeadConversionPaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'E_WALLET'
  | 'INSTALLMENT';

export type ManualLeadConversionPayload = {
  memberId: string;
  items: Array<{
    productId: string;
    quantity: number;
    variantId?: string;
  }>;
  paymentMethod: ManualLeadConversionPaymentMethod;
  voucherCode?: string;
  attributionSource?: string;
  closingNotes?: string;
};

export type ManualLeadConversionResult = {
  paymentId: string;
  orderId: string;
  totalAmount: number;
  paymentStatus: string;
  buyerEmail: string;
  memberId: string;
  productsSummary: string | null;
};

export const LeadConversionService = {
  convert: async (
    payload: ManualLeadConversionPayload,
  ): Promise<ManualLeadConversionResult> => {
    return apiRequest<ManualLeadConversionResult>(
      '/transactions/manual-lead-conversion',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
};
