
import React, { useState } from 'react';
import { ContractInstance, ContractTemplate } from '../../types/contract';
import { ContractService } from '../../services/contractService';
import { FileText, Book, Layout, RefreshCw, Eye, AlertCircle, Wand2, Edit3, Trash2, Copy } from 'lucide-react';
import ClauseLibrary from './contract/ClauseLibrary';
import TemplateBuilder from './contract/TemplateBuilder';
import ContractViewer from './contract/ContractViewer';
import ClauseMasterMindmap from './ClauseMasterMindmap';
import { useToast } from '../../context/ToastContext';

const ContractManager: React.FC = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'INSTANCES' | 'TEMPLATES' | 'LIBRARY'>('INSTANCES');
    const [instances, setInstances] = useState<ContractInstance[]>([]);
    const [loading, setLoading] = useState(false);
    
    // View States
    const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
    const [viewInstance, setViewInstance] = useState<ContractInstance | null>(null);

    // Missing Contract Logic
    const [missingContracts, setMissingContracts] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    // Template Manager States
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null); // For TemplateBuilder
    const [visualEditingTemplate, setVisualEditingTemplate] = useState<ContractTemplate | null>(null); // For Mindmap (Old)

    React.useEffect(() => {
        if (activeTab === 'INSTANCES') loadInstances();
        if (activeTab === 'TEMPLATES') loadTemplates();
    }, [activeTab]);

    const loadInstances = async () => {
        setLoading(true);
        const data = await ContractService.getInstances();
        setInstances(data);
        setLoading(false);
    };

    const loadTemplates = async () => {
        setLoading(true);
        const data = await ContractService.getTemplates();
        setTemplates(data);
        setLoading(false);
    };

    const handleScanMissing = async () => {
        setIsScanning(true);
        const missing = await ContractService.scanMissingContracts();
        setMissingContracts(missing);
        setIsScanning(false);
    };

    const handleBatchGenerate = async () => {
        if (missingContracts.length === 0) return;
        if (!window.confirm(`Generate ${missingContracts.length} contracts now?`)) return;

        setLoading(true);
        try {
            await ContractService.batchGenerate(missingContracts.map(m => m.memberId));
            showToast(`Successfully generated ${missingContracts.length} contracts.`, 'success');
            setMissingContracts([]); // Clear list
            loadInstances();
        } catch (e) {
            showToast('Generation failed.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Callback for Template Builder
    const handleTemplateSaved = () => {
        setShowTemplateBuilder(false);
        setEditingTemplate(null);
        if (activeTab === 'TEMPLATES') {
            loadTemplates();
        } else {
            setActiveTab('TEMPLATES');
        }
    };

    // Callback for Mindmap Editor Save
    const handleSaveTemplateNodes = async (newNodes: any[]) => {
        if (!visualEditingTemplate) return;
        const updatedTemplate = { ...visualEditingTemplate, rootNodes: newNodes };
        await ContractService.saveTemplate(updatedTemplate);
        setVisualEditingTemplate(updatedTemplate);
        loadTemplates(); 
    };

    const handleEditTemplate = (tmpl: ContractTemplate) => {
        setEditingTemplate(tmpl);
        setShowTemplateBuilder(true);
    };
    
    // NEW: Duplicate Feature
    const handleDuplicateTemplate = async (tmpl: ContractTemplate) => {
        if (!confirm(`Duplicate "${tmpl.name}"?`)) return;
        
        const copy: ContractTemplate = {
            ...tmpl,
            id: `TMPL-${Date.now()}`,
            name: `${tmpl.name} (Copy)`,
            isActive: false, // Default to draft
            version: '1.0'
        };
        
        await ContractService.saveTemplate(copy);
        showToast('Template duplicated successfully.', 'success');
        loadTemplates();
    };

    if (showTemplateBuilder) {
        return (
            <TemplateBuilder 
                onClose={() => { setShowTemplateBuilder(false); setEditingTemplate(null); }} 
                onSuccess={handleTemplateSaved} 
                initialData={editingTemplate} // Pass existing data
            />
        );
    }

    if (viewInstance) {
        return (
            <div className="flex flex-col h-full">
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                    <h3 className="font-bold">Viewing Contract: {viewInstance.id}</h3>
                    <button onClick={() => setViewInstance(null)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded">Close</button>
                </div>
                <div className="flex-1 overflow-hidden">
                    <ContractViewer instance={viewInstance} />
                </div>
            </div>
        );
    }

    if (visualEditingTemplate) {
         return (
            <div className="flex flex-col h-full bg-white">
                <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setVisualEditingTemplate(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold">Back</button>
                        <div>
                            <h2 className="font-bold text-slate-900 text-lg">{visualEditingTemplate.name}</h2>
                            <p className="text-xs text-slate-500">Visual Clause Tree Editor</p>
                        </div>
                    </div>
                     <button onClick={() => { setVisualEditingTemplate(null); }} className="px-5 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800">
                        Save & Close
                    </button>
                </div>
                <div className="flex-1 overflow-hidden">
                    <ClauseMasterMindmap 
                        data={visualEditingTemplate.rootNodes || []} 
                        onChange={handleSaveTemplateNodes}
                        // Need to pass tables for selection, assuming we fetch full template data
                        availableTables={visualEditingTemplate.customTables} 
                    />
                </div>
            </div>
         );
    }

    return (
        <div className="page-container flex min-h-0 flex-col animate-fade-in pb-8 min-w-0">
            <div className="mb-5 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-end lg:justify-between min-w-0">
                <div className="flex min-w-0 gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FileText className="h-6 w-6" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl leading-snug">Contract Center</h1>
                        <p className="text-slate-500 mt-1 text-sm sm:text-base">Manage legal agreements, templates, and clause library.</p>
                    </div>
                </div>
                <div className="w-full max-w-full shrink-0 overflow-x-scroll-touch rounded-lg bg-slate-100 p-1 lg:w-auto">
                    <div className="inline-flex max-w-none flex-nowrap gap-1">
                    <button type="button" onClick={() => setActiveTab('INSTANCES')} className={`shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-all sm:px-4 ${activeTab === 'INSTANCES' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
                        <FileText size={14} className="shrink-0"/> Agreements
                    </button>
                    <button type="button" onClick={() => setActiveTab('TEMPLATES')} className={`shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-all sm:px-4 ${activeTab === 'TEMPLATES' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
                        <Layout size={14} className="shrink-0"/> Templates
                    </button>
                    <button type="button" onClick={() => setActiveTab('LIBRARY')} className={`shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-all sm:px-4 ${activeTab === 'LIBRARY' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
                        <Book size={14} className="shrink-0"/> Library
                    </button>
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
                {activeTab === 'LIBRARY' && <ClauseLibrary />}
                
                {activeTab === 'TEMPLATES' && (
                    <div className="bg-white rounded-xl border border-slate-200 h-full min-h-[50vh] flex flex-col overflow-hidden min-w-0">
                         <div className="p-3 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50 sm:p-4">
                            <h3 className="font-bold text-slate-800">Master Templates</h3>
                            <button type="button" onClick={() => { setEditingTemplate(null); setShowTemplateBuilder(true); }} className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 w-full sm:w-auto shrink-0">
                                <Layout size={16} className="shrink-0"/> New Template
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto min-w-0">
                            {templates.map(tmpl => (
                                <div key={tmpl.id} className="border border-slate-200 rounded-xl p-4 sm:p-5 hover:shadow-lg transition-all bg-white group relative min-w-0 max-w-full">
                                    {/* Action Buttons — visible on touch / hover */}
                                    <div className="mb-3 flex flex-wrap gap-2 sm:absolute sm:top-4 sm:right-4 sm:mb-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-slate-50 sm:bg-white/95 p-1 rounded-lg sm:shadow-sm">
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleDuplicateTemplate(tmpl); }}
                                            className="p-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 touch-target sm:min-h-0 sm:min-w-0" 
                                            title="Duplicate Template"
                                        >
                                            <Copy size={16}/>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleEditTemplate(tmpl); }}
                                            className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 touch-target sm:min-h-0 sm:min-w-0" 
                                            title="Edit Full Configuration"
                                        >
                                            <Edit3 size={16}/>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setVisualEditingTemplate(tmpl); }}
                                            className="p-2 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 touch-target sm:min-h-0 sm:min-w-0" 
                                            title="Visual Clause Editor"
                                        >
                                            <Layout size={16}/>
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                            <Layout size={24} />
                                        </div>
                                        <span className={`self-start sm:self-auto text-[10px] font-bold px-2 py-1 rounded uppercase shrink-0 ${tmpl.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {tmpl.isActive ? 'Active' : 'Draft'}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-base sm:text-lg mb-1 break-words">{tmpl.name}</h4>
                                    <p className="text-xs text-slate-500"><span className="text-slate-400">Product:</span> {tmpl.productName}</p>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:justify-between sm:items-center sm:gap-2">
                                        <span>Version {tmpl.version}</span>
                                        <span>{(tmpl.rootNodes?.length || 0)} sections</span>
                                    </div>
                                </div>
                            ))}
                            {templates.length === 0 && (
                                <div className="col-span-full text-center py-20 text-slate-400">
                                    No templates found. Create one to get started.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'INSTANCES' && (
                    <div className="flex flex-col h-full gap-4">
                        {/* ALERT FOR MISSING CONTRACTS */}
                        {missingContracts.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center animate-fade-in min-w-0">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="p-2 bg-amber-100 rounded-full shrink-0 text-amber-700">
                                        <AlertCircle size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-amber-800">Missing Contracts Detected</h4>
                                        <p className="text-xs text-amber-700 mt-0.5">Found {missingContracts.length} active members without contracts.</p>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={handleBatchGenerate}
                                    className="bg-amber-600 text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-amber-700 flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto shrink-0"
                                >
                                    <Wand2 size={14} className="shrink-0"/> Generate {missingContracts.length} Contracts
                                </button>
                            </div>
                        )}

                        <div className="bg-white rounded-xl border border-slate-200 h-full overflow-hidden flex flex-col flex-1">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-bold text-slate-700">Issued Contracts</h3>
                                    {missingContracts.length === 0 && !loading && (
                                        <button onClick={handleScanMissing} className="text-xs text-blue-600 hover:underline">
                                            {isScanning ? 'Scanning...' : 'Check for missing'}
                                        </button>
                                    )}
                                </div>
                                <button onClick={loadInstances}><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white text-slate-500 border-b border-slate-100">
                                        <tr>
                                            <th className="p-4">Contract ID</th>
                                            <th className="p-4">Member</th>
                                            <th className="p-4">Program</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {instances.map(inst => (
                                            <tr key={inst.id} className="hover:bg-slate-50">
                                                <td className="p-4 font-mono text-xs">{inst.id}</td>
                                                <td className="p-4 font-bold">{inst.customerData.name}</td>
                                                <td className="p-4 text-slate-600">{inst.customerData.programName}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${inst.status === 'SIGNED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{inst.status}</span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => setViewInstance(inst)} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Eye size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {instances.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No contracts found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContractManager;
