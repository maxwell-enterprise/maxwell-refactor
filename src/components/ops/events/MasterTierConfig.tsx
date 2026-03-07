
import React, { useState, useEffect } from 'react';
import { MasterTier } from '../../../types/reference';
import { ReferenceService } from '../../../services/referenceService';
import { useToast } from '../../../context/ToastContext';
import { Save, Trash2, Plus, Edit3, X, Layers, Tag } from 'lucide-react';

const MasterTierConfig: React.FC = () => {
    const { showToast } = useToast();
    const [tiers, setTiers] = useState<MasterTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
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
            category: 'PAID',
            defaultColor: 'bg-slate-100 text-slate-600'
        });
        setIsEditing(true);
    };

    const handleEdit = (tier: MasterTier) => {
        setEditForm({ ...tier });
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this Master Tier? This will not affect existing events, but will remove it from the selection list.")) {
            await ReferenceService.deleteMasterTier(id);
            showToast('Tier deleted', 'info');
            loadTiers();
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
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${tier.category === 'PAID' ? 'bg-green-50 border-green-200 text-green-700' : tier.category === 'STAFF' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                    {tier.category}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(tier)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded"><Edit3 size={14}/></button>
                                    <button onClick={() => handleDelete(tier.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded"><Trash2 size={14}/></button>
                                </div>
                            </div>
                            <h4 className="font-bold text-slate-900">{tier.name}</h4>
                            <div className="flex items-center mt-2">
                                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 rounded">{tier.id}</span>
                            </div>
                            <div className={`mt-3 h-2 rounded-full w-full ${tier.defaultColor?.split(' ')[0] || 'bg-slate-200'}`}></div>
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
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unique Code (ID)</label>
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
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                                <select 
                                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                                    value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value as any})}
                                >
                                    <option value="PAID">Paid Ticket</option>
                                    <option value="COMPLIMENTARY">Complimentary / Guest</option>
                                    <option value="STAFF">Staff / Crew</option>
                                </select>
                            </div>
                            
                            <button onClick={handleSave} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 mt-2">
                                Save Master Tier
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterTierConfig;
