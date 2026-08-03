import React, { useState } from 'react';
import { MessageCircleHeart, Send, Sparkles, User } from 'lucide-react';
import { ViewState } from '../types/index';
import PageBackButton from './common/PageBackButton';

const AICoach: React.FC<{ onNavigate?: (view: ViewState) => void }> = ({
  onNavigate,
}) => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: "Hello! I'm your Maxwell Leadership AI Coach. Based on your recent profile update, I see you're interested in 'Team Influence'. How can I help you grow today?" }
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    const newMsg = { id: Date.now(), sender: 'user', text: inputText };
    setMessages([...messages, newMsg]);
    setInputText('');

    // Simulate AI response
    setTimeout(() => {
        setMessages(prev => [...prev, {
            id: Date.now() + 1,
            sender: 'ai',
            text: "That's a great question about leadership. John Maxwell often says, 'Leadership is influence, nothing more, nothing less.' To improve this with your team, have you tried the 'Connection' exercise from the 5 Levels of Leadership module?"
        }]);
    }, 1500);
  };

  return (
    <div className="relative w-full min-w-0 animate-fade-in bg-slate-50">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 sm:py-4">
            <div className="flex items-center gap-1">
                <PageBackButton view={ViewState.AI_COACH} onNavigate={onNavigate} />
                <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                    <Sparkles size={20} />
                </div>
                <div className="min-w-0">
                    <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">Maxwell AI Coach</h1>
                    <p className="flex items-center truncate text-xs text-slate-500">
                        <span className="mr-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500"></span>
                        Online • Specialized in Corporate Leadership
                    </p>
                </div>
            </div>
        </div>

        {/* Chat Area */}
        <div className="space-y-6 p-4 md:p-8">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[min(100%,20rem)] sm:max-w-[80%] md:max-w-xl ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                         <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 
                            ${msg.sender === 'user' ? 'bg-slate-200 ml-3 text-slate-600' : 'bg-indigo-100 mr-3 text-indigo-600'}`}>
                            {msg.sender === 'user' ? <User size={16} /> : <MessageCircleHeart size={16} />}
                         </div>
                         <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm
                            ${msg.sender === 'user' 
                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                            {msg.text}
                         </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Input Area */}
        <div className="safe-area-bottom shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
            <div className="relative mx-auto max-w-4xl">
                <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about leadership challenges..."
                    className="w-full rounded-full border border-slate-200 bg-slate-50 py-3.5 pl-5 pr-14 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500 sm:py-4 sm:pl-6"
                />
                <button 
                    onClick={handleSend}
                    className="touch-target absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-indigo-600 p-2.5 text-white shadow-md transition-colors hover:bg-indigo-700 sm:right-2"
                    aria-label="Send message"
                >
                    <Send size={18} />
                </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400 sm:mt-3 sm:text-xs">
                AI can make mistakes. Consider checking important information.
            </p>
        </div>
    </div>
  );
};

export default AICoach;
