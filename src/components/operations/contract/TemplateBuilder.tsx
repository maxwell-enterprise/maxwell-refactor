
import React, { useState, useEffect, useMemo } from 'react';
import { ContractTemplate, ClauseItem, MasterNode, ContractHeaderField, ContractTableDefinition, ContractInstance } from '../../../types/contract';
import { ContractService } from '../../../services/contractService';
import { DataService } from '../../../services/dataService';
import { Product, Member } from '../../../types/index';
import { useToast } from '../../../context/ToastContext';
import { Save, LayoutTemplate, Folder, FileText, CheckSquare, Square, Eye, RefreshCw, AlertCircle, FileImage, Type } from 'lucide-react';
import HeaderEditor from './editors/HeaderEditor';
import TableEditor from './editors/TableEditor';
import ContractViewer from './ContractViewer';
import ClauseMasterMindmap from '../ClauseMasterMindmap'; // Use local visual editor

interface TemplateBuilderProps {
    onClose: () => void;
    onSuccess?: () => void;
    initialData?: ContractTemplate | null;
}

const TemplateBuilder: React.FC<TemplateBuilderProps> = ({ onClose, onSuccess, initialData }) => {
    const { showToast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [library, setLibrary] = useState<ClauseItem[]>([]);
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'CLAUSES' | 'HEADER' | 'TABLES'>('GENERAL');
    
    // Sample Data State for Preview
    const [sampleMember, setSampleMember] = useState<Member | null>(null);
    const [sampleTxAmount, setSampleTxAmount] = useState<number>(0);
    
    // Form State
    const [selectedProduct, setSelectedProduct] = useState(initialData?.productId || '');
    const [templateName, setTemplateName] = useState(initialData?.name || '');
    const [selectedClauses, setSelectedClauses] = useState<string[]>(initialData?.selectedClauseIds || []);
    
    // Styling State
    const [docTitle, setDocTitle] = useState(initialData?.documentTitle || 'Customer Agreement');
    const [docSubtitle, setDocSubtitle] = useState(initialData?.documentSubtitle || 'Terms and Conditions');
    const [docLogo, setDocLogo] = useState(initialData?.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Maxwell_Logo.jpg');

    // Dynamic Layout State
    const [customHeader, setCustomHeader] = useState<ContractHeaderField[]>(initialData?.customHeader || [
        { id: 'def-1', label: 'Member Name', valueTemplate: '<<FULLNAME>>', width: 'HALF' },
        { id: 'def-2', label: 'Total Fees', valueTemplate: '<<TOTALFEES>>', width: 'HALF' },
        { id: 'def-3', label: 'Address', valueTemplate: '<<HOMEADDRESS>>', width: 'FULL' },
    ]);
    const [customTables, setCustomTables] = useState<ContractTableDefinition[]>(initialData?.customTables || []);
    
    // Tree Structure (Nodes) - Initial Load or Default
    const [rootNodes, setRootNodes] = useState<MasterNode[]>(initialData?.rootNodes || []);

    const [layoutConfig, setLayoutConfig] = useState(initialData?.layoutConfig || {
        showBonusTable: false, 
        showResourcesTable: false,
        showHeaderGrid: true 
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [prods, lib, members, transactions] = await Promise.all([
            DataService.getProducts(),
            ContractService.getLibrary(),
            DataService.getMembers(),
            DataService.getTransactions()
        ]);
        setProducts(prods);
        setLibrary(lib);
        
        // Setup Sample Data (Take the most recent member/transaction)
        if (members.length > 0) {
            const lastTx = transactions.find(t => t.type === 'PO' && t.description.includes('Sale'));
            const targetMember = lastTx ? members.find(m => lastTx.description.includes(m.name)) || members[0] : members[0];
            setSampleMember(targetMember);
            setSampleTxAmount(lastTx ? lastTx.amount : 15000000);
        }

        // If new, auto-select clauses logic (optional, currently we rely on user adding sections)
        if (!initialData) {
            setSelectedClauses([]);
        }
    };

    // --- CONSTRUCT LIVE PREVIEW INSTANCE ---
    const previewInstance: ContractInstance = useMemo(() => {
        // Mock Customer Data
        const customerData = {
            name: sampleMember?.name || 'John Doe (Sample)',
            mlctNumber: sampleMember?.id || 'M-SAMPLE-001',
            joinDate: sampleMember?.joinMonth || new Date().toISOString().split('T')[0],
            programName: products.find(p => p.id === selectedProduct)?.title || 'Selected Program Name',
            totalFees: sampleTxAmount,
            email: sampleMember?.email || 'john@example.com',
            phone: sampleMember?.phone || '08123456789',
            address: sampleMember?.address?.city || 'Jakarta, Indonesia'
        };

        return {
            id: 'PREVIEW-MODE',
            memberId: sampleMember?.id || 'guest',
            templateId: 'temp',
            status: 'DRAFT',
            clauses: [], // Not used for rendering anymore, strictly rootNodes
            rootNodes: rootNodes, // Use the live tree state
            
            logoUrl: docLogo,
            documentTitle: docTitle,
            documentSubtitle: docSubtitle,

            customHeader: customHeader,
            customTables: customTables,
            customerData: customerData,
            selectedNodeIds: selectedClauses
        };
    }, [rootNodes, customHeader, customTables, sampleMember, sampleTxAmount, library, selectedProduct, products, docLogo, docTitle, docSubtitle]);


    const handleSave = async () => {
        if (!selectedProduct || !templateName) {
            showToast('Product and Template Name required', 'error');
            return;
        }
        
        const prod = products.find(p => p.id === selectedProduct);
        const templateToSave: ContractTemplate = {
            id: initialData?.id || `TMPL-${Date.now()}`,
            productId: selectedProduct,
            productName: prod?.title || 'Unknown Product',
            name: templateName,
            
            logoUrl: docLogo,
            documentTitle: docTitle,
            documentSubtitle: docSubtitle,

            selectedClauseIds: selectedClauses, // Legacy support
            rootNodes: rootNodes, // The visual structure
            customHeader: customHeader,
            customTables: customTables,
            version: initialData ? String(Number(initialData.version) + 0.1) : '1.0',
            isActive: true,
            layoutConfig: layoutConfig
        };

        await ContractService.saveTemplate(templateToSave);
        showToast(`Template ${initialData ? 'Updated' : 'Created'}`, 'success');
        if (onSuccess) onSuccess();
        else onClose();
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 shadow-sm z-20">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center">
                        <LayoutTemplate className="mr-2 text-blue-600"/> {initialData ? 'Edit Template' : 'Template Designer'}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-lg text-sm">Cancel</button>
                        <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center text-sm shadow-lg">
                            <Save size={16} className="mr-2"/> Save Template
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                     {/* Tabs as pills */}
                     <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-xl">
                        <button onClick={() => setActiveTab('GENERAL')} className={`flex-1 py-1.5 text-xs font-bold rounded ${activeTab === 'GENERAL' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>1. General & Style</button>
                        <button onClick={() => setActiveTab('HEADER')} className={`flex-1 py-1.5 text-xs font-bold rounded ${activeTab === 'HEADER' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>2. Header Data</button>
                        <button onClick={() => setActiveTab('TABLES')} className={`flex-1 py-1.5 text-xs font-bold rounded ${activeTab === 'TABLES' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>3. Tables</button>
                        <button onClick={() => setActiveTab('CLAUSES')} className={`flex-1 py-1.5 text-xs font-bold rounded ${activeTab === 'CLAUSES' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>4. Document Structure</button>
                    </div>
                </div>
            </div>

            {/* Split View Content */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                
                {/* LEFT COLUMN: EDITOR */}
                <div className="w-full lg:w-[45%] flex flex-col bg-white border-r border-slate-200 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                        
                        {activeTab === 'GENERAL' && (
                            <div className="space-y-6">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Basic Info</h3>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Template Name</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={templateName}
                                            onChange={(e) => setTemplateName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Product</label>
                                        <select 
                                            className="w-full p-2 border border-slate-300 rounded text-sm bg-slate-50"
                                            value={selectedProduct}
                                            onChange={(e) => { setSelectedProduct(e.target.value); if(!initialData) setTemplateName(`${products.find(p=>p.id===e.target.value)?.title} Contract`); }}
                                        >
                                            <option value="">-- Select Product --</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Document Styling</h3>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center"><FileImage size={12} className="mr-1"/> Logo URL</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-2 border border-slate-300 rounded text-sm"
                                            value={docLogo}
                                            onChange={(e) => setDocLogo(e.target.value)}
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center"><Type size={12} className="mr-1"/> Document Title</label>
                                            <input 
                                                type="text" 
                                                className="w-full p-2 border border-slate-300 rounded text-sm"
                                                value={docTitle}
                                                onChange={(e) => setDocTitle(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Subtitle</label>
                                            <input 
                                                type="text" 
                                                className="w-full p-2 border border-slate-300 rounded text-sm"
                                                value={docSubtitle}
                                                onChange={(e) => setDocSubtitle(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'CLAUSES' && (
                             <div className="h-full flex flex-col">
                                 <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4 text-xs text-blue-700">
                                     <strong>Tip:</strong> Build your document structure here. You can add Sections, specific Clauses, and inject Tables between sections.
                                 </div>
                                 <div className="flex-1 min-h-[500px] border border-slate-300 rounded-xl overflow-hidden bg-white">
                                     {/* Use the Tree Editor */}
                                     <ClauseMasterMindmap 
                                         data={rootNodes} 
                                         onChange={setRootNodes} 
                                         availableTables={customTables} // Pass tables so user can select them
                                     />
                                 </div>
                            </div>
                        )}

                        {activeTab === 'HEADER' && (
                             <div className="h-full flex flex-col gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                                    <input type="checkbox" checked={layoutConfig.showHeaderGrid} onChange={e => setLayoutConfig({...layoutConfig, showHeaderGrid: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                                    <div>
                                        <span className="font-bold text-slate-900 block text-sm">Enable Header Grid</span>
                                        <span className="text-xs text-slate-500">Show data table at document top.</span>
                                    </div>
                                </div>
                                {layoutConfig.showHeaderGrid && (
                                    <HeaderEditor fields={customHeader} onChange={setCustomHeader} />
                                )}
                            </div>
                        )}

                        {activeTab === 'TABLES' && (
                            <TableEditor tables={customTables} onChange={setCustomTables} />
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: LIVE PREVIEW */}
                <div className="w-full lg:w-[55%] bg-slate-900 flex flex-col relative overflow-hidden">
                     {/* Preview Toolbar */}
                     <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-800/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-xl border border-slate-700 flex items-center gap-3 text-xs animate-fade-in-down">
                        <Eye size={14} className="text-green-400"/>
                        <span className="font-medium opacity-80">Preview Data:</span>
                        <span className="font-bold flex items-center gap-1">
                             {sampleMember?.name || 'Loading...'}
                        </span>
                        <div className="h-3 w-px bg-slate-600"></div>
                        <span className="font-mono text-amber-400">
                             {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(sampleTxAmount)}
                        </span>
                     </div>

                     <div className="flex-1 overflow-auto p-8 flex justify-center items-start custom-scrollbar-dark">
                         <div className="transform origin-top scale-[0.65] md:scale-[0.8] lg:scale-[0.9] transition-transform duration-300 shadow-2xl">
                             <ContractViewer instance={previewInstance} />
                         </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default TemplateBuilder;
