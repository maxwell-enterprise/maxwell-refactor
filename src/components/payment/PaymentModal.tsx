
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { X, CreditCard, QrCode, Building2, Smartphone, Copy, UploadCloud, CheckCircle, AlertCircle, Clock, ShieldCheck, Loader2, Tag, ChevronRight, Mail, Trash2, Plus, Minus, Zap, PieChart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PaymentMethodType, PaymentTransaction, Product, UserRole, Discount, CartItem } from '../../types/index';
import { PaymentService } from '../../services/paymentService';
import { DiscountService } from '../../services/discountService';
import { formatStorePriceIdr } from '../../utils/formatStorePrice';

/** Unit price for a cart line (variant overrides base product price). */
function getCartLineUnitPrice(product: Product, variantId?: string): number {
  if (variantId && product.variants?.length) {
    const v = product.variants.find((vv) => vv.id === variantId);
    if (v) return v.priceIdr;
  }
  return product.priceIdr;
}

/**
 * When true, Midtrans Snap is not loaded; checkout uses the in-app success modal + server
 * `simulate-settle` (same PAID + wallet path as a real webhook). Default: Snap off (`true`).
 * Production with real Midtrans: set `NEXT_PUBLIC_MIDTRANS_UI_DISABLED=false` and point the API
 * at live keys + webhook; the API should not allow simulation there (explicit or prod defaults).
 */
const MIDTRANS_UI_DISABLED = (() => {
  const v = String(
    process.env.NEXT_PUBLIC_MIDTRANS_UI_DISABLED ?? 'true',
  ).trim().toLowerCase();
  return v !== 'false' && v !== '0';
})();

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[]; 
  products: Product[];
  userEmail: string;
  userRole: UserRole;
  /** Authenticated app user id (wallet owner). Used when CRM member list has no row for checkout email. */
  walletUserId?: string;
  onUpdateQuantity: (productId: string, variantId: string | undefined, delta: number) => void;
  onRemoveItem: (productId: string, variantId: string | undefined) => void;
  preAppliedDiscountCode?: string; 
  attributionSource?: string; 
  onPaymentSuccess?: () => void;
}

type Step = 'SUMMARY';

