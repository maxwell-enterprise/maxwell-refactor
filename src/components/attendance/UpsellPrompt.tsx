
import React from 'react';
import { Zap, X, CheckCircle } from 'lucide-react';

interface UpsellPromptProps {
    memberName: string;
    onClose: () => void;
}

const UpsellPrompt: React.FC<UpsellPromptProps> = ({ memberName, onClose }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-[200] animate-fade-in-up">
            <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white rounded-2xl p-6 shadow-2xl border border-indigo-700 relative overflow-hidden max-w-lg mx-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-indigo-300 hover:text-white"><X size={20}/></button>
                
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-white/10 rounded-full">
                        <Zap size={24} className="text-yellow-400" fill="currentColor" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-1">Upgrade Opportunity!</h3>
                        <p className="text-sm text-indigo-100 mb-4">
                            Hi <b>{memberName}</b>, maximize your growth today. Use your remaining ticket balance to join the <b>Mentorship Program</b>.
                        </p>
                        <div className="flex gap-3">
                            <button className="bg-white text-indigo-900 px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-indigo-50">
                                Yes, Interested
                            </button>
                            <button onClick={onClose} className="text-sm font-medium text-indigo-300 hover:text-white py-2">
                                No thanks
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpsellPrompt;
