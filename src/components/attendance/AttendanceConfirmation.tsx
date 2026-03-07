
import React from 'react';
import { AttendanceRecord } from '../../types/index';
import { CheckCircle2, MapPin, Calendar, ArrowLeft, ShieldCheck } from 'lucide-react';

interface AttendanceConfirmationProps {
  record: AttendanceRecord;
  onBack: () => void;
  status?: 'SUCCESS' | 'FAIL'; // Added prop for flexibility
}

const AttendanceConfirmation: React.FC<AttendanceConfirmationProps> = ({ record, onBack }) => {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Dynamic Header based on Event Color */}
        <div 
          className="h-48 flex flex-col items-center justify-center text-white relative transition-colors duration-500"
          style={{ backgroundColor: record.eventColor || '#4F46E5' }}
        >
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          
          {/* Floating Shield Animation */}
          <div className="relative z-10 bg-white/20 p-5 rounded-full backdrop-blur-md mb-3 animate-bounce-slow border-2 border-white/30">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="relative z-10 text-2xl font-black tracking-tight uppercase drop-shadow-md">Access Granted</h2>
          <p className="relative z-10 text-xs font-medium text-white/80 mt-1 uppercase tracking-widest">Official Entry Pass</p>
        </div>

        <div className="p-8 space-y-8 flex-1 flex flex-col">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-slate-900 leading-tight mb-1">{record.eventName}</h3>
            <p className="text-slate-400 text-sm">Welcome, {record.memberName.split(' ')[0]}!</p>
          </div>

          {/* Visual Code Box - The "Ticket" */}
          <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-200 text-center space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-slate-200 to-transparent rounded-bl-full opacity-50"></div>
            
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Security Check Code</p>
            <div className="text-6xl font-mono font-black tracking-widest text-slate-900 group-hover:scale-105 transition-transform duration-300">
              {record.verificationCode}
            </div>
            <div className="flex items-center justify-center gap-1 text-[10px] text-green-600 font-bold uppercase mt-2">
                <ShieldCheck size={12} /> Verified System Entry
            </div>
          </div>

          <div className="space-y-4 pt-2">
             <div className="flex items-center gap-4 text-sm text-slate-600 p-3 rounded-xl bg-slate-50">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm"><Calendar size={20} className="text-blue-500" /></div>
                <div>
                   <p className="font-bold text-slate-900">Entry Time</p>
                   <p className="text-xs">{new Date(record.scannedAt).toLocaleTimeString()}</p>
                </div>
             </div>
             <div className="flex items-center gap-4 text-sm text-slate-600 p-3 rounded-xl bg-slate-50">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm"><MapPin size={20} className="text-red-500" /></div>
                <div>
                   <p className="font-bold text-slate-900">Scan Method</p>
                   <p className="text-xs">Self Check-In (Device Verified)</p>
                </div>
             </div>
          </div>

          <button 
            onClick={onBack}
            className="mt-auto w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <ArrowLeft size={18} /> Close Pass
          </button>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 mt-6 uppercase tracking-widest font-medium">Show screen to event staff</p>
    </div>
  );
};

export default AttendanceConfirmation;
