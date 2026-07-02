
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Product, CartItem, UserRole, Event } from '../../types/index';
import { DataService } from '../../services/dataService'; 
import { EntitlementService } from '../../services/entitlementService'; 
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
    Search,
    Image as ImageIcon,
    Percent,
    Pencil,
    ShoppingCart,
    Plus,
    Zap,
    Trash2,
    ToggleRight,
    ToggleLeft,
    Package,
    LayoutGrid,
    AlertCircle,
} from 'lucide-react';
import PaymentModal from '../payment/PaymentModal';
import { ProductModal } from './ProductModal'; 
import ProductDetailModal from './ProductDetailModal'; 
import { CartService } from '../../services/cartService';
import { useAccess } from '../../context/SecurityContext';
import { PricingEngine } from '../../services/pricingEngine'; 
import { PricingRule } from '../../types/pricing';
import { UserEntitlements } from '../../types/access'; 
import { isEventExpiredForCatalog } from '@/lib/eventScheduleMeta';
import { EmptyStatePlaceholder } from './EmptyStatePlaceholder';
import { CampaignService } from '../../services/campaignService';
import { CampaignAttributionService } from '../../services/campaignAttributionService';
import { UserVoucherService } from '../../services/userVoucherService';
import { getWorkspaceToken } from '../../lib/workspaceAuthToken';
import { formatStorePriceIdr } from '../../utils/formatStorePrice';
import { useDialog } from '../../context/DialogContext';

const PAGE_SIZE = 18;

function parseCampaignCheckoutSearch(search: string): {
    querySource: string | null;
    queryProductId: string | null;
    queryDiscount: string;
    queryAutoCheckout: boolean;
} {
    const params = new URLSearchParams(search);
    const querySource = params.get('source');
    const queryProductId = params.get('productId') || params.get('product') || null;
    const queryDiscountTrim = params.get('discount')?.trim().toUpperCase() || '';
    const queryAutoCheckout =
        params.get('checkout') === '1' ||
        params.get('autocheckout') === '1' ||
        (Boolean(queryProductId) && Boolean(queryDiscountTrim));

    return {
        querySource,
        queryProductId: queryProductId?.trim() || null,
        queryDiscount: queryDiscountTrim,
        queryAutoCheckout,
    };
}

type StorefrontProps = {
    allowWorkspaceCheckoutConfig?: boolean;
    /** Workspace catalog only — hidden in My Zone consumer storefront. */
    showAddProduct?: boolean;
};

