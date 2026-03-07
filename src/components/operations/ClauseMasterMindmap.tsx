
import React, { useState, useRef } from 'react';
import { MasterNode, ContractTableDefinition } from '../../types/contract';
import { 
    Plus, Trash2, ChevronRight, ChevronDown, FileText, FolderOpen, 
    Eye, Edit3, GripVertical, FileCheck, Table as TableIcon,
    PenTool, Building, AlertCircle
} from 'lucide-react';

interface ClauseMasterMindmapProps {
    data: MasterNode[];
    onChange: (newData: MasterNode[]) => void;
    availableTables?: ContractTableDefinition[];
}

const ClauseMasterMindmap: React.FC<ClauseMasterMindmapProps> = ({ data, onChange, availableTables = [] }) => {
    const [selectedId, setSelectedId] = useState<string | null>(data.length > 0 ? data[0].id : null);
    const [viewMode, setViewMode] = useState<'EDITOR' | 'PREVIEW'>('EDITOR');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(data.map(d => d.id)));
    
    // Drag & Drop State
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
    const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);

    // --- HELPER: FIND NODE ---
    const findNode = (nodes: MasterNode[], id: string): { node: MasterNode, path: number[] } | null => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) return { node: nodes[i], path: [i] };
            if (nodes[i].children) {
                const result = findNode(nodes[i].children!, id);
                if (result) return { node: result.node, path: [i, ...result.path] };
            }
        }
        return null;
    };

    const activeNodeData = selectedId ? findNode(data, selectedId) : null;

    // --- ACTIONS ---

    const updateNode = (field: keyof MasterNode, value: any) => {
        if (!activeNodeData) return;
        const newData = JSON.parse(JSON.stringify(data)); // Deep copy
        let target: any = newData;
        const path = activeNodeData.path;
        
        // Navigate to parent array
        for (let i = 0; i < path.length - 1; i++) {
            target = target[path[i]].children;
        }
        target[path[path.length-1]] = { ...target[path[path.length-1]], [field]: value };
        onChange(newData);
    };

    // Special handler for atomic updates (to fix Table Selection race condition)
    const updateNodeMulti = (updates: Partial<MasterNode>) => {
        if (!activeNodeData) return;
        const newData = JSON.parse(JSON.stringify(data));
        let target: any = newData;
        const path = activeNodeData.path;
        
        for (let i = 0; i < path.length - 1; i++) {
            target = target[path[i]].children;
        }
        
        const currentNode = target[path[path.length-1]];
        target[path[path.length-1]] = { ...currentNode, ...updates };
        
        onChange(newData);
    };

    const addSection = () => {
        const newSection: MasterNode = {
            id: `SEC-${Date.now()}`,
            type: 'SECTION',
            label: 'New Section',
            children: []
        };
        onChange([...data, newSection]);
        setSelectedId(newSection.id);
        setViewMode('EDITOR');
    };

    const addTableBlock = () => {
        const newTableNode: MasterNode = {
            id: `TBL-REF-${Date.now()}`,
            type: 'TABLE_REF',
            label: 'Table Placeholder',
            tableId: '' 
        };
        insertNode(newTableNode);
    };

    const addSignatureBox = () => {
        const newSig: MasterNode = {
            id: `SIG-${Date.now()}`,
            type: 'SIGNATURE',
            label: 'Signature Area',
            closingStatement: 'I, <<FULLNAME>>, acknowledge and agree to the terms outlined above.',
            showCompanySignature: true,
            companySignatoryName: 'Authorized Representative'
        };
        insertNode(newSig);
    };

    const addClause = (parentId: string) => {
        const newData = JSON.parse(JSON.stringify(data));
        const parentInfo = findNode(newData, parentId);
        if (parentInfo) {
            let target: any = newData;
            for (let i = 0; i < parentInfo.path.length; i++) {
                if (i === parentInfo.path.length - 1) {
                    target = target[parentInfo.path[i]];
                } else {
                    target = target[parentInfo.path[i]].children;
                }
            }
            if (!target.children) target.children = [];
            const newClause: MasterNode = {
                id: `CL-${Date.now()}`,
                type: 'CLAUSE',
                label: 'New Clause',
                text: 'Enter legal text here...',
                isMandatory: true
            };
            target.children.push(newClause);
            onChange(newData);
            setSelectedId(newClause.id);
            setExpandedSections(prev => new Set(prev).add(parentId));
            setViewMode('EDITOR');
        }
    };

    // Generic insert helper
    const insertNode = (newNode: MasterNode) => {
        const newData = JSON.parse(JSON.stringify(data));
        if (selectedId) {
            const parentInfo = findNode(newData, selectedId);
            if (parentInfo && parentInfo.node.type === 'SECTION') {
                // Add as child
                let target: any = newData;
                for (let i = 0; i < parentInfo.path.length; i++) {
                    if (i === parentInfo.path.length - 1) target = target[parentInfo.path[i]];
                    else target = target[parentInfo.path[i]].children;
                }
                if (!target.children) target.children = [];
                target.children.push(newNode);
                onChange(newData);
                setSelectedId(newNode.id);
                return;
            }
        }
        onChange([...data, newNode]);
        setSelectedId(newNode.id);
    };

    // Robust Recursive Delete
    const deleteNode = (id: string) => {
        if (!window.confirm("Delete this item?")) return;

        const removeRecursive = (nodes: MasterNode[]): MasterNode[] => {
            return nodes
                .filter(n => n.id !== id)
                .map(n => ({
                    ...n,
                    children: n.children ? removeRecursive(n.children) : undefined
                }));
        };

        const newData = removeRecursive(data);
        onChange(newData);
        if (selectedId === id) setSelectedId(null);
    };

    const toggleSection = (id: string) => {
        const newSet = new Set(expandedSections);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedSections(newSet);
    };

    // --- DRAG AND DROP HANDLERS ---
    
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.stopPropagation();
        setDraggedNodeId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedNodeId === id) return;
        setDragOverNodeId(id);
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverNodeId(null);

        if (!draggedNodeId || draggedNodeId === targetId) return;

        const newData = JSON.parse(JSON.stringify(data));
        
        // 1. Find and Remove Dragged Node
        let draggedNode: MasterNode | null = null;
        
        const removeNode = (nodes: MasterNode[]): MasterNode[] => {
            const index = nodes.findIndex(n => n.id === draggedNodeId);
            if (index !== -1) {
                draggedNode = nodes[index];
                return [...nodes.slice(0, index), ...nodes.slice(index + 1)];
            }
            return nodes.map(n => ({
                ...n,
                children: n.children ? removeNode(n.children) : undefined
            }));
        };

        const dataWithoutDragged = removeNode(newData);
        if (!draggedNode) return; // Should not happen

        // 2. Insert at Target
        const insertNodeAtTarget = (nodes: MasterNode[]): MasterNode[] => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === targetId) {
                    // Logic: If drop on SECTION, add as child. If other, add AFTER.
                    if (nodes[i].type === 'SECTION') {
                        if (!nodes[i].children) nodes[i].children = [];
                        nodes[i].children!.unshift(draggedNode!); // Add to top of section
                        setExpandedSections(prev => new Set(prev).add(nodes[i].id));
                    } else {
                        // Insert after
                        nodes.splice(i + 1, 0, draggedNode!);
                    }
                    return nodes; // Stop processing this level
                }
                if (nodes[i].children) {
                    const originalLength = nodes[i].children!.length;
                    nodes[i].children = insertNodeAtTarget(nodes[i].children!);
                    // If inserted in child, break
                    if (nodes[i].children!.length > originalLength) return nodes;
                }
            }
            return nodes;
        };

        const finalData = insertNodeAtTarget(dataWithoutDragged);
        onChange(finalData);
        setDraggedNodeId(null);
    };


    // --- RENDERERS ---

    const renderTreeItem = (node: MasterNode, depth: number = 0) => {
        const isSelected = selectedId === node.id;
        const isSection = node.type === 'SECTION';
        const isTable = node.type === 'TABLE_REF';
        const isSignature = node.type === 'SIGNATURE';
        const isExpanded = expandedSections.has(node.id);
        const isDragging = draggedNodeId === node.id;
        const isDragOver = dragOverNodeId === node.id;

        let Icon = FileText;
        if (isSection) Icon = FolderOpen;
        if (isTable) Icon = TableIcon;
        if (isSignature) Icon = PenTool;

        return (
            <div 
                key={node.id} 
                className={`select-none transition-all ${isDragging ? 'opacity-50' : 'opacity-100'}`}
                draggable
                onDragStart={(e) => handleDragStart(e, node.id)}
                onDragOver={(e) => handleDragOver(e, node.id)}
                onDrop={(e) => handleDrop(e, node.id)}
            >
                <div 
                    className={`
                        flex items-center px-3 py-2 cursor-pointer border-l-2 group relative
                        ${isSelected ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-transparent hover:bg-slate-50 text-slate-600'}
                        ${isDragOver ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-200' : ''}
                    `}
                    style={{ paddingLeft: `${depth * 16 + 12}px` }}
                    onClick={() => setSelectedId(node.id)}
                >
                    {/* Drag Handle */}
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing">
                        <GripVertical size={12} />
                    </div>

                    {isSection && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleSection(node.id); }}
                            className="mr-1 p-0.5 rounded hover:bg-slate-200 text-slate-400"
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                    )}
                    {(!isSection) && <div className="w-4 mr-1"></div>}
                    
                    <span className="mr-2">
                        <Icon size={14} className={isSelected ? "text-blue-600" : isTable ? "text-purple-500" : isSignature ? "text-rose-500" : isSection ? "text-amber-500" : "text-slate-400"} />
                    </span>
                    
                    <span className={`text-xs truncate flex-1 ${isSelected ? 'font-bold' : 'font-medium'}`}>
                        {node.label}
                    </span>

                    {/* Action Buttons */}
                    <div className={`flex items-center gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                        {isSection && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); addClause(node.id); }}
                                className="p-1 text-slate-400 hover:text-green-600"
                                title="Add Clause"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                            className="p-1 text-slate-400 hover:text-red-600"
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {isSection && isExpanded && node.children && (
                    <div>
                        {node.children.map((child) => renderTreeItem(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const renderEditor = () => {
        if (!activeNodeData) return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <FileText size={48} className="mb-4 opacity-20"/>
                <p>Select an item from the outline to edit</p>
            </div>
        );

        const { node } = activeNodeData;

        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                    <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                            node.type === 'SECTION' ? 'bg-amber-100 text-amber-700' : 
                            node.type === 'TABLE_REF' ? 'bg-purple-100 text-purple-700' : 
                            node.type === 'SIGNATURE' ? 'bg-rose-100 text-rose-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                            {node.type.replace('_', ' ')}
                        </span>
                        <h2 className="text-xl font-bold text-slate-900 mt-2">Edit Node</h2>
                    </div>
                    <button 
                        onClick={() => deleteNode(node.id)}
                        className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title / Label</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={node.label}
                            onChange={(e) => updateNode('label', e.target.value)}
                        />
                    </div>

                    {/* TABLE REFERENCE EDITOR */}
                    {node.type === 'TABLE_REF' && (
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                             <label className="block text-xs font-bold text-purple-900 uppercase mb-2 flex items-center">
                                 <TableIcon size={14} className="mr-2"/> Select Table to Display
                             </label>
                             <select 
                                className="w-full p-3 border border-purple-200 rounded-lg bg-white text-sm"
                                value={node.tableId || ''}
                                onChange={(e) => {
                                    const selectedId = e.target.value;
                                    const t = availableTables.find(t => t.id === selectedId);
                                    // Use updateNodeMulti to atomic update state to avoid race condition
                                    updateNodeMulti({
                                        tableId: selectedId,
                                        label: t ? `Table: ${t.title}` : 'Table Placeholder'
                                    });
                                }}
                             >
                                 <option value="">-- Choose a defined table --</option>
                                 {availableTables.map(t => (
                                     <option key={t.id} value={t.id}>{t.title}</option>
                                 ))}
                             </select>
                             {availableTables.length === 0 && (
                                 <p className="text-xs text-red-500 mt-2">No tables defined in "Tables" tab.</p>
                             )}
                        </div>
                    )}

                    {/* SIGNATURE EDITOR */}
                    {node.type === 'SIGNATURE' && (
                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-rose-900 uppercase mb-1">Closing Statement</label>
                                <textarea 
                                    className="w-full p-3 border border-rose-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none h-24 resize-none"
                                    value={node.closingStatement || ''}
                                    onChange={(e) => updateNode('closingStatement', e.target.value)}
                                    placeholder="I, <<FULLNAME>>, hereby agree..."
                                />
                                <p className="text-[10px] text-rose-700 mt-1">Variables like <code>{'<<FULLNAME>>'}</code> are supported.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-rose-900 uppercase mb-1">Company Signatory Name</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 border border-rose-200 rounded-lg text-sm bg-white"
                                    value={node.companySignatoryName || ''}
                                    onChange={(e) => updateNode('companySignatoryName', e.target.value)}
                                    placeholder="e.g. David Tjokrorahardjo or Authorized Representative"
                                />
                                <p className="text-[10px] text-rose-700 mt-1">This name appears under the physical signature line.</p>
                            </div>
                            
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-rose-600 rounded"
                                    checked={node.showCompanySignature}
                                    onChange={(e) => updateNode('showCompanySignature', e.target.checked)}
                                />
                                <span className="text-sm font-bold text-rose-900 flex items-center">
                                    <Building size={14} className="mr-2"/> Include Company Signature Block
                                </span>
                            </label>
                        </div>
                    )}

                    {/* CLAUSE EDITOR */}
                    {node.type === 'CLAUSE' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clause Content</label>
                                <textarea 
                                    className="w-full p-4 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none h-64 leading-relaxed resize-none"
                                    value={node.text || ''}
                                    onChange={(e) => updateNode('text', e.target.value)}
                                    placeholder="Enter the full legal text here..."
                                />
                                <p className="text-[10px] text-slate-400 mt-2">
                                    Tip: You can use placeholder variables like <code>{'{{MEMBER_NAME}}'}</code> or <code>{'{{FEES}}'}</code>.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="flex items-center cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50 w-full">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-blue-600 rounded"
                                        checked={node.isMandatory}
                                        onChange={(e) => updateNode('isMandatory', e.target.checked)}
                                    />
                                    <div className="ml-3">
                                        <span className="block text-sm font-bold text-slate-700">Mandatory Clause</span>
                                        <span className="block text-xs text-slate-500">Cannot be removed during contract generation.</span>
                                    </div>
                                </label>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full bg-white">
            
            {/* LEFT SIDEBAR: OUTLINE */}
            <div className="w-80 border-r border-slate-200 flex flex-col bg-white h-full shrink-0">
                <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50">
                    <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Document Outline</h3>
                    <div className="flex gap-1 justify-between">
                        <button onClick={addSection} className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 flex-1 flex justify-center" title="New Section">
                            <FolderOpen size={16} />
                        </button>
                        <button onClick={addTableBlock} className="p-1.5 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 flex-1 flex justify-center" title="Add Table">
                            <TableIcon size={16} />
                        </button>
                        <button onClick={addSignatureBox} className="p-1.5 bg-rose-100 text-rose-600 rounded hover:bg-rose-200 flex-1 flex justify-center" title="Add Signature">
                            <PenTool size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto py-2 custom-scrollbar group">
                    {data.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs">
                            Empty document.<br/>Use buttons above to add components.
                        </div>
                    ) : (
                        data.map((node) => renderTreeItem(node))
                    )}
                </div>
                <div className="p-3 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 text-center">
                    Drag items to reorder.
                </div>
            </div>

            {/* MAIN AREA */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                
                {/* Top Toolbar */}
                <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0 z-20">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('EDITOR')}
                            className={`flex items-center px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'EDITOR' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Edit3 size={14} className="mr-2"/> Editor
                        </button>
                        <button 
                            onClick={() => setViewMode('PREVIEW')} 
                            className={`flex items-center px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'PREVIEW' ? 'bg-white shadow text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Eye size={14} className="mr-2"/> Simple Preview
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative">
                    {viewMode === 'EDITOR' ? (
                        <div className="h-full overflow-y-auto p-8 bg-white">
                            {renderEditor()}
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-400">
                             Please use the main "Live Preview" on the right side of the Template Builder to see the full document with styles.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClauseMasterMindmap;
