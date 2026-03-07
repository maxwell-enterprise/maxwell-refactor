import React, { useState } from 'react';
import { MessageCircleHeart, Send, Sparkles, User, UserCircle2 } from 'lucide-react';

const AICoach: React.FC = () => {
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
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 animate-fade-in">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center shadow-sm z-10">
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white mr-3 shadow-lg">
                <Sparkles size={20} />
            </div>
            <div>
                <h1 className="text-lg font-bold text-slate-900">Maxwell AI Coach</h1>
                <p className="text-xs text-slate-500 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                    Online • Specialized in Corporate Leadership
                </p>
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[80%] md:max-w-xl ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
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
        <div className="p-4 bg-white border-t border-slate-200">
            <div className="max-w-4xl mx-auto relative">
                <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about leadership challenges, event details, or course materials..."
                    className="w-full pl-6 pr-14 py-4 rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                />
                <button 
                    onClick={handleSend}
                    className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-md"
                >
                    <Send size={20} />
                </button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-3">
                AI can make mistakes. Consider checking important information.
            </p>
        </div>
    </div>
  );
};

export default AICoach;
