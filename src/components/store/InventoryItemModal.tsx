
import React, { useState } from 'react';
import { InventoryItem } from '../../types/index';
import { X, Save, Box, AlertCircle } from 'lucide-react';

interface InventoryItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: InventoryItem) => void;
    initialData?: InventoryItem;
}

const InventoryItemModal: React.FC<InventoryItemModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState<Partial<InventoryItem>>(initialData || {
        sku: '',
        name: '',
        category: 'Merchandise',
        stock: 0,
        reorderLevel: 10,
        status: 'In Stock',
        price: 0
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.sku || !formData.name) return;
        
        onSave(formData as InventoryItem);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><Box size={20}/></div>
                        <div>
                            <h3 className="font-bold text-slate-900">{initialData ? 'Edit Item' : 'New SKU'}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Warehouse Master</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-white/50 transition-all"><X size={20}/></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">SKU Code</label>
                            <input 
                                type="text" required 
                                className={`w-full p-3 border rounded-xl text-sm font-mono ${initialData ? 'bg-slate-100 text-slate-500' : 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'}`}
                                placeholder="e.g. BK-2025-001"
                                value={formData.sku}
                                onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})}
                                disabled={!!initialData}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Item Name</label>
                            <input 
                                type="text" required 
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Category</label>
                            <select 
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                            >
                                <option value="Books">Books</option>
                                <option value="Merchandise">Merchandise</option>
                                <option value="Stationery">Stationery</option>
                                <option value="Electronics">Electronics</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Base Price</label>
                            <input 
                                type="number" required 
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm"
                                value={formData.price}
                                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Reorder Level</label>
                            <input 
                                type="number" required 
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm text-center"
                                value={formData.reorderLevel}
                                onChange={e => setFormData({...formData, reorderLevel: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Initial Stock</label>
                            <input 
                                type="number" 
                                className={`w-full p-2 border rounded-lg text-sm text-center ${initialData ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-300'}`}
                                value={formData.stock}
                                onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                                disabled={!!initialData}
                            />
                        </div>
                        {initialData && (
                            <div className="col-span-2 text-[10px] text-slate-500 flex items-center justify-center">
                                <AlertCircle size={10} className="mr-1"/> Use "Movements" tab to adjust stock levels.
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm">Cancel</button>
                        <button type="submit" className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg flex items-center justify-center transition-all text-sm">
                            <Save size={18} className="mr-2"/> Save Item
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InventoryItemModal;
