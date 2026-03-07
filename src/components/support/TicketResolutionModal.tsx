
import React, { useState } from 'react';
import { UnifiedTask } from '../../services/taskService';
import { X, CheckCircle, MessageSquare, AlertCircle, Send, User, LifeBuoy } from 'lucide-react';

interface TicketResolutionModalProps {
  task: UnifiedTask;
  onClose: () => void;
  onResolve: (taskId: string, resolution: string) => void;
}

const TicketResolutionModal: React.FC<TicketResolutionModalProps> = ({ task, onClose, onResolve }) => {
  const [resolution, setResolution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolution.trim()) return;
    
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
        onResolve(task.id, resolution);
        setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-amber-50">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-amber-600 shadow-sm"><LifeBuoy size={20}/></div>
                <div>
                    <h3 className="font-bold text-slate-900">Resolve Support Ticket</h3>
                    <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">{task.id}</p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-white/50 transition-all"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-6">
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Issue Description</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${task.priority === 'HIGH' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                        {task.priority} Priority
                    </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{task.title.replace('Ticket: ', '')}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{task.description}</p>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                            {task.metadata?.memberName?.substring(0,1)}
                        </div>
                        <span className="text-xs font-medium text-slate-500">{task.metadata?.memberName}</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <MessageSquare size={16} className="text-blue-600"/> Resolution Summary
                    </label>
                    <textarea 
                        required
                        className="w-full border border-slate-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none shadow-inner"
                        placeholder="Explain how this issue was resolved..."
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                    ></textarea>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5"/>
                    <p className="text-[11px] text-blue-700 leading-tight">
                        Closing this ticket will notify the member via email and mark the case as RESOLVED in the CRM.
                    </p>
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                    <button 
                        type="submit" 
                        disabled={isSubmitting || !resolution.trim()}
                        className="flex-[2] bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg flex items-center justify-center disabled:opacity-50 transition-all"
                    >
                        {isSubmitting ? 'Closing Ticket...' : <><CheckCircle size={18} className="mr-2"/> Mark as Resolved</>}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default TicketResolutionModal;
