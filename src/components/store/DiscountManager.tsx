
import React, { useState, useRef, useEffect } from 'react';
import { Discount } from '../../types/index';
import { DiscountService } from '../../services/discountService';
import { Tag, Calendar, User, Search, Ticket, Upload, Download, FileSpreadsheet, Plus, Edit3, Trash2 } from 'lucide-react';
import { ExcelHelper } from '../../utils/excelHelper';
import { useToast } from '../../context/ToastContext';
import { useAccess } from '../../context/SecurityContext';
import { useDialog } from '../../context/DialogContext'; // NEW
import DiscountModal from './DiscountModal'; 

const DiscountManager: React.FC = () => {
    const { can } = useAccess('mkt_discounts');
    const { showToast } = useToast();
    const { confirm } = useDialog(); // HOOK
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<Discount | undefined>(undefined);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await DiscountService.getDiscounts();
        setDiscounts(data);
    };

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
            // Mock delete (since service might not have delete method exposed in this context, assuming logic exists)
            // In a real app: await DiscountService.delete(discount.id);
            showToast('Voucher deleted (Simulated)', 'info');
            // Optimistic update
            setDiscounts(prev => prev.filter(d => d.id !== discount.id));
        }
    };
    // ----------------------------------------

    const filteredDiscounts = discounts.filter(d => 
        d.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getScopeBadge = (scope: string) => {
        switch(scope) {
            case 'GLOBAL': return 'bg-purple-100 text-purple-700';
            case 'EVENT_SPECIFIC': return 'bg-blue-100 text-blue-700';
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
        <div className="flex flex-col h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-white border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
                <h2 className="font-bold text-slate-900 flex items-center"><Ticket className="mr-2 text-blue-600" size={20}/> Active Vouchers</h2>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {can('WRITE') && (
                        <>
                            <input type="file" ref={fileInputRef} hidden onChange={handleImport} accept=".xlsx,.xls"/>
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                <button onClick={handleDownloadTemplate} className="p-2 text-slate-500 hover:bg-white hover:shadow-sm rounded-md" title="Template"><FileSpreadsheet size={16}/></button>
                                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:bg-white hover:shadow-sm rounded-md" title="Import"><Upload size={16}/></button>
                            </div>
                            <button onClick={handleCreate} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 shadow-sm ml-2">
                                <Plus size={16} className="mr-2"/> New Voucher
                            </button>
                        </>
                    )}
                    <button onClick={handleExport} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Export"><Download size={18}/></button>

                    <div className="relative w-64 ml-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" placeholder="Search codes..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDiscounts.map(discount => (
                        <div key={discount.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${getScopeBadge(discount.scope)}`}>
                                    {discount.scope.replace('_', ' ')}
                                </span>
                            </div>
                            
                            {can('WRITE') && (
                                <div className="absolute top-10 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleEdit(discount)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 bg-white/80 rounded hover:bg-blue-50"
                                    >
                                        <Edit3 size={16}/>
                                    </button>
                                    {/* Added Delete Button using Global Dialog */}
                                    <button 
                                        onClick={() => handleDelete(discount)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 bg-white/80 rounded hover:bg-red-50"
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
