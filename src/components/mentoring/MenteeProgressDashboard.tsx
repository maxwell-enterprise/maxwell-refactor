
import React from 'react';
import { MentoringSession, ActionItem } from '../../types/mentoring';
import { CheckCircle2, Circle, Target, Rocket, ClipboardCheck, TrendingUp, Sparkles } from 'lucide-react';
import { MentoringService } from '../../services/mentoringService'; // Import Service

interface MenteeProgressDashboardProps {
  session: MentoringSession;
  onToggleAction: (id: string) => void; // Parent updater
}

const MenteeProgressDashboard: React.FC<MenteeProgressDashboardProps> = ({ session, onToggleAction }) => {
  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);

  const handleToggle = async (actionId: string) => {
      // Call service to persist
      await MentoringService.toggleActionItem(session.id, actionId);
      // Trigger parent update for UI
      onToggleAction(actionId);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. PROGRESS SCORE CARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp size={120} /></div>
        <div className="flex justify-between items-end mb-4">
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth Progress</p>
                <h3 className="text-3xl font-bold text-slate-900">{session.progressScore}%</h3>
            </div>
            <div className="text-right">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg flex items-center">
                    <Sparkles size={12} className="mr-1"/> Level 2 Mentee
                </span>
            </div>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{width: `${session.progressScore}%`}}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. ACTION PLAN (The Living Checklist) */}
        <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 px-1">
                <ClipboardCheck size={20} className="text-indigo-600" /> Action Roadmap
            </h3>
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
                {session.actionPlan.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <Rocket size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm">No action items yet. Start a session with your AI Mentor!</p>
                    </div>
                ) : (
                    session.actionPlan.map(item => (
                        <div key={item.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors group">
                            <button onClick={() => handleToggle(item.id)} className="mt-0.5 shrink-0 transition-transform active:scale-90">
                                {item.status === 'COMPLETED' ? (
                                    <CheckCircle2 size={24} className="text-green-500" />
                                ) : (
                                    <Circle size={24} className="text-slate-300 group-hover:text-blue-400" />
                                )}
                            </button>
                            <div className="flex-1">
                                <p className={`text-sm font-medium ${item.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                    {item.task}
                                </p>
                                <div className="flex gap-3 mt-1.5">
                                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{item.category}</span>
                                    {item.dueDate && <span className="text-[10px] text-slate-400">Due: {item.dueDate}</span>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* 3. DISTILLED WISDOM (Memory Summary) */}
        <div className="space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 px-1">
                <Target size={20} className="text-amber-500" /> Core Commitments
            </h3>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-inner">
                <div className="prose prose-sm text-amber-900 leading-relaxed italic">
                    {session.memory.distilledContext ? (
                        <div className="whitespace-pre-wrap">{session.memory.distilledContext}</div>
                    ) : (
                        <p className="text-amber-600/60 text-center">Your growth points will appear here as you chat.</p>
                    )}
                </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-1">Mentor's Perspective</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                    "Growth happens outside the comfort zone. Your commitment to scaling is the first step to true influence."
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MenteeProgressDashboard;
