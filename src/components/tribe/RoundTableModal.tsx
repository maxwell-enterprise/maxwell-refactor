
import React, { useState } from 'react';
import { X, Save, School, BookOpen, Users, Calendar } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { SpecificBusinessService } from '../../services/specificBusinessService';
import { RoundTableProgram } from '../../types/business_specifics';

interface RoundTableModalProps {
    facilitatorId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const RoundTableModal: React.FC<RoundTableModalProps> = ({ facilitatorId, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        schoolName: '',
        program: 'iChoose' as RoundTableProgram,
        currentLesson: 1,
        totalParticipants: 10,
        startDate: new Date().toISOString().split('T')[0]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await SpecificBusinessService.startRoundTable({
                ...formData,
                facilitatorId
            });
            showToast('Round Table session started successfully!', 'success');
            onSuccess();
        } catch (error) {
            showToast('Failed to start session', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm"><Users size={20}/></div>
                        <div>
                            <h3 className="font-bold text-slate-900">Start My Round Table</h3>
                            <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-widest">Facilitator Tool</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-white/50 transition-all"><X size={20}/></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center">
                            <School size={12} className="mr-1"/> School / University Name
                        </label>
                        <input 
                            type="text" 
                            required
                            className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. SMA Negeri 1 Jakarta"
                            value={formData.schoolName}
                            onChange={e => setFormData({...formData, schoolName: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center">
                                <BookOpen size={12} className="mr-1"/> Program
                            </label>
                            <select 
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white"
                                value={formData.program}
                                onChange={e => setFormData({...formData, program: e.target.value as RoundTableProgram})}
                            >
                                <option value="iChoose">iChoose</option>
                                <option value="iDo">iDo</option>
                                <option value="iLead">iLead</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Lesson (1-16)</label>
                            <input 
                                type="number" 
                                min="1" max="16"
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold text-center"
                                value={formData.currentLesson}
                                onChange={e => setFormData({...formData, currentLesson: Number(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Participants</label>
                            <input 
                                type="number" 
                                min="1"
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm"
                                value={formData.totalParticipants}
                                onChange={e => setFormData({...formData, totalParticipants: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center">
                                <Calendar size={12} className="mr-1"/> Start Date
                            </label>
                            <input 
                                type="date" 
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm"
                                value={formData.startDate}
                                onChange={e => setFormData({...formData, startDate: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex items-center justify-center disabled:opacity-50 transition-all"
                        >
                            {isSubmitting ? 'Starting...' : <><Save size={18} className="mr-2"/> Launch Session</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoundTableModal;
