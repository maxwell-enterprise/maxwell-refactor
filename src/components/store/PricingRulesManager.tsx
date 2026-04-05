
import React, { useState, useEffect } from 'react';
import { PricingEngine } from '../../services/pricingEngine';
import { PricingRule } from '../../types/pricing';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, Edit3, Save, X, Settings, Calendar, DollarSign, Users, ShieldCheck, Tag, PieChart } from 'lucide-react';
import { EmptyStatePlaceholder } from './EmptyStatePlaceholder';

const PricingRulesManager: React.FC = () => {
    const { showToast } = useToast();
    const [rules, setRules] = useState<PricingRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    // Editor State
    const [editRule, setEditRule] = useState<Partial<PricingRule>>({});

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        setLoading(true);
        const data = await PricingEngine.getRules();
        setRules(data);
        setLoading(false);
    };

    const handleNew = () => {
        setEditRule({
            id: `RULE-${Date.now()}`,
            name: 'New Strategic Discount',
            type: 'MEMBER_TIER',
            priority: 5,
            isActive: true,
            isStackable: false,
            condition: { 
                targetLifecycle: [],
                targetTags: [],
                minEngagementScore: 0
            },
            budget: {
                maxBudget: 10000000,
                currentSpend: 0,
                autoDisableOnDepletion: true
            },
            action: { type: 'PERCENTAGE_OFF', value: 10 }
        });
        setIsEditing(true);
    };

    const handleEdit = (rule: PricingRule) => {
        setEditRule(JSON.parse(JSON.stringify(rule)));
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!editRule.name || !editRule.action?.value) {
            showToast('Please check required fields', 'error');
            return;
        }
        await PricingEngine.saveRule(editRule as PricingRule);
        showToast('Pricing Rule saved successfully', 'success');
        setIsEditing(false);
        loadRules();
    };

    const handleDelete = async (id: string) => {
        if(!window.confirm('Delete this rule? This will affect product pricing immediately.')) return;
        await PricingEngine.deleteRule(id);
        loadRules();
    };

    const toggleArrayItem = (field: 'targetLifecycle' | 'targetTags', value: string) => {
        const current = editRule.condition?.[field] || [];
        const updated = current.includes(value as any) 
            ? current.filter(v => v !== value)
            : [...current, value];
        setEditRule({
            ...editRule,
            condition: { ...editRule.condition!, [field]: updated }
        });
    };

    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits:0 }).format(num);

    if (isEditing && editRule && editRule.condition && editRule.budget) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-3xl mx-auto my-4 animate-fade-in">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h3 className="font-bold text-lg text-slate-900">Configure Strategic Pricing</h3>
                    <button onClick={() => setIsEditing(false)}><X size={20} className="text-slate-400 hover:text-slate-700"/></button>
                </div>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rule Name</label>
                            <input type="text" className="w-full p-2 border border-slate-300 rounded" value={editRule.name} onChange={e => setEditRule({...editRule, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rule Type</label>
                            <select className="w-full p-2 border border-slate-300 rounded" value={editRule.type} onChange={e => setEditRule({...editRule, type: e.target.value as any})}>
                                <option value="MEMBER_TIER">Member Tier</option>
                                <option value="LOYALTY_REWARD">Loyalty Reward</option>
                                <option value="EARLY_BIRD">Early Bird</option>
                                <option value="BULK_VOLUME">Bulk Volume</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priority (1-10)</label>
                            <input type="number" className="w-full p-2 border border-slate-300 rounded" value={editRule.priority} onChange={e => setEditRule({...editRule, priority: Number(e.target.value)})} />
                        </div>
                    </div>

                    {/* ABAC CONDITIONS */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-800 uppercase mb-3 flex items-center"><ShieldCheck size={14} className="mr-1"/> ABAC Conditions (Who gets this?)</h4>
                        
                        <div className="mb-4">
                            <label className="block text-[10px] text-slate-500 mb-1">Lifecycle Stage</label>
                            <div className="flex flex-wrap gap-2">
                                {['MEMBER', 'CERTIFIED', 'FACILITATOR'].map(lc => (
                                    <button 
                                        key={lc}
                                        onClick={() => toggleArrayItem('targetLifecycle', lc)}
                                        className={`text-xs px-2 py-1 rounded border ${editRule.condition?.targetLifecycle?.includes(lc as any) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300'}`}
                                    >
                                        {lc}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-[10px] text-slate-500 mb-1">Target Tags (Has at least one)</label>
                            <div className="flex flex-wrap gap-2">
                                {['FOUNDER', 'PARTNER', 'VIP', 'HIGH_NET_WORTH'].map(tag => (
                                    <button 
                                        key={tag}
                                        onClick={() => toggleArrayItem('targetTags', tag)}
                                        className={`text-xs px-2 py-1 rounded border ${editRule.condition?.targetTags?.includes(tag) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-300'}`}
                                    >
                                        <Tag size={10} className="mr-1 inline"/>{tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Min. Engagement Score (0-100)</label>
                            <input 
                                type="number" 
                                className="w-32 p-2 border border-slate-300 rounded text-sm"
                                value={editRule.condition?.minEngagementScore || 0}
                                onChange={e => setEditRule({...editRule, condition: {...editRule.condition!, minEngagementScore: Number(e.target.value)}})}
                            />
                        </div>
                    </div>

                    {/* FINANCIAL & BUDGET */}
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                        <h4 className="text-xs font-bold text-amber-900 uppercase mb-3 flex items-center"><PieChart size={14} className="mr-1"/> Financial Controls</h4>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="block text-[10px] text-amber-800 mb-1">Discount Value</label>
                                <div className="flex gap-2">
                                    <select className="p-2 border border-amber-300 rounded text-sm bg-white" value={editRule.action?.type} onChange={e => setEditRule({...editRule, action: { ...editRule.action!, type: e.target.value as any }})}>
                                        <option value="PERCENTAGE_OFF">% Off</option>
                                        <option value="FIXED_OFF">IDR Off</option>
                                    </select>
                                    <input type="number" className="w-full p-2 border border-amber-300 rounded text-sm" value={editRule.action?.value} onChange={e => setEditRule({...editRule, action: { ...editRule.action!, value: Number(e.target.value) }})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] text-amber-800 mb-1">Absolute Budget Cap (IDR)</label>
                                <input type="number" className="w-full p-2 border border-amber-300 rounded text-sm" value={editRule.budget.maxBudget} onChange={e => setEditRule({...editRule, budget: { ...editRule.budget!, maxBudget: Number(e.target.value) }})} />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-amber-800">
                            <label className="flex items-center">
                                <input type="checkbox" className="mr-2" checked={editRule.budget.autoDisableOnDepletion} onChange={e => setEditRule({...editRule, budget: {...editRule.budget!, autoDisableOnDepletion: e.target.checked}})} />
                                Auto-disable when budget exhausted
                            </label>
                            <label className="flex items-center">
                                <input type="checkbox" className="mr-2" checked={editRule.isStackable} onChange={e => setEditRule({...editRule, isStackable: e.target.checked})} />
                                Stackable with other promos
                            </label>
                        </div>
                        
                        <div className="mt-2 text-[10px] text-amber-700">
                            Current Spend: <b>{formatIDR(editRule.budget.currentSpend)}</b> / {formatIDR(editRule.budget.maxBudget)}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-slate-900 text-white rounded font-bold hover:bg-slate-800">Save Configuration</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
                <h2 className="font-bold text-slate-900 flex items-center"><Settings className="mr-2 text-slate-600" size={20}/> Pricing Logic Engine</h2>
                <button onClick={handleNew} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700">
                    <Plus size={16} className="mr-2"/> New Rule
                </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
                {loading ? (
                    <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">
                        Loading…
                    </div>
                ) : rules.length === 0 ? (
                    <EmptyStatePlaceholder
                        icon={Settings}
                        message="No pricing rules yet."
                        minHeightClass="min-h-[200px]"
                    />
                ) : (
                <div className="grid grid-cols-1 gap-4">
                    {rules.map(rule => (
                        <div key={rule.id} className={`bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center ${!rule.isActive ? 'opacity-60 border-slate-200' : 'border-slate-300'}`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-slate-900">{rule.name}</h4>
                                    {!rule.isActive && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">DISABLED</span>}
                                    <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{rule.type}</span>
                                </div>
                                <div className="text-sm text-slate-500 flex items-center gap-4">
                                    <span>Effect: <b className="text-slate-800">{rule.action.type === 'PERCENTAGE_OFF' ? `${rule.action.value}%` : `IDR ${rule.action.value}`}</b></span>
                                    <span>Budget: <b className={rule.budget.currentSpend > rule.budget.maxBudget ? 'text-red-500' : 'text-green-600'}>{formatIDR(rule.budget.currentSpend)}</b> / {formatIDR(rule.budget.maxBudget)}</span>
                                </div>
                                <div className="flex gap-1 mt-2">
                                    {rule.condition.targetLifecycle?.map(l => <span key={l} className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{l}</span>)}
                                    {rule.condition.targetTags?.map(t => <span key={t} className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 flex items-center"><Tag size={8} className="mr-1"/>{t}</span>)}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(rule)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={18}/></button>
                                <button onClick={() => handleDelete(rule.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>
                )}
            </div>
        </div>
    );
};

export default PricingRulesManager;
