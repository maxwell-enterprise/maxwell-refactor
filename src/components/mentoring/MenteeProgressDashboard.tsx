
import React from 'react';
import { MentoringSession } from '../../types/mentoring';
import { CheckCircle2, Circle, Target, Rocket, ClipboardCheck, TrendingUp, Sparkles } from 'lucide-react';
import { MentoringService } from '../../services/mentoringService';

interface MenteeProgressDashboardProps {
  session: MentoringSession;
  onToggleAction: (id: string) => void;
  chatSlot?: React.ReactNode;
}

const MenteeProgressDashboard: React.FC<MenteeProgressDashboardProps> = ({ session, onToggleAction, chatSlot }) => {
  const handleToggle = async (actionId: string) => {
    await MentoringService.toggleActionItem(session.id, actionId);
    onToggleAction(actionId);
  };

  const roadmapBlock = (
    <div className="min-w-0 space-y-3">
      <h3 className="flex items-center gap-2 px-0.5 text-sm font-bold text-slate-900 sm:text-base">
        <ClipboardCheck size={18} className="shrink-0 text-indigo-600" /> Action Roadmap
      </h3>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
        {session.actionPlan.length === 0 ? (
          <div className="p-8 text-center text-slate-400 sm:p-10">
            <Rocket size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No action items yet. Start a session with your AI Mentor!</p>
          </div>
        ) : (
          session.actionPlan.map((item) => (
            <div key={item.id} className="group flex items-start gap-3 p-3 transition-colors hover:bg-slate-50 sm:gap-4 sm:p-4">
              <button type="button" onClick={() => handleToggle(item.id)} className="mt-0.5 shrink-0 transition-transform active:scale-90">
                {item.status === 'COMPLETED' ? (
                  <CheckCircle2 size={22} className="text-green-500" />
                ) : (
                  <Circle size={22} className="text-slate-300 group-hover:text-blue-400" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${item.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {item.task}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
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
    <div className="min-w-0 space-y-3">
      <h3 className="flex items-center gap-2 px-0.5 text-sm font-bold text-slate-900 sm:text-base">
        <Target size={18} className="shrink-0 text-amber-500" /> Core Commitments
      </h3>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-inner sm:rounded-2xl sm:p-5">
        <div className="text-sm italic leading-relaxed text-amber-900">
          {session.memory.distilledContext ? (
            <div className="whitespace-pre-wrap">{session.memory.distilledContext}</div>
          ) : (
            <p className="text-center text-amber-600/60">Your growth points will appear here as you chat.</p>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 sm:p-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-800">Mentor&apos;s Perspective</p>
        <p className="text-xs leading-relaxed text-blue-600">
          &quot;Growth happens outside the comfort zone. Your commitment to scaling is the first step to true influence.&quot;
        </p>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-4 sm:space-y-6">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
        <div className="pointer-events-none absolute right-0 top-0 p-3 opacity-5 sm:p-4">
          <TrendingUp size={80} className="sm:h-[120px] sm:w-[120px]" />
        </div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2 sm:mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Growth Progress</p>
            <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">{session.progressScore}%</h3>
          </div>
          <span className="flex items-center rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-600 sm:text-xs">
            <Sparkles size={12} className="mr-1" /> Level 2 Mentee
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 sm:h-3">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
            style={{ width: `${session.progressScore}%` }}
          />
        </div>
      </div>

      {chatSlot ? (
        <div className="grid grid-cols-1 gap-4 pb-2 sm:gap-6 xl:grid-cols-12 xl:gap-5">
          <div className="order-1 h-[min(18rem,42vh)] w-full min-w-0 sm:h-[20rem] xl:order-3 xl:col-span-5 xl:h-[22rem]">
            {chatSlot}
          </div>
          <div className="order-2 min-w-0 xl:order-1 xl:col-span-4">{roadmapBlock}</div>
          <div className="order-3 min-w-0 pb-4 xl:order-2 xl:col-span-3">{coreBlock}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">{roadmapBlock}</div>
          <div>{coreBlock}</div>
        </div>
      )}
    </div>
  );
};

export default MenteeProgressDashboard;
