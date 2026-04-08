
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
        if (activeTab === 'STOCK') {
            const data = await OpsService.getInventory();
            setItems(data);
        } else {
            const txs = await OpsService.getInventoryTransactions();
            setTransactions(txs);
        }
        setLoading(false);
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
        <div className="flex flex-col h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('STOCK')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center ${activeTab === 'STOCK' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Package size={16} className="mr-2"/> Stock Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('HISTORY')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center ${activeTab === 'HISTORY' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <History size={16} className="mr-2"/> Movements
                    </button>
                </div>
                
                <div className="flex gap-2 items-center">
                    <input type="file" ref={fileInputRef} hidden onChange={handleImport} accept=".xlsx,.xls"/>
                    <button onClick={handleDownloadTemplate} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Download Template"><FileSpreadsheet size={18}/></button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Import Inventory"><Upload size={18}/></button>
                    <button onClick={handleExport} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Export Inventory"><Download size={18}/></button>
                    
                    <button onClick={handleCreateItem} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm ml-2">
                        <Plus size={16} className="mr-2"/> New Item
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-2"></div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search SKU or Name..." 
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {activeTab === 'STOCK' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-4">Item Details</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Stock Level</th>
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
                                    <tr key={item.sku} className="hover:bg-slate-50 group">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900 flex items-center">
                                                {item.name}
                                                <button onClick={() => handleEditItem(item)} className="ml-2 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Edit3 size={14}/>
                                                </button>
                                            </div>
                                            <div className="text-xs text-slate-500 font-mono">{item.sku}</div>
                                        </td>
                                        <td className="p-4 text-slate-600">{item.category}</td>
                                        <td className="p-4">
                                            <div className="flex items-center">
                                                <span className="text-lg font-bold mr-2">{item.stock}</span>
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
                                                <button onClick={() => handleOpenMovementModal(item, 'GR')} className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100" title="Goods Receipt (In)">
                                                    <Plus size={16} />
                                                </button>
                                                <button onClick={() => handleOpenMovementModal(item, 'GI')} className="bg-amber-50 text-amber-600 p-2 rounded-lg hover:bg-amber-100" title="Goods Issue (Out)">
                                                    <Minus size={16} />
                                                </button>
                                                <button onClick={() => handleOpenMovementModal(item, 'ADJUSTMENT')} className="bg-slate-50 text-slate-600 p-2 rounded-lg hover:bg-slate-100" title="Stock Adjustment">
                                                    <RefreshCw size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                                )}
                            </tbody>
                        </table>
                    </div>
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
                            <div key={tx.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${tx.quantity > 0 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{tx.type} - {tx.reference}</div>
                                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                                            {tx.sku} • {new Date(tx.timestamp).toLocaleString()} • by {tx.performedBy}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-lg font-bold ${tx.quantity > 0 ? 'text-green-600' : 'text-amber-600'}`}>
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
