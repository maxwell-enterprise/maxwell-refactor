
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem, InventoryTransaction, InventoryMovementType } from '../../types/index';
import { OpsService } from '../../services/opsService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDialog } from '../../context/DialogContext'; // NEW
import {
    Package,
    RefreshCw,
    Plus,
    Minus,
    FileText,
    ArrowRight,
    ArrowLeft,
    AlertTriangle,
    Search,
    History,
    CheckCircle,
    BarChart3,
    X,
    Download,
    Upload,
    FileSpreadsheet,
    Edit3,
} from 'lucide-react';
import { EmptyStatePlaceholder } from './EmptyStatePlaceholder';
import { ExcelHelper } from '../../utils/excelHelper';
import InventoryItemModal from './InventoryItemModal'; 

const InventoryManager: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { confirm, alert } = useDialog(); // HOOK
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'STOCK' | 'HISTORY'>('STOCK');
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Movement Modal State
    const [movementType, setMovementType] = useState<InventoryMovementType | null>(null);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [qtyInput, setQtyInput] = useState<number>(0);
    const [refInput, setRefInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Master Data Modal State
    const [showItemModal, setShowItemModal] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'STOCK') {
                const data = await OpsService.getInventory();
                setItems(Array.isArray(data) ? data : []);
            } else {
                const txs = await OpsService.getInventoryTransactions();
                setTransactions(Array.isArray(txs) ? txs : []);
            }
        } catch (e) {
            if (activeTab === 'STOCK') {
                setItems([]);
                showToast(
                    e instanceof Error ? e.message : 'Could not load inventory.',
                    'error',
                );
            } else {
                setTransactions([]);
                showToast(
                    e instanceof Error ? e.message : 'Could not load stock movements.',
                    'error',
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOpenMovementModal = (item: InventoryItem, type: InventoryMovementType) => {
        setSelectedItem(item);
        setMovementType(type);
        setQtyInput(0);
        setRefInput('');
    };

    const handleCloseMovementModal = () => {
        setSelectedItem(null);
        setMovementType(null);
    };

    // Master Data Handlers
    const handleCreateItem = () => {
        setEditingItem(undefined);
        setShowItemModal(true);
    };

    const handleEditItem = (item: InventoryItem) => {
        setEditingItem(item);
        setShowItemModal(true);
    };

    const handleSaveItem = async (item: InventoryItem) => {
        await OpsService.upsertInventoryItem(item);
        showToast(editingItem ? 'Item updated' : 'New SKU created', 'success');
        setShowItemModal(false);
        loadData();
    };

    const handleSubmitMovement = async () => {
        if (!selectedItem || !movementType || qtyInput <= 0 || !refInput) {
            showToast('Please fill all fields correctly.', 'error');
            return;
        }

        // --- GLOBAL DIALOG CONFIRMATION ---
        // Extra safety check for large adjustments or stock outs
        if (movementType === 'GI' && qtyInput > selectedItem.stock) {
             await alert({
                 title: 'Invalid Movement',
                 message: 'You cannot issue more stock than currently available.',
                 variant: 'danger'
             });
             return;
        }
        
        if (movementType === 'ADJUSTMENT') {
            const confirmed = await confirm({
                title: 'Confirm Stock Adjustment',
                message: `Are you sure you want to adjust ${selectedItem.name} by ${qtyInput}? This will directly affect financial reports.`,
                variant: 'warning'
            });
            if (!confirmed) return;
        }
        // ----------------------------------

        setIsSubmitting(true);
        try {
            await OpsService.updateStock(
                selectedItem.sku, 
                movementType === 'GI' ? qtyInput : (movementType === 'ADJUSTMENT' ? qtyInput : qtyInput),
                movementType, 
                refInput, 
                user?.fullName || 'Admin'
            );
            
            showToast('Stock updated successfully', 'success');
            handleCloseMovementModal();
            loadData();
        } catch (e) {
            showToast('Failed to update stock', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- EXCEL ACTIONS -
    const handleDownloadTemplate = () => {
        const template = [{
            SKU: 'NEW-ITEM-001',
            Name: 'New Product Name',
            Category: 'Books',
            InitialStock: 100,
            Price: 150000,
            ReorderLevel: 10
        }];
        ExcelHelper.exportToExcel(template, 'Inventory_Import_Template');
        showToast('Template downloaded.', 'info');
    };

    const handleExport = () => {
        ExcelHelper.exportToExcel(items, `Inventory_Stock_${new Date().toISOString().split('T')[0]}`);
        showToast('Inventory exported.', 'success');
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        try {
            const raw = await ExcelHelper.importFromExcel<any>(file);
            let count = 0;
            for(const row of raw) {
                if(row.SKU && row.Name) {
                    await OpsService.upsertInventoryItem({
                        sku: row.SKU,
                        name: row.Name,
                        category: row.Category || 'General',
                        stock: Number(row.InitialStock) || 0,
                        price: Number(row.Price) || 0,
                        reorderLevel: Number(row.ReorderLevel) || 10,
                        status: 'In Stock'
                    });
                    count++;
                }
            }
            showToast(`Processed ${count} items. Refreshing data...`, 'success');
            loadData();
        } catch (err) {
            showToast('Import failed.', 'error');
        }
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const filteredItems = items.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        if (status === 'Out of Stock') return 'bg-red-100 text-red-700 border-red-200';
        if (status === 'Low Stock') return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-green-100 text-green-700 border-green-200';
    };

    const MovementModal = () => {
        if (!selectedItem || !movementType) return null;
        
        const isOutbound = movementType === 'GI';
        
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scale-in">
                    <div className={`px-6 py-4 border-b border-slate-100 flex justify-between items-center ${isOutbound ? 'bg-amber-50' : 'bg-blue-50'}`}>
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg flex items-center">
                                {isOutbound ? <ArrowRight size={20} className="mr-2 text-amber-600"/> : <ArrowLeft size={20} className="mr-2 text-blue-600"/>}
                                {movementType === 'GR' ? 'Goods Receipt' : movementType === 'GI' ? 'Goods Issue' : 'Stock Adjustment'}
                            </h3>
                            <p className="text-xs text-slate-500 font-mono mt-1">{selectedItem.sku} - {selectedItem.name}</p>
                        </div>
                        <button onClick={handleCloseMovementModal} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-sm text-slate-500">Current Stock</span>
                            <span className="font-mono font-bold text-lg text-slate-900">{selectedItem.stock}</span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                {movementType === 'ADJUSTMENT' ? 'Adjustment Amount (+/-)' : 'Quantity'}
                            </label>
                            <input 
                                type="number" 
                                autoFocus
                                className="w-full p-3 border border-slate-300 rounded-lg font-mono text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={qtyInput}
                                onChange={(e) => setQtyInput(parseInt(e.target.value) || 0)}
                            />
                            {movementType === 'GI' && qtyInput > selectedItem.stock && (
                                <p className="text-xs text-red-500 mt-1 flex items-center">
                                    <AlertTriangle size={12} className="mr-1"/> Warning: Insufficient stock
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reference / Reason</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder={movementType === 'GR' ? 'PO Number' : movementType === 'GI' ? 'Order ID or Recipient' : 'Stocktake Reason'}
                                value={refInput}
                                onChange={(e) => setRefInput(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                        <button onClick={handleCloseMovementModal} className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                        <button 
                            onClick={handleSubmitMovement}
                            disabled={isSubmitting || !qtyInput || !refInput}
                            className={`flex-1 py-2.5 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 transition-colors ${isOutbound ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isSubmitting ? 'Processing...' : 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex min-h-[min(70vh,560px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 min-w-0 sm:min-h-0 sm:h-full">
            {/* Header */}
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-3 sm:p-4 min-w-0">
                <div className="max-w-full overflow-x-scroll-touch rounded-xl bg-slate-100 p-1">
                    <div className="inline-flex flex-nowrap gap-1">
                        <button 
                            type="button"
                            onClick={() => setActiveTab('STOCK')}
                            className={`flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'STOCK' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:bg-slate-50/80'}`}
                        >
                            <Package size={16} className="mr-1.5 shrink-0 sm:mr-2"/> Stock
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('HISTORY')}
                            className={`flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'HISTORY' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:bg-slate-50/80'}`}
                        >
                            <History size={16} className="mr-1.5 shrink-0 sm:mr-2"/> Movements
                        </button>
                    </div>
                </div>
                
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <input type="file" ref={fileInputRef} hidden onChange={handleImport} accept=".xlsx,.xls"/>
                        <button type="button" onClick={handleDownloadTemplate} className="touch-target rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Download Template" aria-label="Download template"><FileSpreadsheet size={18}/></button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="touch-target rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Import Inventory" aria-label="Import inventory"><Upload size={18}/></button>
                        <button type="button" onClick={handleExport} className="touch-target rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Export Inventory" aria-label="Export inventory"><Download size={18}/></button>
                        
                        <button type="button" onClick={handleCreateItem} className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 sm:flex-initial">
                            <Plus size={16} className="shrink-0"/> New item
                        </button>
                    </div>

                    <div className="relative min-w-0 w-full sm:max-w-xs sm:flex-1 lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                        <input 
                            type="search" 
                            placeholder="Search SKU or name…" 
                            className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            aria-label="Search inventory"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
                {activeTab === 'STOCK' && (
                    <>
                    {/* Mobile cards */}
                    <div className="space-y-3 md:hidden">
                        {loading ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Loading…</div>
                        ) : filteredItems.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-8">
                                <div className="flex flex-col items-center justify-center gap-3 text-center">
                                    <Package className="shrink-0 text-slate-300" strokeWidth={1.25} size={44} aria-hidden />
                                    <p className="text-sm text-slate-500">
                                        {items.length === 0 ? 'No stock items yet.' : 'No items match your search.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            filteredItems.map(item => (
                                <div key={item.sku} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-900 break-words">{item.name}</h3>
                                                <button type="button" onClick={() => handleEditItem(item)} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" aria-label="Edit item">
                                                    <Edit3 size={14}/>
                                                </button>
                                            </div>
                                            <p className="mt-0.5 font-mono text-xs text-slate-500 break-all">{item.sku}</p>
                                            <p className="mt-2 text-sm text-slate-600">{item.category}</p>
                                        </div>
                                        <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border ${getStatusColor(item.status)}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-3">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400">On hand</span>
                                            <p className="text-xl font-bold tabular-nums text-slate-900">{item.stock} <span className="text-sm font-normal text-slate-400">/ {item.reorderLevel} min</span></p>
                                        </div>
                                        <div className="flex w-full justify-end gap-2 sm:w-auto">
                                            <button type="button" onClick={() => handleOpenMovementModal(item, 'GR')} className="touch-target rounded-lg bg-blue-50 p-2.5 text-blue-600 hover:bg-blue-100" title="Goods receipt" aria-label="Goods receipt"><Plus size={16} /></button>
                                            <button type="button" onClick={() => handleOpenMovementModal(item, 'GI')} className="touch-target rounded-lg bg-amber-50 p-2.5 text-amber-600 hover:bg-amber-100" title="Goods issue" aria-label="Goods issue"><Minus size={16} /></button>
                                            <button type="button" onClick={() => handleOpenMovementModal(item, 'ADJUSTMENT')} className="touch-target rounded-lg bg-slate-50 p-2.5 text-slate-600 hover:bg-slate-100" title="Adjust stock" aria-label="Adjust stock"><RefreshCw size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="hidden md:block responsive-table-wrap rounded-xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-500">
                                <tr>
                                    <th className="p-4">Item Details</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4 whitespace-nowrap">Stock Level</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Quick Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-sm text-slate-400">
                                            Loading…
                                        </td>
                                    </tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12">
                                            <div className="flex flex-col items-center justify-center gap-3 text-center">
                                                <Package
                                                    className="shrink-0 text-slate-300"
                                                    strokeWidth={1.25}
                                                    size={44}
                                                    aria-hidden
                                                />
                                                <p className="text-sm text-slate-500">
                                                    {items.length === 0
                                                        ? 'No stock items yet.'
                                                        : 'No items match your search.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                filteredItems.map(item => (
                                    <tr key={item.sku} className="group hover:bg-slate-50">
                                        <td className="p-4 max-w-[240px]">
                                            <div className="flex items-center font-bold text-slate-900">
                                                <span className="break-words">{item.name}</span>
                                                <button type="button" onClick={() => handleEditItem(item)} className="ml-2 shrink-0 text-slate-400 opacity-0 transition-opacity hover:text-blue-600 group-hover:opacity-100">
                                                    <Edit3 size={14}/>
                                                </button>
                                            </div>
                                            <div className="font-mono text-xs text-slate-500 break-all">{item.sku}</div>
                                        </td>
                                        <td className="p-4 text-slate-600">{item.category}</td>
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <span className="mr-2 text-lg font-bold tabular-nums">{item.stock}</span>
                                                <span className="text-xs text-slate-400">/ {item.reorderLevel} min</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getStatusColor(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={() => handleOpenMovementModal(item, 'GR')} className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100" title="Goods Receipt (In)"><Plus size={16} /></button>
                                                <button type="button" onClick={() => handleOpenMovementModal(item, 'GI')} className="rounded-lg bg-amber-50 p-2 text-amber-600 hover:bg-amber-100" title="Goods Issue (Out)"><Minus size={16} /></button>
                                                <button type="button" onClick={() => handleOpenMovementModal(item, 'ADJUSTMENT')} className="rounded-lg bg-slate-50 p-2 text-slate-600 hover:bg-slate-100" title="Stock Adjustment"><RefreshCw size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}

                {activeTab === 'HISTORY' && (
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">
                                Loading…
                            </div>
                        ) : transactions.length === 0 ? (
                            <EmptyStatePlaceholder
                                icon={History}
                                message="No stock movements yet."
                                minHeightClass="min-h-[200px]"
                            />
                        ) : (
                        transactions.map(tx => (
                            <div key={tx.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between min-w-0">
                                <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                                    <div className={`shrink-0 rounded-full p-3 ${tx.quantity > 0 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-900 break-words">{tx.type} — {tx.reference}</div>
                                        <div className="mt-1 font-mono text-xs text-slate-500 break-all leading-relaxed">
                                            {tx.sku} · {new Date(tx.timestamp).toLocaleString()} · {tx.performedBy}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 pt-2 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0 sm:text-right">
                                    <div className={`text-lg font-bold tabular-nums ${tx.quantity > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                        {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                                    </div>
                                    <div className="text-xs text-slate-400">Bal: {tx.balanceAfter}</div>
                                </div>
                            </div>
                        ))
                        )}
                    </div>
                )}
            </div>

            {/* MODALS */}
            <MovementModal />
            <InventoryItemModal 
                isOpen={showItemModal} 
                onClose={() => setShowItemModal(false)} 
                onSave={handleSaveItem} 
                initialData={editingItem}
            />
        </div>
    );
};

export default InventoryManager;
