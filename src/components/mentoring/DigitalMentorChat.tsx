
import React, { useState, useRef, useEffect } from 'react';
import { MentoringSession, MentorPersona } from '../../types/mentoring';
import { MentoringService } from '../../services/mentoringService';
import { Send, Sparkles, User, MessageCircleHeart, Info, Loader2 } from 'lucide-react';

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
        console.error("AI Mentoring Error", e);
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white/20 shadow-lg">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-sm">{persona.name} (Digital Twin)</h4>
                    <p className="text-[10px] text-blue-300 flex items-center">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                        Active Mentoring Mode
                    </p>
                </div>
            </div>
            <button className="text-slate-400 hover:text-white p-2 transition-colors"><Info size={18}/></button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {session.memory.recentFullHistory.length === 0 && (
                <div className="text-center py-12 px-6">
                    <MessageCircleHeart size={48} className="mx-auto mb-4 text-slate-300" />
                    <h5 className="font-bold text-slate-800">Ready to level up?</h5>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-2">
                        I'm here to guide you based on John Maxwell's core leadership principles. What's on your mind today?
                    </p>
                </div>
            )}
            
            {session.memory.recentFullHistory.map((msg, idx) => (
                <div key={msg.id} className={`flex ${msg.sender === 'MENTOR_AI' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.sender === 'MENTOR_AI' 
                        ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none' 
                        : 'bg-blue-600 text-white rounded-tr-none'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}

            {isTyping && (
                <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin text-blue-600" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mentor is reflecting...</span>
                    </div>
                </div>
            )}
            <div ref={scrollRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative flex items-center gap-2">
                <input 
                    type="text"
                    className="flex-1 pl-4 pr-12 py-3 bg-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Ask about leadership, your goals, or specific challenges..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    disabled={isTyping}
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 disabled:bg-slate-300 transition-all shadow-lg active:scale-95 shrink-0"
                >
                    <Send size={18} />
                </button>
            </div>
            <p className="text-[9px] text-center text-slate-400 mt-3 font-medium uppercase tracking-tighter">
                AI Agent Powered by Maxwell Wisdom Engine
            </p>
        </div>
    </div>
  );
};

export default DigitalMentorChat;
