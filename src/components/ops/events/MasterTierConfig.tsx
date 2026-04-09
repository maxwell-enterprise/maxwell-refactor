
import React, { useState, useEffect } from 'react';
import { MasterTier } from '../../../types/reference';
import { ReferenceService } from '../../../services/referenceService';
import { useToast } from '../../../context/ToastContext';
import { Trash2, Plus, Edit3, X, Layers } from 'lucide-react';

const MasterTierConfig: React.FC = () => {
    const { showToast } = useToast();
    const [tiers, setTiers] = useState<MasterTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [tierToDelete, setTierToDelete] = useState<MasterTier | null>(null);
    const [editForm, setEditForm] = useState<Partial<MasterTier>>({});

    useEffect(() => {
        loadTiers();
    }, []);

    const loadTiers = async () => {
        setLoading(true);
        const data = await ReferenceService.getMasterTiers();
        setTiers(data);
        setLoading(false);
    };

    const handleCreate = () => {
        setEditForm({
            id: '',
            name: '',
            description: '',
            basePriceIdr: undefined
        });
        setIsEditing(true);
    };

    const handleEdit = (tier: MasterTier) => {
        setEditForm({ ...tier });
        setIsEditing(true);
    };

    const handleDelete = async (tier: MasterTier) => {
        setTierToDelete(tier);
    };

    const confirmDelete = async () => {
        if (!tierToDelete) return;
        setIsDeleting(true);
        try {
            await ReferenceService.deleteMasterTier(tierToDelete);
            showToast('Tier deleted', 'info');
            setTierToDelete(null);
            await loadTiers();
        } finally {
            setIsDeleting(false);
        }
    };

    const closeDeleteModal = () => {
        if (!isDeleting) {
            setTierToDelete(null);
        }
    };

    const handleSave = async () => {
        if (!editForm.id || !editForm.name) {
            showToast('Code and Name are required.', 'error');
            return;
        }
        
        await ReferenceService.upsertMasterTier(editForm as MasterTier);
        showToast('Master Tier saved.', 'success');
        setIsEditing(false);
        loadTiers();
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center">
                        <Layers size={18} className="mr-2 text-indigo-600"/> Master Tier Definitions
                    </h3>
                    <p className="text-xs text-slate-500">Standardize ticket types across all events.</p>
                </div>
                <button onClick={handleCreate} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center hover:bg-indigo-700">
                    <Plus size={14} className="mr-1"/> Add Master Tier
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tiers.map(tier => (
                        <div key={tier.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow relative group">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase border bg-slate-50 border-slate-200 text-slate-500">
                                    Master Tier
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(tier)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded"><Edit3 size={14}/></button>
                                    <button onClick={() => handleDelete(tier)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded"><Trash2 size={14}/></button>
                                </div>
                            </div>
                            <h4 className="font-bold text-slate-900">{tier.name}</h4>
                            <div className="flex items-center mt-2">
                                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 rounded">{tier.id}</span>
                            </div>
                            {tier.description && (
                                <p className="mt-3 text-xs text-slate-500 line-clamp-2">{tier.description}</p>
                            )}
                            {tier.basePriceIdr !== undefined && (
                                <div className="mt-3 text-xs font-semibold text-slate-700">
                                    Base price: Rp {tier.basePriceIdr.toLocaleString('id-ID')}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* EDIT MODAL */}
            {isEditing && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Configure Tier</h3>
                            <button onClick={() => setIsEditing(false)}><X size={20} className="text-slate-400"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unique Code</label>
                                <input 
                                    type="text" className="w-full p-2 border border-slate-300 rounded text-sm uppercase font-mono"
                                    value={editForm.id} onChange={e => setEditForm({...editForm, id: e.target.value.toUpperCase().replace(/\s/g, '_')})}
                                    placeholder="e.g. VIP, GENERAL"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Name</label>
                                <input 
                                    type="text" className="w-full p-2 border border-slate-300 rounded text-sm"
                                    value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                                    placeholder="e.g. VIP Access"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <textarea
                                    className="w-full p-2 border border-slate-300 rounded text-sm min-h-24 resize-none"
                                    value={editForm.description || ''}
                                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                                    placeholder="Optional description"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Base Price (IDR)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full p-2 border border-slate-300 rounded text-sm"
                                    value={editForm.basePriceIdr ?? ''}
                                    onChange={e => setEditForm({
                                        ...editForm,
                                        basePriceIdr: e.target.value === '' ? undefined : Number(e.target.value),
                                    })}
                                    placeholder="Optional"
                                />
                            </div>
                            
                            <button onClick={handleSave} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 mt-2">
                                Save Master Tier
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRM MODAL */}
            {tierToDelete && (
                <div className="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Delete Master Tier</h3>
                            <button onClick={closeDeleteModal} disabled={isDeleting}>
                                <X size={20} className="text-slate-400"/>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-700">
                                Delete <span className="font-semibold">{tierToDelete.name}</span>?
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                This will not affect existing events, but this tier will be removed from future selection.
                            </p>
                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    onClick={closeDeleteModal}
                                    disabled={isDeleting}
                                    className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete Tier'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterTierConfig;
