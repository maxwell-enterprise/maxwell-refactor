import { PaymentTransaction, PaymentMethodType, PaymentStatus } from '../../types/index';
import { IPaymentRepository } from '../contracts';
import { apiRequest } from './apiClient';

type NestTx = {
  id: string;
  transactionNumber: string;
  subtotalAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  paidAmount?: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  createdAt: string;
  paymentExpiresAt?: string | null;
  guestEmail?: string | null;
};

type ListRes = { data: NestTx[]; total: number };

function toIso(v: unknown): string {
  if (v == null) return new Date().toISOString();
  if (typeof v === 'string') return v.includes('T') ? v : new Date(v).toISOString();
  if (v instanceof Date) return v.toISOString();
  return new Date(String(v)).toISOString();
}

function normalizeStatus(s: string): PaymentStatus {
  const map: Record<string, PaymentStatus> = {
    PENDING: 'PENDING',
    AWAITING_PAYMENT: 'WAITING_FOR_VERIFICATION',
    PAID: 'PAID',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'EXPIRED',
    REFUNDED: 'REFUNDED',
    PARTIAL_REFUND: 'PARTIAL',
    FAILED: 'FAILED',
    OVERPAID: 'OVERPAID',
  };
  return map[s] ?? (s as PaymentStatus);
}

function mapRow(t: NestTx): PaymentTransaction {
  const tot = Number(t.totalAmount ?? 0);
  const paid = Number(t.paidAmount ?? 0);
  const createdAt = toIso(t.createdAt);
  const expiryTime = t.paymentExpiresAt != null ? toIso(t.paymentExpiresAt) : createdAt;

  return {
    id: t.id,
    orderId: String(t.transactionNumber ?? ''),
    amount: Number(t.subtotalAmount ?? tot),
    discountAmount: Number(t.discountAmount ?? 0),
    totalAmount: tot,
    paidAmount: paid,
    balanceDue: Math.max(0, tot - paid),
    method: (t.paymentMethod as PaymentMethodType) ?? 'BANK_TRANSFER',
    status: normalizeStatus(String(t.paymentStatus ?? 'PENDING')),
    createdAt,
    expiryTime,
    customerEmail: String(t.guestEmail ?? ''),
    refunds: undefined,
  };
}

export class ApiPaymentRepository implements IPaymentRepository {
  async getAll(): Promise<PaymentTransaction[]> {
    const out: PaymentTransaction[] = [];
    let page = 1;
    const limit = 100;
    for (;;) {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const res = await apiRequest<ListRes>(`/transactions?${q.toString()}`);
      const batch = res.data ?? [];
      for (const row of batch) {
        out.push(mapRow(row));
      }
      if (batch.length < limit || out.length >= (res.total ?? 0)) break;
      page += 1;
      if (page > 50) break;
    }
    return out;
  }

  async getById(id: string): Promise<PaymentTransaction | null> {
    try {
      const t = await apiRequest<NestTx & { items?: unknown[] }>(
        `/transactions/${encodeURIComponent(id)}`,
      );
      return mapRow(t);
    } catch {
      return null;
    }
  }

  async create(_transaction: PaymentTransaction): Promise<PaymentTransaction> {
    throw new Error('ApiPaymentRepository.create: use Nest checkout / Midtrans snap');
  }

  async update(_transaction: PaymentTransaction): Promise<void> {
    throw new Error('ApiPaymentRepository.update: use Nest payment endpoints');
  }

  async updateStatus(_id: string, _status: string): Promise<void> {
    throw new Error('ApiPaymentRepository.updateStatus: use Nest payment endpoints');
  }
}