const PaymentModal: React.FC<PaymentModalProps> = ({ 
    isOpen,
    onClose,
    cart,
    products,
    userEmail,
    userRole,
    walletUserId,
    onUpdateQuantity,
    onRemoveItem,
    preAppliedDiscountCode,
    attributionSource,
    onPaymentSuccess,
}) => {
  const { refreshSession } = useAuth();

  /** Refresh workspace session after server-side wallet/CRM updates so `user.id` stays aligned; then parent callback. */
  const runAfterPaymentSuccess = useCallback(async () => {
    try {
      await refreshSession({ silent: true });
    } catch {
      /* best-effort */
    }
    onPaymentSuccess?.();
  }, [onPaymentSuccess, refreshSession]);

  const [step, setStep] = useState<Step>('SUMMARY');
  const [selectedMethod] = useState<PaymentMethodType>('BANK_TRANSFER');
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Guest Logic State
  const [customerEmail, setCustomerEmail] = useState(userEmail);
  const isGuest = userRole === UserRole.GUEST;

  // Voucher State
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ discount: Discount, amount: number } | null>(null);
  const [voucherError, setVoucherError] = useState('');
  const [isCheckingVoucher, setIsCheckingVoucher] = useState(false);
  
  // NEW: Installment State
  const [payMode, setPayMode] = useState<'FULL' | 'INSTALLMENT'>('FULL');
  const [dpAmount, setDpAmount] = useState(0);
  const snapPayInFlightRef = useRef(false);
  const [isMidtransPopupOpen, setIsMidtransPopupOpen] = useState(false);
  const [simulatedSuccessOpen, setSimulatedSuccessOpen] = useState(false);
  /** Midtrans-disabled path: payment + confirm already done; splash only, optional auto-close. */
  const checkoutAlreadyFinalizedRef = useRef(false);
  const successAutoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [successSplashAutoClose, setSuccessSplashAutoClose] = useState(false);

  // Determine if installments are available for this cart
  // Logic: All items in cart must allow installments, or at least the main high-value item?
  // Simplification: If cart has ANY item with installmentConfig.enabled, allow splitting.
  const installmentConfig = products.find(p => cart.some(c => c.productId === p.id && p.installmentConfig?.enabled))?.installmentConfig;
  const canInstallment = !!installmentConfig;

  useEffect(() => {
      if (userEmail && userEmail !== 'guest@example.com') {
          setCustomerEmail(userEmail);
      } else if (userEmail === 'guest@example.com' && !customerEmail) {
          setCustomerEmail(''); 
      }
  }, [userEmail]);

  useEffect(() => {
    if (!isOpen) {
      setSimulatedSuccessOpen(false);
      setSuccessSplashAutoClose(false);
      checkoutAlreadyFinalizedRef.current = false;
      if (successAutoCloseTimerRef.current) {
        clearTimeout(successAutoCloseTimerRef.current);
        successAutoCloseTimerRef.current = null;
      }
    }
  }, [isOpen]);

  // Cart Calculation Logic
  const calculateCartTotals = () => {
      let subTotal = 0;
      cart.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
              subTotal += getCartLineUnitPrice(product, item.variantId) * item.quantity;
          }
      });
      return subTotal;
  };

  const subTotal = calculateCartTotals();
  
  // Calculate Tax (PPN) AFTER discount
  const discountVal = appliedDiscount?.amount || 0;
  const taxableAmount = Math.max(0, subTotal - discountVal);
  const ppnRatePercent = Number(
    process.env.NEXT_PUBLIC_PAYMENT_PPN_RATE_PERCENT ?? 0,
  );
  const tax = taxableAmount * (ppnRatePercent / 100);
  const totalAmount = taxableAmount + tax;

  // Recalculate DP when total changes
  useEffect(() => {
      if (canInstallment && installmentConfig) {
          setDpAmount(Math.ceil((totalAmount * installmentConfig.minDownPaymentPercent) / 100));
      }
  }, [totalAmount, canInstallment]);

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  const applyVoucherCode = useCallback(
    async (codeRaw: string) => {
      const codeToUse = codeRaw.trim();
      if (!codeToUse || cart.length === 0) return;

      setIsCheckingVoucher(true);
      setVoucherError('');

      try {
        const discount = await DiscountService.findByCode(codeToUse);
        if (!discount) {
          setVoucherError('Invalid voucher code.');
          setAppliedDiscount(null);
          return;
        }

        const validation = await DiscountService.isValid(
          discount,
          userRole,
          walletUserId,
        );
        if (!validation.valid) {
          setVoucherError(validation.reason || 'Voucher not applicable.');
          setAppliedDiscount(null);
          return;
        }

        let totalDiscount = 0;

        cart.forEach((item) => {
          const product = products.find((p) => p.id === item.productId);
          if (product) {
            const unit = getCartLineUnitPrice(product, item.variantId);
            const itemDiscount = DiscountService.calculateDiscount(
              discount,
              unit,
              item.quantity,
              product.category,
              product.id,
              userRole,
            );
            if (discount.type === 'PERCENTAGE') {
              totalDiscount += itemDiscount * item.quantity;
            } else {
              totalDiscount += itemDiscount;
            }
          }
        });

        if (totalDiscount === 0) {
          setVoucherError(
            'Voucher code is valid but not applicable to items in your cart.',
          );
          setAppliedDiscount(null);
        } else {
          setAppliedDiscount({ discount, amount: totalDiscount });
        }
      } catch (error) {
        console.error('Voucher check failed', error);
        setVoucherError('Error checking voucher.');
      } finally {
        setIsCheckingVoucher(false);
      }
    },
    [cart, products, userRole, walletUserId],
  );

  const handleApplyVoucher = useCallback(() => {
    const code =
      voucherCode.trim() ||
      preAppliedDiscountCode?.trim() ||
      '';
    return applyVoucherCode(code);
  }, [applyVoucherCode, preAppliedDiscountCode, voucherCode]);

  /** Campaign / deep-link codes: wait for cart lines before applying. */
  useEffect(() => {
    if (!preAppliedDiscountCode || appliedDiscount) return;
    if (cart.length === 0) return;
    setVoucherCode((v) => v || preAppliedDiscountCode);
    const t = window.setTimeout(() => {
      void applyVoucherCode(preAppliedDiscountCode);
    }, 0);
    return () => clearTimeout(t);
  }, [preAppliedDiscountCode, appliedDiscount, cart.length, applyVoucherCode]);

  /** Recompute line discounts when the cart changes but a code is already applied. */
  useEffect(() => {
    const code = appliedDiscount?.discount.code?.trim();
    if (!code || cart.length === 0) return;
    void applyVoucherCode(code);
  }, [cart, appliedDiscount?.discount.code, applyVoucherCode]);

  const handleInitiatePayment = async () => {
    if (snapPayInFlightRef.current) return; // prevent double snap.pay while popup is still open
    if (!customerEmail || !customerEmail.includes('@')) {
        alert("Please enter a valid email address for the receipt.");
        return;
    }

    flushSync(() => {
      setIsLoading(true);
      setErrorMessage(null);
    });
    snapPayInFlightRef.current = true;

    try {
      const transactionItems = cart.map(item => {
        const p = products.find(prod => prod.id === item.productId);
        return {
          id: item.productId,
          name: p?.title || 'Unknown Item',
          price: p ? getCartLineUnitPrice(p, item.variantId) : 0,
          quantity: item.quantity,
          variantId: item.variantId,
        };
      });

      const { transaction: trx, snapToken } = await PaymentService.initiateTransaction({
        items: transactionItems,
        subTotal,
        tax,
        discountCode: appliedDiscount?.discount.code,
        discountAmount: appliedDiscount?.amount,
        totalAmount,
        customerEmail,
        method: selectedMethod,
        attributionSource,
        isInstallment: payMode === 'INSTALLMENT',
        downPaymentAmount: payMode === 'INSTALLMENT' ? dpAmount : undefined,
      });

      setTransaction(trx);

      const serverDiscount = Math.round(Number(trx.discountAmount ?? 0));
      if (appliedDiscount) {
        const clientDiscount = Math.round(appliedDiscount.amount);
        if (clientDiscount !== serverDiscount) {
          if (serverDiscount === 0) {
            setAppliedDiscount(null);
            setVoucherError(
              'Server did not apply this voucher (product scope, role, dates, or usage limits). Totals charged follow the server.',
            );
          } else {
            setAppliedDiscount({
              discount: appliedDiscount.discount,
              amount: serverDiscount,
            });
            setVoucherError('');
          }
        }
      }

      // Test mode: always bypass Midtrans popup and show local success modal.
      // Conversion is still recorded by backend when transaction reaches PAID
      // (free checkout is PAID immediately; paid checkout uses simulate-settle).
      if (MIDTRANS_UI_DISABLED) {
        try {
          const paidNow = String(trx.status ?? '').toUpperCase() === 'PAID';
          if (!paidNow && totalAmount > 0) {
            await PaymentService.simulateSettle(trx.id, customerEmail);
          }
          if (trx.itemsSnapshot?.length) {
            await PaymentService.confirmManualTransfer(
              trx.id,
              trx.totalAmount,
              trx.itemsSnapshot,
              trx.customerEmail,
              walletUserId,
            );
          }
          await runAfterPaymentSuccess();
          checkoutAlreadyFinalizedRef.current = true;
          setSuccessSplashAutoClose(true);
          setSimulatedSuccessOpen(true);
          setIsLoading(false);
          snapPayInFlightRef.current = false;
          if (successAutoCloseTimerRef.current) {
            clearTimeout(successAutoCloseTimerRef.current);
          }
          successAutoCloseTimerRef.current = setTimeout(() => {
            successAutoCloseTimerRef.current = null;
            checkoutAlreadyFinalizedRef.current = false;
            setSuccessSplashAutoClose(false);
            setSimulatedSuccessOpen(false);
            onClose();
          }, 1800);
        } catch (e: unknown) {
          const msg =
            e instanceof Error
              ? e.message
              : 'Simulation failed. Set ALLOW_PAYMENT_SIMULATION=true on the server API.';
          setErrorMessage(msg);
        } finally {
          if (!checkoutAlreadyFinalizedRef.current) {
            setIsLoading(false);
            snapPayInFlightRef.current = false;
          }
        }
        return;
      }

      // Rp 0 checkout: backend marks PAID without Midtrans; grant entitlements immediately.
      const snapOk = typeof snapToken === 'string' && snapToken.trim().length > 0;
      if (!snapOk) {
        try {
          if (!trx.itemsSnapshot) throw new Error('Missing cart snapshot');
          await PaymentService.confirmManualTransfer(
            trx.id,
            trx.totalAmount,
            trx.itemsSnapshot,
            trx.customerEmail,
            walletUserId,
          );
          await runAfterPaymentSuccess();
          onClose();
        } catch (e: any) {
          setErrorMessage(e?.message || 'Failed to complete free order');
        } finally {
          setIsLoading(false);
          snapPayInFlightRef.current = false;
        }
        return;
      }

      // Load Midtrans Snap JS then open the hosted payment page.
      const loadSnapJs = () =>
        new Promise<void>((resolve, reject) => {
          if (typeof window === 'undefined') return reject(new Error('No window'));
          if ((window as any).snap) return resolve();

          const existing = document.getElementById('midtrans-snap-script');
          if (existing) {
            // If script exists but points to wrong domain (sandbox vs prod), reload it.
            const isProduction =
              String(process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION ?? 'false').toLowerCase() ===
              'true';
            const expectedSrc = isProduction
              ? 'https://app.midtrans.com/snap/snap.js'
              : 'https://app.sandbox.midtrans.com/snap/snap.js';
            if ((existing as HTMLScriptElement).src === expectedSrc) {
              const deadline = Date.now() + 4000;
              const tick = () => {
                if ((window as any).snap) {
                  resolve();
                  return;
                }
                if (Date.now() >= deadline) {
                  reject(new Error('Midtrans snap not ready'));
                  return;
                }
                setTimeout(tick, 50);
              };
              tick();
              return;
            }

            existing.remove();
          }

          const script = document.createElement('script');
          script.id = 'midtrans-snap-script';
          const isProduction =
            String(process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION ?? 'false').toLowerCase() ===
            'true';
          script.src = isProduction
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed loading midtrans snap.js'));
          document.body.appendChild(script);
        });

      await loadSnapJs();

      // Only after Snap is loaded and token exists, open the popup.
      let snapPayStarted = false;
      try {
        snapPayStarted = true;
        setIsMidtransPopupOpen(true);
        (window as any).snap.pay(snapToken, {
          onSuccess: async () => {
            try {
              if (!trx.itemsSnapshot) throw new Error('Missing cart snapshot');
              await PaymentService.confirmManualTransfer(
                trx.id,
                trx.totalAmount,
                trx.itemsSnapshot,
                trx.customerEmail,
                walletUserId,
              );
              await runAfterPaymentSuccess();
              onClose();
            } catch (e: any) {
              setErrorMessage(e?.message || 'Failed to finalize payment');
            } finally {
              setIsLoading(false);
              setIsMidtransPopupOpen(false);
              snapPayInFlightRef.current = false;
            }
          },
          onPending: () => {
            setIsLoading(false);
            setIsMidtransPopupOpen(false);
            snapPayInFlightRef.current = false;
            // Pending payment does not grant entitlements immediately.
            onClose();
          },
          onError: (err: any) => {
            setIsLoading(false);
            setIsMidtransPopupOpen(false);
            snapPayInFlightRef.current = false;
            setErrorMessage(err?.message || 'Midtrans payment error');
          },
          onClose: () => {
            setIsLoading(false);
            setIsMidtransPopupOpen(false);
            snapPayInFlightRef.current = false;
          },
        });
      } finally {
        // If snap.pay threw synchronously, allow retry.
        if (!snapPayStarted) {
          snapPayInFlightRef.current = false;
          setIsMidtransPopupOpen(false);
        }
      }
    } catch (error: any) {
      console.error("Payment Init Failed", error);
      setIsLoading(false);
      snapPayInFlightRef.current = false;
      setIsMidtransPopupOpen(false);
      setErrorMessage(error.message || "High traffic detected. Please try again.");
    }
  };

  const handleFinalizeSimulatedPayment = async () => {
    if (checkoutAlreadyFinalizedRef.current) {
      if (successAutoCloseTimerRef.current) {
        clearTimeout(successAutoCloseTimerRef.current);
        successAutoCloseTimerRef.current = null;
      }
      checkoutAlreadyFinalizedRef.current = false;
      setSuccessSplashAutoClose(false);
      setSimulatedSuccessOpen(false);
      onClose();
      return;
    }
    if (!transaction?.itemsSnapshot) {
      setErrorMessage('Missing cart snapshot');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await PaymentService.confirmManualTransfer(
        transaction.id,
        transaction.totalAmount,
        transaction.itemsSnapshot,
        transaction.customerEmail,
        walletUserId,
      );
      setSimulatedSuccessOpen(false);
      await runAfterPaymentSuccess();
      onClose();
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to finalize');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleUploadProof = async () => {
    if (!uploadFile || !transaction) return;
    setIsUploading(true);
    try {
      await PaymentService.uploadPaymentProof(transaction.id, uploadFile);
      onClose();
    } catch (error) {
      console.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  /** Same post-payment path as Snap `onSuccess` / finalize simulated modal: session hydrate + parent callback. */
  const handleSimulateSuccess = async () => {
    if (!transaction) return;
    if (!transaction.itemsSnapshot?.length) {
      setErrorMessage('Missing cart snapshot');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await PaymentService.confirmManualTransfer(
        transaction.id,
        transaction.totalAmount,
        transaction.itemsSnapshot,
        transaction.customerEmail,
        walletUserId,
      );
      await runAfterPaymentSuccess();
      onClose();
    } catch (e: unknown) {
      setErrorMessage(
        e instanceof Error ? e.message : 'Simulation failed. Try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderSummary = () => {
    if (isMidtransPopupOpen) {
      return (
        <div className="space-y-4">
          {/* Show backend/payment errors if any */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2 text-sm text-red-700 animate-pulse">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
            Waiting for Midtrans payment confirmation…
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Show backend/payment errors in the only visible step (Summary). */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2 text-sm text-red-700 animate-pulse">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Items List with Edit Capabilities */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-4 max-h-60 overflow-y-auto">
          {cart.length === 0 && (
            <p className="text-center text-slate-400 text-sm">
              Your cart is empty.
            </p>
          )}
          {cart.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return null;
            const variantName = product.variants?.find((v) => v.id === item.variantId)?.name;

            return (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="flex justify-between items-center text-sm border-b border-slate-100 last:border-0 pb-3 last:pb-0"
              >
                <div className="flex-1 pr-4">
                  <span className="text-slate-800 font-medium block truncate">
                    {product.title}
                  </span>
                  {variantName && (
                    <span className="text-xs text-indigo-600 font-medium block">
                      {variantName}
                    </span>
                  )}
                  <span className="text-slate-500 text-xs">
                    {formatStorePriceIdr(getCartLineUnitPrice(product, item.variantId))}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white border border-slate-200 rounded-md">
                    <button
                      onClick={() => onUpdateQuantity(item.productId, item.variantId, -1)}
                      className="px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                      disabled={item.quantity <= 1}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="px-2 text-xs font-semibold w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.productId, item.variantId, 1)}
                      className="px-2 py-1 text-slate-500 hover:bg-slate-100"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.productId, item.variantId)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Guest/User Email Input */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Receipt Email</label>
          <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                  type="email" 
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  disabled={!isGuest && userEmail !== 'guest@example.com'} 
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 ${!isGuest && userEmail !== 'guest@example.com' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-300'}`}
                  placeholder="Enter your email address"
              />
          </div>
          {isGuest && <p className="text-[10px] text-blue-600 mt-1">* As a guest, please ensure this email is correct to receive your tickets.</p>}
      </div>

      {/* Voucher Input */}
      <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Promo Code</label>
          <div className="flex gap-2">
              <div className="relative flex-1">
                  <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                      type="text" 
                      placeholder="e.g. WELCOME20"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 uppercase font-mono"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      disabled={!!appliedDiscount}
                  />
              </div>
              {appliedDiscount ? (
                  <button onClick={() => { setAppliedDiscount(null); setVoucherCode(''); }} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200">
                      Remove
                  </button>
              ) : (
                  <button 
                    onClick={handleApplyVoucher} 
                    disabled={!voucherCode || isCheckingVoucher || cart.length === 0}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 disabled:opacity-50"
                  >
                      {isCheckingVoucher ? '...' : 'Apply'}
                  </button>
              )}
          </div>
          {voucherError && <p className="text-xs text-red-500 mt-1 flex items-center"><AlertCircle size={10} className="mr-1"/> {voucherError}</p>}
          {appliedDiscount && (
              <p className="text-xs text-green-600 mt-1 flex items-center font-medium">
                  <CheckCircle size={10} className="mr-1"/> Code {appliedDiscount.discount.code} applied!
              </p>
          )}
      </div>
      
      {/* Installment selection removed to keep UI single-step summary */}

      {/* Totals Calculation */}
      <div className="border-t border-slate-200 pt-3 space-y-2">
        <div className="flex justify-between text-sm text-slate-500">
          <span>Subtotal</span>
          <span>{formatStorePriceIdr(subTotal)}</span>
        </div>
        
        {appliedDiscount && (
            <div className="flex justify-between text-sm text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                <span>Discount ({appliedDiscount.discount.type === 'PERCENTAGE' ? `${appliedDiscount.discount.value}%` : 'Fixed'})</span>
                <span>-{formatIDR(appliedDiscount.amount)}</span>
            </div>
        )}

        <div className="flex justify-between text-sm text-slate-500">
          <span>PPN ({ppnRatePercent}%)</span>
          <span>{formatIDR(tax)}</span>
        </div>
        
        <div className="border-t border-slate-200 pt-3 flex justify-between text-lg font-bold text-slate-900 items-end">
          <span>Total</span>
          <span className="text-2xl text-blue-600">{formatStorePriceIdr(totalAmount)}</span>
        </div>
        
        {/* Installment breakdown removed (Midtrans token uses full total) */}
      </div>

      <button 
        onClick={handleInitiatePayment}
        disabled={cart.length === 0 || totalAmount < 0 || isMidtransPopupOpen}
        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg flex justify-center items-center group disabled:opacity-50"
      >
        {totalAmount === 0 ? (
          <>
            Claim free
            <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </>
        ) : (
          <>
            Proceed to Pay {formatStorePriceIdr(totalAmount)}
            <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>
    </div>
  );

  };

  const renderDetails = () => {
    if (!transaction) return null;
    
    // Determine the amount to display for THIS payment attempt
    let amountToDisplay = transaction.totalAmount;
    if (transaction.installmentPlan) {
        if (payMode === 'INSTALLMENT') {
             amountToDisplay = dpAmount + (transaction.uniqueCode || 0);
        } else {
             amountToDisplay = transaction.totalAmount + (transaction.uniqueCode || 0);
        }
    } else {
        amountToDisplay = transaction.totalAmount + (transaction.uniqueCode || 0);
    }

    return (
      <div className="space-y-6">
        {/* Header Status */}
        <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg flex items-start gap-3">
           <Clock className="text-orange-600 shrink-0" size={20} />
           <div>
             <p className="text-sm font-bold text-orange-800">Payment Pending</p>
             <p className="text-xs text-orange-600">Please complete payment before {new Date(transaction.expiryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
           </div>
        </div>

        {/* BANK TRANSFER VIEW */}
        {transaction.method === 'BANK_TRANSFER' && transaction.bankDetails && (
          <div className="space-y-4 animate-fade-in">
             <div className="text-center py-2">
                <p className="text-sm text-slate-500">Transfer EXACTLY amount below:</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                   <h2 className="text-3xl font-bold text-slate-900">{formatIDR(amountToDisplay)}</h2>
                   <button onClick={() => handleCopy(amountToDisplay.toString())} className="text-blue-600 p-1 hover:bg-blue-50 rounded"><Copy size={16}/></button>
                </div>
                <p className="text-xs text-red-500 mt-1 font-medium bg-red-50 inline-block px-2 py-1 rounded">IMPORTANT: Unique code {transaction.uniqueCode} included for auto-verify</p>
             </div>

             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-sm text-slate-500">Bank</span>
                   <span className="font-bold text-slate-900">{transaction.bankDetails.bankName}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                   <span className="text-sm text-slate-500">Account No.</span>
                   <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{transaction.bankDetails.accountNumber}</span>
                      <button onClick={() => handleCopy(transaction.bankDetails!.accountNumber)} className="text-blue-600"><Copy size={14}/></button>
                   </div>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-sm text-slate-500">Account Name</span>
                   <span className="font-medium text-slate-900">{transaction.bankDetails.accountHolder}</span>
                </div>
             </div>

             <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-3">
                   {uploadFile ? <CheckCircle size={24} /> : <UploadCloud size={24} />}
                </div>
                <p className="text-sm font-medium text-slate-700">{uploadFile ? uploadFile.name : 'Upload Payment Receipt'}</p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG or PDF (Max 2MB)</p>
             </div>

             <button 
               onClick={handleUploadProof}
               disabled={!uploadFile || isUploading}
               className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
             >
                {isUploading ? 'Uploading...' : 'Confirm Transfer'}
             </button>
          </div>
        )}

        {/* VA VIEW */}
        {transaction.method === 'VIRTUAL_ACCOUNT_BCA' && (
           <div className="space-y-6 text-center animate-fade-in">
              <p className="text-sm text-slate-500">Pay via BCA Mobile / ATM to:</p>
              <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
                 <div className="text-3xl font-mono font-bold text-slate-900 tracking-wider mb-2">
                    {transaction.virtualAccountNumber}
                 </div>
                 <button onClick={() => handleCopy(transaction.virtualAccountNumber || '')} className="text-blue-600 text-sm font-medium hover:underline flex items-center justify-center">
                    <Copy size={14} className="mr-1"/> Copy VA Number
                 </button>
              </div>
              <div className="text-left text-sm text-slate-600 space-y-2 bg-slate-50 p-4 rounded-lg">
                 <p className="font-bold mb-2">How to pay:</p>
                 <ol className="list-decimal list-inside space-y-1">
                    <li>Open BCA Mobile</li>
                    <li>Select m-Transfer {'>'} BCA Virtual Account</li>
                    <li>Input VA Number above</li>
                    <li>Confirm amount: {formatIDR(amountToDisplay)}</li>
                 </ol>
              </div>
              <button 
                 onClick={handleSimulateSuccess} 
                 disabled={isLoading}
                 className="w-full bg-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-300 disabled:opacity-50"
              >
                 {isLoading ? 'Confirming...' : 'Simulate: I Have Paid'}
              </button>
           </div>
        )}

        {/* QRIS VIEW */}
        {transaction.method === 'QRIS' && (
           <div className="space-y-6 text-center animate-fade-in">
              <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block shadow-sm">
                 <img src={transaction.qrisUrl} alt="QRIS" className="w-48 h-48 mx-auto" />
              </div>
              <p className="text-sm text-slate-500">Scan using GoPay, OVO, Dana, or BCA Mobile</p>
              <div className="flex items-center justify-center gap-2">
                 <span className="text-2xl font-bold text-slate-900">{formatIDR(amountToDisplay)}</span>
              </div>
              <button 
                 onClick={handleSimulateSuccess} 
                 disabled={isLoading}
                 className="w-full bg-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-300 disabled:opacity-50"
              >
                 {isLoading ? 'Confirming...' : 'Simulate: I Have Scanned'}
              </button>
           </div>
        )}

        {/* CREDIT CARD VIEW */}
        {transaction.method === 'CREDIT_CARD' && (
           <div className="space-y-4 animate-fade-in">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg mb-4 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-20"><CreditCard size={100} /></div>
                 <div className="relative z-10">
                    <p className="text-xs text-slate-300 mb-2">CARD NUMBER</p>
                    <p className="text-xl font-mono tracking-widest mb-6">•••• •••• •••• ••••</p>
                    <div className="flex justify-between">
                       <div><p className="text-xs text-slate-300">HOLDER</p><p className="font-medium">YOUR NAME</p></div>
                       <div><p className="text-xs text-slate-300">EXP</p><p className="font-medium">MM/YY</p></div>
                    </div>
                 </div>
              </div>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); handleSimulateSuccess(); }}>
                 <input type="text" placeholder="Card Number" className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                 <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="MM/YY" className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="text" placeholder="CVC" className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                 </div>
                 <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors mt-2 disabled:opacity-50">
                    {isLoading ? 'Processing...' : `Pay ${formatIDR(amountToDisplay)}`}
                 </button>
              </form>
           </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      {simulatedSuccessOpen && transaction && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-sim-success-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-green-500 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-white/20 p-2.5">
                  <CheckCircle className="h-7 w-7" aria-hidden />
                </div>
                <div className="text-left">
                  <h3
                    id="payment-sim-success-title"
                    className="text-lg font-bold leading-tight"
                  >
                    Payment Successful
                  </h3>
                  <p className="text-xs text-emerald-50">
                    Your order has been confirmed and recorded.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left">
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                  Payment Summary
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  We have received your payment confirmation. Your access/entitlement will be available in your account.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total Paid
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatIDR(transaction.totalAmount)}
                  </p>
                </div>
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Order Reference
                  </p>
                  <p className="mt-1 break-all rounded-md bg-white px-2.5 py-2 font-mono text-[11px] text-slate-600">
                    {transaction.orderId}
                  </p>
                </div>
              </div>

              <p className="text-center text-xs text-slate-500">
                You can review transaction details anytime from your order history.
              </p>

              {successSplashAutoClose && (
                <p className="text-center text-[11px] font-medium text-slate-500">
                  This window will close automatically in a moment…
                </p>
              )}

              <button
                type="button"
                onClick={handleFinalizeSimulatedPayment}
                disabled={isLoading}
                className="w-full rounded-xl bg-slate-900 py-3 font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {successSplashAutoClose
                  ? 'Close'
                  : isLoading
                    ? 'Processing...'
                    : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
             <h2 className="text-lg font-bold text-slate-900">Checkout</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'SUMMARY' && renderSummary()}
        </div>

        {/* Modal Footer (Security Badge) */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-col justify-center items-center gap-1 text-xs text-slate-400">
           <span className="flex items-center">
             <ShieldCheck size={12} className="mr-1.5" />
             Secure checkout · server-validated totals
           </span>
           {MIDTRANS_UI_DISABLED && (
             <span className="text-amber-700/90">
               Midtrans Snap is disabled by default. Set{' '}
               <code className="rounded bg-amber-100/80 px-1">NEXT_PUBLIC_MIDTRANS_UI_DISABLED=false</code>{' '}
               to use the real Midtrans UI.
             </span>
           )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
