
import React, { useState } from 'react';
import { Member, SocialProfile } from '../../types/index';
import { DataService } from '../../services/dataService';
import { X, Save, Instagram, Briefcase, Globe, Users, Award, ShieldCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface MemberProfilingModalProps {
    member: Member;
    onClose: () => void;
    onSuccess: () => void;
}

const MemberProfilingModal: React.FC<MemberProfilingModalProps> = ({ member, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Initial State from Member or Defaults
    const [profile, setProfile] = useState<SocialProfile>(member.socialProfile || {
        igVerified: false,
        igFollowers: 0,
        businessAccounts: [],
        occupation: '',
        businessType: '',
        communities: []
    });

    // Helper for array inputs
    const [bizAccInput, setBizAccInput] = useState('');
    const [commInput, setCommInput] = useState('');

    const handleAddArrayItem = (field: 'businessAccounts' | 'communities', value: string, setter: (v: string) => void) => {
        if (!value.trim()) return;
        setProfile(prev => ({
            ...prev,
            [field]: [...prev[field], value.trim()]
        }));
        setter('');
    };

    const handleRemoveArrayItem = (field: 'businessAccounts' | 'communities', index: number) => {
        setProfile(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            // Logic: Check qualification
            const isQualified = profile.igVerified || profile.igFollowers > 1000;
            
            // Prepare update payload
            let updatedTags = member.tags || [];
            if (isQualified && !updatedTags.includes('Qualified')) {
                updatedTags = [...updatedTags, 'Qualified'];
                showToast("Member marked as 'Qualified' based on profile data.", 'success');
            } else if (!isQualified && updatedTags.includes('Qualified')) {
                // Optional: Remove tag if criteria no longer met? 
                // Usually we don't downgrade automatically, but for strict sync:
                // updatedTags = updatedTags.filter(t => t !== 'Qualified');
            }

            const updatedMember: Partial<Member> = {
                socialProfile: profile,
                tags: updatedTags
            };

            await DataService.updateMember(member.id, updatedMember);
            showToast('Member profile updated successfully.', 'success');
            onSuccess();
            onClose();
        } catch (e) {
            showToast('Failed to update profile.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <ShieldCheck size={18} className="text-blue-600"/> Member Profiling
                        </h3>
                        <p className="text-xs text-slate-500">Enrich data for: <b>{member.name}</b></p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition-all"><X size={20}/></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    
                    {/* SOCIAL SECTION */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                            <Instagram size={14} className="mr-2"/> Social Impact
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">IG Verified?</label>
                                <select 
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    value={profile.igVerified ? 'YES' : 'NO'}
                                    onChange={(e) => setProfile({...profile, igVerified: e.target.value === 'YES'})}
                                >
                                    <option value="NO">No</option>
                                    <option value="YES">Yes</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">IG Followers</label>
                                <input 
                                    type="number" 
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                    value={profile.igFollowers}
                                    onChange={(e) => setProfile({...profile, igFollowers: Number(e.target.value)})}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Business Accounts</label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    className="flex-1 p-2 border border-slate-300 rounded-lg text-sm"
                                    value={bizAccInput}
                                    onChange={(e) => setBizAccInput(e.target.value)}
                                    placeholder="@brandname..."
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddArrayItem('businessAccounts', bizAccInput, setBizAccInput)}
                                />
                                <button 
                                    onClick={() => handleAddArrayItem('businessAccounts', bizAccInput, setBizAccInput)}
                                    className="px-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {profile.businessAccounts.map((acc, idx) => (
                                    <span key={idx} className="bg-pink-50 text-pink-600 px-2 py-1 rounded text-xs border border-pink-100 flex items-center">
                                        {acc}
                                        <button onClick={() => handleRemoveArrayItem('businessAccounts', idx)} className="ml-1 text-pink-400 hover:text-pink-700"><X size={12}/></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* PROFESSIONAL SECTION */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                            <Briefcase size={14} className="mr-2"/> Professional Context
                        </h4>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Occupation</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                value={profile.occupation}
                                onChange={(e) => setProfile({...profile, occupation: e.target.value})}
                                placeholder="e.g. Entrepreneur, Consultant"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Business Type / Field</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                value={profile.businessType}
                                onChange={(e) => setProfile({...profile, businessType: e.target.value})}
                                placeholder="e.g. F&B, Tech Startup, Retail"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Communities</label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    className="flex-1 p-2 border border-slate-300 rounded-lg text-sm"
                                    value={commInput}
                                    onChange={(e) => setCommInput(e.target.value)}
                                    placeholder="e.g. HIPMI, JCI..."
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddArrayItem('communities', commInput, setCommInput)}
                                />
                                <button 
                                    onClick={() => handleAddArrayItem('communities', commInput, setCommInput)}
                                    className="px-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {profile.communities.map((comm, idx) => (
                                    <span key={idx} className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs border border-blue-100 flex items-center">
                                        {comm}
                                        <button onClick={() => handleRemoveArrayItem('communities', idx)} className="ml-1 text-blue-400 hover:text-blue-700"><X size={12}/></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl text-sm transition-colors">Cancel</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSubmitting}
                        className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center text-sm disabled:opacity-50 transition-all"
                    >
                        {isSubmitting ? 'Saving...' : <><Save size={16} className="mr-2"/> Save Profile</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MemberProfilingModal;
