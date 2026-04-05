
import React, { useState, useRef, useEffect } from 'react';
import { PDFTemplate, PDFElement, PDFPage } from '../../types/index';
import { PDFService } from '../../services/pdfService';
import { Save, Image as ImageIcon, Type, Variable, Trash2, Move, Plus, ChevronLeft, ChevronRight, Upload, Eye, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import VariableInserter from '../common/VariableInserter'; // NEW IMPORT
import { VARIABLE_CATALOG } from '../../constants/variableCatalog';

// Standard A4 Ratios (used for rendering relative CSS)
const A4_WIDTH_PX = 794; 
const A4_HEIGHT_PX = 1123;

const PDFDesigner: React.FC = () => {
    const { showToast } = useToast();
    const [template, setTemplate] = useState<PDFTemplate>({
        id: '',
        name: 'New Certificate',
        category: 'CERTIFICATE',
        orientation: 'LANDSCAPE',
        pages: [
            { id: 'pg-1', pageNumber: 1, elements: [] }
        ]
    });
    
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [savedTemplateCount, setSavedTemplateCount] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const saveLockRef = useRef(false);

    const canvasRef = useRef<HTMLDivElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    const activePage = template.pages[activePageIndex];

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await PDFService.getTemplates();
                if (!cancelled) setSavedTemplateCount(Array.isArray(list) ? list.length : 0);
            } catch {
                if (!cancelled) setSavedTemplateCount(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // ... (Keep existing layout logic handlers: handleOrientationChange, handleAddPage, handleDeletePage, handleBackgroundUpload) ...
    const handleOrientationChange = (orientation: 'PORTRAIT' | 'LANDSCAPE') => {
        setTemplate(prev => ({ ...prev, orientation }));
    };

    const handleAddPage = () => {
        const newPage: PDFPage = {
            id: `pg-${Date.now()}`,
            pageNumber: template.pages.length + 1,
            elements: []
        };
        setTemplate(prev => ({ ...prev, pages: [...prev.pages, newPage] }));
        setActivePageIndex(template.pages.length);
    };

    const handleDeletePage = (index: number) => {
        if (template.pages.length <= 1) return;
        const newPages = template.pages.filter((_, i) => i !== index);
        setTemplate(prev => ({ ...prev, pages: newPages }));
        setActivePageIndex(Math.max(0, index - 1));
    };

    const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const newPages = [...template.pages];
            newPages[activePageIndex] = { ...newPages[activePageIndex], backgroundImageUrl: url };
            setTemplate(prev => ({ ...prev, pages: newPages }));
        }
    };

    const handleAddElement = (type: 'TEXT' | 'VARIABLE', variableKey?: string) => {
        const newEl: PDFElement = {
            id: `el-${Date.now()}`,
            type,
            content: variableKey ? `{{${variableKey}}}` : 'New Text',
            x: 50,
            y: 50,
            fontSize: 24,
            fontWeight: 'normal',
            color: '#000000',
            align: 'center'
        };
        const newPages = [...template.pages];
        newPages[activePageIndex].elements.push(newEl);
        setTemplate(prev => ({ ...prev, pages: newPages }));
        setSelectedElementId(newEl.id);
    };

    const updateElement = (id: string, updates: Partial<PDFElement>) => {
        const newPages = [...template.pages];
        const elIndex = newPages[activePageIndex].elements.findIndex(el => el.id === id);
        if (elIndex >= 0) {
            newPages[activePageIndex].elements[elIndex] = { ...newPages[activePageIndex].elements[elIndex], ...updates };
            setTemplate(prev => ({ ...prev, pages: newPages }));
        }
    };

    const deleteElement = (id: string) => {
        const newPages = [...template.pages];
        newPages[activePageIndex].elements = newPages[activePageIndex].elements.filter(el => el.id !== id);
        setTemplate(prev => ({ ...prev, pages: newPages }));
        setSelectedElementId(null);
    };

    const handleSave = async () => {
        if (saveLockRef.current || isSaving) return;
        if (!template.name) {
            showToast('Please enter a template name', 'error');
            return;
        }
        saveLockRef.current = true;
        setIsSaving(true);
        try {
            await PDFService.saveTemplate(template);
            showToast('Template saved successfully', 'success');
            try {
                const list = await PDFService.getTemplates();
                setSavedTemplateCount(Array.isArray(list) ? list.length : 0);
            } catch {
                /* keep previous count */
            }
        } catch (e) {
            showToast(
                e instanceof Error ? e.message : 'Gagal menyimpan template PDF',
                'error',
            );
        } finally {
            saveLockRef.current = false;
            setIsSaving(false);
        }
    };
    
    // NEW: Variable Insertion Logic for PDF
    const insertVariableIntoSelected = (varKey: string) => {
        if (!selectedElementId) {
            // If no element selected, create a NEW variable element
            handleAddElement('VARIABLE', varKey);
            return;
        }
        const selected = activePage.elements.find(el => el.id === selectedElementId);
        if (!selected) return;

        // If it's a variable type, replace content. If Text, append.
        if (selected.type === 'VARIABLE') {
            updateElement(selectedElementId, { content: `{{${varKey}}}` });
        } else {
            const currentContent = selected.content;
            if (textInputRef.current && document.activeElement === textInputRef.current) {
                const start = textInputRef.current.selectionStart || 0;
                const end = textInputRef.current.selectionEnd || 0;
                const newText = currentContent.substring(0, start) + `{{${varKey}}}` + currentContent.substring(end);
                updateElement(selectedElementId, { content: newText });
                
                setTimeout(() => textInputRef.current?.focus(), 0);
            } else {
                updateElement(selectedElementId, { content: currentContent + ` {{${varKey}}}` });
            }
        }
    };

    const selectedElement = activePage.elements.find(el => el.id === selectedElementId);

    const canvasStyle = {
        width: template.orientation === 'PORTRAIT' ? `${A4_WIDTH_PX * 0.6}px` : `${A4_HEIGHT_PX * 0.6}px`,
        height: template.orientation === 'PORTRAIT' ? `${A4_HEIGHT_PX * 0.6}px` : `${A4_WIDTH_PX * 0.6}px`,
        backgroundImage: `url(${activePage.backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    };

    return (
        <div className="flex h-[calc(100vh-200px)] gap-6">
            
            {/* LEFT TOOLBAR */}
            <div className="w-80 flex flex-col gap-4 flex-shrink-0">
                {/* 1. Template Config (Existing code) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Document Setup (A4)</h3>

                    {savedTemplateCount === 0 && (
                        <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-100 text-[11px] text-amber-900 leading-relaxed">
                            <span className="font-bold">Belum ada template PDF tersimpan</span>
                            <span className="block mt-1 text-amber-800/90">
                                Database mengembalikan 0 template. Setelah desain selesai, klik <span className="font-semibold">Save Template</span> untuk menyimpan.
                            </span>
                        </div>
                    )}
                    
                    <div className="mb-3">
                        <label className="block text-xs text-slate-400 mb-1">Template Name</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-slate-300 rounded text-sm font-bold"
                            value={template.name}
                            onChange={(e) => setTemplate({...template, name: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <button onClick={() => handleOrientationChange('PORTRAIT')} className={`py-2 text-xs font-bold rounded border ${template.orientation === 'PORTRAIT' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>Portrait</button>
                        <button onClick={() => handleOrientationChange('LANDSCAPE')} className={`py-2 text-xs font-bold rounded border ${template.orientation === 'LANDSCAPE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>Landscape</button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <button onClick={() => setActivePageIndex(Math.max(0, activePageIndex - 1))} disabled={activePageIndex === 0} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronLeft size={16}/></button>
                        <span className="text-xs font-bold text-slate-700">Page {activePageIndex + 1} of {template.pages.length}</span>
                        <button onClick={() => setActivePageIndex(Math.min(template.pages.length - 1, activePageIndex + 1))} disabled={activePageIndex === template.pages.length - 1} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronRight size={16}/></button>
                    </div>
                </div>

                {/* 2. Layer & Content Tools */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Page {activePageIndex + 1} Layers</h3>
                    
                    <div className="mb-4">
                        <label className="block w-full cursor-pointer group">
                            <div className="flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-3 hover:bg-slate-50 hover:border-blue-400 transition-colors">
                                <Upload size={16} className="text-slate-400 mr-2 group-hover:text-blue-500"/>
                                <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600">
                                    {activePage.backgroundImageUrl ? 'Change Background' : 'Upload Background'}
                                </span>
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button onClick={() => handleAddElement('TEXT')} className="flex items-center justify-center py-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-700 hover:bg-slate-100">
                            <Type size={14} className="mr-1"/> Add Text
                        </button>
                        {/* NEW: Use VariableInserter */}
                        <div className="relative">
                            <VariableInserter 
                                onInsert={insertVariableIntoSelected} 
                                align="left" 
                                buttonLabel="Add Variable" 
                                className="w-full justify-center"
                            />
                        </div>
                    </div>

                    {/* Selected Element Properties */}
                    {selectedElement ? (
                        <div className="mt-auto border-t border-slate-100 pt-4 animate-fade-in">
                            <h4 className="text-xs font-bold text-blue-600 mb-2 flex items-center justify-between">
                                <span className="flex items-center"><Move size={12} className="mr-1"/> Selected Item</span>
                                <span className="text-[10px] bg-slate-100 px-1.5 rounded">{selectedElement.type}</span>
                            </h4>
                            
                            <div className="space-y-2">
                                {(selectedElement.type === 'TEXT' || selectedElement.type === 'VARIABLE') && (
                                    <div className="relative group">
                                        <input 
                                            ref={textInputRef}
                                            type="text" 
                                            className="w-full p-1.5 border border-slate-300 rounded text-xs pr-6" 
                                            value={selectedElement.content}
                                            onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                                        />
                                        {/* Quick insert icon */}
                                        <div className="absolute right-1 top-1">
                                             <VariableInserter onInsert={insertVariableIntoSelected} align="right" buttonLabel="" />
                                        </div>
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-slate-400">Size</label>
                                        <input 
                                            type="number" className="w-full p-1 border rounded text-xs" 
                                            value={selectedElement.fontSize} onChange={e => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400">Color</label>
                                        <input 
                                            type="color" className="w-full h-7 p-0 border rounded" 
                                            value={selectedElement.color} onChange={e => updateElement(selectedElement.id, { color: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 bg-slate-50 p-1 rounded">
                                    {['left', 'center', 'right'].map(align => (
                                        <button 
                                            key={align}
                                            onClick={() => updateElement(selectedElement.id, { align: align as any })}
                                            className={`flex-1 py-1 text-[10px] uppercase font-bold rounded ${selectedElement.align === align ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                                        >
                                            {align}
                                        </button>
                                    ))}
                                </div>

                                <button 
                                    onClick={() => deleteElement(selectedElement.id)}
                                    className="w-full py-1.5 mt-2 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 flex items-center justify-center"
                                >
                                    <Trash2 size={12} className="mr-1"/> Remove
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-auto py-8 text-center text-slate-400 text-xs italic">
                            Select an item on canvas to edit
                        </div>
                    )}
                </div>
            </div>

            {/* CENTER CANVAS (Unchanged Logic, simplified render for brevity) */}
            <div className="flex-1 bg-slate-100 rounded-xl border border-slate-300 overflow-auto flex items-center justify-center p-8 relative">
                <div className="absolute top-4 right-4 flex gap-2 z-20">
                    <button 
                        type="button"
                        onClick={() => setIsPreviewMode(!isPreviewMode)} 
                        disabled={isSaving}
                        className={`px-4 py-2 rounded-lg font-bold text-xs shadow-lg flex items-center disabled:opacity-50 ${isPreviewMode ? 'bg-amber-500 text-white' : 'bg-white text-slate-700'}`}
                    >
                        <Eye size={14} className="mr-2"/> {isPreviewMode ? 'Exit Preview' : 'Preview Data'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSave()}
                        disabled={isSaving}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-lg flex items-center hover:bg-slate-800 disabled:opacity-60 disabled:pointer-events-none"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={14} className="mr-2 animate-spin" /> Menyimpan…
                            </>
                        ) : (
                            <>
                                <Save size={14} className="mr-2"/> Save Template
                            </>
                        )}
                    </button>
                </div>

                <div 
                    ref={canvasRef}
                    className="bg-white shadow-2xl relative transition-all duration-300 flex-shrink-0"
                    style={canvasStyle}
                    onClick={() => setSelectedElementId(null)}
                >
                    {!activePage.backgroundImageUrl && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 pointer-events-none border-2 border-dashed border-slate-200 m-4 rounded-xl">
                            <ImageIcon size={64} className="mb-2" />
                            <span className="text-sm font-bold">No Background</span>
                            <span className="text-xs">Upload an image from the sidebar</span>
                        </div>
                    )}

                    {activePage.elements.map(el => {
                        let displayContent: string = el.content;
                        if (isPreviewMode) {
                            // IMPROVED PREVIEW LOGIC using VARIABLE_CATALOG
                            const cleanKey = el.content.replace(/{{|}}/g, '');
                            
                            // Look up example in catalog
                            const variableDef = VARIABLE_CATALOG.find(v => v.key === cleanKey);
                            
                            if (variableDef) {
                                displayContent = variableDef.example; // Use catalog example
                            } else {
                                // Fallback manual regex replacement if complex string
                                displayContent = displayContent.replace(/{{(.*?)}}/g, (match, p1) => {
                                    const def = VARIABLE_CATALOG.find(v => v.key === p1);
                                    return def ? def.example : match;
                                });
                            }
                        }

                        return (
                            <div
                                key={el.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
                                className={`absolute cursor-move select-none whitespace-nowrap ${selectedElementId === el.id && !isPreviewMode ? 'ring-2 ring-blue-600 z-10' : ''}`}
                                style={{
                                    left: `${el.x}%`, top: `${el.y}%`, transform: 'translate(-50%, -50%)',
                                    fontSize: `${el.fontSize}px`, fontWeight: el.fontWeight, color: el.color, textAlign: el.align as any, fontFamily: 'serif',
                                }}
                            >
                                {displayContent}
                                {selectedElementId === el.id && !isPreviewMode && <div className="absolute -top-3 -right-3 w-4 h-4 bg-blue-600 rounded-full shadow-sm"></div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PDFDesigner;
