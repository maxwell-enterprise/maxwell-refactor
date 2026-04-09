
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { WhatsAppTemplate, WAUIContext } from '../../types/index';
import { WhatsAppService } from '../../services/whatsappService';
import { useToast } from '../../context/ToastContext';
import { TRIGGER_CATALOG } from '../../constants/triggerCatalog';
import { CONTEXT_VARIABLE_RULES, VARIABLE_CATALOG } from '../../constants/variableCatalog';
import { 
    MessageSquare, Edit3, Save, RotateCcw, Plus, 
    Zap, Check, Layout, AlertTriangle, FileCode, Loader2
} from 'lucide-react';
import VariableInserter from '../common/VariableInserter'; 

const WhatsAppTemplateManager: React.FC = () => {
    const { showToast } = useToast();
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Editor State
    const [editForm, setEditForm] = useState<WhatsAppTemplate | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const saveLockRef = useRef(false);
    const resetLockRef = useRef(false);
    
    // Textarea Ref for cursor tracking
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        const data = await WhatsAppService.getTemplates();
        setTemplates(data);
        if (data.length > 0 && !selectedTemplate) {
            setSelectedTemplate(data[0]);
        }
        setLoading(false);
    };

    // --- VALIDATION ENGINE ---
    useEffect(() => {
        if (isEditing && editForm) {
            validateVariables();
        }
    }, [editForm?.message, editForm?.uiContext]);

    const validateVariables = () => {
        if (!editForm) return;
        const msg = editForm.message || '';
        const contexts = (editForm.uiContext && editForm.uiContext.length > 0) 
            ? editForm.uiContext 
            : ['GENERAL'] as WAUIContext[];
        
        const regex = /{{(.*?)}}/g;
        let match;
        const usedVars = new Set<string>();
        while ((match = regex.exec(msg)) !== null) {
            usedVars.add(match[1]); // e.g., "member_name"
        }

        const newErrors: string[] = [];

        // Check each variable against each selected context
        usedVars.forEach(varKey => {
            // Find which category this variable belongs to
            const varDef = VARIABLE_CATALOG.find(v => v.key === varKey);
            if (!varDef) {
                // If variable isn't in catalog (legacy or typo), strictly warn only if not simple
                // We'll treat unknown vars as potentially dangerous
                // newErrors.push(`Unknown variable: {{${varKey}}}`); // Optional strictness
                return;
            }

            contexts.forEach(ctx => {
                const allowedCategories = CONTEXT_VARIABLE_RULES[ctx];
                if (!allowedCategories.includes(varDef.category)) {
                    newErrors.push(`Variable {{${varKey}}} is invalid for location: ${ctx} (Missing ${varDef.category} context)`);
                }
            });
        });

        setErrors(newErrors);
    };

    const handleSelect = (tpl: WhatsAppTemplate) => {
        if (isEditing && editForm?.id !== tpl.id) {
            if (!window.confirm("Discard unsaved changes?")) return;
        }
        setSelectedTemplate(tpl);
        setIsEditing(false);
        setEditForm(null);
    };

    const handleEdit = () => {
        if (!selectedTemplate) return;
        // Ensure legacy data is compatible with array
        const safeTpl = JSON.parse(JSON.stringify(selectedTemplate));
        if (safeTpl.uiContext && !Array.isArray(safeTpl.uiContext)) {
             safeTpl.uiContext = [safeTpl.uiContext];
        }
        setEditForm(safeTpl);
        setIsEditing(true);
    };

    const handleCreate = () => {
        const newTpl: WhatsAppTemplate = {
            id: `TPL-${Date.now()}`,
            category: 'GENERAL',
            uiContext: ['GENERAL'],
            label: 'New Template',
            message: 'Hello {{member_name}}, ...',
            variables: ['member_name'],
            isDefault: false,
            linkedTriggerId: ''
        };
        setEditForm(newTpl);
        setSelectedTemplate(newTpl); 
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!editForm || !editForm.message || saveLockRef.current || isSaving) return;
        if (errors.length > 0) {
            if(!window.confirm("There are validation errors. Variables may fail to render. Save anyway?")) return;
        }
        
        const regex = /{{(.*?)}}/g;
        const matches = editForm.message.match(regex);
        const vars = matches ? matches.map(m => m.replace(/{{|}}/g, '')) : [];
        
        const finalForm = { ...editForm, variables: vars };

        saveLockRef.current = true;
        setIsSaving(true);
        try {
            await WhatsAppService.saveTemplate(finalForm);
            showToast('Template saved & rules updated.', 'success');
            await loadTemplates();
            setIsEditing(false);
            setSelectedTemplate(finalForm);
        } catch (e) {
            showToast(
                e instanceof Error ? e.message : 'Gagal menyimpan template',
                'error',
            );
        } finally {
            saveLockRef.current = false;
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        if (resetLockRef.current || isResetting) return;
        if (!window.confirm("Are you sure? This will delete all custom changes and restore original templates.")) return;
        resetLockRef.current = true;
        setIsResetting(true);
        try {
            await WhatsAppService.resetTemplatesToDefault();
            showToast('Reset to defaults.', 'info');
            await loadTemplates();
            setIsEditing(false);
        } catch (e) {
            showToast(
                e instanceof Error ? e.message : 'Gagal reset template',
                'error',
            );
        } finally {
            resetLockRef.current = false;
            setIsResetting(false);
        }
    };

    const insertVariable = (varKey: string) => {
        if (!editForm || !textAreaRef.current) return;
        
        const input = textAreaRef.current;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = editForm.message;
        const insertion = `{{${varKey}}}`;
        
        const newText = text.substring(0, start) + insertion + text.substring(end);
        
        setEditForm({ ...editForm, message: newText });
        
        setTimeout(() => {
            input.focus();
            input.setSelectionRange(start + insertion.length, start + insertion.length);
        }, 0);
    };

    const triggerOptions = TRIGGER_CATALOG.map(t => ({ id: t.id, label: t.label }));

    const CONTEXT_OPTIONS: { id: WAUIContext, label: string }[] = [
        { id: 'GENERAL', label: 'General / Anywhere' },
        { id: 'CRM_MEMBER_LIST', label: 'CRM: Member Directory' },
        { id: 'LEADS_PIPELINE', label: 'CRM: Sales Leads' },
        { id: 'OPS_LOGISTICS', label: 'Operations: Task List' },
        { id: 'FINANCE_COMMISSION', label: 'Finance: Commissions' },
        { id: 'EVENT_ATTENDANCE', label: 'Event: Attendance Log' },
        { id: 'TRIBE_MEMBER', label: 'My Tribe: Member List' },
        { id: 'LEGAL_CONTRACT', label: 'Legal: Contracts' },
        { id: 'YOUTH_SCHOOL', label: 'Youth: School Partners' },
    ];

    const toggleContext = (ctx: WAUIContext) => {
        if (!editForm) return;
        let current = editForm.uiContext || [];
        
        if (current.includes(ctx)) {
            current = current.filter(c => c !== ctx);
        } else {
            current = [...current, ctx];
        }
        
        // Logic: If GENERAL selected, clear others or if others selected, clear GENERAL? 
        // Simplification: GENERAL is just another tag. Logic in Service handles precedence.
        
        setEditForm({ ...editForm, uiContext: current });
    };

    // --- PREVIEW RENDERER WITH HIGHLIGHTS ---
    const renderPreviewWithHighlights = (msg: string) => {
        const parts = msg.split(/({{.*?}})/g);
        return parts.map((part, idx) => {
            if (part.startsWith('{{') && part.endsWith('}}')) {
                const varKey = part.replace(/{{|}}/g, '');
                // Check if this specific var caused an error
                const isError = errors.some(e => e.includes(varKey));
                return (
                    <span key={idx} className={`font-mono px-1 rounded ${isError ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-green-100 text-green-700'}`}>
                        {part}
                    </span>
                );
            }
            return <span key={idx}>{part}</span>;
        });
    };

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 lg:flex-row lg:gap-6">
            
            {/* LEFT: LIST — full width on mobile, fixed width on large screens */}
            <div className="flex w-full min-h-[240px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:w-[min(100%,320px)] lg:max-w-[380px]">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm">Message Library</h3>
                    <div className="flex gap-2">
                         <button
                            type="button"
                            onClick={() => handleReset()}
                            disabled={isSaving || isResetting || loading}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40 disabled:pointer-events-none"
                            title="Reset Defaults"
                        >
                            {isResetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14}/>}
                        </button>
                        <button
                            type="button"
                            onClick={handleCreate}
                            disabled={isSaving || isResetting || loading}
                            className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors disabled:opacity-40 disabled:pointer-events-none"
                            title="New Template"
                        >
                            <Plus size={14}/>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-14 text-slate-500 gap-2 px-2">
                            <MessageSquare className="text-green-400 animate-pulse" size={28} />
                            <span className="text-xs font-medium text-center">Memuat template dari database…</span>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="flex flex-col items-center text-center py-12 px-3 text-slate-600">
                            <FileCode className="text-slate-200 mb-2" size={36} />
                            <p className="text-xs font-bold text-slate-800">Belum ada template</p>
                            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                                Database mengembalikan 0 template. Klik <span className="font-semibold text-green-700">+</span> untuk buat baru, atau ikon reset untuk memuat template default.
                            </p>
                        </div>
                    ) : (
                    templates.map(tpl => (
                        <button
                            type="button"
                            key={tpl.id}
                            onClick={() => handleSelect(tpl)}
                            disabled={isSaving || isResetting}
                            className={`w-full text-left p-3 rounded-lg border transition-all group disabled:opacity-50 disabled:pointer-events-none ${
                                (isEditing ? editForm?.id : selectedTemplate?.id) === tpl.id 
                                ? 'bg-green-50 border-green-200 ring-1 ring-green-200' 
                                : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-sm text-slate-900">{tpl.label}</span>
                                {tpl.linkedTriggerId && (
                                    <span title="Automated">
                                        <Zap size={12} className="text-amber-500 fill-amber-500" />
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 rounded">{tpl.category}</span>
                                {(tpl.uiContext && tpl.uiContext.length > 0) && (
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 rounded border border-blue-100 flex items-center">
                                        <Layout size={8} className="mr-1"/> {tpl.uiContext.length > 1 ? 'Multiple Locations' : tpl.uiContext[0].split('_')[0]}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{tpl.message}</p>
                        </button>
                    ))
                    )}
                </div>
            </div>

            {/* RIGHT: EDITOR / PREVIEW */}
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {(isEditing && editForm) ? (
                    <div className="flex flex-col h-full">
                        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <input 
                                type="text" 
                                className="min-w-0 w-full font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-green-500 outline-none sm:max-w-md transition-colors"
                                value={editForm.label}
                                onChange={e => setEditForm({...editForm, label: e.target.value})}
                                placeholder="Template Name"
                            />
                            <div className="flex shrink-0 flex-wrap gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setIsEditing(false); setEditForm(null); setErrors([]); }}
                                    disabled={isSaving}
                                    className="px-3 py-1.5 text-slate-500 text-xs font-bold hover:bg-slate-100 rounded disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSave()}
                                    disabled={isSaving}
                                    className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 flex items-center disabled:opacity-60 disabled:pointer-events-none"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 size={14} className="mr-1.5 animate-spin" /> Menyimpan…
                                        </>
                                    ) : (
                                        <>
                                            <Save size={14} className="mr-1.5"/> Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden p-4 lg:flex-row lg:gap-6 lg:p-6">
                            {/* Editor Input */}
                            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:overflow-y-auto lg:pr-2">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Content Category (Tag)</label>
                                        <select 
                                            className="w-full p-2 border border-slate-200 rounded text-sm bg-white"
                                            value={editForm.category}
                                            onChange={e => setEditForm({...editForm, category: e.target.value as any})}
                                        >
                                            <option value="GENERAL">General</option>
                                            <option value="BIRTHDAY">Birthday</option>
                                            <option value="PROMO">Promotion</option>
                                            <option value="REMINDER">Reminder</option>
                                            <option value="ONBOARDING">Onboarding</option>
                                            <option value="ENGAGEMENT">Engagement</option>
                                            <option value="FINANCE">Finance</option>
                                            <option value="LOGISTICS">Logistics</option>
                                            <option value="LEGAL">Legal</option>
                                        </select>
                                    </div>

                                    {/* TRIGGER ASSIGNMENT */}
                                    <div>
                                        <label className="block text-xs font-bold text-amber-600 uppercase mb-1 flex items-center">
                                            <Zap size={12} className="mr-1 fill-amber-600"/> Auto-Trigger (Optional)
                                        </label>
                                        <select 
                                            className="w-full p-2 border border-amber-200 bg-amber-50 rounded text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                            value={editForm.linkedTriggerId || ''}
                                            onChange={e => setEditForm({...editForm, linkedTriggerId: e.target.value})}
                                        >
                                            <option value="">-- No Automation (Manual Send) --</option>
                                            {triggerOptions.map(opt => (
                                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-blue-600 uppercase mb-1 flex items-center">
                                            <Layout size={12} className="mr-1"/> UI Location (Context)
                                        </label>
                                        <div className="flex flex-wrap gap-2 p-2 border border-blue-100 rounded-lg bg-blue-50">
                                            {CONTEXT_OPTIONS.map(opt => {
                                                const isSelected = (editForm.uiContext || []).includes(opt.id);
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => toggleContext(opt.id)}
                                                        className={`text-[10px] px-2 py-1 rounded border transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'}`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-1">Select where this Quick Action button will appear.</p>
                                    </div>
                                </div>
                                
                                <div className="flex-1 flex flex-col relative">
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase">Message Content</label>
                                        <VariableInserter onInsert={insertVariable} />
                                    </div>
                                    <textarea 
                                        ref={textAreaRef}
                                        id="wa-message-editor"
                                        className="flex-1 w-full p-4 border border-slate-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 font-sans text-sm leading-relaxed min-h-[300px]"
                                        value={editForm.message}
                                        onChange={e => setEditForm({...editForm, message: e.target.value})}
                                        placeholder="Type your message here..."
                                    />
                                    
                                    {/* VALIDATION PREVIEW */}
                                    <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed">
                                        <p className="font-bold text-slate-400 mb-1">Variable Validation Preview:</p>
                                        <div className="text-slate-600">
                                            {renderPreviewWithHighlights(editForm.message)}
                                        </div>
                                        {errors.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-red-100">
                                                {errors.map((err, i) => (
                                                    <p key={i} className="text-red-600 flex items-center font-bold">
                                                        <AlertTriangle size={10} className="mr-1"/> {err}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Live Preview — below editor on mobile, beside on lg */}
                            <div className="flex w-full max-w-full flex-col items-center justify-center border-t border-slate-100 pt-6 shrink-0 lg:w-[300px] lg:border-t-0 lg:pt-0 lg:border-l lg:border-slate-100 lg:pl-6">
                                <div className="w-[min(100%,280px)] h-[min(70vh,550px)] max-h-[550px] bg-slate-900 rounded-[2.5rem] border-[8px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col transform scale-[0.92] origin-top sm:scale-95">
                                    {/* Notch */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>
                                    
                                    {/* WA Header */}
                                    <div className="bg-[#075E54] h-20 pt-8 px-4 flex items-center gap-3 text-white shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                                        <div>
                                            <p className="text-xs font-bold">Maxwell Admin</p>
                                            <p className="text-[9px] opacity-80">online</p>
                                        </div>
                                    </div>

                                    {/* Chat Body */}
                                    <div className="flex-1 bg-[#E5DDD5] p-3 overflow-y-auto bg-[url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-repeat">
                                        <div className="flex justify-end mb-2">
                                            <div className="bg-[#DCF8C6] p-2 rounded-lg rounded-tr-none shadow-sm max-w-[85%]">
                                                <p className="text-[11px] text-slate-800 whitespace-pre-wrap leading-tight break-words">
                                                    {editForm.message.replace(/{{(.*?)}}/g, (match) => match)}
                                                </p>
                                                <div className="text-[9px] text-slate-400 text-right mt-1 flex justify-end items-center gap-1">
                                                    10:30 AM <Check size={10} className="text-blue-500"/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">Live Mobile Preview</p>
                            </div>
                        </div>
                    </div>
                ) : selectedTemplate ? (
                    <div className="flex flex-col h-full items-center justify-center p-8 text-center space-y-6">
                         <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                            <MessageSquare size={40} />
                         </div>
                         <div>
                            <h2 className="text-2xl font-bold text-slate-900">{selectedTemplate.label}</h2>
                            <div className="flex justify-center gap-2 mt-2">
                                {selectedTemplate.linkedTriggerId && (
                                    <span className="inline-flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                        <Zap size={12} className="mr-1 fill-amber-600"/> Automated
                                    </span>
                                )}
                                <span className="inline-flex items-center text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                    <Layout size={12} className="mr-1"/> {Array.isArray(selectedTemplate.uiContext) ? selectedTemplate.uiContext.join(', ') : (selectedTemplate.uiContext || 'GENERAL')}
                                </span>
                            </div>
                            <p className="text-slate-500 max-w-md mx-auto mt-4 text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                                {selectedTemplate.message}
                            </p>
                         </div>
                         <button onClick={handleEdit} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center">
                             <Edit3 size={16} className="mr-2"/> Edit Template
                         </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8 text-slate-500">
                        <MessageSquare className="text-slate-200 mb-3" size={40} />
                        <p className="text-sm font-semibold text-slate-700">Pilih template di panel kiri</p>
                        <p className="text-xs text-slate-400 mt-2 max-w-sm">
                            Jika daftar kosong, tambah template baru atau reset default dari ikon di atas daftar.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppTemplateManager;
