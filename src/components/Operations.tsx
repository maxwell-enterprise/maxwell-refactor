
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
        <div className="page-container space-y-5 sm:space-y-6 animate-fade-in relative pb-24 min-w-0">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between min-w-0">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                        <ClipboardList className="shrink-0 text-blue-600" size={28} /> <span className="leading-tight">Operations Center</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm sm:text-base">Manage fulfillment, logistics, and workflows.</p>
                </div>
                
                {/* TAB SWITCHER */}
                <div className="w-full max-w-full shrink-0 overflow-x-scroll-touch rounded-lg bg-slate-100 p-1 lg:w-auto">
                    <div className="inline-flex max-w-none flex-nowrap gap-1">
                    <button type="button" onClick={() => setActiveTab('TASKS')} className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-bold rounded-md transition-all sm:px-4 ${activeTab === 'TASKS' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
                        Tasks
                    </button>
                    {canManageWorkflows && (
                        <button type="button" onClick={() => setActiveTab('WORKFLOWS')} className={`shrink-0 whitespace-nowrap inline-flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-all sm:px-4 ${activeTab === 'WORKFLOWS' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                            <GitMerge size={14} className="shrink-0"/> SOP Engine
                        </button>
                    )}
                    </div>
                </div>
            </div>

            {/* WORKFLOW MANAGER VIEW */}
            {activeTab === 'WORKFLOWS' && (
                <div className="min-h-[50vh] border border-slate-200 rounded-xl overflow-hidden shadow-sm sm:min-h-[480px] lg:min-h-[560px]">
                    <WorkflowManager />
                </div>
            )}

            {/* TASK LIST VIEW */}
            {activeTab === 'TASKS' && (
                <div className="space-y-4 sm:space-y-6 min-w-0">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                         <button type="button" onClick={loadData} className="touch-target p-2 text-slate-500 hover:bg-slate-100 rounded-lg sm:min-h-0 sm:min-w-0" aria-label="Refresh">
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <div className="overflow-x-scroll-touch max-w-full rounded-lg bg-slate-100 p-1">
                            <div className="inline-flex max-w-none flex-nowrap gap-0.5">
                            <button type="button" onClick={() => setFilterStatus('ACTIVE')} className={`shrink-0 whitespace-nowrap px-3 py-2 text-xs font-bold rounded sm:px-4 sm:py-1.5 ${filterStatus === 'ACTIVE' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Active</button>
                            <button type="button" onClick={() => setFilterStatus('COMPLETED')} className={`shrink-0 whitespace-nowrap px-3 py-2 text-xs font-bold rounded sm:px-4 sm:py-1.5 ${filterStatus === 'COMPLETED' ? 'bg-white shadow text-green-700' : 'text-slate-500'}`}>Completed</button>
                            <button type="button" onClick={() => setFilterStatus('ALL')} className={`shrink-0 whitespace-nowrap px-3 py-2 text-xs font-bold rounded sm:px-4 sm:py-1.5 ${filterStatus === 'ALL' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>All</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {loading ? <div className="text-center py-12 text-slate-400">Loading operations...</div> :
                        filteredChecklists.length === 0 ? <div className="text-center py-12 text-slate-400">No checklists found.</div> :
                        filteredChecklists.map(checklist => {
                            const isExpanded = expandedIds.has(checklist.id);
                            return (
                                <div key={checklist.id} className="min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                                    {/* Header (Click to Expand) */}
                                    <div 
                                        className="cursor-pointer bg-white p-3 hover:bg-slate-50/50 sm:p-4"
                                        onClick={() => toggleExpand(checklist.id)}
                                    >
                                        <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                            <div className={`shrink-0 rounded-full p-2.5 sm:p-3 ${checklist.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <Package size={20} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-[15px] font-bold leading-snug text-slate-900 sm:text-sm">{checklist.productName}</h3>
                                                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${checklist.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                        {checklist.status}
                                                    </span>
                                                </div>
                                                <p className="mt-1.5 break-words text-[13px] leading-relaxed text-slate-600 sm:text-xs">
                                                    <span className="text-slate-500">Member:</span>{' '}
                                                    <span className="font-semibold text-slate-800">{checklist.memberName}</span>
                                                    <span className="text-slate-400"> · </span>
                                                    <span className="text-slate-500">Ref:</span>{' '}
                                                    <span className="font-mono text-[12px] text-slate-700 break-all sm:text-xs">{checklist.transactionId}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 items-center justify-between gap-4 pl-[52px] min-[480px]:justify-end min-[480px]:pl-0">
                                            <div className="min-w-0 flex-1 text-left min-[480px]:flex-none min-[480px]:text-right">
                                                <div className="text-xs font-bold text-slate-700">{checklist.progress}% Done</div>
                                                <div className="mt-1 h-1.5 max-w-[10rem] overflow-hidden rounded-full bg-slate-100 min-[480px]:ml-auto min-[480px]:w-24">
                                                    <div className="h-full bg-blue-500 transition-all duration-500" style={{width: `${checklist.progress}%`}}></div>
                                                </div>
                                            </div>
                                            <button type="button" className="shrink-0 text-slate-400" aria-expanded={isExpanded} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                                                {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                            </button>
                                        </div>
                                        </div>
                                    </div>

                                    {/* Task List (Accordion Body) */}
                                    {isExpanded && (
                                        <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/30">
                                            {checklist.tasks.map(task => (
                                                <div key={task.id} className="flex flex-col gap-3 p-4 pl-4 transition-colors hover:bg-slate-50 sm:pl-12 md:flex-row md:items-center md:justify-between lg:pl-16">
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
