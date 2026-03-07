
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ContractService } from '../../../services/contractService';
import { ClauseItem } from '../../../types/contract';
import { useToast } from '../../../context/ToastContext';
import { ExcelHelper } from '../../../utils/excelHelper';
import { 
    Plus, Upload, Search, FileText, Trash2, Save, 
    FolderOpen, ChevronRight, ChevronDown, MoreVertical,
    Edit3, Folder, CheckCircle2
} from 'lucide-react';
import VariableInserter from '../../common/VariableInserter';

const ClauseLibrary: React.FC = () => {
    const { showToast } = useToast();
    const [clauses, setClauses] = useState<ClauseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // UI States
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Editor State
    const [editForm, setEditForm] = useState<Partial<ClauseItem>>({});
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await ContractService.getLibrary();
        setClauses(data);
        // Auto-expand sections that have data
        const sections = new Set(data.map(c => c.section));
        setExpandedSections(sections);
        setLoading(false);
    };

    // --- DATA GROUPING ---
    const groupedClauses = useMemo(() => {
        const groups: Record<string, ClauseItem[]> = {};
        const filtered = clauses.filter(c => 
            c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.section.toLowerCase().includes(searchTerm.toLowerCase())
        );

        filtered.forEach(c => {
            if (!groups[c.section]) groups[c.section] = [];
            groups[c.section].push(c);
        });

        // Sort keys
        return Object.keys(groups).sort().reduce((obj, key) => {
            obj[key] = groups[key];
            return obj;
        }, {} as Record<string, ClauseItem[]>);
    }, [clauses, searchTerm]);

    // --- ACTIONS ---

    // Helper to check if form has unsaved changes
    const checkIsDirty = (targetClauseId: string | undefined, currentForm: Partial<ClauseItem>) => {
        if (!targetClauseId) return false;
        
        // If it's a new clause being created
        if (targetClauseId.startsWith('CL-NEW')) {
            // It's dirty if user typed anything meaningful
            return !!(currentForm.title !== 'New Clause' || currentForm.text || (currentForm.section && currentForm.section !== 'General'));
        }

        const original = clauses.find(c => c.id === targetClauseId);
        if (!original) return false;

        return (
            original.title !== currentForm.title ||
            original.text !== currentForm.text ||
            original.section !== currentForm.section
        );
    };

    const handleSelect = (clause: ClauseItem) => {
        // If we are currently editing something else
        if (isEditing && editForm.id && editForm.id !== clause.id) {
            const isDirty = checkIsDirty(editForm.id, editForm);
            
            if (isDirty) {
                if (!window.confirm("You have unsaved changes. Discard them?")) {
                    return; // User cancelled switch
                }
            }
        }
        
        setSelectedClauseId(clause.id);
        setEditForm(JSON.parse(JSON.stringify(clause)));
        setIsEditing(true);
    };

    const handleNewClause = () => {
        // Check dirty on current before switching to new
        if (isEditing && editForm.id) {
            const isDirty = checkIsDirty(editForm.id, editForm);
            if (isDirty) {
                if (!window.confirm("You have unsaved changes. Discard them?")) return;
            }
        }

        const newClause: Partial<ClauseItem> = {
            id: `CL-NEW-${Date.now()}`,
            section: 'General',
            title: 'New Clause',
            text: '',
            tags: []
        };
        setEditForm(newClause);
        setSelectedClauseId(null); // Deselect list to show "New" state visually if needed
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!editForm.title || !editForm.text || !editForm.section) {
            showToast('Please fill all required fields.', 'error');
            return;
        }

        const clauseToSave = {
            ...editForm,
            id: editForm.id && !editForm.id.startsWith('CL-NEW') ? editForm.id : `CL-MAN-${Date.now()}`
        } as ClauseItem;

        await ContractService.addClausesToLibrary([clauseToSave]);
        showToast('Clause saved successfully.', 'success');
        
        await loadData();
        setSelectedClauseId(clauseToSave.id);
        setEditForm(clauseToSave);
    };

    const toggleSection = (sec: string) => {
        const next = new Set(expandedSections);
        if (next.has(sec)) next.delete(sec);
        else next.add(sec);
        setExpandedSections(next);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        try {
            const raw = await ExcelHelper.importFromExcel<any>(file);
            const imported: ClauseItem[] = raw.map((r, idx) => ({
                id: `CL-IMP-${Date.now()}-${idx}`,
                section: r.Section || 'General',
                title: r.Title || 'Untitled Clause',
                text: r.Text || r.Clause || '',
                tags: []
            })).filter(c => c.text); 

            await ContractService.addClausesToLibrary(imported);
            showToast(`Imported ${imported.length} clauses successfully`, 'success');
            loadData();
        } catch (err) {
            showToast('Import failed.', 'error');
        }
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const insertVariable = (varKey: string) => {
        if (!textInputRef.current || !editForm) return;
        
        const start = textInputRef.current.selectionStart;
        const end = textInputRef.current.selectionEnd;
        const text = editForm.text || '';
        const newText = text.substring(0, start) + `<<${varKey.toUpperCase()}>>` + text.substring(end);
        
        setEditForm({ ...editForm, text: newText });
        
        // Restore focus next tick
        setTimeout(() => {
            textInputRef.current?.focus();
            textInputRef.current?.setSelectionRange(start + varKey.length + 4, start + varKey.length + 4);
        }, 0);
    };

    return (
        <div className="flex h-full bg-white rounded-xl border border-slate-200 overflow-hidden">
            
            {/* LEFT SIDEBAR: TREE NAVIGATION */}
            <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50 flex-shrink-0">
                {/* Header Actions */}
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Clause Explorer</h3>
                        <div className="flex gap-1">
                            <input type="file" ref={fileInputRef} hidden onChange={handleImport} accept=".xlsx,.xls"/>
                            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Import Excel">
                                <Upload size={14}/>
                            </button>
                            <button onClick={handleNewClause} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700" title="Add Clause">
                                <Plus size={14}/>
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Filter clauses..." 
                            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Tree List */}
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                    {loading ? (
                        <div className="p-4 text-center text-xs text-slate-400">Loading library...</div>
                    ) : Object.keys(groupedClauses).length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                            <FolderOpen size={24} className="mx-auto mb-2 opacity-20"/>
                            No clauses found.
                        </div>
                    ) : (
                        Object.keys(groupedClauses).map(section => (
                            <div key={section} className="select-none">
                                {/* Section Header */}
                                <div 
                                    className="flex items-center px-2 py-1.5 cursor-pointer hover:bg-slate-100 rounded-lg group"
                                    onClick={() => toggleSection(section)}
                                >
                                    <button className="mr-1 text-slate-400">
                                        {expandedSections.has(section) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                    </button>
                                    <Folder size={14} className="text-amber-500 fill-amber-500 mr-2" />
                                    <span className="text-xs font-bold text-slate-700 flex-1 truncate">{section}</span>
                                    <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 rounded-full">
                                        {groupedClauses[section].length}
                                    </span>
                                </div>

                                {/* Clauses List */}
                                {expandedSections.has(section) && (
                                    <div className="ml-2 pl-3 border-l border-slate-200 mt-1 space-y-0.5">
                                        {groupedClauses[section].map(clause => (
                                            <div 
                                                key={clause.id}
                                                onClick={() => handleSelect(clause)}
                                                className={`
                                                    flex items-center px-2 py-2 rounded-md cursor-pointer text-xs transition-all border
                                                    ${selectedClauseId === clause.id 
                                                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' 
                                                        : 'border-transparent text-slate-600 hover:bg-white hover:border-slate-100'
                                                    }
                                                `}
                                            >
                                                <FileText size={13} className={`mr-2 ${selectedClauseId === clause.id ? 'text-blue-500' : 'text-slate-400'}`} />
                                                <span className="truncate">{clause.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
                
                {/* Footer Stats */}
                <div className="p-3 border-t border-slate-200 bg-white text-[10px] text-slate-400 flex justify-between">
                    <span>{clauses.length} Total Items</span>
                    <span>{Object.keys(groupedClauses).length} Sections</span>
                </div>
            </div>

            {/* RIGHT PANEL: EDITOR */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                {isEditing ? (
                    <>
                        {/* Editor Header */}
                        <div className="h-14 border-b border-slate-200 flex justify-between items-center px-6 bg-white shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-100 text-blue-600 rounded">
                                    <Edit3 size={16} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">
                                        {editForm.id?.includes('NEW') ? 'Create New Clause' : 'Edit Clause'}
                                    </h2>
                                    <p className="text-[10px] text-slate-500 font-mono">{editForm.id}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {editForm.id && !editForm.id.includes('NEW') && (
                                    <button 
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Clause"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <button 
                                    onClick={handleSave}
                                    className="flex items-center bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 shadow-sm"
                                >
                                    <Save size={14} className="mr-2"/> Save Changes
                                </button>
                            </div>
                        </div>

                        {/* Editor Inputs */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Section Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                                        placeholder="e.g. Payment Policies"
                                        value={editForm.section || ''}
                                        onChange={e => setEditForm({...editForm, section: e.target.value})}
                                        list="section-suggestions"
                                    />
                                    <datalist id="section-suggestions">
                                        {Object.keys(groupedClauses).map(s => <option key={s} value={s} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Clause Title</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. Late Payment Penalty"
                                        value={editForm.title || ''}
                                        onChange={e => setEditForm({...editForm, title: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col h-full min-h-[300px]">
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Legal Text Content</label>
                                    <VariableInserter onInsert={insertVariable} buttonLabel="Insert Variable" />
                                </div>
                                <div className="relative flex-1">
                                    <textarea 
                                        ref={textInputRef}
                                        className="w-full h-full p-4 border border-slate-300 rounded-xl text-sm leading-relaxed text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-serif bg-slate-50 focus:bg-white transition-colors shadow-inner"
                                        placeholder="Type the legal clause text here..."
                                        value={editForm.text || ''}
                                        onChange={e => setEditForm({...editForm, text: e.target.value})}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2">
                                    Use <code>{'<<VARIABLE>>'}</code> syntax or the Insert button to add dynamic fields.
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <FileText size={40} />
                        </div>
                        <p className="text-sm font-medium text-slate-400">Select a clause to edit or create a new one.</p>
                        <button 
                            onClick={handleNewClause}
                            className="mt-4 px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                        >
                            + Create New Clause
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClauseLibrary;
