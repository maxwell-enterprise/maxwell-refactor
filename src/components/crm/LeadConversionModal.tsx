
import React, { useEffect, useMemo, useState } from 'react';
import { Member, Product } from '../../types/index';
import { DataService } from '../../services/dataService';
import { PaymentService } from '../../services/paymentService';
import {
  LeadConversionService,
  ManualLeadConversionPaymentMethod,
} from '../../services/leadConversionService';
import { useToast } from '../../context/ToastContext';
import {
  X,
  Package,
  CreditCard,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface LeadConversionModalProps {
  lead: Member;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS: Array<{
  value: ManualLeadConversionPaymentMethod;
  label: string;
}> = [
  { value: 'CASH', label: 'Cash / Offline' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'E_WALLET', label: 'E-Wallet' },
  { value: 'INSTALLMENT', label: 'Installment Plan' },
];

const CLOSING_CATEGORIES = new Set([
  'Packages',
  'Certification',
  'Upgrade',
  'Digital',
  'Token',
]);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const resolveUnitPrice = (product: Product, variantId?: string): number => {
  if (product.hasVariants && product.variants?.length) {
    const vid = variantId?.trim();
    if (!vid) return NaN;
    const variant = product.variants.find((v) => v.id === vid);
    return variant ? Number(variant.priceIdr) || 0 : NaN;
  }
  return Number(product.priceIdr) || 0;
};

const LeadConversionModal: React.FC<LeadConversionModalProps> = ({
  lead,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [ppnRatePercent, setPpnRatePercent] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] =
    useState<ManualLeadConversionPaymentMethod>('CASH');
  const [voucherCode, setVoucherCode] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasEmail = Boolean(String(lead.email ?? '').trim());

  useEffect(() => {
    let cancelled = false;
    setLoadingProducts(true);
    void Promise.all([
      DataService.getProducts(),
      PaymentService.getCheckoutConfig().catch(() => ({ ppnRatePercent: 0 })),
    ])
      .then(([allProducts, config]) => {
        if (cancelled) return;
        const eligible = allProducts.filter(
          (p) =>
            p.isActive !== false &&
            CLOSING_CATEGORIES.has(p.category),
        );
        setProducts(eligible);
        setPpnRatePercent(Number(config.ppnRatePercent) || 0);
        if (eligible.length > 0) {
          setSelectedProductId(eligible[0].id);
        }
      })
      .catch(() => {
        if (cancelled) return;
        showToast('Failed to load product catalog.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  useEffect(() => {
    if (!selectedProduct) {
      setSelectedVariantId('');
      return;
    }
    if (selectedProduct.hasVariants && selectedProduct.variants?.length) {
      setSelectedVariantId(selectedProduct.variants[0].id);
    } else {
      setSelectedVariantId('');
    }
  }, [selectedProduct]);

  const unitPrice = selectedProduct
    ? resolveUnitPrice(selectedProduct, selectedVariantId)
    : 0;
  const subtotal =
    Number.isFinite(unitPrice) && quantity > 0 ? unitPrice * quantity : 0;
  const taxAmount = Math.round(subtotal * (ppnRatePercent / 100));
  const estimatedTotal = subtotal + taxAmount;
  const needsVariant =
    Boolean(selectedProduct?.hasVariants) &&
    (selectedProduct?.variants?.length ?? 0) > 0;
  const priceReady = selectedProduct && Number.isFinite(unitPrice);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEmail) {
      showToast('Lead must have an email before conversion.', 'error');
      return;
    }
    if (!selectedProduct) {
      showToast('Please select a package.', 'error');
      return;
    }
    if (needsVariant && !selectedVariantId.trim()) {
      showToast('Please select a pricing tier.', 'error');
      return;
    }
    if (!Number.isFinite(unitPrice)) {
      showToast('Invalid product pricing.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await LeadConversionService.convert({
        memberId: lead.id,
        items: [
          {
            productId: selectedProduct.id,
            quantity,
            variantId: selectedVariantId.trim() || undefined,
          },
        ],
        paymentMethod,
        voucherCode: voucherCode.trim() || undefined,
        closingNotes: closingNotes.trim() || undefined,
      });

      showToast(
        `${lead.name} converted — ${formatCurrency(result.totalAmount)} recorded (${result.orderId}).`,
        'success',
      );
      onSuccess();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Conversion failed.';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 bg-orange-50 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package size={18} className="text-orange-600" />
              Close Deal — Convert Lead
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Record manual payment, snapshot package price, and promote to Member.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto px-6 py-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm font-bold text-slate-900">{lead.name}</div>
              <div className="text-xs text-slate-500">{lead.email || 'No email'}</div>
              <div className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                {lead.lifecycleStage}
              </div>
            </div>

            {!hasEmail && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>
                  This lead has no email. Add an email in profiling before closing the deal.
                </span>
              </div>
            )}

            {loadingProducts ? (
              <div className="flex items-center justify-center py-8 text-sm text-slate-400">
                <Loader2 size={18} className="mr-2 animate-spin" />
                Loading packages...
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                No active packages found in the catalog.
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Package / Product
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title} — {product.category}
                      </option>
                    ))}
                  </select>
                </div>

                {needsVariant && selectedProduct?.variants && (
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Pricing Tier
                    </label>
                    <select
                      value={selectedVariantId}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {selectedProduct.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.name} — {formatCurrency(variant.priceIdr)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Unit Price (snapshot)
                    </label>
                    <div className="flex h-[42px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                      {priceReady ? formatCurrency(unitPrice) : '—'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Payment Method
                  </label>
                  <div className="relative">
                    <CreditCard
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <select
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(
                          e.target.value as ManualLeadConversionPaymentMethod,
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Voucher Code (optional)
                  </label>
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="e.g. SCHOLARSHIP2026"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Closing Notes (optional)
                  </label>
                  <textarea
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    rows={2}
                    placeholder="B2B invoice ref, scholarship approval, etc."
                    className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-800">
                    <DollarSign size={14} />
                    Estimated Total (server confirms)
                  </div>
                  <div className="space-y-1 text-sm text-emerald-900">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {ppnRatePercent > 0 && (
                      <div className="flex justify-between text-emerald-800/80">
                        <span>PPN ({ppnRatePercent}%)</span>
                        <span>{formatCurrency(taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-emerald-200 pt-2 font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(estimatedTotal)}</span>
                    </div>
                  </div>
                  {voucherCode.trim() && (
                    <p className="mt-2 text-[11px] text-emerald-700">
                      Voucher discount applied on the server at checkout time.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                loadingProducts ||
                !hasEmail ||
                !selectedProduct ||
                !priceReady
              }
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Confirm Conversion
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadConversionModal;
