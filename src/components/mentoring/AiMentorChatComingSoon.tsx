import React from 'react';
import { Sparkles } from 'lucide-react';
import DigitalMentorChat from './DigitalMentorChat';
import type { MentoringSession, MentorPersona } from '../../types/mentoring';

interface AiMentorChatComingSoonProps {
  session: MentoringSession;
  persona: MentorPersona;
  onUpdate: (updated: MentoringSession) => void;
}

/** Preview shell: blurred chat UI with a Ready Soon overlay (feature gated). */
const AiMentorChatComingSoon: React.FC<AiMentorChatComingSoonProps> = (props) => {
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden rounded-2xl sm:rounded-3xl">
      <div
        className="pointer-events-none h-full select-none blur-[4px] opacity-45 saturate-50"
        aria-hidden
      >
        <DigitalMentorChat {...props} />
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/55 backdrop-blur-md">
        <div className="mx-4 max-w-xs rounded-2xl border border-indigo-200/90 bg-white/95 px-5 py-5 text-center shadow-xl">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <Sparkles size={20} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-500">AI Mentor Chat</p>
          <h4 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">Ready Soon</h4>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Personalized mentoring conversations are being prepared. Stay tuned.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AiMentorChatComingSoon;
