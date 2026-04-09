
import React, { useEffect, useState } from 'react';
import { TaskService, UnifiedTask } from '../services/taskService';
import { OpsService } from '../services/opsService';
import { SupportService } from '../services/supportService';
import { OpsTask, OpsTaskStatus } from '../types/ops';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { markRbacInboxRead } from '../lib/rbacInboxClient';
import { 
    ClipboardList, LifeBuoy, CheckCircle2, Bell,
    RefreshCw, Search, ChevronRight
} from 'lucide-react';
import TaskActionModal from './ops/TaskActionModal';
import TicketResolutionModal from './support/TicketResolutionModal';

const MyTasks: React.FC = () => {
  const { userRole, logout } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedOpsTask, setSelectedOpsTask] = useState<OpsTask | null>(null);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<UnifiedTask | null>(null);

  const loadTasks = async () => {
      setLoading(true);
      try {
          const data = await TaskService.getMyTasks(userRole);
          setTasks(data);
      } catch (error) {
          console.error('[MyTasks] Failed to load tasks:', error);
          showToast('Failed to load Action Center data', 'error');
          setTasks([]);
      }
      setLoading(false);
  };

  useEffect(() => {
      loadTasks();
  }, [userRole]);

  const handleTaskClick = async (task: UnifiedTask) => {
      const inboxId = task.metadata?.rbacInboxId;
      if (task.source === 'SYSTEM' && inboxId) {
          await markRbacInboxRead(inboxId);
          showToast(
              'Akun Anda diarahkan ke RBAC: kami mengeluarkan sesi ini supaya login berikutnya memuat role baru.',
              'info',
          );
          await logout();
          return;
      }
      if (task.source === 'OPS' && task.metadata?.checklistId) {
          const checklist = await OpsService.getChecklistById(task.metadata.checklistId);
          if (checklist) {
              const realTask = checklist.tasks.find(t => t.id === task.id);
              if (realTask) {
                  setSelectedChecklistId(checklist.id);
                  setSelectedOpsTask(realTask);
              }
          }
      } else if (task.source === 'SUPPORT') {
          setSelectedTicket(task);
      }
  };

  const handleOpsTaskUpdate = async (taskId: string, status: OpsTaskStatus, note: string) => {
      if (!selectedChecklistId) return;
      const updated = await OpsService.updateTaskStatus(selectedChecklistId, taskId, status, userRole, note);
      if (updated) {
          showToast(`Task ${status.toLowerCase()} successfully`, 'success');
          loadTasks();
      }
  };

  const handleTicketResolve = async (taskId: string, resolution: string) => {
      await SupportService.resolveTicket(taskId, resolution);
      showToast("Ticket resolved and member notified", "success");
      setSelectedTicket(null);
      loadTasks();
  };

  const filteredTasks = tasks.filter(t => 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.metadata?.memberName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSourceStyle = (source: string) => {
      switch(source) {
          case 'OPS': return 'bg-blue-50 text-blue-600 border-blue-100';
          case 'SUPPORT': return 'bg-amber-50 text-amber-600 border-amber-100';
          case 'SYSTEM': return 'bg-violet-50 text-violet-700 border-violet-100';
          default: return 'bg-slate-50 text-slate-600 border-slate-100';
      }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in pb-24">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="text-blue-600" /> My Action Center
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    {tasks.length} critical items require your immediate attention.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search tasks..." 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button onClick={loadTasks} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors">
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
                Array.from({length: 4}).map((_, i) => <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse"></div>)
            ) : filteredTasks.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="p-4 bg-slate-50 rounded-full mb-4"><CheckCircle2 size={48} className="text-slate-200"/></div>
                    <p className="font-bold text-slate-600">Zero Pending Tasks</p>
                    <p className="text-sm">Enjoy the productivity, you're all caught up!</p>
                </div>
            ) : (
                filteredTasks.map(task => (
                    <div 
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer relative overflow-hidden flex flex-col"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${getSourceStyle(task.source)}`}>
                                {task.source === 'OPS' && <ClipboardList size={12} className="mr-1"/>}
                                {task.source === 'SUPPORT' && <LifeBuoy size={12} className="mr-1"/>}
                                {task.source === 'SYSTEM' && <Bell size={12} className="mr-1"/>}
                                {task.source}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${task.priority === 'HIGH' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                {task.priority} PRIORITY
                            </span>
                        </div>

                        <div className="mb-4 flex-1">
                            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                                {task.title.replace('Ticket: ', '')}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                {task.description}
                            </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                                    {task.metadata?.memberName?.substring(0,1)}
                                </div>
                                <div className="text-[10px] font-medium text-slate-500">
                                    {task.metadata?.memberName || 'System'}
                                </div>
                            </div>
                            <div className="flex items-center text-blue-600 text-xs font-bold gap-1 group-hover:gap-2 transition-all">
                                Process <ChevronRight size={14} />
                            </div>
                        </div>

                        <div className={`absolute bottom-0 left-0 h-1 bg-blue-600 transition-all duration-300 ${task.status === 'IN_PROGRESS' ? 'w-1/2' : 'w-0 group-hover:w-full'}`}></div>
                    </div>
                ))
            )}
        </div>

        {selectedOpsTask && (
            <TaskActionModal 
                task={selectedOpsTask} 
                onClose={() => { setSelectedOpsTask(null); setSelectedChecklistId(null); }}
                onUpdateStatus={handleOpsTaskUpdate}
                currentUserRole={userRole}
            />
        )}

        {selectedTicket && (
            <TicketResolutionModal 
                task={selectedTicket}
                onClose={() => setSelectedTicket(null)}
                onResolve={handleTicketResolve}
            />
        )}
    </div>
  );
};

export default MyTasks;
