
import React, { useState, useEffect } from 'react';
import { Event } from '../../types/index';
import { EventGateConfig } from '../../types/attendance';
import { MasterTier } from '../../types/reference';
import { UserService } from '../../services/userService';
import { DataService } from '../../services/dataService';
import { ReferenceService } from '../../services/referenceService';
import { X, Plus, Trash2, Users, Save, ShieldCheck, MapPin, Tag } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface GateConfigModalProps {
    event: Event;
    onClose: () => void;
    onSave: () => void;
}

const GateConfigModal: React.FC<GateConfigModalProps> = ({ event, onClose, onSave }) => {
    const { showToast } = useToast();
    const [gates, setGates] = useState<EventGateConfig[]>(event.gates || []);
    const [isSaving, setIsSaving] = useState(false);
    
    // For User Lookup
    const [staffUsers, setStaffUsers] = useState<{id: string, name: string}[]>([]);
    
    // For Tier Lookup (Dynamic based on Event Config)
    const [availableTiers, setAvailableTiers] = useState<MasterTier[]>([]);

    useEffect(() => {
        const loadDependencies = async () => {
            // 1. Load Staff
            const users = await UserService.getAllUsers();
            setStaffUsers(users.map(u => ({ id: u.id, name: u.fullName })));
            
            // 2. Load Tiers (Prioritize Event's own tiers, else fallback to Master)
            if (event.tiers && event.tiers.length > 0) {
                // Adapt EventTierDefinition to MasterTier shape for consistency
                setAvailableTiers(event.tiers.map(t => ({
                    id: t.id,
                    name: t.name
                })));
            } else {
                const masters = await ReferenceService.getMasterTiers();
                setAvailableTiers(masters);
            }
        };
        loadDependencies();
    }, [event]);

    const addGate = () => {
        const newGate: EventGateConfig = {
            id: `GATE-${Date.now()}`,
            name: 'New Gate',
            allowedTiers: availableTiers.length > 0 ? [availableTiers[0].id] : ['GENERAL'],
            assignedUserIds: [],
            isActive: true
        };
        setGates([...gates, newGate]);
    };

    const updateGate = (idx: number, field: keyof EventGateConfig, value: any) => {
        const updated = [...gates];
        updated[idx] = { ...updated[idx], [field]: value };
        setGates(updated);
    };

    const removeGate = (idx: number) => {
        if (confirm("Remove this gate configuration?")) {
            setGates(gates.filter((_, i) => i !== idx));
        }
    };

    const toggleUserAssignment = (gateIdx: number, userId: string) => {
        const current = gates[gateIdx].assignedUserIds || [];
        const updatedIds = current.includes(userId) 
            ? current.filter(id => id !== userId) 
            : [...current, userId];
        updateGate(gateIdx, 'assignedUserIds', updatedIds);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update Event with new Gate Config
            const updatedEvent = { ...event, gates };
            await DataService.upsertEvent(updatedEvent);
            showToast('Gate configuration saved successfully', 'success');
            onSave();
        } catch (e) {
            showToast('Failed to save configuration', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <ShieldCheck className="text-blue-600" size={20}/> Gate Access Control
                        </h2>
                        <p className="text-xs text-slate-500">Configure entry points and assign staff for <b>{event.name}</b></p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200"><X size={20}/></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    
                    {gates.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                            <MapPin size={48} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500 text-sm font-medium">No gates configured for this event.</p>
                            <button onClick={addGate} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
                                + Add First Gate
                            </button>
                        </div>
                    )}

                    <div className="space-y-6">
                        {gates.map((gate, idx) => (
                            <div key={gate.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                {/* Gate Header Row */}
                                <div className="p-4 border-b border-slate-100 flex gap-4 items-center bg-slate-50/50">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <MapPin size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Gate Name</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-transparent font-bold text-slate-900 outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-500 transition-colors"
                                            value={gate.name}
                                            onChange={(e) => updateGate(idx, 'name', e.target.value)}
                                            placeholder="e.g. Main Lobby"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Status</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input 
                                                type="checkbox" 
                                                checked={gate.isActive} 
                                                onChange={(e) => updateGate(idx, 'isActive', e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded"
                                            />
                                            <span className="text-xs font-medium text-slate-700">Active</span>
                                        </div>
                                    </div>
                                    <button onClick={() => removeGate(idx)} className="text-slate-300 hover:text-red-500 p-2">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left: Tiers */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
                                            <Tag size={12} className="mr-1"/> Allowed Tiers
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {availableTiers.map(tier => (
                                                <button
                                                    key={tier.id}
                                                    onClick={() => {
                                                        const current = gate.allowedTiers || [];
                                                        const updated = current.includes(tier.id) 
                                                            ? current.filter(t => t !== tier.id) 
                                                            : [...current, tier.id];
                                                        updateGate(idx, 'allowedTiers', updated);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                        gate.allowedTiers.includes(tier.id) 
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {tier.name || tier.id}
                                                </button>
                                            ))}
                                            {availableTiers.length === 0 && (
                                                <span className="text-xs text-slate-400 italic">No tiers defined for this event.</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2">Only tickets with these tiers can pass this gate.</p>
                                    </div>

                                    {/* Right: Staff Assignment */}
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
                                            <Users size={12} className="mr-1"/> Assigned Gate Keepers
                                        </label>
                                        
                                        <div className="max-h-32 overflow-y-auto space-y-1 mb-2 custom-scrollbar pr-1">
                                            {staffUsers.map(user => (
                                                <label key={user.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-100 hover:border-blue-200 cursor-pointer">
                                                    <span className="text-xs text-slate-700">{user.name}</span>
                                                    <input 
                                                        type="checkbox"
                                                        checked={gate.assignedUserIds.includes(user.id)}
                                                        onChange={() => toggleUserAssignment(idx, user.id)}
                                                        className="w-4 h-4 text-blue-600 rounded border-slate-300"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-blue-600">
                                            {gate.assignedUserIds.length} staff assigned. They will see this gate in their scanner.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {gates.length > 0 && (
                            <button onClick={addGate} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all flex items-center justify-center">
                                <Plus size={16} className="mr-2"/> Add Another Gate
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-lg text-sm">Cancel</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 text-sm shadow-lg flex items-center disabled:opacity-50"
                    >
                        <Save size={16} className="mr-2"/> Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GateConfigModal;
