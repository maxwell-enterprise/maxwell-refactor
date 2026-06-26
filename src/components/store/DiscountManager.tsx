
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Discount } from '../../types/index';
import { DiscountService } from '../../services/discountService';
import { Tag, Calendar, User, Search, Ticket, Upload, Download, FileSpreadsheet, Plus, Edit3, Trash2 } from 'lucide-react';
import { ExcelHelper } from '../../utils/excelHelper';
import { useToast } from '../../context/ToastContext';
import { useAccess } from '../../context/SecurityContext';
import { useDialog } from '../../context/DialogContext'; // NEW
import DiscountModal from './DiscountModal';
import { EmptyStatePlaceholder } from './EmptyStatePlaceholder';
import { useVoucherRealtime } from '../../hooks/useVoucherRealtime';

const DiscountManager: React.FC = () => {
    const { can } = useAccess('mkt_discounts');
    const { showToast } = useToast();
    const { confirm } = useDialog(); // HOOK
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<Discount | undefined>(undefined);

    const loadData = async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) {
            setLoading(true);
        }
        try {
            const data = await DiscountService.getDiscounts();
            setDiscounts(Array.isArray(data) ? data : []);
        } catch (e) {
            setDiscounts([]);
            showToast(
                e instanceof Error ? e.message : 'Could not load vouchers.',
                'error',
            );
        } finally {
            if (!opts?.silent) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        void loadData();
    }, []);

    useVoucherRealtime(true, () => {
        void loadData({ silent: true });
    });

    const handleCreate = () => {
        setEditingDiscount(undefined);
        setShowModal(true);
    };

    const handleEdit = (discount: Discount) => {
        setEditingDiscount(discount);
        setShowModal(true);
    };

    const handleSave = async (discount: Discount) => {
        await DiscountService.upsertDiscount(discount);
        showToast('Voucher saved successfully', 'success');
        setShowModal(false);
        loadData();
    };

    // --- REFACTORED TO USE GLOBAL DIALOG ---
    const handleDelete = async (discount: Discount) => {
        const isConfirmed = await confirm({
            title: 'Delete Voucher?',
            variant: 'danger',
            message: (
                <span>
                    Are you sure you want to delete <b>{discount.code}</b>?
                    <br/>
                    <span className="text-xs text-red-500">This action cannot be undone and might affect pending carts.</span>
                </span>
            ),
            confirmLabel: 'Yes, Delete'
        });

        if (isConfirmed) {
            try {
                const result = await DiscountService.deleteDiscount(discount.id);
                if (result.action === 'DEACTIVATED') {
                    showToast(
                        result.message ||
                            `Voucher "${discount.code}" was deactivated by the system because it has already been used.`,
                        'info',
                    );
                } else {
                    showToast(result.message || 'Voucher deleted.', 'info');
                }
                setDiscounts((prev) => prev.filter((d) => d.id !== discount.id));
            } catch (e) {
                showToast(
                    e instanceof Error ? e.message : 'Could not delete voucher.',
                    'error',
                );
            }
        }
    };
    // ----------------------------------------

    const activeDiscounts = useMemo(
        () =>
            discounts.filter((d) => {
                if (d.conditions?.deactivatedBySystem === true) return false;
                return new Date(d.validUntil).getTime() >= Date.now();
            }),
        [discounts],
    );

    const filteredDiscounts = activeDiscounts.filter(d =>
        d.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getScopeBadge = (scope: string) => {
        switch(scope) {
            case 'GLOBAL': return 'bg-purple-100 text-purple-700';
            case 'PRODUCT_SPECIFIC':
            case 'Product_SPECIFIC': return 'bg-emerald-100 text-emerald-700';
            case 'CATEGORY_SPECIFIC': return 'bg-amber-100 text-amber-700';
            case 'EVENT_SPECIFIC': return 'bg-blue-100 text-blue-700';
            case 'USER_ROLE_SPECIFIC': return 'bg-fuchsia-100 text-fuchsia-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    // ... (Keep existing Excel Import/Export logic) ...
    const handleDownloadTemplate = () => {
        const template = [{ Code: 'SPRING2025', Title: 'Spring Sale', Description: '20% Off', Type: 'PERCENTAGE', Value: 20, Scope: 'GLOBAL', ValidFrom: '2025-04-01', ValidUntil: '2025-04-30', MaxUsageLimit: 1000 }];
        ExcelHelper.exportToExcel(template, 'Voucher_Import_Template');
        showToast('Template downloaded.', 'info');
    };

    const handleExport = () => {
        const data = discounts.map(d => ({ Code: d.code, Title: d.title, Type: d.type, Value: d.value, Scope: d.scope, Usage: d.currentUsageCount, Limit: d.maxUsageLimit || 'Unlimited', ValidUntil: d.validUntil }));
        ExcelHelper.exportToExcel(data, `Vouchers_Export_${new Date().toISOString().split('T')[0]}`);
        showToast('Voucher list exported.', 'success');
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        try {
            const raw = await ExcelHelper.importFromExcel<any>(file);
            let count = 0;
            for(const r of raw) {
                if(r.Code && r.Value) {
                    const newDiscount: Discount = {
                        id: `DSC-IMP-${Date.now()}-${count}`,
                        code: r.Code, title: r.Title || 'Imported', description: r.Description || '',
                        type: r.Type === 'FIXED_AMOUNT' ? 'FIXED_AMOUNT' : 'PERCENTAGE',
                        value: Number(r.Value), scope: r.Scope || 'GLOBAL',
                        validFrom: r.ValidFrom || new Date().toISOString(),
                        validUntil: r.ValidUntil || new Date(new Date().setMonth(new Date().getMonth()+1)).toISOString(),
                        maxUsageLimit: r.MaxUsageLimit ? Number(r.MaxUsageLimit) : undefined,
                        currentUsageCount: 0, currentBudgetBurned: 0, isFeatured: false
                    };
                    await DiscountService.createDiscount(newDiscount);
                    count++;
                }
            }
            loadData();
            showToast(`Imported ${count} vouchers.`, 'success');
        } catch (err) { showToast('Import failed.', 'error'); }
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="flex min-h-[min(70vh,560px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 min-w-0 sm:min-h-0 sm:h-full">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-4">
                <h2 className="flex shrink-0 items-center font-bold text-slate-900"><Ticket className="mr-2 shrink-0 text-blue-600" size={20}/> Active Vouchers</h2>
                
                <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    {can('WRITE') && (
                        <>
                            <input type="file" ref={fileInputRef} hidden onChange={handleImport} accept=".xlsx,.xls"/>
                            <div className="flex rounded-lg bg-slate-100 p-1">
                                <button type="button" onClick={handleDownloadTemplate} className="touch-target rounded-md p-2 text-slate-500 hover:bg-white hover:shadow-sm" title="Template" aria-label="Download template"><FileSpreadsheet size={16}/></button>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="touch-target rounded-md p-2 text-slate-500 hover:bg-white hover:shadow-sm" title="Import" aria-label="Import vouchers"><Upload size={16}/></button>
                            </div>
                            <button type="button" onClick={handleCreate} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-purple-700 sm:w-auto">
                                <Plus size={16} className="shrink-0"/> New Voucher
                            </button>
                        </>
                    )}
                    <button type="button" onClick={handleExport} className="touch-target self-start rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:self-auto" title="Export" aria-label="Export vouchers"><Download size={18}/></button>

                    <div className="relative min-w-0 w-full sm:max-w-xs sm:flex-1 lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                        <input 
                            type="search" placeholder="Search codes…" className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            aria-label="Search vouchers"
                        />
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
                {loading ? (
                    <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">
                        Loading…
                    </div>
                ) : filteredDiscounts.length === 0 ? (
                    <EmptyStatePlaceholder
                        icon={Ticket}
                        message={
                            activeDiscounts.length === 0
                                ? 'No vouchers yet. Create one with New Voucher.'
                                : 'No vouchers match your search.'
                        }
                        minHeightClass="min-h-[200px]"
                    />
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDiscounts.map(discount => (
                        <div key={discount.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${getScopeBadge(discount.scope)}`}>
                                    {discount.scope.replace('_', ' ')}
                                </span>
                            </div>
                            
                            {can('WRITE') && (
                                <div className="absolute top-10 right-2 z-10 flex flex-row items-center gap-1 rounded-lg border border-slate-200/80 bg-white/95 p-1 shadow-sm backdrop-blur-sm sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                                    <button 
                                        type="button"
                                        onClick={() => handleEdit(discount)}
                                        className="touch-target rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                                        aria-label="Edit voucher"
                                    >
                                        <Edit3 size={16}/>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleDelete(discount)}
                                        className="touch-target rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                        aria-label="Delete voucher"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-green-50 text-green-600 rounded-lg border border-green-100">
                                    <Tag size={24} />
                                </div>
                                <div>
                                    <h3 className="font-mono font-bold text-lg text-slate-900">{discount.code}</h3>
                                    <p className="text-xs text-slate-500 font-bold">{discount.type === 'PERCENTAGE' ? `${discount.value}% OFF` : `IDR ${discount.value.toLocaleString()} OFF`}</p>
                                </div>
                            </div>
                            
                            <p className="text-sm text-slate-600 mb-4 line-clamp-2">{discount.description}</p>
                            
                            <div className="space-y-2 text-xs text-slate-500 border-t border-slate-50 pt-3">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center"><Calendar size={12} className="mr-1"/> Valid Until</span>
                                    <span className="font-medium">{new Date(discount.validUntil).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center"><User size={12} className="mr-1"/> Usage</span>
                                    <span className="font-medium">{discount.currentUsageCount} / {discount.maxUsageLimit || '∞'}</span>
                                </div>
                            </div>
                            
                            <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full" style={{ width: `${Math.min(100, (discount.currentUsageCount / (discount.maxUsageLimit || 100)) * 100)}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
                )}
            </div>

            <DiscountModal 
                isOpen={showModal} 
                onClose={() => setShowModal(false)} 
                onSave={handleSave} 
                initialData={editingDiscount}
            />
        </div>
    );
};

export default DiscountManager;
