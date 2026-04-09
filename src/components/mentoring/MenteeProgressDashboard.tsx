
import React from 'react';
import { MentoringSession } from '../../types/mentoring';
import { CheckCircle2, Circle, Target, Rocket, ClipboardCheck, TrendingUp, Sparkles } from 'lucide-react';
import { MentoringService } from '../../services/mentoringService'; // Import Service

interface MenteeProgressDashboardProps {
  session: MentoringSession;
  onToggleAction: (id: string) => void;
  /** When set, desktop shows a 3-column workbench: Action Roadmap | Core Commitments | chat (matches Success Toolkit layout). */
  chatSlot?: React.ReactNode;
}

const MenteeProgressDashboard: React.FC<MenteeProgressDashboardProps> = ({ session, onToggleAction, chatSlot }) => {
  const handleToggle = async (actionId: string) => {
      // Call service to persist
      await MentoringService.toggleActionItem(session.id, actionId);
      // Trigger parent update for UI
      onToggleAction(actionId);
  };

  const roadmapBlock = (
    <div className="min-w-0 space-y-4">
      <h3 className="flex items-center gap-2 px-1 font-bold text-slate-900">
        <ClipboardCheck size={20} className="shrink-0 text-indigo-600" /> Action Roadmap
      </h3>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        {session.actionPlan.length === 0 ? (
          <div className="p-10 text-center text-slate-400 sm:p-12">
            <Rocket size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">No action items yet. Start a session with your AI Mentor!</p>
          </div>
        ) : (
          session.actionPlan.map((item) => (
            <div key={item.id} className="group flex items-start gap-4 p-4 transition-colors hover:bg-slate-50">
              <button type="button" onClick={() => handleToggle(item.id)} className="mt-0.5 shrink-0 transition-transform active:scale-90">
                {item.status === 'COMPLETED' ? (
                  <CheckCircle2 size={24} className="text-green-500" />
                ) : (
                  <Circle size={24} className="text-slate-300 group-hover:text-blue-400" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${item.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {item.task}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-3">
                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-500">{item.category}</span>
                  {item.dueDate && <span className="text-[10px] text-slate-400">Due: {item.dueDate}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const coreBlock = (
    <div className="min-w-0 space-y-4">
      <h3 className="flex items-center gap-2 px-1 font-bold text-slate-900">
        <Target size={20} className="shrink-0 text-amber-500" /> Core Commitments
      </h3>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-inner">
        <div className="prose prose-sm italic leading-relaxed text-amber-900">
          {session.memory.distilledContext ? (
            <div className="whitespace-pre-wrap">{session.memory.distilledContext}</div>
          ) : (
            <p className="text-center text-amber-600/60">Your growth points will appear here as you chat.</p>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-800">Mentor&apos;s Perspective</p>
        <p className="text-xs leading-relaxed text-blue-600">
          &quot;Growth happens outside the comfort zone. Your commitment to scaling is the first step to true influence.&quot;
        </p>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="absolute right-0 top-0 p-4 opacity-5">
          <TrendingUp size={120} />
        </div>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Growth Progress</p>
            <h3 className="text-3xl font-bold text-slate-900">{session.progressScore}%</h3>
          </div>
          <span className="flex items-center rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
            <Sparkles size={12} className="mr-1" /> Level 2 Mentee
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            style={{ width: `${session.progressScore}%` }}
          />
        </div>
      </div>

      {chatSlot ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-5 xl:gap-6">
          <div className="min-w-0 lg:col-span-6">{roadmapBlock}</div>
          <div className="min-w-0 lg:col-span-3">{coreBlock}</div>
          <div className="flex min-h-[28rem] w-full min-w-0 flex-col lg:col-span-3 lg:min-h-[min(36rem,calc(100vh-12rem))] lg:sticky lg:top-4 lg:self-start">
            {chatSlot}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">{roadmapBlock}</div>
          <div>{coreBlock}</div>
        </div>
      )}
    </div>
  );
};

export default MenteeProgressDashboard;
