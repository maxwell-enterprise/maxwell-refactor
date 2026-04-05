
import React, { useState, useEffect } from 'react';
import { CommissionService } from '../../services/commissionService';
import { CommissionRule, BeneficiaryBasis } from '../../types/commission';
import { STORE_PRODUCTS } from '../../constants';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, Edit3, X, DollarSign, Percent, Settings, ShieldCheck, Box, UserCheck, Scale } from 'lucide-react';

const CommissionConfig: React.FC = () => {
    const { showToast } = useToast();
    const [rules, setRules] = useState<CommissionRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    // Editor State
    const [editRule, setEditRule] = useState<Partial<CommissionRule>>({});

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        setLoading(true);
        try {
            const data = await CommissionService.getRules();
            setRules(data);
        } catch {
            setRules([]);
        } finally {
            setLoading(false);
        }
    };

    const handleNew = () => {
        setEditRule({
            id: `COM-${Date.now()}`,
            name: 'New Commission Rule',
            type: 'PERCENTAGE_ON_SALES',
            value: 10,
            targetProductId: 'ALL',
            beneficiaryRole: 'ALL',
            beneficiaryBasis: 'DIRECT_REFERRER',
            isActive: true
        });
        setIsEditing(true);
    };

    const handleEdit = (rule: CommissionRule) => {
        setEditRule(JSON.parse(JSON.stringify(rule)));
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!editRule.name || editRule.value === undefined) {
            showToast('Please check required fields', 'error');
            return;
        }
        try {
            await CommissionService.saveRule(editRule as CommissionRule);
            showToast('Commission Rule saved successfully', 'success');
            setIsEditing(false);
            loadRules();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to save rule';
            showToast(msg, 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if(!window.confirm('Delete this rule?')) return;
        try {
            await CommissionService.deleteRule(id);
            loadRules();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to delete rule';
            showToast(msg, 'error');
        }
    };

    const getBasisLabel = (basis: BeneficiaryBasis) => {
        switch(basis) {
            case 'DIRECT_REFERRER': return 'Direct Sponsor (Referrer)';
            case 'ASSIGNED_MENTOR': return 'Assigned Mentor (Upline)';
            case 'SALES_AGENT': return 'Sales Agent';
            case 'MANUAL': return 'Manual Selection';
            default: return basis;
        }
    };

    if (isEditing) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl mx-auto my-4 animate-fade-in">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h3 className="font-bold text-lg text-slate-900">Configure Commission Logic</h3>
                    <button onClick={() => setIsEditing(false)}><X size={20} className="text-slate-400 hover:text-slate-700"/></button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rule Name</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded" value={editRule.name} onChange={e => setEditRule({...editRule, name: e.target.value})} placeholder="e.g. Standard 10% Referral" />
                    </div>

                    {/* NEW: Beneficiary Basis Selector */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <label className="block text-xs font-bold text-blue-800 uppercase mb-2 flex items-center">
                            <UserCheck size={14} className="mr-1"/> Reference Mechanism (Who gets paid?)
                        </label>
                        <select 
                            className="w-full p-2 border border-blue-200 rounded text-sm bg-white"
                            value={editRule.beneficiaryBasis}
                            onChange={e => setEditRule({...editRule, beneficiaryBasis: e.target.value as BeneficiaryBasis})}
                        >
                            <option value="DIRECT_REFERRER">Direct Sponsor (The one who referred the buyer)</option>
                            <option value="ASSIGNED_MENTOR">Assigned Mentor (Long-term coach)</option>
                            <option value="SALES_AGENT">Internal Sales Agent</option>
                            <option value="MANUAL">No Auto-Logic (Admin Decides)</option>
                        </select>
                        <p className="text-[10px] text-blue-600 mt-1">This defines the relationship link between the Buyer and the Beneficiary.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Calculation Type</label>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setEditRule({...editRule, type: 'PERCENTAGE_ON_SALES'})}
                                    className={`flex-1 py-2 rounded border text-xs font-bold flex items-center justify-center ${editRule.type === 'PERCENTAGE_ON_SALES' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-500'}`}
                                >
                                    <Percent size={12} className="mr-1"/> Percentage
                                </button>
                                <button 
                                    onClick={() => setEditRule({...editRule, type: 'FIXED_AMOUNT'})}
                                    className={`flex-1 py-2 rounded border text-xs font-bold flex items-center justify-center ${editRule.type === 'FIXED_AMOUNT' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-slate-500'}`}
                                >
                                    <DollarSign size={12} className="mr-1"/> Fixed (IDR)
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Value</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border border-slate-300 rounded font-mono font-bold" 
                                value={editRule.value} 
                                onChange={e => setEditRule({...editRule, value: Number(e.target.value)})} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Applicable Product</label>
                            <select 
                                className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                                value={editRule.targetProductId}
                                onChange={e => setEditRule({...editRule, targetProductId: e.target.value})}
                            >
                                <option value="ALL">All Products (Global)</option>
                                {STORE_PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Beneficiary Role Requirement</label>
                            <select 
                                className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                                value={editRule.beneficiaryRole}
                                onChange={e => setEditRule({...editRule, beneficiaryRole: e.target.value})}
                            >
                                <option value="ALL">Anyone (Member/Partner/Facilitator)</option>
                                <option value="FACILITATOR">Facilitator Only</option>
                                <option value="PARTNER">Partner Only</option>
                                <option value="SALES">Sales Team Only</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-slate-900 text-white rounded font-bold hover:bg-slate-800">Save Rule</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center"><Settings className="mr-3 text-slate-600" /> Master Commission Rules</h2>
                <button onClick={handleNew} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700">
                    <Plus size={16} className="mr-2"/> New Rule
                </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
                {!loading && rules.length === 0 ? (
                    <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center">
                        <div
                            className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 shadow-sm ring-1 ring-blue-100/80"
                            aria-hidden
                        >
                            <Scale className="h-8 w-8" strokeWidth={1.6} />
                        </div>
                        <h3 className="text-lg font-semibold tracking-tight text-slate-800">
                            No commission rules yet
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                            Define who earns commission, how beneficiaries are determined (sponsor, mentor, sales), and the percentage or fixed amount. Use{' '}
                            <span className="font-medium text-slate-600">New Rule</span> in the top-right to get started.
                        </p>
                    </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rules.map(rule => (
                        <div key={rule.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`p-2 rounded-lg ${rule.type === 'PERCENTAGE_ON_SALES' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                        {rule.type === 'PERCENTAGE_ON_SALES' ? <Percent size={20}/> : <DollarSign size={20}/>}
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(rule)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit3 size={16}/></button>
                                        <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <h4 className="font-bold text-slate-900 text-lg mb-1">{rule.name}</h4>
                                <div className="text-2xl font-bold text-slate-800 mb-4">
                                    {rule.type === 'PERCENTAGE_ON_SALES' ? `${rule.value}%` : `IDR ${rule.value.toLocaleString()}`}
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-2 py-1.5 rounded">
                                        <UserCheck size={14} className="mr-2 text-indigo-500"/>
                                        <span className="font-bold text-indigo-700">{getBasisLabel(rule.beneficiaryBasis)}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-2 py-1.5 rounded">
                                        <Box size={14} className="mr-2 text-slate-400"/>
                                        <span className="truncate flex-1">{rule.targetProductId === 'ALL' ? 'Global (All Products)' : rule.targetProductId}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-2 py-1.5 rounded">
                                        <ShieldCheck size={14} className="mr-2 text-slate-400"/>
                                        <span>{rule.beneficiaryRole === 'ALL' ? 'Any Role' : rule.beneficiaryRole}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                )}
            </div>
        </div>
    );
};

export default CommissionConfig;
