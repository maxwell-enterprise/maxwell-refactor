
import React, { useState } from 'react';
import { OpsTask, OpsTaskStatus } from '../../types/ops';
import { ContractService } from '../../services/contractService';
import { X, CheckCircle, Clock, User, FileText, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface TaskActionModalProps {
  task: OpsTask;
  onClose: () => void;
  onUpdateStatus: (taskId: string, status: OpsTaskStatus, note: string) => void;
  currentUserRole: string;
}

const TaskActionModal: React.FC<TaskActionModalProps> = ({ task, onClose, onUpdateStatus, currentUserRole }) => {
  const { showToast } = useToast();
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NEW: Check if this task relates to contracts
  const isContractTask = task.title.toLowerCase().includes('contract') || task.description.toLowerCase().includes('contract');

  const handleSubmit = (status: OpsTaskStatus) => {
      if (!note && status !== 'IN_PROGRESS') {
          alert("Please provide a logbook note for this action.");
          return;
      }
      setIsSubmitting(true);
      setTimeout(() => {
          onUpdateStatus(task.id, status, note);
          setIsSubmitting(false);
          onClose();
      }, 800);
  };

  const handleGenerateContract = async () => {
      // Mock logic: Create contract for the member associated with this task context
      setIsSubmitting(true);
      try {
          await ContractService.createInstance(
              'PKG-MLCT-2026', // Mock product ID, in real app this comes from task metadata
              'M002', 
              'TRX-9988',
              30000000
          );
          setNote('Contract Generated and Published to Member Portal.');
          showToast('Contract Generated Successfully', 'success');
      } catch (e) {
          showToast('Failed to generate contract', 'error');
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                    <h3 className="font-bold text-slate-900 text-lg">{task.title}</h3>
                    <p className="text-xs text-slate-500 font-mono">{task.id}</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200"><X size={20}/></button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="mb-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Instructions</h4>
                    <p className="text-sm text-slate-700 bg-blue-50 p-3 rounded-lg border border-blue-100 leading-relaxed">
                        {task.description}
                    </p>
                </div>

                {isContractTask && task.status !== 'COMPLETED' && (
                    <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50 rounded-xl text-center">
                        <FileText size={24} className="mx-auto text-indigo-500 mb-2"/>
                        <h4 className="font-bold text-indigo-900 text-sm">Contract Automation</h4>
                        <p className="text-xs text-indigo-700 mb-3">One-click generate standard agreement for this order.</p>
                        <button 
                            onClick={handleGenerateContract} 
                            disabled={isSubmitting}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin inline mr-1"/> : 'Generate & Publish'}
                        </button>
                    </div>
                )}

                <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700">Execution Logbook</label>
                    <textarea 
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                        placeholder="Describe what action you took..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    ></textarea>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <button onClick={() => handleSubmit('IN_PROGRESS')} className="text-blue-600 text-sm font-bold hover:underline">
                    Mark In Progress
                </button>
                <button 
                    onClick={() => handleSubmit('COMPLETED')}
                    disabled={isSubmitting || !note}
                    className="bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-800 shadow-lg flex items-center disabled:opacity-50"
                >
                    <CheckCircle size={16} className="mr-2"/> Complete Task
                </button>
            </div>
        </div>
    </div>
  );
};

export default TaskActionModal;
