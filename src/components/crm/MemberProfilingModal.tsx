
import React, { useEffect, useState } from 'react';
import { Member, SocialProfile } from '../../types/index';
import { DataService } from '../../services/dataService';
import { X, Save, Instagram, Briefcase, ShieldCheck, Search, UserCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAccess } from '../../context/SecurityContext';

interface MemberProfilingModalProps {
    member: Member;
    onClose: () => void;
    onSuccess: () => void;
}

const MemberProfilingModal: React.FC<MemberProfilingModalProps> = ({ member, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const { can: canAssignFacilitatorAccess } = useAccess('crm_member_facilitator_assignment');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingFacilitators, setIsLoadingFacilitators] = useState(false);
    const [facilitatorOptions, setFacilitatorOptions] = useState<Member[]>([]);
    const [facilitatorSearch, setFacilitatorSearch] = useState('');
    const [selectedFacilitator, setSelectedFacilitator] = useState<Member | null>(null);
    const [showFacilitatorMenu, setShowFacilitatorMenu] = useState(false);
    const canAssignFacilitator = canAssignFacilitatorAccess('WRITE');
    
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

    useEffect(() => {
        if (!canAssignFacilitator) return;

        let cancelled = false;
        setIsLoadingFacilitators(true);

        void DataService.getMembers()
            .then((members) => {
                if (cancelled) return;
                const facilitators = members
                    .filter((candidate) => candidate.lifecycleStage === 'FACILITATOR')
                    .sort((a, b) => a.name.localeCompare(b.name));
                setFacilitatorOptions(facilitators);
                const current = facilitators.find(
                    (candidate) =>
                        candidate.name.trim().toLowerCase() ===
                        (member.facilitatorName || '').trim().toLowerCase(),
                ) || null;
                setSelectedFacilitator(current);
                setFacilitatorSearch(current?.name || '');
            })
            .catch(() => {
                if (cancelled) return;
                showToast('Failed to load facilitator options.', 'error');
            })
            .finally(() => {
                if (!cancelled) setIsLoadingFacilitators(false);
            });

        return () => {
            cancelled = true;
        };
    }, [canAssignFacilitator, member.facilitatorName, showToast]);

    const filteredFacilitators = facilitatorOptions.filter((candidate) => {
        const query = facilitatorSearch.trim().toLowerCase();
        if (!query) return true;
        return candidate.name.toLowerCase().includes(query);
    });

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
        if (
            canAssignFacilitator &&
            facilitatorSearch.trim() &&
            !selectedFacilitator &&
            facilitatorSearch.trim().toLowerCase() !==
                (member.facilitatorName || '').trim().toLowerCase()
        ) {
            showToast('Please select a facilitator from the dropdown list.', 'error');
            return;
        }

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

            if (
                canAssignFacilitator &&
                selectedFacilitator &&
                selectedFacilitator.name.trim().toLowerCase() !==
                    (member.facilitatorName || '').trim().toLowerCase()
            ) {
                updatedMember.facilitatorName = selectedFacilitator.name;
            }

            await DataService.updateMember(member.id, updatedMember);
            showToast('Member profile updated successfully.', 'success');
            onSuccess();
            onClose();
        } catch (e) {
            const message =
                e instanceof Error && e.message.trim()
                    ? e.message
                    : 'Failed to update profile.';
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
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

                    {canAssignFacilitator && (
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                <UserCheck size={14} className="mr-2"/> Facilitator Assignment
                            </h4>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Current Facilitator</div>
                                    <div className="mt-2 text-sm font-semibold text-slate-900">
                                        {member.facilitatorName || 'Not assigned'}
                                    </div>
                                    <div className="mt-2">
                                        {member.facilitatorType ? (
                                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                                                {member.facilitatorType}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400">No facilitator type yet</span>
                                        )}
                                    </div>
                                </div>

                                <div className="relative">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Facilitator Name</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                            value={facilitatorSearch}
                                            onFocus={() => setShowFacilitatorMenu(true)}
                                            onChange={(e) => {
                                                setFacilitatorSearch(e.target.value);
                                                setSelectedFacilitator(null);
                                                setShowFacilitatorMenu(true);
                                            }}
                                            onBlur={() => {
                                                window.setTimeout(() => setShowFacilitatorMenu(false), 120);
                                            }}
                                            placeholder="Search facilitator by name..."
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">
                                        Save will set type to <b>ASSIGN</b> if empty before, or <b>MOVE</b> if reassigned.
                                    </p>

                                    {showFacilitatorMenu && (
                                        <div className="absolute z-10 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                            {isLoadingFacilitators ? (
                                                <div className="px-3 py-3 text-sm text-slate-500">Loading facilitators...</div>
                                            ) : filteredFacilitators.length === 0 ? (
                                                <div className="px-3 py-3 text-sm text-slate-500">No facilitator found.</div>
                                            ) : (
                                                filteredFacilitators.slice(0, 12).map((candidate) => (
                                                    <button
                                                        key={candidate.id}
                                                        type="button"
                                                        onMouseDown={() => {
                                                            setSelectedFacilitator(candidate);
                                                            setFacilitatorSearch(candidate.name);
                                                            setShowFacilitatorMenu(false);
                                                        }}
                                                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                                                            selectedFacilitator?.id === candidate.id
                                                                ? 'bg-blue-50 text-blue-700'
                                                                : 'hover:bg-slate-50 text-slate-700'
                                                        }`}
                                                    >
                                                        <span className="font-medium">{candidate.name}</span>
                                                        <span className="text-xs text-slate-400">{candidate.email}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
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
