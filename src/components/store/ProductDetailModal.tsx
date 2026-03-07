
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Event, ProductItem, ProductVariant } from '../../types/index';
import { DataService } from '../../services/dataService';
import { CreditTagService } from '../../services/creditTagService';
import { X, Calendar, MapPin, Tag, Package, ShoppingCart, Info, Check, Zap, Layers, Ticket, ChevronDown, ChevronUp, Clock, AlertTriangle } from 'lucide-react';
import { CreditTagMaster } from '../../types/access';

interface ProductDetailModalProps {
    product: Product;
    onClose: () => void;
    onAddToCart: (product: Product, variantId?: string) => void;
    initialVariantId?: string;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onAddToCart, initialVariantId }) => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'COMPONENTS'>('OVERVIEW');
    const [selectedVariantId, setSelectedVariantId] = useState<string>(initialData(product));
    const [loading, setLoading] = useState(true);
    
    // UI State for Expanded Component Card
    const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(null);
    
    // Detailed Data Maps
    const [relatedEvents, setRelatedEvents] = useState<Record<string, Event>>({});
    const [relatedTags, setRelatedTags] = useState<Record<string, CreditTagMaster>>({});

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

        // Fetch Data
        const allEvents = await DataService.getEvents();
        const relevantEvents = allEvents.filter(e => eventIds.has(e.id));
        const eventMap: Record<string, Event> = {};
        
        relevantEvents.forEach(e => {
            eventMap[e.id] = e;
            // Check Event Expiry
            if (e.date < today) expiredFlag = true;
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

    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    const toggleExpand = (idx: number) => {
        setExpandedItemIndex(expandedItemIndex === idx ? null : idx);
    };

    const renderItemDetail = (item: ProductItem, index: number) => {
        const isExpanded = expandedItemIndex === index;
        const today = new Date().toISOString().split('T')[0];
        
        if (item.type === 'TICKET') {
            const evt = relatedEvents[item.meta?.eventId];
            const eventDate = evt ? new Date(evt.date).toLocaleDateString() : '';
            const isItemExpired = evt && evt.date < today;

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
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl h-[85vh] md:h-auto md:max-h-[85vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-scale-in">
                
                {/* LEFT: IMAGE & PREVIEW */}
                <div className="w-full md:w-5/12 bg-slate-100 relative h-48 md:h-auto">
                    <img 
                        src={product.imageUrl} 
                        alt={product.title} 
                        className={`absolute inset-0 w-full h-full object-cover ${isExpired ? 'grayscale' : ''}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-4 text-white">
                        <span className="bg-white/20 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase mb-2 inline-block border border-white/30">
                            {product.category}
                        </span>
                    </div>
                    {isExpired && (
                        <div className="absolute top-0 left-0 right-0 bg-red-600/90 text-white text-center text-xs font-bold py-2 shadow-sm">
                            PRODUCT CONTAINS EXPIRED ITEMS
                        </div>
                    )}
                    <button onClick={onClose} className="absolute top-4 left-4 bg-white/20 backdrop-blur p-2 rounded-full text-white hover:bg-white/40 md:hidden">
                        <X size={20}/>
                    </button>
                </div>

                {/* RIGHT: DETAILS */}
                <div className="flex-1 flex flex-col h-full bg-white relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 hidden md:block">
                        <X size={24}/>
                    </button>

                    <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2 leading-tight pr-8">{product.title}</h2>
                        
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-xl font-bold text-blue-600">{formatIDR(displayPrice)}</span>
                            {product.compareAtPriceIdr && (
                                <span className="text-sm text-slate-400 line-through decoration-slate-400">
                                    {formatIDR(product.compareAtPriceIdr)}
                                </span>
                            )}
                        </div>

                        {/* Variants */}
                        {product.hasVariants && product.variants && (
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Option</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.variants.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => setSelectedVariantId(v.id)}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                                                selectedVariantId === v.id 
                                                ? 'bg-slate-900 text-white border-slate-900' 
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                            }`}
                                        >
                                            {v.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="border-b border-slate-200 mb-4 flex gap-6">
                            <button 
                                onClick={() => setActiveTab('OVERVIEW')}
                                className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'OVERVIEW' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Overview
                            </button>
                            <button 
                                onClick={() => setActiveTab('COMPONENTS')}
                                className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'COMPONENTS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                What's Inside ({currentItems.length})
                            </button>
                        </div>

                        <div className="min-h-[200px]">
                            {activeTab === 'OVERVIEW' && (
                                <div className="prose prose-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {product.description}
                                </div>
                            )}

                            {activeTab === 'COMPONENTS' && (
                                <div className="space-y-3 animate-fade-in">
                                    {loading ? (
                                        <div className="text-center py-8 text-slate-400 text-xs">Resolving items...</div>
                                    ) : (
                                        currentItems.map((item, idx) => (
                                            <div key={idx}>{renderItemDetail(item, idx)}</div>
                                        ))
                                    )}
                                    {currentItems.length === 0 && <p className="text-xs text-slate-400 italic">No specific sub-items listed.</p>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                        <div className="text-xs text-slate-500 hidden md:block">
                            {product.installmentConfig?.enabled ? (
                                <span className="flex items-center text-indigo-600 font-bold"><Zap size={12} className="mr-1"/> Installments Available</span>
                            ) : (
                                <span>Instant Confirmation</span>
                            )}
                        </div>
                        
                        {isExpired ? (
                             <button 
                                disabled
                                className="w-full md:w-auto px-8 py-3 bg-red-100 text-red-400 rounded-xl font-bold cursor-not-allowed flex items-center justify-center"
                            >
                                <AlertTriangle size={18} className="mr-2"/> Not Available
                            </button>
                        ) : (
                            <button 
                                onClick={() => { onAddToCart(product, selectedVariantId); onClose(); }}
                                className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg flex items-center justify-center transition-transform active:scale-95"
                            >
                                <ShoppingCart size={18} className="mr-2"/> Add to Cart - {formatIDR(displayPrice)}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailModal;
