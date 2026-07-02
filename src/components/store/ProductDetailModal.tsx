
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Event, ProductItem, ProductVariant } from '../../types/index';
import { DataService } from '../../services/dataService';
import { CreditTagService } from '../../services/creditTagService';
import { X, Calendar, MapPin, Tag, Package, ShoppingCart, Info, Check, Zap, Layers, Ticket, ChevronDown, ChevronUp, Clock, AlertTriangle } from 'lucide-react';
import { CreditTagMaster } from '../../types/access';
import { formatStorePriceIdr } from '../../utils/formatStorePrice';
import { isEventExpiredForCatalog, resolveEventScheduleMeta } from '@/lib/eventScheduleMeta';

interface ProductDetailModalProps {
    product: Product;
    onClose: () => void;
    onAddToCart: (product: Product, variantId?: string) => void;
    initialVariantId?: string;
    /** When set (e.g. campaign deep link), overrides variant price for display + CTA. */
    displayPriceOverride?: { current: number; compare?: number; voucherCode?: string };
    /** Replace default "Add to Cart" CTA label (e.g. login gate). */
    primaryCtaLabel?: string;
    /** Smaller second line under primary CTA (e.g. price) — keeps the button compact. */
    primaryCtaHint?: string;
    /** Default true. Set false when CTA opens login overlay and the modal should stay open. */
    closeOnAddToCart?: boolean;
    /** Optional `source` query from campaign links — one subtle line under pricing. */
    campaignSource?: string;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
    product,
    onClose,
    onAddToCart,
    initialVariantId,
    displayPriceOverride,
    primaryCtaLabel,
    primaryCtaHint,
    closeOnAddToCart = true,
    campaignSource,
}) => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'COMPONENTS'>('OVERVIEW');
    const [selectedVariantId, setSelectedVariantId] = useState<string>(initialData(product));
    const [loading, setLoading] = useState(true);
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);
    
    // UI State for Expanded Component Card
    const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(null);
    
    // Detailed Data Maps
    const [relatedEvents, setRelatedEvents] = useState<Record<string, Event>>({});
    const [relatedTags, setRelatedTags] = useState<Record<string, CreditTagMaster>>({});
    const [catalogEvents, setCatalogEvents] = useState<Event[]>([]);

    // Expiry Check
    const [isExpired, setIsExpired] = useState(false);

    function initialData(p: Product) {
        if (initialVariantId) return initialVariantId;
        if (p.hasVariants && p.variants && p.variants.length > 0) return p.variants[0].id;
        return '';
    }

    useEffect(() => {
        loadDetails();
    }, [product]);

    useEffect(() => {
        setDescriptionExpanded(false);
    }, [product.id]);

    const productDescription = product.description?.trim() ?? '';
    const showDescriptionToggle = productDescription.length > 200;

    const loadDetails = async () => {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        let expiredFlag = false;

        // Identify all Event IDs and Tag Codes mentioned in items/variants
        const eventIds = new Set<string>();
        const tagCodes = new Set<string>();

        const scanItems = (items: ProductItem[]) => {
            items.forEach(item => {
                if (item.type === 'TICKET' && item.meta?.eventId) eventIds.add(item.meta.eventId);
                if (item.type === 'EVENT_CREDIT' && item.meta?.creditTag) tagCodes.add(item.meta.creditTag);
                if (item.type === 'RECURRING_PASS' && item.meta?.eventId) eventIds.add(item.meta.eventId); 
                if (item.type === 'RECURRING_PASS' && item.meta?.creditTag) tagCodes.add(item.meta.creditTag);

                // Quick expiry check on dates directly if available in meta (Credits)
                if ((item.type === 'EVENT_CREDIT' || item.type === 'RECURRING_PASS') && item.meta?.expiration) {
                    if (item.meta.expiration !== 'NEVER' && item.meta.expiration < today) expiredFlag = true;
                }
            });
        };

        // Scan Base Items
        scanItems(product.items);

        // Scan Variants
        if (product.hasVariants && product.variants) {
            product.variants.forEach(v => scanItems(v.items));
        }

        const eventFetchList = [...eventIds];
        const [catalogEventList, ...fetchedEvents] = await Promise.all([
            DataService.getEvents(),
            ...eventFetchList.map((id) => DataService.getEventById(id)),
        ]);
        const relevantEvents = fetchedEvents.filter((e): e is Event => e != null);
        const eventMap: Record<string, Event> = {};

        setCatalogEvents(catalogEventList);

        relevantEvents.forEach((e) => {
            eventMap[e.id] = e;
            if (isEventExpiredForCatalog(e, catalogEventList, today)) expiredFlag = true;
        });

        const allTags = await CreditTagService.getAllTags();
        const relevantTags = allTags.filter(t => tagCodes.has(t.code));
        const tagMap: Record<string, CreditTagMaster> = {};
        relevantTags.forEach(t => tagMap[t.code] = t);

        setRelatedEvents(eventMap);
        setRelatedTags(tagMap);
        setIsExpired(expiredFlag);
        setLoading(false);
    };

    const currentVariant = product.hasVariants 
        ? product.variants?.find(v => v.id === selectedVariantId) 
        : null;

    const currentItems = currentVariant && currentVariant.items.length > 0 
        ? currentVariant.items 
        : product.items;

    const displayPrice = currentVariant ? currentVariant.priceIdr : product.priceIdr;
    const shownPrice = displayPriceOverride?.current ?? displayPrice;
    const compareForHeader =
        displayPriceOverride != null
            ? (displayPriceOverride.compare ?? displayPrice)
            : product.compareAtPriceIdr;

    const isTokenListing = product.category === 'Token';
    const showTokenDiscount =
        isTokenListing &&
        compareForHeader != null &&
        compareForHeader > shownPrice;

    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    const toggleExpand = (idx: number) => {
        setExpandedItemIndex(expandedItemIndex === idx ? null : idx);
    };

    const renderItemDetail = (item: ProductItem, index: number) => {
        const isExpanded = expandedItemIndex === index;
        const today = new Date().toISOString().split('T')[0];
        
        if (item.type === 'TICKET') {
            const evt = relatedEvents[item.meta?.eventId];
            const schedule = evt ? resolveEventScheduleMeta(evt, catalogEvents, today) : null;
            const eventDate = schedule?.displayDateLabel ?? (evt ? new Date(evt.date).toLocaleDateString() : '');
            const isItemExpired = evt ? isEventExpiredForCatalog(evt, catalogEvents, today) : false;

            return (
                <div 
                    className={`rounded-lg border overflow-hidden cursor-pointer transition-all hover:shadow-sm ${isItemExpired ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-100'}`}
                    onClick={() => toggleExpand(index)}
                >
                    {/* Header */}
                    <div className="flex gap-3 p-3 items-start">
                        <div className={`p-2 rounded h-fit shadow-sm ${isItemExpired ? 'bg-red-100 text-red-600' : 'bg-white text-purple-600'}`}>
                            <Ticket size={16}/>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div className={`font-bold text-sm ${isItemExpired ? 'text-red-700' : 'text-slate-800'}`}>{item.name}</div>
                                <div className={isItemExpired ? 'text-red-400' : 'text-purple-400'}>
                                    {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                {isItemExpired ? (
                                     <span className="text-[10px] font-bold text-red-700 bg-white px-1.5 py-0.5 rounded border border-red-200 flex items-center">
                                         <AlertTriangle size={10} className="mr-1"/> Event Ended ({eventDate})
                                     </span>
                                ) : eventDate && (
                                    <span className="text-[10px] font-bold text-purple-700 bg-white px-1.5 py-0.5 rounded border border-purple-100 flex items-center">
                                        <Calendar size={10} className="mr-1"/> {eventDate}
                                    </span>
                                )}
                                <span className="text-[9px] bg-white border border-purple-200 text-purple-700 px-1.5 py-0.5 rounded ml-2">
                                     x{item.quantity} Ticket
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Details (Expanded) */}
                    {isExpanded && evt && (
                        <div className={`p-3 border-t bg-white/50 text-xs space-y-2 animate-fade-in ${isItemExpired ? 'border-red-100 text-red-600' : 'border-purple-100 text-slate-600'}`}>
                            <div className="flex items-center"><MapPin size={12} className="mr-2 opacity-60"/> {evt.location}</div>
                            {evt.time && <div className="flex items-center"><Clock size={12} className="mr-2 opacity-60"/> {evt.time}</div>}
                            <div className="flex items-center"><Info size={12} className="mr-2 opacity-60"/> Tier: {item.meta?.targetTier || 'General'}</div>
                        </div>
                    )}
                </div>
            );
        }

        if (item.type === 'EVENT_CREDIT' || item.type === 'RECURRING_PASS') {
            const tagDef = relatedTags[item.meta?.creditTag];
            const expiryDateStr = item.meta?.expiration && item.meta?.expiration !== 'NEVER' ? item.meta.expiration : '9999-12-31';
            const expiryLabel = item.meta?.expiration && item.meta?.expiration !== 'NEVER' ? new Date(item.meta.expiration).toLocaleDateString() : 'Unlimited';
            const isItemExpired = expiryDateStr < today;

            return (
                <div 
                    className={`rounded-lg border overflow-hidden cursor-pointer transition-all hover:shadow-sm ${isItemExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-100'}`}
                    onClick={() => toggleExpand(index)}
                >
                    <div className="flex gap-3 p-3 items-start">
                        <div className={`p-2 rounded h-fit shadow-sm ${isItemExpired ? 'bg-red-100 text-red-600' : 'bg-white text-amber-600'}`}><Zap size={16}/></div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div className={`font-bold text-sm ${isItemExpired ? 'text-red-700' : 'text-slate-800'}`}>{item.name}</div>
                                <div className={isItemExpired ? 'text-red-400' : 'text-amber-400'}>
                                    {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                {isItemExpired ? (
                                     <span className="text-[10px] font-bold text-red-700 bg-white px-1.5 py-0.5 rounded border border-red-200 flex items-center">
                                         <AlertTriangle size={10} className="mr-1"/> Expired {expiryLabel}
                                     </span>
                                ) : (
                                     <span className="text-[10px] font-bold text-amber-700 bg-white px-1.5 py-0.5 rounded border border-amber-200 flex items-center">
                                        <Clock size={10} className="mr-1"/> Valid until {expiryLabel}
                                    </span>
                                )}
                                <span className="text-[9px] bg-white border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded">
                                     {tagDef?.type === 'UNLIMITED_ACCESS' ? 'Unlimited' : `${item.quantity} Credits`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (item.type === 'PHYSICAL') {
            return (
                <div className="flex gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="p-2 bg-white rounded text-slate-600 h-fit shadow-sm"><Package size={16}/></div>
                    <div>
                        <div className="font-bold text-sm text-slate-800">{item.name}</div>
                        <p className="text-xs text-slate-500 mt-1">Physical item. Will be shipped to your address.</p>
                         <span className="text-[9px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded mt-2 inline-block">
                             Qty: {item.quantity}
                        </span>
                    </div>
                </div>
            );
        }

        // Default Digital/Other
        return (
            <div className="flex gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="p-2 bg-white rounded text-blue-600 h-fit shadow-sm"><Info size={16}/></div>
                <div>
                    <div className="font-bold text-sm text-slate-800">{item.name}</div>
                    <p className="text-xs text-slate-500 mt-1">Digital Resource.</p>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div
                className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in md:h-auto md:max-h-[85vh] md:flex-row"
                role="dialog"
                aria-modal="true"
                aria-labelledby="product-detail-title"
            >
                {/* LEFT: IMAGE */}
                <div className="relative h-48 w-full shrink-0 bg-slate-100 md:h-auto md:w-5/12">
                    {product.imageUrl ? (
                        <img
                            src={product.imageUrl}
                            alt={product.title}
                            className={`absolute inset-0 h-full w-full object-cover ${
                                isExpired ? 'grayscale' : ''
                            }`}
                        />
                    ) : (
                        <div
                            className={`absolute inset-0 h-full w-full bg-slate-200 ${
                                isExpired ? 'grayscale' : ''
                            }`}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 flex max-w-[85%] flex-wrap gap-2 text-white">
                        {isTokenListing ? (
                            <>
                                <span className="inline-block rounded border border-white/30 bg-amber-500/90 px-2 py-1 text-[10px] font-bold uppercase backdrop-blur">
                                    Token
                                </span>
                                {showTokenDiscount && (
                                    <span className="inline-block rounded border border-white/30 bg-emerald-600/90 px-2 py-1 text-[10px] font-bold uppercase backdrop-blur">
                                        Potongan harga
                                    </span>
                                )}
                            </>
                        ) : (
                            <span className="inline-block rounded border border-white/30 bg-white/20 px-2 py-1 text-[10px] font-bold uppercase backdrop-blur">
                                {product.category}
                            </span>
                        )}
                    </div>
                    {isExpired && (
                        <div className="absolute left-0 right-0 top-0 bg-red-600/90 py-2 text-center text-xs font-bold text-white shadow-sm">
                            PRODUCT CONTAINS EXPIRED ITEMS
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute left-4 top-4 rounded-full bg-white/20 p-2 text-white backdrop-blur hover:bg-white/40 md:hidden"
                        aria-label="Tutup"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* RIGHT: DETAILS */}
                <div className="relative flex h-full min-h-0 flex-1 flex-col bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-4 top-4 hidden text-slate-400 hover:text-slate-700 md:block"
                        aria-label="Tutup"
                    >
                        <X size={24} />
                    </button>

                    <div className="custom-scrollbar flex-1 overflow-y-auto p-6 md:p-8">
                        <h2
                            id="product-detail-title"
                            className="mb-2 pr-8 text-2xl font-bold leading-tight text-slate-900"
                        >
                            {product.title}
                        </h2>

                        <div className="mb-6">
                            <div className="flex flex-wrap items-baseline gap-2">
                                {displayPriceOverride?.voucherCode && (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                                        {displayPriceOverride.voucherCode}
                                    </span>
                                )}
                                <span className="text-xl font-bold text-blue-600">{formatStorePriceIdr(shownPrice)}</span>
                                {compareForHeader != null && compareForHeader > shownPrice && (
                                    <span className="text-sm text-slate-400 line-through decoration-slate-400">
                                        {formatIDR(compareForHeader)}
                                    </span>
                                )}
                            </div>
                            {showTokenDiscount && (
                                <p className="mt-1.5 text-[11px] font-semibold text-emerald-700">
                                    Potongan harga
                                </p>
                            )}
                        </div>

                        {campaignSource ? (
                            <p className="-mt-2 mb-4 text-[11px] text-slate-400">
                                <span className="font-semibold text-slate-500">Ref</span>
                                <span className="mx-1 text-slate-300">·</span>
                                {campaignSource}
                            </p>
                        ) : null}

                        {product.hasVariants && product.variants && (
                            <div className="mb-6">
                                <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                                    Select Option
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {product.variants.map((v) => (
                                        <button
                                            key={v.id}
                                            type="button"
                                            onClick={() => setSelectedVariantId(v.id)}
                                            className={`rounded-lg border px-4 py-2 text-xs font-bold transition-all ${
                                                selectedVariantId === v.id
                                                    ? 'border-slate-900 bg-slate-900 text-white'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                                            }`}
                                        >
                                            {v.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-4 flex gap-6 border-b border-slate-200">
                            <button
                                type="button"
                                onClick={() => setActiveTab('OVERVIEW')}
                                className={`pb-2 text-sm font-bold transition-colors ${
                                    activeTab === 'OVERVIEW'
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Overview
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('COMPONENTS')}
                                className={`pb-2 text-sm font-bold transition-colors ${
                                    activeTab === 'COMPONENTS'
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                What&apos;s Inside ({currentItems.length})
                            </button>
                        </div>

                        <div className="min-h-[200px]">
                            {activeTab === 'OVERVIEW' && (
                                <div>
                                    <div className="relative">
                                        <div
                                            className={`prose prose-sm max-w-none whitespace-pre-line text-slate-600 leading-relaxed prose-headings:text-slate-900 custom-scrollbar ${
                                                descriptionExpanded
                                                    ? 'max-h-52 overflow-y-auto pr-1'
                                                    : 'max-h-24 overflow-hidden line-clamp-4'
                                            }`}
                                        >
                                            {productDescription || (
                                                <span className="text-slate-400 italic">
                                                    No description provided.
                                                </span>
                                            )}
                                        </div>
                                        {showDescriptionToggle && !descriptionExpanded && (
                                            <div
                                                className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent"
                                                aria-hidden
                                            />
                                        )}
                                    </div>
                                    {showDescriptionToggle && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDescriptionExpanded((prev) => !prev)
                                            }
                                            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
                                        >
                                            {descriptionExpanded ? (
                                                <>
                                                    Show less
                                                    <ChevronUp size={16} />
                                                </>
                                            ) : (
                                                <>
                                                    Read more
                                                    <ChevronDown size={16} />
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}

                            {activeTab === 'COMPONENTS' && (
                                <div className="space-y-3 animate-fade-in">
                                    {loading ? (
                                        <div className="py-8 text-center text-xs text-slate-400">
                                            Resolving items...
                                        </div>
                                    ) : (
                                        currentItems.map((item, idx) => (
                                            <div key={idx}>{renderItemDetail(item, idx)}</div>
                                        ))
                                    )}
                                    {currentItems.length === 0 && (
                                        <p className="text-xs italic text-slate-400">
                                            No specific sub-items listed.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50 p-6">
                        <div className="hidden text-xs text-slate-500 md:block">
                            {product.installmentConfig?.enabled ? (
                                <span className="flex items-center font-bold text-indigo-600">
                                    <Zap size={12} className="mr-1" /> Installments Available
                                </span>
                            ) : (
                                <span>Instant Confirmation</span>
                            )}
                        </div>

                        {isExpired ? (
                            <button
                                type="button"
                                disabled
                                className="mx-auto flex w-full max-w-[14rem] cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-400 md:mx-0 md:ml-auto md:w-auto md:max-w-none"
                            >
                                <AlertTriangle size={16} className="shrink-0" /> Not Available
                            </button>
                        ) : (
                            <button
                                type="button"
                                title={
                                    primaryCtaHint
                                        ? `${primaryCtaLabel ?? 'Add to Cart'} ${primaryCtaHint}`
                                        : undefined
                                }
                                onClick={() => {
                                    onAddToCart(product, selectedVariantId);
                                    if (closeOnAddToCart) onClose();
                                }}
                                className={`mx-auto flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:bg-blue-700 active:scale-95 md:ml-auto md:px-5 ${
                                    primaryCtaHint
                                        ? 'w-full max-w-md justify-start gap-3 md:min-w-[19rem]'
                                        : 'justify-center gap-2 w-full max-w-[min(100%,15rem)] sm:max-w-[17rem] md:w-auto md:max-w-xs'
                                }`}
                            >
                                <ShoppingCart size={16} className="shrink-0" />
                                {primaryCtaHint ? (
                                    <span className="flex min-w-0 flex-1 items-center justify-between gap-3 leading-tight">
                                        <span className="min-w-0 truncate pr-1 text-left">
                                            {primaryCtaLabel ?? `Add to Cart`}
                                        </span>
                                        <span className="flex shrink-0 items-center gap-1.5 tabular-nums font-medium text-blue-50">
                                            <span className="text-blue-200/90" aria-hidden>
                                                ·
                                            </span>
                                            {primaryCtaHint}
                                        </span>
                                    </span>
                                ) : (
                                    <span className="whitespace-normal text-center leading-tight">
                                        {primaryCtaLabel ?? `Add to Cart — ${formatStorePriceIdr(shownPrice)}`}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailModal;
