
import React, { useState, useRef, useEffect } from 'react';
import { MentoringSession, MentorPersona } from '../../types/mentoring';
import { MentoringService } from '../../services/mentoringService';
import { Send, Sparkles, MessageCircleHeart, Info, Loader2 } from 'lucide-react';

interface DigitalMentorChatProps {
  session: MentoringSession;
  persona: MentorPersona;
  onUpdate: (updated: MentoringSession) => void;
}

const DigitalMentorChat: React.FC<DigitalMentorChatProps> = ({ session, persona, onUpdate }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.memory.recentFullHistory, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input;
    setInput('');
    setIsTyping(true);

    try {
      const result = await MentoringService.sendMessage(session.id, userText, persona);
      onUpdate(result.session);
    } catch (e) {
      console.error('AI Mentoring Error', e);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg sm:rounded-3xl sm:shadow-xl">
      <div className="flex shrink-0 items-center justify-between gap-2 bg-slate-900 p-3 text-white sm:p-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-blue-600 shadow-lg">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold">{persona.name}</h4>
            <p className="flex items-center text-[10px] text-blue-300">
              <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Active mentoring
            </p>
          </div>
        </div>
        <button type="button" className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:text-white" aria-label="Info">
          <Info size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-3 sm:space-y-4 sm:p-4">
        {session.memory.recentFullHistory.length === 0 && (
          <div className="px-2 py-8 text-center sm:py-10">
            <MessageCircleHeart size={40} className="mx-auto mb-3 text-slate-300" />
            <h5 className="text-sm font-bold text-slate-800">Ready to level up?</h5>
            <p className="mx-auto mt-1.5 max-w-xs text-xs text-slate-500">
              Ask about leadership challenges, goals, or your next growth step.
            </p>
          </div>
        )}

        {session.memory.recentFullHistory.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'MENTOR_AI' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[min(100%,18rem)] rounded-2xl p-3 text-sm leading-relaxed shadow-sm sm:max-w-[85%] sm:p-3.5 ${
                msg.sender === 'MENTOR_AI'
                  ? 'rounded-tl-none border border-slate-200 bg-white text-slate-800'
                  : 'rounded-tr-none bg-blue-600 text-white'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-slate-100 bg-white p-3">
              <Loader2 size={14} className="animate-spin text-blue-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="min-w-0 flex-1 rounded-xl bg-slate-100 py-2.5 pl-3 pr-2 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 sm:rounded-2xl sm:py-3 sm:pl-4"
            placeholder="Ask your mentor..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isTyping}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition-all hover:bg-blue-600 disabled:bg-slate-300 active:scale-95 sm:h-11 sm:w-11 sm:rounded-2xl"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DigitalMentorChat;
