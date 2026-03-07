
import React, { useState, useMemo } from 'react';
import { TRIGGER_CATALOG } from '../../constants/triggerCatalog';
import { TriggerDefinition, TriggerCategory } from '../../types/automation';
import { 
    CreditCard, UserPlus, Ticket, Truck, Gift, Clock, QrCode, 
    Zap, Search, CheckCircle2, ChevronRight 
} from 'lucide-react';

// Icon Mapper
const IconMap: Record<string, any> = {
    CreditCard, UserPlus, Ticket, Truck, Gift, Clock, QrCode
};

interface TriggerSelectorProps {
    selectedTriggerId?: string;
    onSelect: (trigger: TriggerDefinition) => void;
    className?: string;
}

const TriggerSelector: React.FC<TriggerSelectorProps> = ({ selectedTriggerId, onSelect, className }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<TriggerCategory | 'ALL'>('ALL');

    const categories: (TriggerCategory | 'ALL')[] = ['ALL', 'FINANCE', 'CRM', 'EVENT', 'LOGISTICS'];

    const filteredTriggers = useMemo(() => {
        return TRIGGER_CATALOG.filter(t => {
            const matchesSearch = t.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  t.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
            return matchesSearch && matchesCat;
        });
    }, [searchTerm, selectedCategory]);

    const getIcon = (iconName: string) => {
        const Icon = IconMap[iconName] || Zap;
        return <Icon size={24} />;
    };

    const getCategoryColor = (cat: TriggerCategory) => {
        switch(cat) {
            case 'FINANCE': return 'bg-emerald-100 text-emerald-600';
            case 'CRM': return 'bg-blue-100 text-blue-600';
            case 'EVENT': return 'bg-purple-100 text-purple-600';
            case 'LOGISTICS': return 'bg-amber-100 text-amber-600';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Search & Filter Bar */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search triggers (e.g. Payment, Ticket)..." 
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select 
                    className="p-2 border border-slate-300 rounded-lg text-sm bg-white outline-none cursor-pointer"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as any)}
                >
                    {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>)}
                </select>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[400px] pr-2">
                {filteredTriggers.map(trigger => {
                    const isSelected = selectedTriggerId === trigger.id;
                    return (
                        <button
                            key={trigger.id}
                            onClick={() => onSelect(trigger)}
                            className={`flex items-start p-4 rounded-xl border text-left transition-all group relative ${
                                isSelected 
                                ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' 
                                : 'border-slate-200 hover:border-blue-300 hover:shadow-md bg-white'
                            }`}
                        >
                            <div className={`p-3 rounded-lg mr-4 shrink-0 ${getCategoryColor(trigger.category)}`}>
                                {getIcon(trigger.iconName)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-blue-800' : 'text-slate-900'}`}>{trigger.label}</h4>
                                    {isSelected && <CheckCircle2 size={18} className="text-blue-600" />}
                                </div>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                    {trigger.description}
                                </p>
                                
                                {/* Variable Preview (Power Automate Style) */}
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {trigger.variables.slice(0, 3).map(v => (
                                        <span key={v.key} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                                            {`{${v.key}}`}
                                        </span>
                                    ))}
                                    {trigger.variables.length > 3 && (
                                        <span className="text-[10px] text-slate-400 px-1">+{trigger.variables.length - 3} more</span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default TriggerSelector;
