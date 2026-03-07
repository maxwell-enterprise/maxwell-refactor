
import React, { useState, useRef } from 'react';
import { DigitalTwinService } from '../../services/digitalTwinService';
import { User, MessageSquare, Target, Save, Sparkles, BrainCircuit } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import VariableInserter from '../common/VariableInserter'; // NEW IMPORT

interface MentorDirectionPanelProps {
  menteeId: string;
  menteeName: string;
  currentIntent: string;
}

const MentorDirectionPanel: React.FC<MentorDirectionPanelProps> = ({ menteeId, menteeName, currentIntent }) => {
  const { showToast } = useToast();
  const [intent, setIntent] = useState(currentIntent);
  const [isSaving, setIsSaving] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
        await DigitalTwinService.updateIntent('fac-1', menteeId, intent);
        showToast(`AI instruction updated for ${menteeName}`, 'success');
    } catch (e) {
        showToast('Failed to update AI direction', 'error');
    } finally {
        setIsSaving(false);
    }
  };

  const insertVariable = (varKey: string) => {
      if (!textAreaRef.current) return;
      const input = textAreaRef.current;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const text = intent;
      const insertion = `{{${varKey}}}`;
      
      const newText = text.substring(0, start) + insertion + text.substring(end);
      setIntent(newText);
      
      setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + insertion.length, start + insertion.length);
      }, 0);
  };

  return (
    <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden border border-indigo-700/50">
        <div className="absolute top-0 right-0 p-4 opacity-10"><BrainCircuit size={100} /></div>
        <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                        <Sparkles size={20} className="text-indigo-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">AI Mentoring Intention</h3>
                        <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest">Directing your Digital Twin</p>
                    </div>
                </div>
                {/* INJECTION TOOL */}
                <VariableInserter onInsert={insertVariable} buttonLabel="Insert Context" className="text-indigo-900"/>
            </div>

            <p className="text-xs text-indigo-100 leading-relaxed">
                Direct your AI Twin on what to focus on during the next session with <b>{menteeName}</b>. Use variables to make it dynamic.
            </p>

            <textarea 
                ref={textAreaRef}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-sm focus:bg-white/10 focus:ring-2 focus:ring-indigo-400 outline-none h-32 transition-all resize-none shadow-inner"
                placeholder="e.g., Focus on {{member_first_name}}'s time management issues. Mention their {{member_company}} role."
                value={intent}
                onChange={e => setIntent(e.target.value)}
            />

            <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-white text-indigo-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
                {isSaving ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-900 border-t-transparent"></span> : <Save size={18} />}
                Update Intent for {menteeName.split(' ')[0]}
            </button>
        </div>
    </div>
  );
};

export default MentorDirectionPanel;
