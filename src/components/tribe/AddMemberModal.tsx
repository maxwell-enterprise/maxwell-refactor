import React, { useState } from 'react';
import { Briefcase, Building2, Mail, MapPin, Phone, Save, UserPlus, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { TribeService, type CreateTribeMemberInput } from '../../services/tribeService';

interface AddMemberModalProps {
    facilitatorName: string;
    onClose: () => void;
    onSuccess: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ facilitatorName, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState<CreateTribeMemberInput>({
        memberName: '',
        phone: '',
        email: '',
        positionOccupation: '',
        company: '',
        domicile: '',
        instagram: '',
        linkedin: '',
        facilitatorName,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setField = (field: keyof CreateTribeMemberInput, value: string) => {
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const isFormValid =
        formData.memberName.trim().length > 0 &&
        formData.phone.trim().length > 0 &&
        formData.email.trim().length > 0 &&
        formData.positionOccupation.trim().length > 0 &&
        formData.company.trim().length > 0 &&
        formData.domicile.trim().length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) {
            showToast('Please complete all required fields.', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            await TribeService.createMember(formData);
            showToast('Member added successfully.', 'success');
            onSuccess();
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : 'Failed to add member.',
                'error',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm"><UserPlus size={20} /></div>
                        <div>
                            <h3 className="font-bold text-slate-900">Add Member</h3>
                            <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest">My Tribe Registration</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-white/60 transition-all">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Member Name *</label>
                            <input
                                type="text"
                                required
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Full name"
                                value={formData.memberName}
                                onChange={(e) => setField('memberName', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center">
                                <Phone size={12} className="mr-1" /> Phone *
                            </label>
                            <input
                                type="tel"
                                required
                                inputMode="tel"
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="08xxxxxxxxxx"
                                value={formData.phone}
                                onChange={(e) => setField('phone', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center">
                                <Mail size={12} className="mr-1" /> Email *
                            </label>
                            <input
                                type="email"
                                required
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="name@email.com"
                                value={formData.email}
                                onChange={(e) => setField('email', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center">
                                <Briefcase size={12} className="mr-1" /> Position / Occupation *
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Manager, Coach, Entrepreneur"
                                value={formData.positionOccupation}
                                onChange={(e) => setField('positionOccupation', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center">
                                <Building2 size={12} className="mr-1" /> Company *
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Company name"
                                value={formData.company}
                                onChange={(e) => setField('company', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center">
                                <MapPin size={12} className="mr-1" /> Domicile *
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="City / domicile"
                                value={formData.domicile}
                                onChange={(e) => setField('domicile', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Instagram</label>
                            <input
                                type="text"
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="@username"
                                value={formData.instagram}
                                onChange={(e) => setField('instagram', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">LinkedIn</label>
                            <input
                                type="text"
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="https://linkedin.com/in/..."
                                value={formData.linkedin}
                                onChange={(e) => setField('linkedin', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500">
                        Registered by <span className="font-bold text-slate-700">{facilitatorName}</span>. Facilitator type will be saved as <span className="font-bold text-emerald-700">REGISTER</span>.
                    </div>

                    <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !isFormValid}
                            className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg flex items-center justify-center disabled:opacity-50 transition-all"
                        >
                            {isSubmitting ? 'Saving...' : <><Save size={18} className="mr-2" /> Save Member</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMemberModal;
