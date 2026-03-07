
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
        <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col animate-fade-in">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <FileText className="mr-3 text-blue-600" /> Contract Center
                    </h1>
                    <p className="text-slate-500 mt-1">Manage legal agreements, templates, and clause library.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('INSTANCES')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center ${activeTab === 'INSTANCES' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
                        <FileText size={14} className="mr-2"/> Agreements
                    </button>
                    <button onClick={() => setActiveTab('TEMPLATES')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center ${activeTab === 'TEMPLATES' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
                        <Layout size={14} className="mr-2"/> Templates
                    </button>
                    <button onClick={() => setActiveTab('LIBRARY')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center ${activeTab === 'LIBRARY' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
                        <Book size={14} className="mr-2"/> Library
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'LIBRARY' && <ClauseLibrary />}
                
                {activeTab === 'TEMPLATES' && (
                    <div className="bg-white rounded-xl border border-slate-200 h-full flex flex-col overflow-hidden">
                         <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Master Templates</h3>
                            <button onClick={() => { setEditingTemplate(null); setShowTemplateBuilder(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-blue-700">
                                <Layout size={16} className="mr-2"/> New Template
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
                            {templates.map(tmpl => (
                                <div key={tmpl.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all bg-white group relative">
                                    {/* Action Buttons */}
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded-lg shadow-sm">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDuplicateTemplate(tmpl); }}
                                            className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200" 
                                            title="Duplicate Template"
                                        >
                                            <Copy size={16}/>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleEditTemplate(tmpl); }}
                                            className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" 
                                            title="Edit Full Configuration"
                                        >
                                            <Edit3 size={16}/>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setVisualEditingTemplate(tmpl); }}
                                            className="p-1.5 bg-purple-50 text-purple-600 rounded hover:bg-purple-100" 
                                            title="Visual Clause Editor"
                                        >
                                            <Layout size={16}/>
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <Layout size={24} />
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${tmpl.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {tmpl.isActive ? 'Active' : 'Draft'}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-lg mb-1">{tmpl.name}</h4>
                                    <p className="text-xs text-slate-500">Product: {tmpl.productName}</p>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                                        <span>Ver {tmpl.version}</span>
                                        <span>{(tmpl.rootNodes?.length || 0)} Sections</span>
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
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex justify-between items-center animate-fade-in">
                                <div className="flex items-center">
                                    <div className="p-2 bg-amber-100 rounded-full mr-3 text-amber-700">
                                        <AlertCircle size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-amber-800">Missing Contracts Detected</h4>
                                        <p className="text-xs text-amber-700">Found {missingContracts.length} active members without contracts.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleBatchGenerate}
                                    className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-700 flex items-center shadow-sm"
                                >
                                    <Wand2 size={14} className="mr-2"/> Generate {missingContracts.length} Contracts
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
