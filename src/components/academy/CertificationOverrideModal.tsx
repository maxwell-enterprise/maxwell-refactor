
import React, { useState } from 'react';
import { Member } from '../../types/index';
import { MasterDoneTag } from '../../types/certification';
import { CertificationService } from '../../services/certificationService';
import { X, ShieldAlert, CheckCircle, Save, Info } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

interface CertificationOverrideModalProps {
    member: Member;
    tag: MasterDoneTag;
    hasTag: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CertificationOverrideModal: React.FC<CertificationOverrideModalProps> = ({ member, tag, hasTag, onClose, onSuccess }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOverride = async () => {
        if (!reason.trim()) {
            showToast('A reason is required for audit logs.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            // We assume user is Admin (UI should protect this)
            await CertificationService.grantManualOverride(member.id, tag.code, reason, user?.fullName || 'Admin');
            showToast(`Tag ${tag.code} granted manually.`, 'success');
            onSuccess();
            onClose();
        } catch (e) {
            showToast('Failed to apply override.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <ShieldAlert className="text-amber-500" size={20}/> Manual Override
                        </h2>
                        <p className="text-xs text-slate-500">Administrative Action</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200"><X size={20}/></button>
                </div>

                <div className="p-6 space-y-4">
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Member</p>
                                <p className="font-bold text-slate-900">{member.name}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Tag Target</p>
                                <p className="font-mono text-blue-600 font-bold">{tag.code}</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-sm">
                        <p className="text-slate-600 mb-2">Current Status:</p>
                        {hasTag ? (
                            <div className="flex items-center text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
                                <CheckCircle size={18} className="mr-2"/>
                                <span>Tag already acquired.</span>
                            </div>
                        ) : (
                            <div className="flex items-center text-slate-500 bg-slate-100 p-3 rounded-lg border border-slate-200">
                                <Info size={18} className="mr-2"/>
                                <span>Tag missing. (Not completed via Event)</span>
                            </div>
                        )}
                    </div>

                    {!hasTag && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                Override Justification <span className="text-red-500">*</span>
                            </label>
                            <textarea 
                                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none h-24"
                                placeholder="e.g. Member attended previous system era, evidence verified manually."
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center">
                                <Info size={10} className="mr-1"/> This action will be permanently recorded in the Audit Trail.
                            </p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg text-sm">Cancel</button>
                    {!hasTag && (
                        <button 
                            onClick={handleOverride} 
                            disabled={isSubmitting || !reason}
                            className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 text-sm shadow-lg flex items-center disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : <><Save size={16} className="mr-2"/> Confirm Override</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CertificationOverrideModal;