const Storefront: React.FC<StorefrontProps> = ({
    allowWorkspaceCheckoutConfig = false,
    showAddProduct = false,
}) => {
    const { user, userRole } = useAuth();
    const { showToast } = useToast();
    const { confirm } = useDialog();
    const { can } = useAccess('ops_inventory'); 
    
    const canManageStore = can('WRITE');

    const isStoreAdmin = useMemo(
        () =>
            userRole === UserRole.SUPER_ADMIN ||
            userRole === UserRole.OPERATIONS,
        [userRole],
    );

    const [products, setProducts] = useState<Product[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [pricingRules, setPricingRules] = useState<PricingRule[]>([]); 
    const [cart, setCart] = useState<CartItem[]>([]);
    
    const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [categories] = useState<string[]>(['All', 'Packages', 'Certification', 'Upgrade', 'Merchandise', 'Digital', 'Token']);
    
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [attributionSource, setAttributionSource] = useState<string | undefined>(undefined); 
    const [autoAppliedDiscount, setAutoAppliedDiscount] = useState<string>('');
    const [stickyVoucher, setStickyVoucher] = useState<{ code: string; productId?: string } | null>(null);
    const [autoCheckoutProductId, setAutoCheckoutProductId] = useState<string | null>(null);
    const [autoCheckoutArmed, setAutoCheckoutArmed] = useState(false);
    const [campaignVoucherDismissed, setCampaignVoucherDismissed] = useState(false);

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

    const [activeVariantSelections, setActiveVariantSelections] = useState<Record<string, string>>({});

    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    /** Set when pricing rules / products / entitlements fetch fails (e.g. API 500 from DB timeout). */
    const [listLoadError, setListLoadError] = useState<string | null>(null);
    const cartHydratedRef = useRef(false);

    const scrollRootRef = useRef<HTMLDivElement>(null);
    const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
    const listFetchGenRef = useRef(0);
    const pageRef = useRef(1);
    const campaignTargetSeenInCartRef = useRef(false);

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchTerm), 350);
        return () => window.clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncCampaignContextFromUrl = () => {
            const {
                querySource,
                queryProductId,
                queryDiscount,
                queryAutoCheckout,
            } = parseCampaignCheckoutSearch(window.location.search);

            setCampaignVoucherDismissed(false);
            setAutoAppliedDiscount(queryDiscount);
            setAutoCheckoutProductId(queryProductId);
            setAutoCheckoutArmed(queryAutoCheckout);
            campaignTargetSeenInCartRef.current = false;

            const sourceFromStorage = CampaignAttributionService.getSource();
            if (!querySource) {
                setAttributionSource(sourceFromStorage);
                return;
            }

            const normalizedSource = CampaignAttributionService.saveSource(querySource);
            setAttributionSource(normalizedSource || sourceFromStorage);

            if (!normalizedSource || !CampaignAttributionService.shouldTrackClick(normalizedSource)) {
                return;
            }

            CampaignService.trackClick(normalizedSource).catch((error) => {
                console.warn('[Campaign] Failed to track click:', error);
            });
        };

        syncCampaignContextFromUrl();
        window.addEventListener('popstate', syncCampaignContextFromUrl);
        return () => window.removeEventListener('popstate', syncCampaignContextFromUrl);
    }, []);

    const clearCampaignCheckoutParams = useCallback(() => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        url.searchParams.delete('discount');
        url.searchParams.delete('product');
        url.searchParams.delete('productId');
        url.searchParams.delete('checkout');
        url.searchParams.delete('autocheckout');
        url.searchParams.delete('source');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }, []);

    // Load sticky voucher from backend (per-account)
    useEffect(() => {
      if (!user?.id) return;
      (async () => {
        try {
          const v = await UserVoucherService.getMyVoucher();
          if (v?.code) {
            setStickyVoucher({ code: v.code, productId: v.productId });
          } else {
            setStickyVoucher(null);
          }
        } catch (error) {
          console.warn(
            '[Storefront] Failed to load sticky voucher:',
            error instanceof Error ? error.message : error,
          );
        }
      })();
    }, [user?.id]);

    useEffect(() => {
      if (!autoAppliedDiscount || !autoCheckoutProductId) return;
      const hasTargetInCart = cart.some(
        (item) => item.productId === autoCheckoutProductId,
      );
      if (hasTargetInCart) {
        campaignTargetSeenInCartRef.current = true;
        return;
      }
      if (!campaignTargetSeenInCartRef.current) return;

      setCampaignVoucherDismissed(true);
      setAutoAppliedDiscount('');
      setAutoCheckoutArmed(false);
      campaignTargetSeenInCartRef.current = false;
      setStickyVoucher((prev) => {
        if (!prev) return prev;
        const sameCode =
          prev.code.trim().toUpperCase() === autoAppliedDiscount.trim().toUpperCase();
        const sameProduct =
          !prev.productId || prev.productId === autoCheckoutProductId;
        return sameCode && sameProduct ? null : prev;
      });
      clearCampaignCheckoutParams();
    }, [
      autoAppliedDiscount,
      autoCheckoutProductId,
      cart,
      clearCampaignCheckoutParams,
    ]);

    const buildListQuery = useCallback(
        (pageNum: number) => ({
            page: pageNum,
            limit: PAGE_SIZE,
            search: debouncedSearch.trim() || undefined,
            category: selectedCategory === 'All' ? undefined : selectedCategory,
            sortBy: 'title' as const,
            sortOrder: 'asc' as const,
            isActive: isStoreAdmin ? undefined : true,
        }),
        [debouncedSearch, selectedCategory, isStoreAdmin],
    );

    useEffect(() => {
        let cancelled = false;
        listFetchGenRef.current += 1;
        const gen = listFetchGenRef.current;

        (async () => {
            setListLoading(true);
            setListLoadError(null);
            setProducts([]);
            setPage(1);
            pageRef.current = 1;
            setHasMore(true);

            try {
                const [rules, userEnt, catalogEvents] = await Promise.all([
                    PricingEngine.getRules(),
                    user ? EntitlementService.getUserEntitlements(user.id) : Promise.resolve(null),
                    DataService.getEvents(),
                ]);
                if (cancelled || gen !== listFetchGenRef.current) return;
                setPricingRules(rules);
                setEntitlements(userEnt);
                setEvents(catalogEvents);

                const { data, total: t } = await DataService.listProducts(buildListQuery(1));
                if (cancelled || gen !== listFetchGenRef.current) return;

                setProducts(data);
                setTotal(t);
                pageRef.current = 1;
                setHasMore(t > 0 && data.length < t);

                // Auto-checkout: if URL carries productId+discount, prefill cart then open checkout.
                if (autoCheckoutArmed && autoCheckoutProductId) {
                  const target = data.find((p) => p.id === autoCheckoutProductId);
                  if (target) {
                    setCart([{ productId: target.id, variantId: target.hasVariants ? (target.variants?.[0]?.id ?? undefined) : undefined, quantity: 1 }]);
                    setIsPaymentModalOpen(true);
                  }
                }
            } catch (err) {
                if (!cancelled && gen === listFetchGenRef.current) {
                    const raw = err instanceof Error ? err.message : String(err);
                    let detail = raw;
                    try {
                        const parsed = JSON.parse(raw) as { message?: string };
                        if (typeof parsed?.message === 'string') detail = parsed.message;
                    } catch {
                        /* keep raw */
                    }
                    setListLoadError(
                        `Failed to load the store. ${detail} — check Nest server logs (often a database timeout or lost connection to Postgres/Supabase).`,
                    );
                    showToast('Failed to load store data', 'error');
                }
            } finally {
                if (!cancelled && gen === listFetchGenRef.current) {
                    setListLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, debouncedSearch, selectedCategory, buildListQuery, autoCheckoutArmed, autoCheckoutProductId]);

    // If URL had voucher params, claim to backend so it sticks to account.
    useEffect(() => {
      if (!user?.id) return;
      if (!autoAppliedDiscount) return;
      // Only claim once per mount for this page.
      (async () => {
        try {
          await UserVoucherService.claimMyVoucher(autoAppliedDiscount, autoCheckoutProductId ?? undefined);
          setStickyVoucher({ code: autoAppliedDiscount, productId: autoCheckoutProductId ?? undefined });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Could not save voucher campaign.';
          showToast(message, 'error');
        }
      })();
    }, [user?.id, autoAppliedDiscount, autoCheckoutProductId, showToast]);

    /** Buyer-side realtime: pick up updates if backend revokes / refreshes sticky voucher. */
    useEffect(() => {
      if (!user?.id) return;
      let cancelled = false;
      const refresh = async () => {
        try {
          const v = await UserVoucherService.getMyVoucher();
          if (cancelled) return;
          setStickyVoucher(v?.code ? { code: v.code, productId: v.productId } : null);
        } catch (error) {
          if (!cancelled) {
            console.warn(
              '[Storefront] Failed to refresh sticky voucher:',
              error instanceof Error ? error.message : error,
            );
          }
        }
      };

      const onFocus = () => { void refresh(); };
      window.addEventListener('focus', onFocus);
      return () => {
        cancelled = true;
        window.removeEventListener('focus', onFocus);
      };
    }, [user?.id]);

    useEffect(() => {
        setActiveVariantSelections((prev) => {
            const next = { ...prev };
            for (const p of products) {
                if (p.hasVariants && p.variants?.length && !next[p.id]) {
                    next[p.id] = p.variants[0].id;
                }
            }
            return next;
        });
    }, [products]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const active = await CartService.getActiveCart(user?.id);
                if (cancelled) return;
                if (cartHydratedRef.current) return;
                if (active?.status !== 'ACTIVE') return;
                if (!Array.isArray(active.items) || active.items.length === 0) return;

                setCart((prev) => (prev.length > 0 ? prev : active.items));
                cartHydratedRef.current = true;
            } catch {
                // Ignore restore failures; cart is still usable in-memory.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            const nextPage = pageRef.current + 1;
            const { data, total: t } = await DataService.listProducts(buildListQuery(nextPage));
            setTotal(t);

            let mergedLength = 0;
            setProducts((prev) => {
                const seen = new Set(prev.map((p) => p.id));
                const merged = [...prev];
                for (const p of data) {
                    if (!seen.has(p.id)) {
                        seen.add(p.id);
                        merged.push(p);
                    }
                }
                mergedLength = merged.length;
                return merged;
            });

            pageRef.current = nextPage;
            setPage(nextPage);
            setHasMore(mergedLength < t);
        } catch {
            showToast('Could not load more products', 'error');
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, buildListQuery, showToast]);

    useEffect(() => {
        const root = scrollRootRef.current;
        const target = loadMoreSentinelRef.current;
        if (!root || !target) return;

        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    void loadMore();
                }
            },
            { root, rootMargin: '240px', threshold: 0 },
        );
        obs.observe(target);
        return () => obs.disconnect();
    }, [loadMore]);

    /** Debounced: `products` refetches (pagination, save) must not spam POST /carts/sync. */
    useEffect(() => {
        const totalValue = cart.reduce((sum, item) => {
            const p = products.find((prod) => prod.id === item.productId);
            if (!p) return sum;

            let price = p.priceIdr;
            if (p.hasVariants && item.variantId) {
                const v = p.variants?.find((vv) => vv.id === item.variantId);
                if (v) price = v.priceIdr;
            }
            return sum + price * item.quantity;
        }, 0);

        const tid = window.setTimeout(() => {
            void CartService.syncCart(user?.id, cart, totalValue);
        }, 450);

        return () => window.clearTimeout(tid);
    }, [cart, user, products]);

    const isProductExpired = useCallback(
        (p: Product) => {
            const today = new Date().toISOString().split('T')[0];

            const checkItems = (items: { type: string; meta?: { eventId?: string; expiration?: string } }[]) => {
                for (const item of items) {
                    if (item.type === 'TICKET' && item.meta?.eventId) {
                        const evt = events.find((e) => e.id === item.meta!.eventId);
                        if (isEventExpiredForCatalog(evt, events, today)) return true;
                    }
                    if (
                        (item.type === 'EVENT_CREDIT' || item.type === 'RECURRING_PASS') &&
                        item.meta?.expiration
                    ) {
                        if (item.meta.expiration !== 'NEVER' && item.meta.expiration < today) return true;
                    }
                }
                return false;
            };

            if (checkItems(p.items)) return true;

            if (p.hasVariants && p.variants) {
                for (const v of p.variants) {
                    if (checkItems(v.items)) return true;
                }
            }

            return false;
        },
        [events],
    );

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const expired = isProductExpired(p);
            const isActive = p.isActive !== false;

            if ((!isActive || expired) && !isStoreAdmin) {
                return false;
            }
            return true;
        });
    }, [products, isProductExpired, isStoreAdmin]);

    const formatIDR = (num: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    
    const getProductPricing = (product: Product, variantId?: string) => {
        let basePrice = product.priceIdr;
        if (product.hasVariants && variantId && product.variants) {
            const v = product.variants.find((v) => v.id === variantId);
            if (v) basePrice = v.priceIdr;
        }

        const proxyProduct = { ...product, priceIdr: basePrice };

        const calculation = PricingEngine.calculatePrice(proxyProduct, entitlements, 1, pricingRules);
        return {
            price: calculation.finalPrice,
            original: basePrice,
            appliedRules: calculation.appliedRules,
        };
    };

    const addToCart = (product: Product, specificVariantId?: string) => {
        /** Token = wallet credits: require a real account (not guest). Workspace JWT is preferred for API calls but not the only signal — signed-in members should not be blocked if the tab has a valid session without JWT yet. */
        const canPurchaseToken =
            Boolean(getWorkspaceToken()) ||
            (Boolean(user?.id) && userRole !== UserRole.GUEST);
        if (product.category === 'Token' && !canPurchaseToken) {
            showToast('Please sign in to purchase wallet credits.', 'info');
            window.location.assign('/');
            return;
        }
        if (product.isActive === false) {
            showToast('This product is currently inactive.', 'error');
            return;
        }
        if (isProductExpired(product)) {
            showToast('This product contains expired events and cannot be purchased.', 'error');
            return;
        }

        let variantId = specificVariantId;

        if (!variantId && product.hasVariants) {
            variantId = activeVariantSelections[product.id];
            if (!variantId && product.variants?.length) variantId = product.variants[0].id;
        }

        setCart((prev) => {
            const existing = prev.find(
                (item) => item.productId === product.id && item.variantId === variantId,
            );

            if (existing) {
                return prev.map((item) =>
                    item.productId === product.id && item.variantId === variantId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                );
            }
            return [...prev, { productId: product.id, variantId, quantity: 1 }];
        });

        const variantName = product.variants?.find((v) => v.id === variantId)?.name;
        showToast(
            `Added "${product.title} ${variantName ? `(${variantName})` : ''}" to cart`,
            'success',
        );
    };

    const lineKey = (productId: string, variantId?: string) =>
        `${productId}\0${variantId ?? ''}`;

    const updateCartQuantity = (productId: string, variantId: string | undefined, delta: number) =>
        setCart((prev) =>
            prev.map((item) =>
                lineKey(item.productId, item.variantId) === lineKey(productId, variantId)
                    ? { ...item, quantity: Math.max(1, item.quantity + delta) }
                    : item,
            ),
        );
    const removeFromCart = (productId: string, variantId: string | undefined) =>
        setCart((prev) =>
            prev.filter((item) => lineKey(item.productId, item.variantId) !== lineKey(productId, variantId)),
        );
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const refetchFirstPage = useCallback(async () => {
        listFetchGenRef.current += 1;
        const gen = listFetchGenRef.current;
        const { data, total: t } = await DataService.listProducts(buildListQuery(1));
        if (gen !== listFetchGenRef.current) return;
        setProducts(data);
        setTotal(t);
        setPage(1);
        pageRef.current = 1;
        setHasMore(t > 0 && data.length < t);
    }, [buildListQuery]);

    const handleCreateProduct = () => {
        setEditingProduct(undefined);
        setIsProductModalOpen(true);
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setIsProductModalOpen(true);
    };

    const handleDeleteProduct = async (product: Product) => {
        const ok = await confirm({
            title: 'Delete this product?',
            variant: 'danger',
            confirmLabel: 'Delete product',
            cancelLabel: 'Cancel',
            message: (
                <span className="text-sm text-slate-600">
                    Permanently delete{' '}
                    <strong className="text-slate-900">{product.title}</strong>? This cannot be undone and may affect
                    orders or access tied to this catalog item.
                </span>
            ),
        });
        if (!ok) return;
        try {
            await DataService.deleteProduct(product.id);
            showToast('Product deleted.', 'success');
            await refetchFirstPage();
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Could not delete product.', 'error');
        }
    };

    const handleToggleActive = async (product: Product) => {
        const isActive = product.isActive !== false;

        await DataService.upsertProduct({ ...product, isActive: !isActive });
        showToast(`Product ${!isActive ? 'Activated' : 'Deactivated'}`, 'success');
        await refetchFirstPage();
    };

    const handleSaveProduct = async (product: Product) => {
        const saved = await DataService.upsertProduct(
            product,
            editingProduct ? undefined : { intent: 'create' },
        );
        if (saved.id !== product.id) {
            setActiveVariantSelections((prev) => {
                const v = prev[product.id];
                if (v === undefined) return prev;
                const next = { ...prev };
                delete next[product.id];
                next[saved.id] = v;
                return next;
            });
        }
        showToast(editingProduct ? 'Product updated' : 'Product created', 'success');
        setIsProductModalOpen(false);
        await refetchFirstPage();
    };

    return (
        <div className="flex w-full min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-50 sm:min-h-0 sm:h-full sm:overflow-hidden">
            <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-slate-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:p-4 min-w-0">
                <div className="relative min-w-0 w-full sm:max-w-md sm:flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" aria-hidden />
                    <input type="search" placeholder="Search products…" className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} aria-label="Search products" />
                </div>
                
                <div className="flex w-full min-w-0 items-center gap-1.5 sm:gap-2 sm:w-auto sm:max-w-[55%] md:max-w-none">
                    <div className="min-w-0 flex-1 overflow-x-scroll-touch rounded-full bg-slate-100/80 py-1 pl-1 pr-0.5">
                        <div className="inline-flex flex-nowrap gap-1.5">
                            {categories.map(cat => (
                                <button key={cat} type="button" onClick={() => setSelectedCategory(cat)} className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${selectedCategory === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200/80 hover:bg-slate-50'}`}>{cat}</button>
                            ))}
                        </div>
                    </div>
                    {canManageStore && showAddProduct && (
                        <button
                            type="button"
                            onClick={handleCreateProduct}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700 sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded-full sm:px-4 sm:py-2 sm:text-sm sm:font-bold"
                            aria-label="Add product"
                            title="Add product"
                        >
                            <Plus size={17} className="shrink-0" aria-hidden />
                            <span className="hidden sm:inline">Add product</span>
                        </button>
                    )}
                    <button type="button" onClick={() => cart.length > 0 ? setIsPaymentModalOpen(true) : showToast('Cart empty', 'info')} className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:h-auto sm:w-auto sm:p-2.5" aria-label={`Cart, ${cartCount} items`}>
                        <ShoppingCart size={18} />
                        {cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">{cartCount}</span>}
                    </button>
                </div>
            </div>

            <div className="w-full p-3 sm:min-h-0 sm:flex-1 sm:overflow-auto sm:p-6" ref={scrollRootRef}>
                {listLoading ? (
                    <div className="flex min-h-[160px] items-center justify-center py-16">
                        <p className="text-center text-sm text-slate-400">Loading products…</p>
                    </div>
                ) : listLoadError ? (
                    <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 py-16 px-4 text-center">
                        <AlertCircle className="shrink-0 text-slate-300" strokeWidth={1.25} size={44} aria-hidden />
                        <p className="max-w-lg text-sm text-slate-600">{listLoadError}</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <EmptyStatePlaceholder
                        icon={products.length === 0 ? Package : LayoutGrid}
                        message={
                            products.length === 0
                                ? 'No products in the catalog yet.'
                                : 'No products match the current filters.'
                        }
                    />
                ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-3">
                    {filteredProducts.map((product) => {
                        const selectedVariantId = activeVariantSelections[product.id];
                        const { price, original, appliedRules } = getProductPricing(product, selectedVariantId);
                        const hasDynamicDiscount = price < original;
                        const displayComparePrice = product.compareAtPriceIdr || (hasDynamicDiscount ? original : undefined);
                        
                        const discountPercent = displayComparePrice 
                            ? Math.round(((displayComparePrice - price) / displayComparePrice) * 100) 
                            : 0;
                        
                        const expired = isProductExpired(product);
                        const isActive = product.isActive !== false;

                        return (
                            <div 
                                key={product.id} 
                                className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-xl ${expired || !isActive ? 'opacity-75 grayscale hover:grayscale-0' : ''}`}
                                onClick={() => setViewingProduct(product)}
                            >
                                {canManageStore && (
                                    <div className="absolute top-2 left-2 z-20 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                         <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleEditProduct(product); }}
                                            className="touch-target rounded-lg border border-slate-200 bg-white/90 p-1.5 text-blue-600 shadow-sm backdrop-blur hover:bg-blue-50"
                                            title="Edit"
                                            aria-label="Edit product"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleToggleActive(product); }}
                                            className={`touch-target rounded-lg border border-slate-200 bg-white/90 p-1.5 shadow-sm backdrop-blur ${isActive ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-50'}`}
                                            title={isActive ? "Deactivate" : "Activate"}
                                            aria-label={isActive ? 'Deactivate product' : 'Activate product'}
                                        >
                                            {isActive ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); void handleDeleteProduct(product); }}
                                            className="touch-target rounded-lg border border-slate-200 bg-white/90 p-1.5 text-red-600 shadow-sm backdrop-blur hover:bg-red-50"
                                            title="Delete"
                                            aria-label="Delete product"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                                
                                {expired && (
                                    <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-center text-[10px] font-bold py-1 z-10 shadow-md">
                                        EXPIRED COMPONENT (INTERNAL VIEW)
                                    </div>
                                )}
                                {!isActive && !expired && (
                                    <div className="absolute top-0 left-0 right-0 bg-slate-500 text-white text-center text-[10px] font-bold py-1 z-10 shadow-md">
                                        INACTIVE (INTERNAL VIEW)
                                    </div>
                                )}

                                <div className="group/image relative h-48 overflow-hidden bg-slate-100">
                                    {product.imageUrl ? (
                                        <img 
                                            src={product.imageUrl} 
                                            alt={product.title} 
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement?.querySelector('.fallback-img')?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    
                                    <div className={`fallback-img absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-300 ${product.imageUrl ? 'hidden' : ''}`}>
                                        <ImageIcon size={48} strokeWidth={2} />
                                    </div>

                                    <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                                        <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm backdrop-blur">
                                            {product.category === 'Token' ? 'TOKEN' : product.category}
                                        </div>
                                        {product.category === 'Token' && displayComparePrice && !expired && isActive && (
                                            <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-wide">
                                                Potongan harga
                                            </div>
                                        )}
                                        {discountPercent > 0 && !expired && isActive && (
                                            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center">
                                                <Percent size={10} className="mr-1"/> Save {discountPercent}%
                                            </div>
                                        )}
                                    </div>
                                    
                                    {hasDynamicDiscount && !expired && isActive && (
                                        <div className="absolute bottom-2 left-2 flex flex-col gap-1 items-start">
                                            {appliedRules.map((rule, idx) => (
                                                <div key={idx} className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm flex items-center">
                                                    <Zap size={8} className="mr-1" /> {rule.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-1 flex-col p-6">
                                    <h3 className="mb-2 line-clamp-2 text-xl font-bold leading-tight text-slate-900">{product.title}</h3>

                                    <p className="mb-6 line-clamp-2 flex-1 text-sm text-slate-500">{product.description}</p>
                                    
                                    <div className="mt-auto flex flex-row flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-6">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-baseline gap-2">
                                                <div className={`text-lg font-bold tabular-nums ${expired ? 'text-slate-400' : 'text-slate-900'}`}>{formatStorePriceIdr(price)}</div>
                                                {displayComparePrice && <div className="text-xs text-slate-400 line-through">{formatIDR(displayComparePrice)}</div>}
                                            </div>
                                        </div>
                                        {expired ? (
                                            <button 
                                                type="button"
                                                disabled
                                                className="shrink-0 cursor-not-allowed rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400 sm:text-sm"
                                            >
                                                Expired
                                            </button>
                                        ) : !isActive ? (
                                             <button 
                                                type="button"
                                                disabled
                                                className="shrink-0 cursor-not-allowed rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400 sm:text-sm"
                                            >
                                                Inactive
                                            </button>
                                        ) : (
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); addToCart(product); }} 
                                                className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700 active:scale-95"
                                            >
                                                Add to Cart
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                )}
                {!listLoading && filteredProducts.length > 0 && (
                    <div ref={loadMoreSentinelRef} className="h-px w-full" aria-hidden />
                )}
            </div>

            {viewingProduct && (
                <ProductDetailModal 
                    product={viewingProduct}
                    onClose={() => setViewingProduct(null)}
                    onAddToCart={addToCart}
                    initialVariantId={activeVariantSelections[viewingProduct.id]}
                />
            )}

            <PaymentModal 
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onPaymentSuccess={() => {
                    setCart([]);
                    showToast('Payment successful. Your order has been recorded.', 'success');
                    if (user?.id) {
                      void UserVoucherService.getMyVoucher()
                        .then((v) => {
                          setStickyVoucher(
                            v?.code
                              ? { code: v.code, productId: v.productId }
                              : null,
                          );
                        })
                        .catch(() => setStickyVoucher(null));
                    } else {
                      setStickyVoucher(null);
                    }
                }}
                cart={cart}
                products={products}
                userEmail={user?.email || 'guest@example.com'}
                userRole={userRole}
                walletUserId={
                  user && userRole !== UserRole.GUEST ? user.id : undefined
                }
                onUpdateQuantity={updateCartQuantity}
                onRemoveItem={removeFromCart}
                preAppliedDiscountCode={
                  campaignVoucherDismissed
                    ? undefined
                    : stickyVoucher?.code &&
                        (!stickyVoucher.productId ||
                          cart.some((c) => c.productId === stickyVoucher.productId))
                      ? stickyVoucher.code
                      : autoAppliedDiscount
                }
                attributionSource={attributionSource} 
                allowWorkspaceCheckoutConfig={allowWorkspaceCheckoutConfig}
            />

            {isProductModalOpen && (
                <ProductModal 
                    isOpen={isProductModalOpen}
                    onClose={() => setIsProductModalOpen(false)}
                    onSave={handleSaveProduct}
                    initialData={editingProduct}
                />
            )}
        </div>
    );
};

export default Storefront;
