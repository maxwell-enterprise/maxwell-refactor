
import React, { useState, useEffect, useRef } from 'react';
import { Product, ProductItem, InventoryItem, Event, ProductEntitlementType, ProductVariant } from '../../types/index';
import { OpsService } from '../../services/opsService';
import { DataService } from '../../services/dataService';
import { RoyaltyService } from '../../services/royaltyService'; 
import { RoyaltyContract } from '../../types/royalty'; 
import { UserService } from '../../services/userService'; 
import { CreditTagService } from '../../services/creditTagService'; 
import { X, Save, Box, Image, DollarSign, Tag, CreditCard, Package, Ticket, Zap, Link, Trash2, Plus, Gift, Layers, Percent, User, AlertTriangle, ArrowRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAccess } from '../../context/SecurityContext';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Product) => void;
    initialData?: Product;
}

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const { showToast } = useToast();
    const { can } = useAccess('fin_royalties'); 
    const canManageRoyalties = can('WRITE');

    const parseIdrInput = (raw: string): number => {
        const digitsOnly = raw.replace(/[^\d]/g, '');
        const n = digitsOnly ? Number.parseInt(digitsOnly, 10) : 0;
        return Number.isFinite(n) ? n : 0;
    };

    const formatIdrWithComma = (n: number): string => {
        const safe = Number.isFinite(n) ? n : 0;
        // Use comma grouping (user asked for "koma").
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(safe);
    };

    const findCaretPosByDigits = (formatted: string, digitsBeforeCaret: number) => {
        if (digitsBeforeCaret <= 0) return 0;
        let seen = 0;
        for (let i = 0; i < formatted.length; i += 1) {
            const ch = formatted[i];
            if (/\d/.test(ch)) {
                seen += 1;
                if (seen >= digitsBeforeCaret) return i + 1;
            }
        }
        return formatted.length;
    };

    const priceInputRef = useRef<HTMLInputElement | null>(null);
    const variantPriceInputRef = useRef<HTMLInputElement | null>(null);

    // --- MASTER DATA ---
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [royaltyContracts, setRoyaltyContracts] = useState<RoyaltyContract[]>([]);
    const [users, setUsers] = useState<{id: string, name: string}[]>([]);
    
    // NEW: Master Tags
    const [availableTags, setAvailableTags] = useState<{code: string, label: string}[]>([]);
    
    // --- UI STATE ---
    const [activeTab, setActiveTab] = useState<'MARKETING' | 'ITEMS' | 'ROYALTIES'>('MARKETING');

    // --- FORM STATE ---
    const productDefaults: Partial<Product> = {
        title: '',
        description: '',
        priceIdr: 0,
        category: 'Packages',
        imageUrl: '',
        items: [],
        hasVariants: false,
        variants: [],
        installmentConfig: {
            enabled: false,
            minDownPaymentPercent: 20,
            maxTenorMonths: 3,
            interestRatePercent: 0,
        },
        isActive: true, // Default to active for new products
    };

    const [formData, setFormData] = useState<Partial<Product>>({
        ...productDefaults,
        ...(initialData || {}),
    });

    const [priceIdrInput, setPriceIdrInput] = useState<string>('0');
    const [variantPriceIdrInput, setVariantPriceIdrInput] = useState<string>('0');

    // --- ITEM BUILDER STATE ---
    const [itemType, setItemType] = useState<ProductEntitlementType>('PHYSICAL');
    const [activeVariantIndex, setActiveVariantIndex] = useState<number>(-1); 
    
    // Temp states for adding new item
    const [selectedSku, setSelectedSku] = useState('');
    const [selectedEventId, setSelectedEventId] = useState('');
    const [selectedEventTier, setSelectedEventTier] = useState('');
    const [creditTag, setCreditTag] = useState('');
    const [digitalUrl, setDigitalUrl] = useState('');
    const [itemLabel, setItemLabel] = useState('');
    const [itemQty, setItemQty] = useState(1);
    const [itemExpiry, setItemExpiry] = useState('');
    const [isTransferable, setIsTransferable] = useState(false);

    // --- ROYALTY BUILDER STATE ---
    const [newContract, setNewContract] = useState<Partial<RoyaltyContract>>({
        beneficiaryId: '',
        percentage: 0,
        beneficiaryRole: 'AUTHOR'
    });

    useEffect(() => {
        if(isOpen) {
            OpsService.getInventory().then(setInventory);
            DataService.getEvents().then(setEvents);
            UserService.getAllUsers().then(us => setUsers(us.map(u => ({ id: u.id, name: u.fullName }))));
            CreditTagService.getTagOptions().then(setAvailableTags);
            
            if (initialData?.id) {
                RoyaltyService.getContractsByProduct(initialData.id).then(setRoyaltyContracts);
            }
        }
    }, [isOpen, initialData]);

    useEffect(() => {
        if (!isOpen) return;
        // Initialize displayed string once when modal opens.
        setPriceIdrInput(String(Number(formData.priceIdr ?? 0)));
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        // Re-initialize only when switching variant, not while typing.
        if (!formData.variants || activeVariantIndex < 0) return;
        const current = formData.variants?.[activeVariantIndex];
        setVariantPriceIdrInput(String(Number(current?.priceIdr ?? 0)));
    }, [isOpen, activeVariantIndex]);

    // Handle Variant Toggling
    const toggleVariants = (enabled: boolean) => {
        setFormData(prev => ({ 
            ...prev, 
            hasVariants: enabled,
            variants: enabled && (!prev.variants || prev.variants.length === 0) 
                ? [{ id: 'VAR-1', name: 'Standard', priceIdr: prev.priceIdr || 0, items: prev.items || [] }] 
                : prev.variants 
        }));
        setActiveVariantIndex(enabled ? 0 : -1);
    };

    const addVariant = () => {
        const newVar: ProductVariant = {
            id: `VAR-${Date.now()}`,
            name: 'New Variant',
            priceIdr: 0,
            items: []
        };
        setFormData(prev => ({ ...prev, variants: [...(prev.variants || []), newVar] }));
        setActiveVariantIndex((formData.variants?.length || 0));
    };

    const removeVariant = (idx: number) => {
        if ((formData.variants?.length || 0) <= 1) return showToast("Must have at least one variant", "error");
        const newVars = [...(formData.variants || [])];
        newVars.splice(idx, 1);
        setFormData(prev => ({ ...prev, variants: newVars }));
        setActiveVariantIndex(0);
    };

    const updateVariant = (idx: number, field: keyof ProductVariant, value: any) => {
        const newVars = [...(formData.variants || [])];
        newVars[idx] = { ...newVars[idx], [field]: value };
        setFormData(prev => ({ ...prev, variants: newVars }));
    };

    const handleAddItem = () => {
        let newItem: ProductItem | null = null;
        const tempId = `ITEM-${Date.now()}`;

        if (itemType === 'PHYSICAL') {
            const skuData = inventory.find(i => i.sku === selectedSku);
            if (!skuData) return showToast('Please select a valid SKU', 'error');
            newItem = { id: tempId, name: itemLabel || skuData.name, type: 'PHYSICAL', quantity: itemQty, meta: { skuRef: skuData.sku } };
        } 
        else if (itemType === 'TICKET') {
            const evt = events.find(e => e.id === selectedEventId);
            if (!evt) return showToast('Please select an event', 'error');
            
            if (evt.tiers && evt.tiers.length > 0 && !selectedEventTier) {
                return showToast('This event has tiers. Please select one.', 'error');
            }
            
            // Allow past events but warn (handled in toast if needed)

            newItem = {
                id: tempId,
                name: itemLabel || `${evt.name} ${selectedEventTier ? `(${selectedEventTier})` : ''}`,
                type: 'TICKET',
                quantity: itemQty,
                meta: { 
                    eventId: evt.id,
                    targetTier: selectedEventTier || undefined,
                    isTransferable: isTransferable
                }
            };
        } 
        else if (itemType === 'EVENT_CREDIT') {
            if (!creditTag) return showToast('Credit Tag is required', 'error');
            newItem = { id: tempId, name: itemLabel || `${itemQty}x ${creditTag} Credit`, type: 'EVENT_CREDIT', quantity: itemQty, meta: { creditTag, expiration: itemExpiry || 'NEVER', isTransferable } };
        } 
        else if (itemType === 'DIGITAL_LINK') {
            if (!digitalUrl) return showToast('URL is required', 'error');
            newItem = { id: tempId, name: itemLabel || 'Digital Access', type: 'DIGITAL_LINK', quantity: 1, meta: { url: digitalUrl } };
        }
        else if (itemType === 'RECURRING_PASS') {
            const evt = events.find(e => e.id === selectedEventId);
            if (!evt) return showToast('Please select a recurring session', 'error');
            const tagToGrant = evt.creditTags[0]; 
            if(!tagToGrant) return showToast('Event has no credit tag configured', 'error');

            newItem = { id: tempId, name: itemLabel || `${evt.name} Access Pass`, type: 'RECURRING_PASS', quantity: 1, meta: { eventId: evt.id, creditTag: tagToGrant, expiration: itemExpiry || 'SUBSCRIPTION_ACTIVE' } };
        }

        if (newItem) {
            if (formData.hasVariants && activeVariantIndex >= 0) {
                const newVars = [...(formData.variants || [])];
                newVars[activeVariantIndex].items.push(newItem);
                setFormData(prev => ({ ...prev, variants: newVars }));
            } else {
                setFormData(prev => ({ ...prev, items: [...(prev.items || []), newItem!] }));
            }
            
            // Reset fields for UX
            setItemLabel(''); 
            // Keep Type selected for rapid entry
            showToast('Item added to package', 'success');
        }
    };

    const handleRemoveItem = (itemIdx: number) => {
        if (formData.hasVariants && activeVariantIndex >= 0) {
            const newVars = [...(formData.variants || [])];
            newVars[activeVariantIndex].items.splice(itemIdx, 1);
            setFormData(prev => ({ ...prev, variants: newVars }));
        } else {
            setFormData(prev => {
                const newItems = [...(prev.items || [])];
                newItems.splice(itemIdx, 1);
                return { ...prev, items: newItems };
            });
        }
    };

    // --- ROYALTY HANDLERS ---
    const handleAddRoyalty = () => {
        if (!newContract.beneficiaryId || !newContract.percentage) {
            return showToast('Beneficiary and Percentage required', 'error');
        }
        
        const prodId = formData.id;
        if (!prodId) {
            return showToast('Please save the product first before adding royalties.', 'error');
        }

        const contract: RoyaltyContract = {
            id: `RC-${Date.now()}`,
            productId: prodId,
            beneficiaryId: newContract.beneficiaryId,
            beneficiaryRole: newContract.beneficiaryRole as any,
            percentage: newContract.percentage,
            isActive: true,
            validFrom: new Date().toISOString()
        };

        RoyaltyService.upsertContract(contract);
        setRoyaltyContracts(prev => [...prev, contract]);
        setNewContract({ beneficiaryId: '', percentage: 0, beneficiaryRole: 'AUTHOR' });
    };

    const handleRemoveRoyalty = async (id: string) => {
        await RoyaltyService.deleteContract(id);
        setRoyaltyContracts(prev => prev.filter(c => c.id !== id));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const productToSave: Product = {
            id: formData.id || `PROD-${Date.now()}`,
            title: formData.title || 'Untitled Product',
            description: formData.description || '',
            priceIdr: Number(formData.priceIdr),
            category: formData.category as any,
            imageUrl: formData.imageUrl || '',
            items: formData.items || [],
            installmentConfig: formData.installmentConfig,
            hasVariants: formData.hasVariants ?? false,
            variants: formData.variants,
            isActive: formData.isActive !== false // Defaults to true
        };
        onSave(productToSave);
    };

    const currentSelectedEvent = events.find(e => e.id === selectedEventId);
    const activeItemsList = formData.hasVariants && activeVariantIndex >= 0 
        ? formData.variants?.[activeVariantIndex]?.items || [] 
        : formData.items || [];

    const totalRoyalty = royaltyContracts.reduce((sum, c) => sum + c.percentage, 0);

    const checkItemExpiry = (item: ProductItem) => {
        const today = new Date().toISOString().split('T')[0];
        if (item.type === 'TICKET' && item.meta?.eventId) {
            const evt = events.find(e => e.id === item.meta.eventId);
            if (evt && evt.date < today) return true;
        }
        return false;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><Box size={20}/></div>
                        <div>
                            <h3 className="font-bold text-slate-900">{initialData ? 'Edit Product' : 'New Product'}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Store Catalog</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-white/50 transition-all"><X size={20}/></button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    
                    {/* LEFT SIDEBAR NAVIGATION */}
                    <div className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col p-4 gap-2 shrink-0">
                        <button 
                            onClick={() => setActiveTab('MARKETING')} 
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center transition-all ${activeTab === 'MARKETING' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <Tag size={16} className="mr-3"/> Marketing
                        </button>
                        <button 
                            onClick={() => setActiveTab('ITEMS')} 
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center transition-all ${activeTab === 'ITEMS' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <Package size={16} className="mr-3"/> Items & Bundle
                        </button>
                        {canManageRoyalties && (
                            <button 
                                onClick={() => setActiveTab('ROYALTIES')} 
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center transition-all ${activeTab === 'ROYALTIES' ? 'bg-white shadow-sm text-blue-700 ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                <Percent size={16} className="mr-3"/> Royalties
                            </button>
                        )}
                    </div>

                    {/* RIGHT CONTENT AREA */}
                    <div className="flex-1 overflow-y-auto bg-white p-8">
                    
                    {/* 1. MARKETING TAB */}
                    {activeTab === 'MARKETING' && (
                         <div className="max-w-2xl mx-auto space-y-6">
                            <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Product Title</label>
                                    <input 
                                        type="text" required 
                                        className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. MLCT Full Package 2026"
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                    />
                                </div>

                                {!formData.hasVariants && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center"><DollarSign size={12} className="mr-1"/> Price (IDR)</label>
                                        <input 
                                            type="text" required
                                            inputMode="numeric"
                                            className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={priceIdrInput}
                                            ref={priceInputRef}
                                            onChange={(e) => {
                                                const nextRaw = e.target.value;
                                                const caret = e.target.selectionStart ?? nextRaw.length;
                                                const digitsBeforeCaret = nextRaw
                                                    .slice(0, caret)
                                                    .replace(/[^\d]/g, '')
                                                    .length;
                                                const digitsOnly = nextRaw.replace(/[^\d]/g, '');
                                                const n = parseIdrInput(nextRaw);
                                                const formatted = digitsOnly.length
                                                    ? formatIdrWithComma(n)
                                                    : '0';
                                                setPriceIdrInput(formatted);
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    priceIdr: n,
                                                }));
                                                requestAnimationFrame(() => {
                                                    if (!priceInputRef.current) return;
                                                    const pos = findCaretPosByDigits(
                                                        formatted,
                                                        digitsBeforeCaret,
                                                    );
                                                    priceInputRef.current.setSelectionRange(pos, pos);
                                                });
                                            }}
                                            onBlur={() => {
                                                const n = parseIdrInput(priceIdrInput);
                                                setPriceIdrInput(formatIdrWithComma(n));
                                                setFormData((prev) => ({ ...prev, priceIdr: n }));
                                            }}
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center"><Tag size={12} className="mr-1"/> Category</label>
                                        <select 
                                            className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.category}
                                            onChange={e => setFormData({...formData, category: e.target.value as any})}
                                        >
                                            <option value="Packages">Packages</option>
                                            <option value="Certification">Certification</option>
                                            <option value="Upgrade">Upgrade</option>
                                            <option value="Merchandise">Merchandise</option>
                                            <option value="Digital">Digital</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center"><Image size={12} className="mr-1"/> Image URL</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.imageUrl}
                                            onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description</label>
                                    <textarea 
                                        className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
                                        placeholder="Product details..."
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>
                                
                                <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                                     <div className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                            checked={formData.isActive !== false}
                                            onChange={e => setFormData({...formData, isActive: e.target.checked})}
                                        />
                                        <span className="text-sm font-bold text-slate-700">Product Active</span>
                                     </div>
                                     <span className="text-xs text-slate-400">If unchecked, product will be hidden from the store.</span>
                                </div>

                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-purple-600 rounded"
                                            checked={formData.hasVariants}
                                            onChange={e => toggleVariants(e.target.checked)}
                                        />
                                        <span className="text-sm font-bold text-purple-900 flex items-center">
                                            <Layers size={14} className="mr-2"/> Multi-Tier Product (Variants)
                                        </span>
                                    </label>
                                </div>

                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-indigo-600 rounded"
                                            checked={formData.installmentConfig?.enabled}
                                            onChange={e => setFormData({
                                                ...formData, 
                                                installmentConfig: { ...formData.installmentConfig!, enabled: e.target.checked }
                                            })}
                                        />
                                        <span className="text-sm font-bold text-indigo-900 flex items-center">
                                            <CreditCard size={14} className="mr-2"/> Allow Installments
                                        </span>
                                    </label>
                                    
                                    {formData.installmentConfig?.enabled && (
                                        <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                            <div>
                                                <label className="block text-[10px] font-bold text-indigo-500 uppercase mb-1">Min DP (%)</label>
                                                <input 
                                                    type="number" min="0" max="100"
                                                    className="w-full p-2 border border-indigo-200 rounded text-sm text-center"
                                                    value={formData.installmentConfig.minDownPaymentPercent}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        installmentConfig: { ...formData.installmentConfig!, minDownPaymentPercent: Number(e.target.value) }
                                                    })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-indigo-500 uppercase mb-1">Max Tenor (Mo)</label>
                                                <input 
                                                    type="number" min="1" max="24"
                                                    className="w-full p-2 border border-indigo-200 rounded text-sm text-center"
                                                    value={formData.installmentConfig.maxTenorMonths}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        installmentConfig: { ...formData.installmentConfig!, maxTenorMonths: Number(e.target.value) }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </form>
                         </div>
                    )}

                    {/* 2. ITEMS TAB (Split Layout) */}
                    {activeTab === 'ITEMS' && (
                        <div className="flex h-full flex-col">
                             {/* VARIANT SELECTOR */}
                            {formData.hasVariants && (
                                <div className="flex gap-2 overflow-x-auto mb-4 pb-2 shrink-0 border-b border-slate-100">
                                    {formData.variants?.map((v, idx) => (
                                        <button 
                                            key={v.id}
                                            onClick={() => setActiveVariantIndex(idx)}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${activeVariantIndex === idx ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300'}`}
                                        >
                                            {v.name}
                                        </button>
                                    ))}
                                    <button onClick={addVariant} className="px-3 py-2 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors">
                                        <Plus size={14}/>
                                    </button>
                                </div>
                            )}

                            {formData.hasVariants && activeVariantIndex >= 0 && (
                                <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm mb-4 animate-fade-in shrink-0">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-xs font-bold text-purple-700 uppercase">Variant Config</h4>
                                        {formData.variants && formData.variants.length > 1 && (
                                            <button onClick={() => removeVariant(activeVariantIndex)} className="text-red-400 hover:text-red-600 text-xs flex items-center">
                                                <Trash2 size={12} className="mr-1"/> Remove
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] text-slate-400 font-bold mb-1">Variant Name</label>
                                            <input 
                                                type="text" className="w-full p-2 border border-slate-200 rounded text-sm font-bold"
                                                value={formData.variants![activeVariantIndex].name}
                                                onChange={e => updateVariant(activeVariantIndex, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-slate-400 font-bold mb-1">Price (IDR)</label>
                                            <input 
                                                type="text" inputMode="numeric"
                                                className="w-full p-2 border border-slate-200 rounded text-sm"
                                                value={variantPriceIdrInput}
                                                ref={variantPriceInputRef}
                                                onChange={(e) => {
                                                    const nextRaw = e.target.value;
                                                    const caret = e.target.selectionStart ?? nextRaw.length;
                                                    const digitsBeforeCaret = nextRaw
                                                        .slice(0, caret)
                                                        .replace(/[^\d]/g, '')
                                                        .length;
                                                    const digitsOnly = nextRaw.replace(/[^\d]/g, '');
                                                    const n = parseIdrInput(nextRaw);
                                                    const formatted = digitsOnly.length
                                                        ? formatIdrWithComma(n)
                                                        : '0';
                                                    setVariantPriceIdrInput(formatted);
                                                    updateVariant(activeVariantIndex, 'priceIdr', n);
                                                    requestAnimationFrame(() => {
                                                        if (!variantPriceInputRef.current) return;
                                                        const pos = findCaretPosByDigits(
                                                            formatted,
                                                            digitsBeforeCaret,
                                                        );
                                                        variantPriceInputRef.current.setSelectionRange(pos, pos);
                                                    });
                                                }}
                                                onBlur={() => {
                                                    const n = parseIdrInput(variantPriceIdrInput);
                                                    setVariantPriceIdrInput(formatIdrWithComma(n));
                                                    updateVariant(activeVariantIndex, 'priceIdr', n);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* SPLIT LAYOUT: BUILDER vs LIST */}
                            <div className="flex flex-1 gap-6 overflow-hidden">
                                {/* LEFT: BUILDER */}
                                <div className="w-1/2 flex flex-col gap-4 overflow-y-auto pr-2">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">1. Select Item Type</label>
                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                            <button onClick={() => setItemType('PHYSICAL')} className={`py-3 px-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${itemType === 'PHYSICAL' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}><Package size={14}/> Physical</button>
                                            <button onClick={() => setItemType('TICKET')} className={`py-3 px-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${itemType === 'TICKET' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}><Ticket size={14}/> Ticket</button>
                                            <button onClick={() => setItemType('EVENT_CREDIT')} className={`py-3 px-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${itemType === 'EVENT_CREDIT' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}><Zap size={14}/> Credit</button>
                                            <button onClick={() => setItemType('DIGITAL_LINK')} className={`py-3 px-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${itemType === 'DIGITAL_LINK' ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}><Link size={14}/> Digital</button>
                                        </div>

                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">2. Configure Details</label>
                                        <div className="space-y-3 mb-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Item Label (Name)</label>
                                                <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" placeholder="Override Name (Optional)" value={itemLabel} onChange={e => setItemLabel(e.target.value)} />
                                            </div>
                                            
                                            {itemType === 'PHYSICAL' && (
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Inventory SKU</label>
                                                    <select className="w-full p-2 border border-slate-300 rounded text-sm bg-white" value={selectedSku} onChange={e => setSelectedSku(e.target.value)}>
                                                        <option value="">-- Choose Item from Warehouse --</option>
                                                        {inventory.map(inv => <option key={inv.sku} value={inv.sku}>{inv.name} (Stock: {inv.stock})</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            
                                            {itemType === 'TICKET' && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Event</label>
                                                        <select 
                                                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white" 
                                                            value={selectedEventId} 
                                                            onChange={e => { setSelectedEventId(e.target.value); setSelectedEventTier(''); }}
                                                        >
                                                            <option value="">-- Choose Event --</option>
                                                            {events.filter(e => !e.isRecurring).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(ev => (
                                                                <option key={ev.id} value={ev.id}>{ev.name} ({new Date(ev.date).toLocaleDateString()})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Event Tier</label>
                                                        <select className="w-full p-2 border border-slate-300 rounded text-sm bg-white" value={selectedEventTier} onChange={e => setSelectedEventTier(e.target.value)} disabled={!currentSelectedEvent?.tiers || currentSelectedEvent.tiers.length === 0}>
                                                            <option value="">{(!currentSelectedEvent?.tiers || currentSelectedEvent.tiers.length === 0) ? 'Standard / No Tier' : '-- Select Tier --'}</option>
                                                            {currentSelectedEvent?.tiers?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-slate-200">
                                                        <input type="checkbox" className="w-4 h-4 text-purple-600 rounded" checked={isTransferable} onChange={e => setIsTransferable(e.target.checked)}/>
                                                        <div className="flex items-center text-xs font-bold text-purple-700"><Gift size={12} className="mr-1"/> Allow Transfer (Giftable)</div>
                                                    </label>
                                                </div>
                                            )}

                                            {itemType === 'EVENT_CREDIT' && (
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Credit Tag</label>
                                                    <select 
                                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white uppercase font-mono"
                                                        value={creditTag}
                                                        onChange={e => setCreditTag(e.target.value)}
                                                    >
                                                        <option value="">-- Select Master Tag --</option>
                                                        {availableTags.map(t => (
                                                            <option key={t.code} value={t.code}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {itemType === 'DIGITAL_LINK' && (
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Resource URL</label>
                                                    <input 
                                                        type="url" 
                                                        className="w-full p-2 border border-slate-300 rounded text-sm outline-none text-blue-600" 
                                                        placeholder="https://..." 
                                                        value={digitalUrl} 
                                                        onChange={e => setDigitalUrl(e.target.value)} 
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity</label>
                                                <input type="number" min="1" className="w-24 p-2 border border-slate-300 rounded text-sm text-center" value={itemQty} onChange={e => setItemQty(Math.max(1, Number(e.target.value)))} disabled={itemType === 'DIGITAL_LINK'} />
                                            </div>
                                        </div>

                                        <button type="button" onClick={handleAddItem} className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center shadow-lg font-bold transition-transform active:scale-95 text-sm">
                                            <Plus size={18} className="mr-2"/> Add Item to Bundle
                                        </button>
                                    </div>
                                </div>

                                {/* RIGHT: LIST */}
                                <div className="w-1/2 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="p-3 bg-slate-50 border-b border-slate-200">
                                        <h4 className="text-xs font-bold text-slate-600 uppercase">Current Items ({activeItemsList.length})</h4>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50">
                                        {activeItemsList.length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center">
                                                <Package size={32} className="mb-2 opacity-50"/>
                                                <p className="text-sm">No items yet.</p>
                                                <p className="text-xs mt-1">Use the builder on the left to add items.</p>
                                            </div>
                                        )}
                                        {activeItemsList.map((item, idx) => {
                                            const isExpired = checkItemExpiry(item);
                                            return (
                                                <div key={idx} className={`flex items-center justify-between p-3 rounded-lg group transition-colors shadow-sm ${isExpired ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-200 hover:border-blue-300'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${isExpired ? 'bg-red-100 text-red-600' : (item.type === 'PHYSICAL' ? 'bg-slate-100 text-slate-600' : item.type === 'TICKET' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600')}`}>
                                                            {isExpired ? <AlertTriangle size={16}/> : (item.type === 'PHYSICAL' ? <Package size={16}/> : item.type === 'TICKET' ? <Ticket size={16}/> : <Zap size={16}/>)}
                                                        </div>
                                                        <div>
                                                            <div className={`font-bold text-sm flex items-center ${isExpired ? 'text-red-700' : 'text-slate-800'}`}>
                                                                {item.name}
                                                                {isExpired && <span className="ml-2 text-[9px] bg-red-200 text-red-800 px-1.5 rounded uppercase font-bold">Expired</span>}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 font-mono">{item.type} {item.meta?.targetTier ? `[${item.meta.targetTier}]` : ''}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm font-bold text-slate-600">x{item.quantity}</span>
                                                        <button onClick={() => handleRemoveItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. ROYALTIES TAB */}
                    {activeTab === 'ROYALTIES' && (
                        <div className="flex-1 overflow-y-auto p-8 bg-amber-50/30">
                            {!formData.id ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <Save size={48} className="mb-4 opacity-20"/>
                                    <p className="font-bold">Save Product First</p>
                                    <p className="text-sm">You must save this product before adding royalty rules.</p>
                                </div>
                            ) : (
                                <div className="max-w-2xl mx-auto space-y-6">
                                    <div className="bg-white p-6 rounded-xl border border-amber-200 shadow-sm">
                                        <h4 className="text-sm font-bold text-amber-800 uppercase mb-4 flex items-center">
                                            <Percent size={14} className="mr-2"/> Revenue Split Rules
                                        </h4>
                                        <div className="grid grid-cols-12 gap-3 mb-4 items-end">
                                            <div className="col-span-5">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Beneficiary (User)</label>
                                                <select 
                                                    className="w-full p-2 border border-slate-200 rounded text-sm bg-white"
                                                    value={newContract.beneficiaryId}
                                                    onChange={e => setNewContract({...newContract, beneficiaryId: e.target.value})}
                                                >
                                                    <option value="">-- Select Partner/Author --</option>
                                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-3">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Role</label>
                                                <select 
                                                    className="w-full p-2 border border-slate-200 rounded text-sm bg-white"
                                                    value={newContract.beneficiaryRole}
                                                    onChange={e => setNewContract({...newContract, beneficiaryRole: e.target.value as any})}
                                                >
                                                    <option value="AUTHOR">Author</option>
                                                    <option value="PARTNER">Partner</option>
                                                    <option value="REFERRER">Referrer</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cut (%)</label>
                                                <input 
                                                    type="number" min="1" max="100"
                                                    className="w-full p-2 border border-slate-200 rounded text-sm text-center font-bold"
                                                    value={newContract.percentage}
                                                    onChange={e => setNewContract({...newContract, percentage: Number(e.target.value)})}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <button onClick={handleAddRoyalty} className="w-full p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center justify-center font-bold text-sm shadow-sm">
                                                    Add
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {royaltyContracts.map(contract => {
                                                const userName = users.find(u => u.id === contract.beneficiaryId)?.name || contract.beneficiaryId;
                                                return (
                                                    <div key={contract.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-white rounded-full border border-slate-200"><User size={14} className="text-slate-400"/></div>
                                                            <div>
                                                                <div className="font-bold text-sm text-slate-800">{userName}</div>
                                                                <div className="text-[10px] text-slate-500 font-mono uppercase">{contract.beneficiaryRole}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">{contract.percentage}%</span>
                                                            <button onClick={() => handleRemoveRoyalty(contract.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {royaltyContracts.length === 0 && <p className="text-center text-slate-400 text-xs italic py-4">No royalty rules defined.</p>}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs font-bold text-slate-600">
                                            <span>Total Allocated:</span>
                                            <span className={totalRoyalty > 100 ? 'text-red-600' : 'text-green-600'}>{totalRoyalty}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 z-10">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm">Cancel</button>
                    <button onClick={handleSubmit} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg flex items-center justify-center transition-all text-sm">
                        <Save size={18} className="mr-2"/> Save Product
                    </button>
                </div>
            </div>
        </div>
    );
};
