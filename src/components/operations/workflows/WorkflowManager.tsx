
import React, { useState, useEffect } from 'react';
import { WorkflowService } from '../../../services/workflowService';
import { OpsTemplate } from '../../../types/ops';
import { useToast } from '../../../context/ToastContext';
import { Plus, GitMerge, Edit3, Trash2, Power, Zap, Copy } from 'lucide-react';
import WorkflowEditor from './WorkflowEditor';

const WorkflowManager: React.FC = () => {
    const { showToast } = useToast();
    const [templates, setTemplates] = useState<OpsTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<OpsTemplate | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await WorkflowService.getTemplates();
        setTemplates(data);
        setLoading(false);
    };

    const handleCreate = () => {
        const newTemplate: OpsTemplate = {
            id: '', // Will be assigned on save
            name: 'New SOP Workflow',
            triggerType: 'PRODUCT_PURCHASE',
            triggerProductId: 'ALL',
            items: [],
            isActive: true
        };
        setEditingTemplate(newTemplate);
    };

    const handleSave = async (tpl: OpsTemplate) => {
        const toSave = {
            ...tpl,
            id: tpl.id || `TPL-${Date.now()}`
        };
        await WorkflowService.saveTemplate(toSave);
        showToast('Workflow saved successfully', 'success');
        setEditingTemplate(null);
        loadData();
    };

    const handleDuplicate = async (id: string) => {
        await WorkflowService.duplicateTemplate(id);
        showToast('Workflow duplicated successfully', 'success');
        loadData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this workflow?')) return;
        await WorkflowService.deleteTemplate(id);
        showToast('Workflow deleted', 'info');
        loadData();
    };

    if (editingTemplate) {
        return (
            <WorkflowEditor 
                template={editingTemplate} 
                onSave={handleSave} 
                onCancel={() => setEditingTemplate(null)} 
            />
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center">
                        <GitMerge className="mr-3 text-blue-600" /> SOP Workflow Engine
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Automate task creation based on business events.</p>
                </div>
                <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center hover:bg-blue-700 shadow-sm">
                    <Plus size={16} className="mr-2"/> Create Workflow
                </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                {loading ? <p className="text-slate-400">Loading workflows...</p> : 
                 templates.map(tpl => (
                    <div key={tpl.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start mb-3">
                            <div className={`p-2 rounded-lg ${tpl.triggerType === 'SYSTEM_EVENT' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                                <Zap size={20} />
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${tpl.isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                {tpl.isActive ? 'ACTIVE' : 'DRAFT'}
                            </span>
                        </div>
                        
                        <h3 className="font-bold text-slate-900 mb-1">{tpl.name}</h3>
                        <p className="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[32px]">{tpl.description || 'No description provided.'}</p>
                        
                        <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                            <div className="text-slate-600 font-medium">
                                Trigger: <span className="text-slate-800 font-bold">{tpl.triggerType === 'SYSTEM_EVENT' ? tpl.triggerEventId : (tpl.triggerProductId === 'ALL' ? 'Any Product' : 'Specific Product')}</span>
                            </div>
                            <div className="text-slate-400 font-mono">
                                {tpl.items.length} Steps
                            </div>
                        </div>

                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDuplicate(tpl.id)} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200" title="Duplicate">
                                <Copy size={16}/>
                            </button>
                            <button onClick={() => setEditingTemplate(tpl)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Edit">
                                <Edit3 size={16}/>
                            </button>
                            <button onClick={() => handleDelete(tpl.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Delete">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WorkflowManager;
