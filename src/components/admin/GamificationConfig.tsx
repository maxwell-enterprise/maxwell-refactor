
import React, { useState, useEffect } from 'react';
import { GamificationService } from '../../services/gamificationService';
import { Badge, PointRule, PointTriggerType } from '../../types/gamification';
import { GAMIFICATION_TRIGGERS } from '../../constants/gamificationDefs'; 
import { useToast } from '../../context/ToastContext';
import { 
    Trophy, Star, Settings, Plus, Save, Trash2, 
    Zap, Flame, Gem, Sunrise, Users, Target, Shield, Info, Link 
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
    Trophy, Star, Zap, Flame, Gem, Sunrise, Users, Target, Shield
};

const GamificationConfig: React.FC = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'BADGES' | 'RULES'>('BADGES');
    const [badges, setBadges] = useState<Badge[]>([]);
    const [rules, setRules] = useState<PointRule[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [b, r] = await Promise.all([
            GamificationService.getBadges(),
            GamificationService.getRules()
        ]);
        setBadges(b);
        setRules(r);
        setLoading(false);
    };

    const handleSaveBadges = async () => {
        await GamificationService.updateBadges(badges);
        showToast('Badge configurations saved.', 'success');
    };

    const handleSaveRules = async () => {
        await GamificationService.updateRules(rules);
        showToast('Scoring rules updated.', 'success');
    };

    const addBadge = () => {
        setBadges([...badges, {
            id: `BG-${Date.now()}`,
            code: 'NEW_BADGE',
            name: 'New Badge',
            description: 'Description...',
            icon: 'Star',
            rarity: 'COMMON',
            pointBonus: 0,
            autoTrigger: 'MANUAL_AWARD_ONLY'
        }]);
    };

    const updateBadge = (idx: number, field: keyof Badge, value: any) => {
        const updated = [...badges];
        updated[idx] = { ...updated[idx], [field]: value };
        setBadges(updated);
    };

    const removeBadge = (idx: number) => {
        setBadges(badges.filter((_, i) => i !== idx));
    };

    const updateRule = (idx: number, field: keyof PointRule, value: any) => {
        const updated = [...rules];
        updated[idx] = { ...updated[idx], [field]: value };
        setRules(updated);
    };

    const getTriggerDef = (triggerId: string) => {
        return GAMIFICATION_TRIGGERS.find(t => t.id === triggerId);
    };

    return (
        <div className="page-container flex flex-col animate-fade-in min-w-0">
            
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-5 sm:mb-6 min-w-0">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                        <Trophy className="shrink-0 text-amber-500" /> <span className="leading-tight">Gamification Engine</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm sm:text-base">Configure incentives, badges, and point logic.</p>
                </div>
                <div className="overflow-x-scroll-touch rounded-lg bg-slate-100 p-1 shrink-0 self-start sm:self-auto w-full sm:w-auto">
                    <div className="inline-flex max-w-none flex-nowrap gap-1">
                    <button type="button" onClick={() => setActiveTab('BADGES')} className={`shrink-0 px-3 sm:px-4 py-2 text-sm font-bold rounded-md transition-all whitespace-nowrap ${activeTab === 'BADGES' ? 'bg-white shadow text-amber-600' : 'text-slate-500'}`}>Badges</button>
                    <button type="button" onClick={() => setActiveTab('RULES')} className={`shrink-0 px-3 sm:px-4 py-2 text-sm font-bold rounded-md transition-all whitespace-nowrap ${activeTab === 'RULES' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Scoring Rules</button>
                    </div>
                </div>
            </div>

            <div className="min-w-0 overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                
                {/* BADGES EDITOR */}
                {activeTab === 'BADGES' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Badge Registry</h3>
                            <button onClick={addBadge} className="flex items-center text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg">
                                <Plus size={16} className="mr-2"/> Add Badge
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {badges.map((badge, idx) => (
                                <div key={badge.id} className="border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-4 bg-slate-50/50 hover:shadow-md transition-shadow group relative min-w-0 max-w-full">
                                    <button onClick={() => removeBadge(idx)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1 rounded hover:bg-slate-100">
                                        <Trash2 size={16} />
                                    </button>

                                    <div className="w-16 flex flex-col items-center gap-2">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 
                                            ${badge.rarity === 'LEGENDARY' ? 'bg-amber-100 border-amber-400 text-amber-600' : 
                                              badge.rarity === 'EPIC' ? 'bg-purple-100 border-purple-400 text-purple-600' : 
                                              badge.rarity === 'RARE' ? 'bg-blue-100 border-blue-400 text-blue-600' : 
                                              'bg-slate-100 border-slate-300 text-slate-500'}`}>
                                            {React.createElement(ICON_MAP[badge.icon] || Star, { size: 24 })}
                                        </div>
                                        <select 
                                            className="text-[10px] w-full bg-white border border-slate-200 rounded"
                                            value={badge.icon}
                                            onChange={(e) => updateBadge(idx, 'icon', e.target.value)}
                                        >
                                            {Object.keys(ICON_MAP).map(icon => <option key={icon} value={icon}>{icon}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-col gap-2 min-w-0 pr-0 sm:flex-row sm:gap-2 sm:pr-6">
                                            <input 
                                                type="text" 
                                                className="min-w-0 font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-full"
                                                value={badge.name}
                                                onChange={(e) => updateBadge(idx, 'name', e.target.value)}
                                                placeholder="Badge Name"
                                            />
                                            <select 
                                                className="shrink-0 text-xs font-bold uppercase bg-white border border-slate-200 rounded px-2 outline-none sm:max-w-[9rem]"
                                                value={badge.rarity}
                                                onChange={(e) => updateBadge(idx, 'rarity', e.target.value)}
                                            >
                                                <option value="COMMON">Common</option>
                                                <option value="RARE">Rare</option>
                                                <option value="EPIC">Epic</option>
                                                <option value="LEGENDARY">Legendary</option>
                                            </select>
                                        </div>
                                        <input 
                                            type="text" 
                                            className="text-xs text-slate-500 w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                                            value={badge.description}
                                            onChange={(e) => updateBadge(idx, 'description', e.target.value)}
                                            placeholder="Description..."
                                        />
                                        
                                        {/* LOGIC & REWARD SECTION */}
                                        <div className="grid grid-cols-2 gap-3 mt-2 bg-white p-2 rounded border border-slate-100">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 flex items-center mb-1">
                                                    <Link size={10} className="mr-1"/> Unlock Trigger
                                                </label>
                                                <select 
                                                    className="w-full text-xs border border-slate-200 rounded p-1"
                                                    value={badge.autoTrigger || 'MANUAL_AWARD_ONLY'}
                                                    onChange={(e) => updateBadge(idx, 'autoTrigger', e.target.value)}
                                                >
                                                    <option value="MANUAL_AWARD_ONLY">Manual Award Only</option>
                                                    {GAMIFICATION_TRIGGERS.map(t => (
                                                        <option key={t.id} value={t.id}>{t.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 flex items-center mb-1">
                                                    <GiftIcon size={10} className="mr-1"/> One-time Bonus
                                                </label>
                                                <div className="flex items-center">
                                                    <input 
                                                        type="number" 
                                                        className="w-full text-xs border border-slate-200 rounded p-1 text-right font-mono"
                                                        value={badge.pointBonus}
                                                        onChange={(e) => updateBadge(idx, 'pointBonus', Number(e.target.value))}
                                                    />
                                                    <span className="ml-1 text-[10px] text-slate-400">pts</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-100 flex justify-end">
                            <button onClick={handleSaveBadges} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold flex items-center hover:bg-slate-800">
                                <Save size={16} className="mr-2"/> Save Badges
                            </button>
                        </div>
                    </div>
                )}

                {/* RULES EDITOR */}
                {activeTab === 'RULES' && (
                    <div className="space-y-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Point Scoring Rules</h3>
                            <p className="text-sm text-slate-500">
                                Define consistent rewards for repetitive actions (e.g., attending events).
                            </p>
                        </div>

                        <div className="space-y-2 min-w-0">
                            <div className="overflow-x-scroll-touch rounded-lg">
                            <div className="min-w-[640px] space-y-2">
                            <div className="grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-4 py-2 bg-slate-100 rounded-lg text-[10px] sm:text-xs font-bold text-slate-500 uppercase">
                                <div className="col-span-1 text-center">Active</div>
                                <div className="col-span-4">System Trigger</div>
                                <div className="col-span-2 text-center">Points</div>
                                <div className="col-span-5">Admin Note</div>
                            </div>
                            {rules.map((rule, idx) => {
                                const def = getTriggerDef(rule.triggerType);
                                return (
                                    <div key={rule.id} className="grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-4 py-3 bg-white border border-slate-200 rounded-lg items-center hover:shadow-sm">
                                        <div className="col-span-1 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                checked={rule.isActive}
                                                onChange={(e) => updateRule(idx, 'isActive', e.target.checked)}
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <div className="flex items-center">
                                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded mr-3">
                                                    {def && React.createElement(def.icon, { size: 16 })}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm">{def?.label || rule.triggerType}</div>
                                                    <div className="text-[10px] text-slate-400 line-clamp-1">{def?.description}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <input 
                                                type="number" 
                                                className="w-full p-2 border border-slate-200 rounded text-center font-bold text-slate-900 focus:border-blue-500 outline-none"
                                                value={rule.points}
                                                onChange={(e) => updateRule(idx, 'points', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="col-span-5">
                                            <input 
                                                type="text" 
                                                className="w-full text-sm text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                                                value={rule.description}
                                                onChange={(e) => updateRule(idx, 'description', e.target.value)}
                                                placeholder="Internal note..."
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                            </div>
                        </div>
                        <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-100 flex justify-end">
                            <button onClick={handleSaveRules} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold flex items-center hover:bg-slate-800">
                                <Save size={16} className="mr-2"/> Save Rules
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Simple helper icon not in main import
const GiftIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
);

export default GamificationConfig;
