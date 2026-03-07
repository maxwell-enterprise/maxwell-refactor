
import React, { useState, useMemo } from 'react';
import { Variable as VariableIcon, Search, X, ChevronRight, Info } from 'lucide-react';
import { VARIABLE_CATALOG, VARIABLE_CATEGORIES, VariableCategory } from '../../constants/variableCatalog';

interface VariableInserterProps {
    onInsert: (variableKey: string) => void;
    align?: 'left' | 'right';
    className?: string;
    buttonLabel?: string;
}

const VariableInserter: React.FC<VariableInserterProps> = ({ onInsert, align = 'right', className = '', buttonLabel = 'Insert Variable' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<VariableCategory>('MEMBER');

    const filteredVariables = useMemo(() => {
        return VARIABLE_CATALOG.filter(v => {
            const matchesCategory = v.category === activeCategory;
            const matchesSearch = v.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  v.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  v.description.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [activeCategory, searchTerm]);

    const handleSelect = (key: string) => {
        onInsert(key);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`relative inline-block ${className}`}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm"
                title="Inject Dynamic Data"
            >
                <VariableIcon size={12} className="mr-1.5"/> {buttonLabel}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[400px] animate-scale-in`}>
                        
                        {/* Header & Search */}
                        <div className="p-3 border-b border-slate-100 bg-slate-50">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    autoFocus
                                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:border-indigo-500 outline-none"
                                    placeholder="Search variables (e.g. name, price)..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* Category Sidebar */}
                            <div className="w-10 bg-slate-50 border-r border-slate-100 flex flex-col items-center py-2 gap-1 overflow-y-auto custom-scrollbar">
                                {VARIABLE_CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`p-2 rounded-lg transition-all ${activeCategory === cat.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                        title={cat.label}
                                    >
                                        <cat.icon size={16} />
                                    </button>
                                ))}
                            </div>

                            {/* Variable List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                <div className="px-2 py-1 mb-1">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {VARIABLE_CATEGORIES.find(c => c.id === activeCategory)?.label}
                                    </h4>
                                </div>
                                {filteredVariables.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-400 italic">No matches found.</div>
                                ) : (
                                    filteredVariables.map(v => (
                                        <button
                                            key={v.key}
                                            onClick={() => handleSelect(v.key)}
                                            className="w-full text-left p-2 rounded-lg hover:bg-indigo-50 group transition-colors border border-transparent hover:border-indigo-100"
                                        >
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="font-bold text-slate-700 text-xs">{v.label}</span>
                                                <code className="text-[9px] bg-slate-100 px-1 py-0.5 rounded text-slate-500 font-mono group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                                                    {`{{${v.key}}}`}
                                                </code>
                                            </div>
                                            <div className="text-[10px] text-slate-500 truncate" title={v.description}>
                                                {v.description}
                                            </div>
                                            <div className="mt-1 text-[9px] text-slate-400 flex items-center">
                                                <Info size={8} className="mr-1"/> Ex: {v.example}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default VariableInserter;
