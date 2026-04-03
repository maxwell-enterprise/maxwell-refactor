
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Product, CartItem, UserRole, Event } from '../../types/index';
import { DataService } from '../../services/dataService'; 
import { EntitlementService } from '../../services/entitlementService'; 
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Search, Image as ImageIcon, Percent, Pencil, ShoppingCart, Plus, Zap, ChevronDown, Trash2, ToggleRight, ToggleLeft } from 'lucide-react';
import PaymentModal from '../payment/PaymentModal';
import { ProductModal } from './ProductModal'; 
import ProductDetailModal from './ProductDetailModal'; 
import { CartService } from '../../services/cartService';
import { useAccess } from '../../context/SecurityContext';
import { PricingEngine } from '../../services/pricingEngine'; 
import { PricingRule } from '../../types/pricing';
import { UserEntitlements } from '../../types/access'; 
import { collectEventIdsFromProducts } from '../../utils/productEventRefs';

const PAGE_SIZE = 18;

const Storefront: React.FC = () => {
    const { user, userRole } = useAuth();
    const { showToast } = useToast();
    const { can } = useAccess('ops_inventory'); 
    
    const canManageStore = can('WRITE');

    const isStoreAdmin = useMemo(
        () =>
            userRole === UserRole.SUPER_ADMIN ||
            userRole === UserRole.OPERATIONS ||
            userRole === UserRole.MARKETING,
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
    const [categories] = useState<string[]>(['All', 'Packages', 'Certification', 'Upgrade', 'Merchandise', 'Digital']);
    
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [attributionSource, setAttributionSource] = useState<string | undefined>(undefined); 
    const [autoAppliedDiscount, setAutoAppliedDiscount] = useState<string>('');

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

    const [activeVariantSelections, setActiveVariantSelections] = useState<Record<string, string>>({});

    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const scrollRootRef = useRef<HTMLDivElement>(null);
    const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
    const listFetchGenRef = useRef(0);
    const fetchedEventIdsRef = useRef<Set<string>>(new Set());
    const pageRef = useRef(1);

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchTerm), 350);
        return () => window.clearTimeout(t);
    }, [searchTerm]);

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

    const mergeEventsForProducts = useCallback(async (batch: Product[]) => {
        const ids = collectEventIdsFromProducts(batch);
        const toFetch = ids.filter((id) => !fetchedEventIdsRef.current.has(id));
        for (const id of toFetch) {
            fetchedEventIdsRef.current.add(id);
        }
        if (toFetch.length === 0) return;

        const results = await Promise.all(toFetch.map((id) => DataService.getEventById(id)));
        const arrived = results.filter((e): e is Event => e != null);
        if (arrived.length === 0) return;

        setEvents((prev) => {
            const map = new Map(prev.map((e) => [e.id, e]));
            for (const e of arrived) {
                map.set(e.id, e);
            }
            return Array.from(map.values());
        });
    }, []);

    useEffect(() => {
        let cancelled = false;
        listFetchGenRef.current += 1;
        const gen = listFetchGenRef.current;

        fetchedEventIdsRef.current.clear();

        (async () => {
            setProducts([]);
            setPage(1);
            pageRef.current = 1;
            setHasMore(true);

            const [rules, userEnt] = await Promise.all([
                PricingEngine.getRules(),
                user ? EntitlementService.getUserEntitlements(user.id) : Promise.resolve(null),
            ]);
            if (cancelled || gen !== listFetchGenRef.current) return;
            setPricingRules(rules);
            setEntitlements(userEnt);

            const { data, total: t } = await DataService.listProducts(buildListQuery(1));
            if (cancelled || gen !== listFetchGenRef.current) return;

            setProducts(data);
            setTotal(t);
            pageRef.current = 1;
            setHasMore(t > 0 && data.length < t);
            await mergeEventsForProducts(data);
        })();

        return () => {
            cancelled = true;
        };
    }, [user, debouncedSearch, selectedCategory, buildListQuery, mergeEventsForProducts]);

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
            await mergeEventsForProducts(data);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, buildListQuery, mergeEventsForProducts]);

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

        CartService.syncCart(user?.id, cart, totalValue);
    }, [cart, user, products]);

    const isProductExpired = useCallback(
        (p: Product) => {
            const today = new Date().toISOString().split('T')[0];

            const checkItems = (items: { type: string; meta?: { eventId?: string; expiration?: string } }[]) => {
                for (const item of items) {
                    if (item.type === 'TICKET' && item.meta?.eventId) {
                        const evt = events.find((e) => e.id === item.meta!.eventId);
                        if (evt && evt.date < today) return true;
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

    const updateCartQuantity = (productId: string, delta: number) =>
        setCart((prev) =>
            prev.map((item) =>
                item.productId === productId
                    ? { ...item, quantity: Math.max(1, item.quantity + delta) }
                    : item,
            ),
        );
    const removeFromCart = (productId: string) =>
        setCart((prev) => prev.filter((item) => item.productId !== productId));
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
        await mergeEventsForProducts(data);
    }, [buildListQuery, mergeEventsForProducts]);

    const handleCreateProduct = () => {
        setEditingProduct(undefined);
        setIsProductModalOpen(true);
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setIsProductModalOpen(true);
    };

    const handleDeleteProduct = async (productId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this product?')) {
            await DataService.deleteProduct(productId);
            showToast('Product deleted.', 'info');
            await refetchFirstPage();
        }
    };

    const handleToggleActive = async (product: Product) => {
        const isActive = product.isActive !== false;

        await DataService.upsertProduct({ ...product, isActive: !isActive });
        showToast(`Product ${!isActive ? 'Activated' : 'Deactivated'}`, 'success');
        await refetchFirstPage();
    };

    const handleSaveProduct = async (product: Product) => {
        await DataService.upsertProduct(product);
        showToast(editingProduct ? 'Product updated' : 'Product created', 'success');
        setIsProductModalOpen(false);
        await refetchFirstPage();
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-white border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Search products..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto items-center">
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{cat}</button>
                    ))}
                    
                    {canManageStore && (
                        <button onClick={handleCreateProduct} className="ml-2 flex items-center px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold shadow-md hover:bg-blue-700 whitespace-nowrap">
                            <Plus size={16} className="mr-1" /> Add Product
                        </button>
                    )}
                </div>

                <button onClick={() => cart.length > 0 ? setIsPaymentModalOpen(true) : showToast('Cart empty', 'info')} className="relative p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 ml-2 shadow-sm">
                    <ShoppingCart size={20} />
                    {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-bounce">{cartCount}</span>}
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6" ref={scrollRootRef}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                                className={`bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full group relative cursor-pointer ${expired || !isActive ? 'opacity-75 grayscale hover:grayscale-0' : ''}`}
                                onClick={() => setViewingProduct(product)}
                            >
                                {canManageStore && (
                                    <div className="absolute top-2 left-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); handleEditProduct(product); }}
                                            className="bg-white/90 backdrop-blur p-1.5 rounded-lg text-blue-600 shadow-sm border border-slate-200 hover:bg-blue-50"
                                            title="Edit"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleToggleActive(product); }}
                                            className={`bg-white/90 backdrop-blur p-1.5 rounded-lg shadow-sm border border-slate-200 ${isActive ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-50'}`}
                                            title={isActive ? "Deactivate" : "Activate"}
                                        >
                                            {isActive ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                                            className="bg-white/90 backdrop-blur p-1.5 rounded-lg text-red-600 shadow-sm border border-slate-200 hover:bg-red-50"
                                            title="Delete"
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

                                <div className="h-48 overflow-hidden relative bg-slate-100 group/image">
                                    {product.imageUrl ? (
                                        <img 
                                            src={product.imageUrl} 
                                            alt={product.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement?.querySelector('.fallback-img')?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    
                                    <div className={`fallback-img absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-300 ${product.imageUrl ? 'hidden' : ''}`}>
                                        <ImageIcon size={48} />
                                    </div>

                                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                                        <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-900 shadow-sm">{product.category}</div>
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
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">{product.title}</h3>
                                    
                                    {product.hasVariants && product.variants && (
                                        <div className="mb-3" onClick={e => e.stopPropagation()}>
                                            <div className="relative">
                                                <select 
                                                    className="w-full p-2 pl-3 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none outline-none font-medium text-slate-700 cursor-pointer hover:border-blue-300 transition-colors"
                                                    value={selectedVariantId || ''}
                                                    onChange={(e) => setActiveVariantSelections({...activeVariantSelections, [product.id]: e.target.value})}
                                                >
                                                    {product.variants.map(v => (
                                                        <option key={v.id} value={v.id}>{v.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-slate-500 text-sm mb-6 line-clamp-2 flex-1">{product.description}</p>
                                    
                                    <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-baseline gap-2">
                                                <div className={`text-lg font-bold ${expired ? 'text-slate-400' : 'text-slate-900'}`}>{formatIDR(price)}</div>
                                                {displayComparePrice && <div className="text-xs text-slate-400 line-through">{formatIDR(displayComparePrice)}</div>}
                                            </div>
                                        </div>
                                        {expired ? (
                                            <button 
                                                disabled
                                                className="px-4 py-2 bg-slate-100 text-slate-400 text-sm font-semibold rounded-lg cursor-not-allowed"
                                            >
                                                Expired
                                            </button>
                                        ) : !isActive ? (
                                             <button 
                                                disabled
                                                className="px-4 py-2 bg-slate-100 text-slate-400 text-sm font-semibold rounded-lg cursor-not-allowed"
                                            >
                                                Inactive
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); addToCart(product); }} 
                                                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 active:scale-95"
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
                <div ref={loadMoreSentinelRef} className="h-px w-full" aria-hidden />
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
                onPaymentSuccess={() => setCart([])}
                cart={cart}
                products={products}
                userEmail={user?.email || 'guest@example.com'}
                userRole={userRole}
                onUpdateQuantity={updateCartQuantity}
                onRemoveItem={removeFromCart}
                preAppliedDiscountCode={autoAppliedDiscount}
                attributionSource={attributionSource} 
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
