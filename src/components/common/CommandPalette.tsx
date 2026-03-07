
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Search, X, ArrowRight, Command, LayoutDashboard, Users, 
    ShoppingCart, CreditCard, Ticket, Settings, 
    LogOut, Clock, ChevronRight, Zap
} from 'lucide-react';
import { ViewState } from '../../types/index';
import { DataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (view: ViewState) => void;
}

type CommandType = 'RECENT' | 'NAVIGATION' | 'ACTION' | 'MEMBER' | 'PRODUCT';

interface CommandItem {
    id: string;
    title: string;
    subtitle?: string;
    type: CommandType;
    icon: React.ReactNode;
    action: () => void;
    keywords: string[]; 
}

// Helper for Text Highlighting
const HighlightedText = ({ text, query }: { text: string, query: string }) => {
    if (!query) return <>{text}</>;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) => 
                part.toLowerCase() === query.toLowerCase() ? (
                    <span key={i} className="text-blue-600 font-extrabold bg-blue-50 px-0.5 rounded">{part}</span>
                ) : (
                    part
                )
            )}
        </span>
    );
};

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
    const { logout } = useAuth();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [recentIds, setRecentIds] = useState<string[]>([]);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Dynamic Data State
    const [members, setMembers] = useState<any[]>([]);

    // 1. Load Recents from LocalStorage on Mount
    useEffect(() => {
        const stored = localStorage.getItem('cmd_recents');
        if (stored) {
            setRecentIds(JSON.parse(stored));
        }
    }, []);

    // 2. Load Data & Focus
    useEffect(() => {
        if (isOpen) {
            DataService.getMembers().then(data => setMembers(data.slice(0, 50))); 
            // Small delay to ensure render ensures focus works
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery('');
            setActiveIndex(0);
        }
    }, [isOpen]);

    // 3. Save to Recents
    const addToRecents = (id: string) => {
        const newRecents = [id, ...recentIds.filter(rid => rid !== id)].slice(0, 5);
        setRecentIds(newRecents);
        localStorage.setItem('cmd_recents', JSON.stringify(newRecents));
    };

    // --- COMMAND REGISTRY ---
    const allCommands: CommandItem[] = useMemo(() => {
        const list: CommandItem[] = [
            // NAVIGATION
            {
                id: 'nav-dash', title: 'Go to Dashboard', type: 'NAVIGATION', 
                icon: <LayoutDashboard size={18} />, 
                action: () => onNavigate(ViewState.DASHBOARD),
                keywords: ['home', 'main', 'stats']
            },
            {
                id: 'nav-crm', title: 'Member Directory', type: 'NAVIGATION', 
                icon: <Users size={18} />, 
                action: () => onNavigate(ViewState.CRM),
                keywords: ['users', 'people', 'customers', 'crm']
            },
            {
                id: 'nav-finance', title: 'Finance & Invoices', type: 'NAVIGATION', 
                icon: <CreditCard size={18} />, 
                action: () => onNavigate(ViewState.FINANCE),
                keywords: ['money', 'po', 'expense', 'accounting']
            },
            {
                id: 'nav-store', title: 'Store & Inventory', type: 'NAVIGATION', 
                icon: <ShoppingCart size={18} />, 
                action: () => onNavigate(ViewState.STORE_ADMIN),
                keywords: ['products', 'stock', 'items']
            },
            {
                id: 'nav-ops', title: 'Operations Center', type: 'NAVIGATION', 
                icon: <Ticket size={18} />, 
                action: () => onNavigate(ViewState.OPERATIONS),
                keywords: ['tasks', 'checklists', 'workflow']
            },
            {
                id: 'nav-settings', title: 'Settings', type: 'NAVIGATION', 
                icon: <Settings size={18} />, 
                action: () => onNavigate(ViewState.SETTINGS),
                keywords: ['profile', 'password', 'account']
            },

            // ACTIONS
            {
                id: 'act-logout', title: 'Log Out', type: 'ACTION', 
                icon: <LogOut size={18} className="text-red-500" />, 
                action: () => logout(),
                keywords: ['sign out', 'exit']
            }
        ];

        // MEMBER DYNAMIC DATA
        members.forEach(m => {
            list.push({
                id: `mem-${m.id}`,
                title: m.name,
                subtitle: m.email || m.phone,
                type: 'MEMBER',
                icon: <Users size={18} className="text-blue-500" />,
                action: () => {
                    onNavigate(ViewState.CRM);
                    // In a real app, we would dispatch an event or set context to open this specific member
                },
                keywords: [m.email, m.phone || '', m.company || '', m.id]
            });
        });

        return list;
    }, [members, onNavigate, logout]);

    // --- SEARCH ENGINE ---
    const filteredCommands = useMemo(() => {
        let results: CommandItem[] = [];

        if (!query) {
            // Show Recents First if no query
            if (recentIds.length > 0) {
                const recents = recentIds
                    .map(id => allCommands.find(c => c.id === id))
                    .filter((c): c is CommandItem => !!c)
                    .map(c => ({ ...c, type: 'RECENT' as CommandType })); // Override type for grouping
                results = [...recents];
            }
            // Then show default navigation
            const defaults = allCommands.filter(c => c.type === 'NAVIGATION' || c.type === 'ACTION');
            // Dedupe if already in recents
            results = [...results, ...defaults.filter(d => !recentIds.includes(d.id))];
        } else {
            const lowerQuery = query.toLowerCase();
            
            // Scoring Logic: Title Match > Keyword Match
            const scored = allCommands.map(cmd => {
                let score = 0;
                if (cmd.title.toLowerCase().includes(lowerQuery)) score += 10;
                if (cmd.title.toLowerCase().startsWith(lowerQuery)) score += 20;
                if (cmd.keywords.some(k => k.toLowerCase().includes(lowerQuery))) score += 5;
                if (cmd.subtitle && cmd.subtitle.toLowerCase().includes(lowerQuery)) score += 3;
                return { cmd, score };
            }).filter(i => i.score > 0);

            results = scored.sort((a,b) => b.score - a.score).map(i => i.cmd);
        }

        return results.slice(0, 15);
    }, [query, allCommands, recentIds]);

    // --- KEYBOARD TRAP ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
                // Scroll into view logic could go here
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selected = filteredCommands[activeIndex];
                if (selected) {
                    addToRecents(selected.id.replace('mem-', 'mem-')); // Keep original ID logic
                    selected.action();
                    onClose();
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeIndex, filteredCommands]);

    if (!isOpen) return null;

    // Helper to render section headers
    let lastType: string = '';

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4 transition-all duration-200">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scale-in ring-1 ring-black/5">
                
                {/* Input Area */}
                <div className="flex items-center px-4 py-4 border-b border-slate-100 relative">
                    <Search className="text-slate-400 mr-3" size={20} />
                    <input 
                        ref={inputRef}
                        type="text" 
                        className="flex-1 bg-transparent text-lg text-slate-800 placeholder-slate-400 outline-none h-9"
                        placeholder="Type a command or search..."
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                        autoComplete="off"
                        autoCorrect="off"
                    />
                    <div className="hidden md:flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ESC</span>
                    </div>
                    <button onClick={onClose} className="md:hidden p-2 bg-slate-100 rounded-full text-slate-500">
                        <X size={16} />
                    </button>
                </div>

                {/* List Area */}
                <div 
                    ref={listRef}
                    className="max-h-[60vh] overflow-y-auto p-2 scroll-smooth"
                >
                    {filteredCommands.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <Command size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No results found for "{query}"</p>
                            <p className="text-xs mt-1 text-slate-300">Try searching for members, pages, or actions.</p>
                        </div>
                    ) : (
                        filteredCommands.map((cmd, idx) => {
                            // Section Header Logic
                            const showHeader = cmd.type !== lastType;
                            lastType = cmd.type;

                            return (
                                <React.Fragment key={cmd.id + idx}>
                                    {showHeader && (
                                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center mt-1 first:mt-0">
                                            {cmd.type === 'RECENT' && <><Clock size={10} className="mr-1"/> Recently Used</>}
                                            {cmd.type === 'NAVIGATION' && 'Navigation'}
                                            {cmd.type === 'MEMBER' && 'Database Records'}
                                            {cmd.type === 'ACTION' && 'Quick Actions'}
                                        </div>
                                    )}
                                    
                                    <button
                                        onClick={() => { 
                                            addToRecents(cmd.id);
                                            cmd.action(); 
                                            onClose(); 
                                        }}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        className={`w-full flex items-center px-3 py-3 rounded-lg text-left transition-all duration-100 group ${
                                            idx === activeIndex 
                                            ? 'bg-blue-600 text-white shadow-md transform scale-[1.01]' 
                                            : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-md mr-3 transition-colors ${
                                            idx === activeIndex 
                                            ? 'bg-white/20 text-white' 
                                            : 'bg-white border border-slate-200 text-slate-500 group-hover:border-slate-300'
                                        }`}>
                                            {cmd.type === 'RECENT' ? <Clock size={16}/> : cmd.icon}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm flex items-center">
                                                <HighlightedText text={cmd.title} query={query} />
                                                {cmd.type === 'MEMBER' && (
                                                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border opacity-80 ${
                                                        idx === activeIndex ? 'border-white/30 text-blue-100' : 'border-slate-200 text-slate-400'
                                                    }`}>CRM</span>
                                                )}
                                                {cmd.type === 'RECENT' && (
                                                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border opacity-80 ${
                                                        idx === activeIndex ? 'border-white/30 text-blue-100' : 'border-slate-200 text-slate-400'
                                                    }`}>History</span>
                                                )}
                                            </div>
                                            {cmd.subtitle && (
                                                <div className={`text-xs truncate transition-colors ${
                                                    idx === activeIndex ? 'text-blue-100' : 'text-slate-400'
                                                }`}>
                                                    <HighlightedText text={cmd.subtitle} query={query} />
                                                </div>
                                            )}
                                        </div>

                                        {idx === activeIndex && (
                                            <div className="flex items-center text-xs opacity-80">
                                                <span className="mr-2 hidden md:inline">Jump to</span>
                                                <ChevronRight size={16} />
                                            </div>
                                        )}
                                    </button>
                                </React.Fragment>
                            );
                        })
                    )}
                </div>

                {/* Footer Tips */}
                <div className="hidden md:flex justify-between items-center px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400">
                    <div className="flex gap-4">
                        <span className="flex items-center"><kbd className="font-sans bg-white border border-slate-200 rounded px-1.5 py-0.5 mr-1.5 shadow-sm">↵</kbd> to select</span>
                        <span className="flex items-center"><kbd className="font-sans bg-white border border-slate-200 rounded px-1.5 py-0.5 mr-1.5 shadow-sm">↑↓</kbd> to navigate</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Zap size={10} className="text-amber-500" />
                        <span>Pro Tip: Type "CRM" to find members</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
