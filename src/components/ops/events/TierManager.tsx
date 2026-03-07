
import React, { useState, useEffect } from 'react';
import { Event, EventTierDefinition, EventType } from '../../../types/index';
import { MasterTier } from '../../../types/reference';
import { ReferenceService } from '../../../services/referenceService';
import { Plus, Trash2, ChevronUp, ChevronDown, Check, X, Ticket, Layers, Gem, DownloadCloud } from 'lucide-react';
import { DataUtils } from '../../../utils/dataUtils';

interface TierManagerProps {
    tiers: EventTierDefinition[];
    eventType: EventType;
    availableCreditTags: { code: string, label: string }[];
    availableBundles: Event[]; // For Container Bundle selection
    onChange: (tiers: EventTierDefinition[]) => void;
    expandedIndex: number | null;
    setExpandedIndex: (idx: number | null) => void;
}

const TierManager: React.FC<TierManagerProps> = ({ 
    tiers, eventType, availableCreditTags, availableBundles, 
    onChange, expandedIndex, setExpandedIndex 
}) => {
    // Local transient states
    const [bundleEventId, setBundleEventId] = useState('');
    const [bundleTierId, setBundleTierId] = useState('');
    
    // Master Tier Data
    const [masterTiers, setMasterTiers] = useState<MasterTier[]>([]);

    useEffect(() => {
        ReferenceService.getMasterTiers().then(setMasterTiers);
    }, []);

    const addNewTier = () => {
        const newId = DataUtils.generateID(); 
        const newTierDef: EventTierDefinition = { 
            id: newId,
            name: 'New Tier',
            quota: 50,
            grantTagIds: [],
            bundledTiers: []
        };
        onChange([...tiers, newTierDef]);
        setExpandedIndex(tiers.length);
    };

    const removeTier = (idx: number) => {
        if (!window.confirm("Delete this tier configuration?")) return;
        onChange(tiers.filter((_, i) => i !== idx));
        setExpandedIndex(null);
    };

    const updateTier = (idx: number, field: keyof EventTierDefinition, value: any) => {
        const updated = [...tiers];
        updated[idx] = { ...updated[idx], [field]: value };
        onChange(updated);
    };
    
    const applyMasterTemplate = (idx: number, masterId: string) => {
        const master = masterTiers.find(m => m.id === masterId);
        if (master) {
            updateTier(idx, 'name', master.name);
            updateTier(idx, 'masterCode', master.id);
            // Could also apply defaults like price if stored in master
        }
    };

    const toggleTag = (tierIdx: number, tagCode: string) => {
        const current = tiers[tierIdx].grantTagIds || [];
        const updated = current.includes(tagCode) 
            ? current.filter(t => t !== tagCode) 
            : [...current, tagCode];
        updateTier(tierIdx, 'grantTagIds', updated);
    };

    const addBundle = (tierIdx: number) => {
        if (!bundleEventId || !bundleTierId) return;
        const event = availableBundles.find(e => e.id === bundleEventId);
        const tier = event?.tiers?.find(t => t.id === bundleTierId);
        
        if (event && tier) {
            const current = tiers[tierIdx].bundledTiers || [];
            updateTier(tierIdx, 'bundledTiers', [...current, {
                eventId: event.id,
                eventName: event.name,
                tierId: tier.id,
                tierName: tier.name
            }]);
            setBundleEventId('');
            setBundleTierId('');
        }
    };

    const removeBundle = (tierIdx: number, bundleIdx: number) => {
        const current = [...(tiers[tierIdx].bundledTiers || [])];
        current.splice(bundleIdx, 1);
        updateTier(tierIdx, 'bundledTiers', current);
    };

    const selectedBundleEvent = availableBundles.find(e => e.id === bundleEventId);

    return (
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-4">
            <div className="flex justify-between items-center mb-4">
                <label className="block text-xs font-bold text-purple-900 uppercase flex items-center">
                    <Gem size={12} className="mr-1"/> {eventType === 'CONTAINER' ? 'Series Tiers (Bundles)' : 'Ticket Tiers'}
                </label>
                <button onClick={addNewTier} type="button" className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-purple-700 shadow-sm flex items-center">
                    <Plus size={12} className="mr-1"/> Add Tier
                </button>
            </div>
            
            <div className="space-y-3">
                {tiers.map((tier, idx) => {
                    const isExpanded = expandedIndex === idx;
                    
                    return (
                        <div key={tier.id} className="bg-white rounded-lg border border-purple-200 overflow-hidden shadow-sm transition-all">
                            {/* Header */}
                            <div 
                                className="p-3 flex justify-between items-center cursor-pointer hover:bg-purple-50/50"
                                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-md ${isExpanded ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                                        <Ticket size={16}/>
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-800">{tier.name}</div>
                                        <div className="text-[10px] text-slate-500">
                                            {eventType === 'CONTAINER' ? (
                                                `${tier.bundledTiers?.length || 0} Bundled Events`
                                            ) : (
                                                `${tier.grantTagIds?.length || 0} Access Tags`
                                            )}
                                            {tier.masterCode && <span className="ml-2 font-mono text-[9px] text-indigo-600 bg-indigo-50 px-1 rounded">REF: {tier.masterCode}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeTier(idx); }}
                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                    {isExpanded ? <ChevronUp size={16} className="text-purple-400"/> : <ChevronDown size={16} className="text-slate-300"/>}
                                </div>
                            </div>

                            {/* Body */}
                            {isExpanded && (
                                <div className="p-4 border-t border-purple-100 bg-purple-50/30 animate-fade-in">
                                    
                                    {/* MASTER TIER PRESET SELECTOR */}
                                    <div className="mb-4 bg-white p-2 rounded border border-slate-200 flex items-center gap-2">
                                        <DownloadCloud size={14} className="text-slate-400"/>
                                        <select 
                                            className="text-xs flex-1 outline-none text-slate-600 bg-transparent cursor-pointer font-medium"
                                            onChange={(e) => {
                                                if (e.target.value) applyMasterTemplate(idx, e.target.value);
                                                e.target.value = '';
                                            }}
                                        >
                                            <option value="">-- Load Preset from Master --</option>
                                            {masterTiers.map(m => (
                                                <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tier Name</label>
                                            <input 
                                                type="text" className="w-full p-2 text-sm border border-slate-200 rounded"
                                                value={tier.name}
                                                onChange={(e) => updateTier(idx, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quota</label>
                                            <input 
                                                type="number" className="w-full p-2 text-sm border border-slate-200 rounded"
                                                value={tier.quota}
                                                onChange={(e) => updateTier(idx, 'quota', Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Tag Selection (ALWAYS AVAILABLE) */}
                                    {/* This is the Key issuance mechanism, even Containers might issue a Series Tag */}
                                    <div className="mb-4">
                                        <label className="block text-[10px] font-bold text-purple-700 uppercase mb-2">
                                            Granted Access Keys (Tags)
                                        </label>
                                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1 border border-slate-200 rounded-lg bg-white">
                                            {availableCreditTags.map(tag => {
                                                const isSelected = tier.grantTagIds?.includes(tag.code);
                                                return (
                                                    <button
                                                        key={tag.code}
                                                        type="button"
                                                        onClick={() => toggleTag(idx, tag.code)}
                                                        className={`
                                                            text-left px-3 py-2 rounded border text-xs font-medium transition-all flex items-center justify-between
                                                            ${isSelected 
                                                                ? 'bg-blue-50 border-blue-500 text-blue-700' 
                                                                : 'bg-white border-transparent text-slate-500 hover:bg-slate-50'
                                                            }
                                                        `}
                                                    >
                                                        <span className="truncate mr-2">{tag.label}</span>
                                                        {isSelected && <Check size={12} className="text-blue-600 shrink-0"/>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Bundle Logic (Container Only - Explicit Separation) */}
                                    {eventType === 'CONTAINER' && (
                                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center">
                                                <Layers size={10} className="mr-1"/> Advanced: Bundled Sub-Events
                                            </label>
                                            <p className="text-[10px] text-slate-400 mb-2">Use this if the Container directly issues tickets for sub-events instead of just a Series Tag.</p>
                                            
                                            <div className="flex gap-2 mb-2">
                                                <select 
                                                    className="flex-1 p-1.5 border border-slate-200 rounded text-xs"
                                                    value={bundleEventId}
                                                    onChange={(e) => { setBundleEventId(e.target.value); setBundleTierId(''); }}
                                                >
                                                    <option value="">-- 1. Select Child Event --</option>
                                                    {availableBundles.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                                </select>
                                                
                                                <select 
                                                    className="flex-1 p-1.5 border border-slate-200 rounded text-xs"
                                                    value={bundleTierId}
                                                    onChange={(e) => setBundleTierId(e.target.value)}
                                                    disabled={!selectedBundleEvent}
                                                >
                                                    <option value="">-- 2. Select Tier --</option>
                                                    {selectedBundleEvent?.tiers?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                                
                                                <button 
                                                    type="button"
                                                    onClick={() => addBundle(idx)}
                                                    disabled={!bundleEventId || !bundleTierId}
                                                    className="px-3 bg-slate-800 text-white rounded text-xs font-bold disabled:opacity-50"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            
                                            <div className="space-y-1">
                                                {tier.bundledTiers?.map((bundle, bIdx) => (
                                                    <div key={bIdx} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded border border-slate-100">
                                                        <span>{bundle.eventName} <span className="text-slate-400">({bundle.tierName})</span></span>
                                                        <button type="button" onClick={() => removeBundle(idx, bIdx)} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                                                    </div>
                                                ))}
                                                {(!tier.bundledTiers || tier.bundledTiers.length === 0) && (
                                                    <div className="text-[10px] text-slate-400 italic text-center p-2">No direct bundling configured. Access handled by Tags.</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TierManager;
