
import React, { useState, useEffect } from 'react';
import { OpsTemplate, OpsTemplateItem, SystemTriggerType, OpsTaskType } from '../../../types/ops';
import { UserRole } from '../../../types/index';
import { AUTOMATION_CATALOG } from '../../../constants/opsCatalog';
import { STORE_PRODUCTS } from '../../../constants';
import { Save, Plus, Trash2, ArrowDown, Settings, Zap, Briefcase, Clock, GripVertical, CheckCircle2 } from 'lucide-react';

interface WorkflowEditorProps {
    template: OpsTemplate;
    onSave: (tpl: OpsTemplate) => void;
    onCancel: () => void;
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ template, onSave, onCancel }) => {
    // Deep copy to prevent mutation issues
    const [formData, setFormData] = useState<OpsTemplate>(JSON.parse(JSON.stringify(template)));

    // FIX: Use functional update pattern to ensure array reliability
    const handleAddItem = () => {
        const newItem: OpsTemplateItem = {
            id: `item-${Date.now()}`,
            title: 'New Process Step',
            description: '',
            type: 'MANUAL',
            scope: 'USER_LEVEL',
            assignedRole: UserRole.OPERATIONS,
            isBlocking: true,
            slaHours: 24
        };
        
        setFormData(prev => {
            const updatedItems = [...(prev.items || []), newItem]; // Safe spread
            return {
                ...prev,
                items: updatedItems
            };
        });
    };

    const handleRemoveItem = (idx: number) => {
        setFormData(prev => {
            const newItems = [...prev.items];
            newItems.splice(idx, 1);
            return { ...prev, items: newItems };
        });
    };

    const updateItem = (idx: number, field: keyof OpsTemplateItem, value: any) => {
        setFormData(prev => {
            const newItems = [...prev.items];
            // Safe object merge for the item at index
            newItems[idx] = { ...newItems[idx], [field]: value };
            return { ...prev, items: newItems };
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center">
                        <Settings className="mr-2 text-slate-500" /> 
                        {formData.id ? 'Edit Workflow' : 'New Workflow'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Define Standard Operating Procedures (SOP)</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button onClick={() => onSave(formData)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex items-center">
                        <Save size={16} className="mr-2"/> Save Workflow
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
                
                {/* LEFT: Config */}
                <div className="w-1/3 bg-white border-r border-slate-200 p-6 overflow-y-auto">
                    <h3 className="font-bold text-slate-800 mb-4 uppercase text-xs tracking-wider">Trigger Logic</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Workflow Name</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="e.g. New Member Onboarding"
                            />
                        </div>
                        
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">When to start this SOP?</label>
                            <div className="flex bg-white p-1 rounded-lg mb-3 border border-slate-200">
                                <button 
                                    onClick={() => setFormData({...formData, triggerType: 'PRODUCT_PURCHASE'})}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded ${formData.triggerType === 'PRODUCT_PURCHASE' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Product Purchase
                                </button>
                                <button 
                                    onClick={() => setFormData({...formData, triggerType: 'SYSTEM_EVENT'})}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded ${formData.triggerType === 'SYSTEM_EVENT' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    System Event
                                </button>
                            </div>

                            {formData.triggerType === 'PRODUCT_PURCHASE' ? (
                                <select 
                                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.triggerProductId}
                                    onChange={e => setFormData({...formData, triggerProductId: e.target.value})}
                                >
                                    <option value="ALL">Any Product</option>
                                    {STORE_PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                            ) : (
                                <select 
                                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                                    value={formData.triggerEventId}
                                    onChange={e => setFormData({...formData, triggerEventId: e.target.value as any})}
                                >
                                    <option value="">-- Select Event --</option>
                                    {AUTOMATION_CATALOG.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            )}
                            <p className="text-[10px] text-slate-400 mt-2 leading-snug">
                                This workflow will automatically generate a checklist in "Ops Center" when this event occurs.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                            <textarea 
                                className="w-full p-2 border border-slate-300 rounded text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                placeholder="Describe the goal of this SOP..."
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                checked={formData.isActive}
                                onChange={e => setFormData({...formData, isActive: e.target.checked})}
                            />
                            <span className="text-sm font-bold text-slate-700">Workflow Active</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Steps Builder */}
                <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
                    <div className="max-w-2xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Operational Steps</h3>
                            <button 
                                onClick={handleAddItem} 
                                className="bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-50 flex items-center transition-colors"
                            >
                                <Plus size={14} className="mr-1"/> Add Step
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.items.map((item, idx) => (
                                <div key={item.id} className="relative group animate-fade-in-up">
                                    {idx > 0 && (
                                        <div className="absolute -top-4 left-6 h-4 w-0.5 bg-slate-300 z-0"></div>
                                    )}
                                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative z-10 hover:shadow-md transition-shadow">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col items-center gap-2 pt-1">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold border border-slate-200">
                                                    {idx + 1}
                                                </div>
                                                <GripVertical size={16} className="text-slate-300 cursor-move hover:text-slate-500"/>
                                            </div>
                                            
                                            <div className="flex-1 space-y-3">
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        className="flex-1 font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none transition-colors"
                                                        value={item.title}
                                                        onChange={e => updateItem(idx, 'title', e.target.value)}
                                                        placeholder="Task Title"
                                                    />
                                                    <button onClick={() => handleRemoveItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                
                                                <input 
                                                    type="text" 
                                                    className="w-full text-xs text-slate-500 border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none transition-colors"
                                                    value={item.description}
                                                    onChange={e => updateItem(idx, 'description', e.target.value)}
                                                    placeholder="Detailed instructions for the assignee..."
                                                />

                                                <div className="grid grid-cols-3 gap-3 pt-2">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center"><Zap size={10} className="mr-1"/> Type</label>
                                                        <select 
                                                            className="w-full text-xs border border-slate-200 rounded p-1.5 bg-slate-50 cursor-pointer"
                                                            value={item.type}
                                                            onChange={e => updateItem(idx, 'type', e.target.value)}
                                                        >
                                                            <option value="MANUAL">Manual Task</option>
                                                            <option value="AUTOMATED">System Automation</option>
                                                            <option value="CUSTOMER_WAITING">Wait Customer</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center"><Briefcase size={10} className="mr-1"/> Assignee</label>
                                                        <select 
                                                            className="w-full text-xs border border-slate-200 rounded p-1.5 bg-slate-50 cursor-pointer"
                                                            value={item.assignedRole}
                                                            onChange={e => updateItem(idx, 'assignedRole', e.target.value)}
                                                            disabled={item.type === 'AUTOMATED'}
                                                        >
                                                            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center"><Clock size={10} className="mr-1"/> SLA (Hrs)</label>
                                                        <input 
                                                            type="number" 
                                                            className="w-full text-xs border border-slate-200 rounded p-1.5"
                                                            value={item.slaHours || 24}
                                                            onChange={e => updateItem(idx, 'slaHours', Number(e.target.value))}
                                                            disabled={item.type === 'AUTOMATED'}
                                                        />
                                                    </div>
                                                </div>

                                                {item.type === 'AUTOMATED' && (
                                                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mt-2">
                                                        <label className="text-[10px] font-bold text-purple-700 uppercase mb-1 flex items-center">
                                                            <Zap size={10} className="mr-1"/> Select System Action Trigger
                                                        </label>
                                                        <select 
                                                            className="w-full text-xs border border-purple-200 rounded p-2 text-purple-900 bg-white cursor-pointer"
                                                            value={item.systemTrigger}
                                                            onChange={e => updateItem(idx, 'systemTrigger', e.target.value)}
                                                        >
                                                            <option value="">-- When should this auto-complete? --</option>
                                                            {AUTOMATION_CATALOG.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                                        </select>
                                                        <div className="text-[10px] text-purple-600 mt-1 flex items-center">
                                                            <CheckCircle2 size={10} className="mr-1"/> 
                                                            Explanation: When the selected event occurs (e.g. Payment Received), this specific task step will be marked as DONE automatically, moving the workflow forward.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {idx < formData.items.length - 1 && (
                                        <div className="flex justify-center my-2">
                                            <ArrowDown size={16} className="text-slate-300" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            {formData.items.length === 0 && (
                                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 bg-slate-50/50">
                                    <p className="text-sm font-bold">No steps defined.</p>
                                    <p className="text-xs mt-1">Click "Add Step" above to start building the process.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowEditor;
