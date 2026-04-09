
import React, { useState, useEffect, useRef } from 'react';
import { X, CreditCard, QrCode, Building2, Smartphone, Copy, UploadCloud, CheckCircle, AlertCircle, Clock, ShieldCheck, Loader2, Tag, ChevronRight, Mail, Trash2, Plus, Minus, Zap, PieChart } from 'lucide-react';
import { PaymentMethodType, PaymentTransaction, Product, UserRole, Discount, CartItem } from '../../types/index';
import { PaymentService } from '../../services/paymentService';
import { DiscountService } from '../../services/discountService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[]; 
  products: Product[];
  userEmail: string;
  userRole: UserRole;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
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
    onUpdateQuantity,
    onRemoveItem,
    preAppliedDiscountCode,
    attributionSource,
    onPaymentSuccess,
}) => {
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

  // Handle Auto-Apply Discount
  useEffect(() => {
      if (preAppliedDiscountCode && !appliedDiscount) {
          setVoucherCode(preAppliedDiscountCode);
          setTimeout(() => handleApplyVoucher(), 100); 
      }
  }, [preAppliedDiscountCode, cart]);

  // Cart Calculation Logic
  const calculateCartTotals = () => {
      let subTotal = 0;
      cart.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
              subTotal += product.priceIdr * item.quantity;
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

  useEffect(() => {
      if (appliedDiscount) {
          handleApplyVoucher();
      }
  }, [cart]);

  const handleApplyVoucher = async () => {
      if ((!voucherCode && !preAppliedDiscountCode) && !appliedDiscount) return;
      const codeToUse = voucherCode || preAppliedDiscountCode || appliedDiscount?.discount.code || '';
      
      setIsCheckingVoucher(true);
      setVoucherError('');

      // Simulate Network
      await new Promise(r => setTimeout(r, 600));

      try {
          const discount = await DiscountService.findByCode(codeToUse);
          if (!discount) {
              setVoucherError('Invalid voucher code.');
              setAppliedDiscount(null);
              setIsCheckingVoucher(false);
              return;
          }

          const validation = await DiscountService.isValid(discount, userRole);
          if (!validation.valid) {
              setVoucherError(validation.reason || 'Voucher not applicable.');
              setAppliedDiscount(null);
              setIsCheckingVoucher(false);
              return;
          }

          let totalDiscount = 0;
          
          cart.forEach(item => {
              const product = products.find(p => p.id === item.productId);
              if (product) {
                  const itemDiscount = DiscountService.calculateDiscount(
                      discount, 
                      product.priceIdr, 
                      item.quantity,
                      product.category,
                      product.id
                  );
                  if(discount.type === 'PERCENTAGE') {
                      totalDiscount += itemDiscount * item.quantity;
                  } else {
                      totalDiscount += itemDiscount; 
                  }
              }
          });

          if (totalDiscount === 0) {
              setVoucherError('Voucher code is valid but not applicable to items in your cart.');
              setAppliedDiscount(null);
          } else {
              setAppliedDiscount({ discount, amount: totalDiscount });
          }
      } catch (error) {
          console.error("Voucher check failed", error);
          setVoucherError('Error checking voucher.');
      } finally {
          setIsCheckingVoucher(false);
      }
  };

  const handleInitiatePayment = async () => {
    if (snapPayInFlightRef.current) return; // prevent double snap.pay while popup is still open
    if (!customerEmail || !customerEmail.includes('@')) {
        alert("Please enter a valid email address for the receipt.");
        return;
    }

    setIsLoading(true);
    setErrorMessage(null); // Reset error
    snapPayInFlightRef.current = true;

    try {
      const transactionItems = cart.map(item => {
        const p = products.find(prod => prod.id === item.productId);
        return {
          id: item.productId,
          name: p?.title || 'Unknown Item',
          price: p?.priceIdr || 0,
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
              // Script is being/was loaded; wait a tick.
              setTimeout(
                () =>
                  (window as any).snap
                    ? resolve()
                    : reject(new Error('Midtrans snap not ready')),
                500,
              );
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
              );
              onPaymentSuccess?.();
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

  // --- CRITICAL UPDATE: ACTUALLY PROCESS THE MOCK PAYMENT ---
  const handleSimulateSuccess = async () => {
      if(!transaction) return;
      setIsLoading(true);
      try {
          // This call ensures Entitlements are granted even for manual/simulated payments
          await PaymentService.confirmManualTransfer(
            transaction.id,
            transaction.totalAmount,
            transaction.itemsSnapshot,
            transaction.customerEmail,
          );
          onClose();
      } catch (e) {
          setErrorMessage("Simulation failed. Try again.");
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
            Menunggu konfirmasi pembayaran di Midtrans...
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
                    {formatIDR(product.priceIdr)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white border border-slate-200 rounded-md">
                    <button
                      onClick={() => onUpdateQuantity(item.productId, -1)}
                      className="px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                      disabled={item.quantity <= 1}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="px-2 text-xs font-semibold w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.productId, 1)}
                      className="px-2 py-1 text-slate-500 hover:bg-slate-100"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.productId)}
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
          <span>{formatIDR(subTotal)}</span>
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
          <span className="text-2xl text-blue-600">{formatIDR(totalAmount)}</span>
        </div>
        
        {/* Installment breakdown removed (Midtrans token uses full total) */}
      </div>

      <button 
        onClick={handleInitiatePayment}
        disabled={totalAmount <= 0 || cart.length === 0 || isMidtransPopupOpen}
        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg flex justify-center items-center group disabled:opacity-50"
      >
        Proceed to Pay {formatIDR(totalAmount)}
        <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
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
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-center items-center text-xs text-slate-400">
           <ShieldCheck size={12} className="mr-1.5" />
           High-Traffic Queue Protection Enabled
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
