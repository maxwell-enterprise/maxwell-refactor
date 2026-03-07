
import React, { useState, useEffect } from 'react';
import { OpsService } from '../services/opsService';
import { OpsChecklist, OpsTask, OpsTaskStatus } from '../types/ops';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, CheckCircle2, Clock, AlertCircle, RefreshCw, Filter, GitMerge, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { UserRole } from '../types/index';
import WorkflowManager from './operations/workflows/WorkflowManager';
import OpsActionWidget from './ops/OpsActionWidget';

const Operations: React.FC = () => {
    const { userRole } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'TASKS' | 'WORKFLOWS'>('TASKS');
    
    // Task State
    const [checklists, setChecklists] = useState<OpsChecklist[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ACTIVE');
    
    // Expanded Accordion State
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const canManageWorkflows = [UserRole.SUPER_ADMIN, UserRole.OPERATIONS].includes(userRole);

    useEffect(() => {
        if (activeTab === 'TASKS') loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        const data = await OpsService.getChecklists();
        setChecklists(data);
        setLoading(false);
    };

    const handleTaskUpdate = async (checklistId: string, taskId: string, status: OpsTaskStatus, note: string) => {
        await OpsService.updateTaskStatus(checklistId, taskId, status, userRole, note);
        showToast('Task updated', 'success');
        loadData();
    };

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const filteredChecklists = checklists.filter(c => 
        filterStatus === 'ALL' || c.status === filterStatus
    ).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const getStatusColor = (status: string) => {
        if (status === 'COMPLETED') return 'text-green-600 bg-green-50 border-green-100';
        if (status === 'IN_PROGRESS') return 'text-blue-600 bg-blue-50 border-blue-100';
        if (status === 'PENDING') return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-slate-500 bg-slate-50 border-slate-100';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in relative pb-24">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <ClipboardList className="mr-3 text-blue-600" /> Operations Center
                    </h1>
                    <p className="text-slate-500 mt-1">Manage fulfillment, logistics, and workflows.</p>
                </div>
                
                {/* TAB SWITCHER */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('TASKS')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'TASKS' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
                        Tasks
                    </button>
                    {canManageWorkflows && (
                        <button onClick={() => setActiveTab('WORKFLOWS')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center ${activeTab === 'WORKFLOWS' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                            <GitMerge size={14} className="mr-2"/> SOP Engine
                        </button>
                    )}
                </div>
            </div>

            {/* WORKFLOW MANAGER VIEW */}
            {activeTab === 'WORKFLOWS' && (
                <div className="h-[calc(100vh-200px)] border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <WorkflowManager />
                </div>
            )}

            {/* TASK LIST VIEW */}
            {activeTab === 'TASKS' && (
                <div className="space-y-6">
                    <div className="flex justify-end gap-2">
                         <button onClick={loadData} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setFilterStatus('ACTIVE')} className={`px-4 py-1.5 text-xs font-bold rounded ${filterStatus === 'ACTIVE' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Active</button>
                            <button onClick={() => setFilterStatus('COMPLETED')} className={`px-4 py-1.5 text-xs font-bold rounded ${filterStatus === 'COMPLETED' ? 'bg-white shadow text-green-700' : 'text-slate-500'}`}>Completed</button>
                            <button onClick={() => setFilterStatus('ALL')} className={`px-4 py-1.5 text-xs font-bold rounded ${filterStatus === 'ALL' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>All</button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {loading ? <div className="text-center py-12 text-slate-400">Loading operations...</div> :
                        filteredChecklists.length === 0 ? <div className="text-center py-12 text-slate-400">No checklists found.</div> :
                        filteredChecklists.map(checklist => {
                            const isExpanded = expandedIds.has(checklist.id);
                            return (
                                <div key={checklist.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                                    {/* Header (Click to Expand) */}
                                    <div 
                                        className="p-4 bg-white flex justify-between items-center cursor-pointer hover:bg-slate-50/50"
                                        onClick={() => toggleExpand(checklist.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-full ${checklist.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <Package size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-slate-900 text-sm">{checklist.productName}</h3>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${checklist.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                        {checklist.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Member: <span className="font-semibold text-slate-700">{checklist.memberName}</span> • Ref: {checklist.transactionId}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right hidden md:block">
                                                <div className="text-xs font-bold text-slate-700">{checklist.progress}% Done</div>
                                                <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                    <div className="h-full bg-blue-500 transition-all duration-500" style={{width: `${checklist.progress}%`}}></div>
                                                </div>
                                            </div>
                                            <button className="text-slate-400">
                                                {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Task List (Accordion Body) */}
                                    {isExpanded && (
                                        <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/30">
                                            {checklist.tasks.map(task => (
                                                <div key={task.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-colors pl-16">
                                                    <div className="flex-1 mb-2 md:mb-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className={`font-bold text-sm ${task.status === 'COMPLETED' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                                                {task.title}
                                                            </h4>
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${task.type === 'AUTOMATED' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                                {task.type === 'CUSTOMER_WAITING' ? 'Customer' : task.type}
                                                            </span>
                                                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                                                                {task.assignedRole}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500">{task.description}</p>
                                                        {task.logs.length > 0 && (
                                                            <div className="mt-1 text-[10px] text-slate-400 italic">
                                                                Last update: {new Date(task.logs[task.logs.length-1].timestamp).toLocaleString()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* ACTION WIDGET */}
                                                    <div>
                                                        <OpsActionWidget 
                                                            task={task}
                                                            checklistContext={{
                                                                id: checklist.id,
                                                                memberId: checklist.memberId,
                                                                memberName: checklist.memberName,
                                                                productName: checklist.productName
                                                            }}
                                                            userRole={userRole}
                                                            onUpdate={(tid, stat, note) => handleTaskUpdate(checklist.id, tid, stat, note)}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Operations;
