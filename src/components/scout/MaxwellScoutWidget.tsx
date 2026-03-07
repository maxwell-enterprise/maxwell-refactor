import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Sparkles, ChevronRight, Mail, Lock, ExternalLink } from 'lucide-react';
import { ScoutService } from '../../services/scoutService';
import { ScoutSession } from '../../types/index';

const MaxwellScoutWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'TEASER' | 'FORM' | 'VERIFY' | 'CHAT'>('TEASER');
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Chat State
  const [session, setSession] = useState<ScoutSession | null>(null);
  const [inputMsg, setInputMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, isTyping, session?.status]);

  const handleStart = async () => {
      if (!name || !email) return;
      // In real app, trigger backend to send OTP here
      setStep('VERIFY');
  };

  const handleVerify = async () => {
      setIsVerifying(true);
      // Simulate API call
      setTimeout(async () => {
          setIsVerifying(false);
          const newSession = await ScoutService.startSession(name, email);
          setSession(newSession);
          setStep('CHAT');
      }, 1500);
  };

  const handleSend = async () => {
      if (!inputMsg.trim() || !session) return;
      if (session.status === 'COMPLETED') return; // Prevent sending if completed
      
      const userText = inputMsg;
      setInputMsg(''); // Clear input immediately
      
      // Update UI with user message
      setSession(prev => prev ? ({
          ...prev,
          messages: [...prev.messages, { sender: 'user', text: userText, timestamp: Date.now() }]
      }) : null);

      setIsTyping(true);

      // 1. Process Chat Response
      const { session: updatedSession } = await ScoutService.sendMessage(session, userText);
      setSession(updatedSession);
      setIsTyping(false);

      // 2. Background Qualification (Fire and forget)
      // Only run if not completed to save resources
      if (updatedSession.status !== 'COMPLETED') {
          ScoutService.qualifyLead(userText, session.score).then(newScore => {
              console.log("Updated Lead Score (Hidden):", newScore);
              setSession(prev => prev ? ({ ...prev, score: newScore }) : null);
          });
      }
  };

  // Render Functions
  const renderTeaser = () => (
      <div className="p-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse-slow">
              <Sparkles className="text-white" size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Leadership Checkup</h3>
          <p className="text-sm text-slate-600 mb-6">
              Not sure where to start? Chat with Maxwell Scout to diagnose your leadership level in 2 minutes.
          </p>
          <button 
            onClick={() => setStep('FORM')}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center"
          >
              Start Free Assessment <ChevronRight size={16} className="ml-1" />
          </button>
      </div>
  );

  const renderForm = () => (
      <div className="p-6">
          <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Unlock Your Profile</h3>
              <p className="text-xs text-slate-500">We'll send your personalized results here.</p>
          </div>
          <div className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Your Name</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                    placeholder="john@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
              </div>
              <button 
                onClick={handleStart}
                disabled={!name || !email}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                  Continue
              </button>
          </div>
      </div>
  );

  const renderVerify = () => (
      <div className="p-6 text-center">
          <div className="mb-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Mail size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Verify Email</h3>
              <p className="text-xs text-slate-500">We sent a code to <b>{email}</b></p>
          </div>
          <div className="mb-6">
              <input 
                type="text" 
                className="w-full p-3 border border-slate-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:border-blue-500 outline-none"
                placeholder="0000"
                maxLength={4}
                value={otp}
                onChange={e => setOtp(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-2">Use '1234' for demo</p>
          </div>
          <button 
            onClick={handleVerify}
            disabled={otp.length < 4 || isVerifying}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex justify-center items-center"
          >
              {isVerifying ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span> : <Lock size={16} className="mr-2" />}
              {isVerifying ? 'Verifying...' : 'Access Scout'}
          </button>
      </div>
  );

  const renderChat = () => (
      <div className="flex flex-col h-full">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-100 flex items-center bg-slate-50 rounded-t-2xl">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white mr-2">
                  <Sparkles size={16} />
              </div>
              <div>
                  <h4 className="font-bold text-slate-900 text-sm">Maxwell Scout</h4>
                  <p className="text-[10px] text-slate-500 flex items-center">
                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${session?.status === 'COMPLETED' ? 'bg-slate-400' : 'bg-green-500'}`}></span> 
                      {session?.status === 'COMPLETED' ? 'Session Completed' : 'Live Analysis'}
                  </p>
              </div>
              {/* Score Indicator (Hidden from user usually, visible for demo/admin) */}
              <div className="ml-auto text-[10px] bg-slate-200 px-2 py-1 rounded text-slate-500 font-mono" title="Lead Score (Internal)">
                  L{session?.score.willingness}/C{session?.score.capacity}
              </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
              {session?.messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
                          msg.sender === 'user' 
                              ? 'bg-blue-600 text-white rounded-br-none' 
                              : 'bg-slate-100 text-slate-800 rounded-bl-none'
                      }`}>
                          {msg.text}
                      </div>
                  </div>
              ))}
              
              {isTyping && (
                  <div className="flex justify-start">
                      <div className="bg-slate-100 p-3 rounded-xl rounded-bl-none flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                      </div>
                  </div>
              )}

              {/* Special CTA when Session Completed */}
              {session?.status === 'COMPLETED' && (
                  <div className="flex justify-center mt-4 mb-2 animate-fade-in-up">
                      <a 
                        href={ScoutService.getWhatsappLink(session)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center transform hover:scale-105 transition-all text-sm"
                      >
                          <MessageCircle size={18} className="mr-2" />
                          Chat Expert on WhatsApp
                      </a>
                  </div>
              )}

              <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 bg-white">
              <div className="relative">
                  <input 
                    type="text" 
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder={session?.status === 'COMPLETED' ? "Session ended. Please use WhatsApp." : "Type your reply..."}
                    value={inputMsg}
                    onChange={e => setInputMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    disabled={session?.status === 'COMPLETED'}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!inputMsg.trim() || session?.status === 'COMPLETED'}
                    className="absolute right-1 top-1 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:bg-slate-300"
                  >
                      <Send size={16} />
                  </button>
              </div>
          </div>
      </div>
  );

  if (!isOpen) {
      return (
          <button 
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 h-14 w-14 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-105 transition-transform flex items-center justify-center z-[100] group"
          >
              <Sparkles size={24} className="group-hover:animate-pulse" />
              <span className="absolute -top-2 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
          </button>
      );
  }

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-sm h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-[100] animate-fade-in-up">
        {/* Close Button if not in Chat mode (Chat has its own header) */}
        {step !== 'CHAT' && (
            <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"
            >
                <X size={20} />
            </button>
        )}
        
        {step === 'CHAT' && (
             <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-20"
            >
                <X size={20} />
            </button>
        )}

        {step === 'TEASER' && renderTeaser()}
        {step === 'FORM' && renderForm()}
        {step === 'VERIFY' && renderVerify()}
        {step === 'CHAT' && renderChat()}
    </div>
  );
};

export default MaxwellScoutWidget;