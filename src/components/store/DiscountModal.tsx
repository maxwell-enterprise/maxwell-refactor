
import React, { useState } from 'react';
import { Discount } from '../../types/index';
import { AbacCondition } from '../../types/pricing'; // Fixed Import
import { X, Save, Ticket, Calendar, Users, ShieldCheck, DollarSign } from 'lucide-react';

interface DiscountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (discount: Discount) => void;
    initialData?: Discount;
}

const DiscountModal: React.FC<DiscountModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState<Partial<Discount>>(initialData || {
        code: '',
        title: '',
        description: '',
        type: 'PERCENTAGE',
        value: 0,
        scope: 'GLOBAL',
        validFrom: new Date().toISOString().slice(0, 10),
        validUntil: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10),
        maxUsageLimit: 100,
        isFeatured: false,
        conditions: {} // Initialize ABAC
    });

    const [abac, setAbac] = useState<AbacCondition>(initialData?.conditions || {
        targetRegions: [],
        targetCompanies: [],
        minTenureMonths: 0
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const discountToSave: Discount = {
            id: formData.id || `DSC-${Date.now()}`,
            code: formData.code!.toUpperCase(),
            title: formData.title || 'Untitled',
            description: formData.description || '',
            type: formData.type as any,
            value: Number(formData.value),
            scope: formData.scope as any,
            validFrom: formData.validFrom || new Date().toISOString(),
            validUntil: formData.validUntil || new Date().toISOString(),
            maxUsageLimit: Number(formData.maxUsageLimit),
            currentUsageCount: formData.currentUsageCount || 0,
            currentBudgetBurned: formData.currentBudgetBurned || 0,
            isFeatured: !!formData.isFeatured,
            conditions: abac // Attach ABAC
        };
        onSave(discountToSave);
    };

    // Helper to toggle array items
    const toggleArray = <T extends string>(field: keyof AbacCondition, value: T) => {
        const current = (abac[field] as T[]) || [];
        const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        setAbac({ ...abac, [field]: updated });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg text-purple-600 shadow-sm"><Ticket size={20}/></div>
                        <div>
                            <h3 className="font-bold text-slate-900">{initialData ? 'Edit Voucher' : 'New Voucher'}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Marketing Engine</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-white/50 transition-all"><X size={20}/></button>
                </div>

                <div className="overflow-y-auto p-6 flex-1">
                    <form id="discountForm" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* BASIC INFO */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Voucher Code</label>
                                <input 
                                    type="text" required className="w-full p-3 border border-slate-300 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="SUMMER2025" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Campaign Title</label>
                                <input 
                                    type="text" required className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Summer Sale" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Type</label>
                                <select className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                    <option value="PERCENTAGE">Percentage (%)</option>
                                    <option value="FIXED_AMOUNT">Fixed Amount (IDR)</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Value</label>
                                <input 
                                    type="number" required className="w-full p-3 border border-slate-300 rounded-xl text-sm"
                                    value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})}
                                />
                            </div>
                        </div>

                        {/* LIMITS */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1"><Calendar size={10} className="inline mr-1"/> Valid From</label>
                                <input type="date" className="w-full p-2 border rounded text-xs" value={formData.validFrom?.slice(0,10)} onChange={e => setFormData({...formData, validFrom: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1"><Calendar size={10} className="inline mr-1"/> Valid Until</label>
                                <input type="date" className="w-full p-2 border rounded text-xs" value={formData.validUntil?.slice(0,10)} onChange={e => setFormData({...formData, validUntil: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1"><Users size={10} className="inline mr-1"/> Max Usage</label>
                                <input type="number" className="w-full p-2 border rounded text-xs" value={formData.maxUsageLimit} onChange={e => setFormData({...formData, maxUsageLimit: Number(e.target.value)})} />
                            </div>
                        </div>

                        {/* ABAC SECTION */}
                        <div className="border border-indigo-100 rounded-xl overflow-hidden">
                            <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex items-center">
                                <ShieldCheck size={16} className="text-indigo-600 mr-2"/>
                                <span className="text-xs font-bold text-indigo-800 uppercase">Advanced Eligibility (ABAC)</span>
                            </div>
                            <div className="p-4 space-y-4">
                                {/* Region */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Target Region</label>
                                    <div className="flex gap-2">
                                        {['ID', 'SG', 'US'].map(r => (
                                            <button 
                                                key={r} type="button"
                                                onClick={() => toggleArray('targetRegions', r as any)}
                                                className={`px-3 py-1 text-xs rounded-full border ${abac.targetRegions?.includes(r as any) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                            >
                                                {r === 'ID' ? 'Indonesia' : r === 'SG' ? 'Singapore' : 'USA'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tenure */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Minimum Tenure (Loyalty)</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" className="w-20 p-2 border rounded text-xs" 
                                            value={abac.minTenureMonths || 0}
                                            onChange={e => setAbac({...abac, minTenureMonths: Number(e.target.value)})}
                                        />
                                        <span className="text-xs text-slate-600">months membership required</span>
                                    </div>
                                </div>

                                {/* Corporate */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Corporate Exclusive</label>
                                    <input 
                                        type="text" className="w-full p-2 border rounded text-xs" 
                                        placeholder="Enter company tag (e.g. BCA, PERTAMINA)"
                                        value={abac.targetCompanies?.join(', ') || ''}
                                        onChange={e => setAbac({...abac, targetCompanies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Comma separated list of Company Tags.</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded text-purple-600" checked={formData.isFeatured} onChange={e => setFormData({...formData, isFeatured: e.target.checked})} />
                                <span className="text-sm font-bold text-slate-700">Feature on Landing Page</span>
                            </label>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors text-sm">Cancel</button>
                    <button form="discountForm" type="submit" className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg flex items-center transition-all">
                        <Save size={18} className="mr-2" /> Save Voucher
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DiscountModal;
