
import React, { useState, useEffect } from 'react';
import { Search, User, Loader2, Check } from 'lucide-react';
import { DataService } from '../../services/dataService';
import { Member } from '../../types/index';

interface MemberLookupProps {
    onSelect: (member: Member) => void;
    placeholder?: string;
    className?: string;
    excludeEmail?: string; // Optional: To exclude current user etc.
}

const MemberLookup: React.FC<MemberLookupProps> = ({ onSelect, placeholder = "Search member...", className = '', excludeEmail }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Debounce search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length >= 2) {
                setIsLoading(true);
                const allMembers = await DataService.getMembers();
                const filtered = allMembers.filter(m => 
                    (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                     m.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
                    m.email !== excludeEmail
                ).slice(0, 5); // Limit results
                setResults(filtered);
                setIsLoading(false);
                setShowResults(true);
            } else {
                setResults([]);
                setShowResults(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, excludeEmail]);

    const handleSelect = (member: Member) => {
        onSelect(member);
        setSearchTerm('');
        setShowResults(false);
    };

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder={placeholder}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 size={16} className="animate-spin text-slate-400" />
                    </div>
                )}
            </div>

            {showResults && results.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in-down">
                    <div className="max-h-60 overflow-y-auto">
                        {results.map(member => (
                            <button 
                                key={member.id} 
                                onClick={() => handleSelect(member)}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between group border-b border-slate-50 last:border-0"
                            >
                                <div className="flex items-center overflow-hidden">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 mr-3 shrink-0">
                                        {member.name.substring(0,2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-sm text-slate-900 truncate">{member.name}</div>
                                        <div className="text-xs text-slate-500 truncate">{member.email || member.id}</div>
                                    </div>
                                </div>
                                <div className="text-xs font-bold text-slate-400 group-hover:text-blue-600 bg-slate-50 group-hover:bg-white px-2 py-1 rounded">
                                    Select
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {showResults && results.length === 0 && !isLoading && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center text-xs text-slate-400">
                    No members found.
                </div>
            )}
        </div>
    );
};

export default MemberLookup;
