
import React, { useEffect, useState } from 'react';
import { Member } from '../types/index';
import { DataService } from '../services/dataService';
import { isSalesPipelineLead } from '../lib/memberLifecycleViews';
import { useToast } from '../context/ToastContext';
import { Search, Filter, Mail, ChevronRight, UserPlus, Target, UserCog, CheckCircle, Award, Square, CheckSquare, X } from 'lucide-react';
import WhatsAppQuickAction from './common/WhatsAppQuickAction';
import DeepResearchPanel from './crm/DeepResearchPanel';
import MemberProfilingModal from './crm/MemberProfilingModal';
import InviteMembersModal from './crm/InviteMembersModal'; // Import Invite Modal

const LeadsDashboard: React.FC = () => {
    const { showToast } = useToast();
    const [leads, setLeads] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [researchTarget, setResearchTarget] = useState<Member | null>(null);
    const [profilingTarget, setProfilingTarget] = useState<Member | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showQualifiedOnly, setShowQualifiedOnly] = useState(false);

    // SELECTION STATE
    const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    useEffect(() => {
        loadLeads();
    }, []);

    const loadLeads = async () => {
        setLoading(true);
        const allMembers = await DataService.getMembers();
        const leadList = allMembers.filter((m) => isSalesPipelineLead(m));
        setLeads(leadList);
        setLoading(false);
    };

    const handleConvert = async (lead: Member) => {
        if (window.confirm(`Promote ${lead.name} to Full Member? This usually happens after payment.`)) {
            await DataService.updateMember(lead.id, { lifecycleStage: 'MEMBER', joinMonth: new Date().toISOString().slice(0, 7) });
            showToast(`${lead.name} converted to Member!`, 'success');
            loadLeads();
        }
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedLeadIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedLeadIds(next);
    };

    const toggleAll = () => {
        if (selectedLeadIds.size === filteredLeads.length) {
            setSelectedLeadIds(new Set());
        } else {
            setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
        }
    };

    const filteredLeads = leads.filter(l => {
        const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.company?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (showQualifiedOnly) {
            return matchesSearch && l.tags?.includes('Qualified');
        }
        return matchesSearch;
    });

    return (
        <div className="page-container space-y-5 sm:space-y-6 animate-fade-in relative pb-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end min-w-0">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                        <Target className="shrink-0 text-orange-600" size={28} /> 
                        <span className="leading-tight">Sales Pipeline</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm sm:text-base">Prospects, guests, and qualified leads.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full lg:w-auto min-w-0">
                    <button 
                        onClick={() => setShowQualifiedOnly(!showQualifiedOnly)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center transition-all ${showQualifiedOnly ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Award size={14} className="mr-1.5"/> Qualified Only
                    </button>

                    <div className="relative w-full sm:w-64 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search leads..." 
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden pb-20 min-w-0">
                <div className="overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
                <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-orange-50 text-orange-800 font-bold border-b border-orange-100">
                        <tr>
                            <th className="px-4 py-4 w-10 text-center cursor-pointer hover:bg-orange-100" onClick={toggleAll}>
                                {selectedLeadIds.size > 0 && selectedLeadIds.size === filteredLeads.length ? <CheckSquare size={16}/> : <Square size={16}/>}
                            </th>
                            <th className="px-6 py-4">Lead Name</th>
                            <th className="px-6 py-4">Company / Role</th>
                            <th className="px-6 py-4">Interest</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading pipeline...</td></tr>
                        ) : filteredLeads.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">No active leads found.</td></tr>
                        ) : (
                            filteredLeads.map(lead => (
                                <tr 
                                    key={lead.id} 
                                    className={`hover:bg-slate-50 transition-colors group ${selectedLeadIds.has(lead.id) ? 'bg-orange-50/30' : ''}`}
                                    onClick={() => toggleSelection(lead.id)}
                                >
                                    <td className="px-4 py-4 text-center" onClick={(e) => { e.stopPropagation(); toggleSelection(lead.id); }}>
                                        {selectedLeadIds.has(lead.id) ? <CheckSquare size={16} className="text-orange-600"/> : <Square size={16} className="text-slate-300"/>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 flex items-center gap-1">
                                            {lead.name}
                                            {lead.tags?.includes('Qualified') && <CheckCircle size={12} className="text-blue-500 fill-blue-50"/>}
                                        </div>
                                        <div className="text-xs text-slate-500">{lead.email}</div>
                                        <div className="text-[10px] text-slate-400">{lead.phone}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800">{lead.company || '-'}</div>
                                        <div className="text-xs text-slate-500">{lead.jobTitle}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">
                                            {lead.program || 'General'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            lead.lifecycleStage === 'PARTICIPANT' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {lead.lifecycleStage}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2 items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setProfilingTarget(lead)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" 
                                                title="Profile / Stalk"
                                            >
                                                <UserCog size={16}/>
                                            </button>
                                            
                                            <button 
                                                onClick={() => setResearchTarget(lead)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                                                title="AI Research"
                                            >
                                                <Search size={16}/>
                                            </button>
                                            
                                            <WhatsAppQuickAction 
                                                phone={lead.phone}
                                                name={lead.name}
                                                context="LEADS_PIPELINE"
                                                contextData={{
                                                    member_name: lead.name,
                                                    company: lead.company || 'your company',
                                                    interest: lead.program || 'Leadership Development'
                                                }}
                                            />

                                            <a 
                                                href={`mailto:${lead.email}`}
                                                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                                title="Email"
                                            >
                                                <Mail size={16}/>
                                            </a>
                                            <button 
                                                onClick={() => handleConvert(lead)}
                                                className="flex items-center px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded hover:bg-slate-800 ml-2 shadow-sm"
                                                title="Convert Lead to Member"
                                            >
                                                Convert <ChevronRight size={12} className="ml-1"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            {/* FLOATING ACTION BAR FOR BULK INVITE */}
            {selectedLeadIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] animate-fade-in-up">
                    <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-700">
                        <div className="flex items-center gap-2 border-r border-slate-700 pr-6">
                            <span className="bg-orange-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                                {selectedLeadIds.size}
                            </span>
                            <span className="text-sm font-medium text-slate-300">Leads Selected</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setIsInviteModalOpen(true)}
                                className="flex items-center gap-2 text-sm font-bold hover:text-orange-400 transition-colors"
                            >
                                <Mail size={18} className="text-orange-500"/>
                                Invite to Event
                            </button>
                            
                            <div className="w-px h-4 bg-slate-700"></div>
                            
                            <button 
                                onClick={() => setSelectedLeadIds(new Set())}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {researchTarget && (
                <DeepResearchPanel 
                    context={{
                        fullName: researchTarget.name,
                        email: researchTarget.email,
                        company: researchTarget.company,
                        city: researchTarget.address?.city,
                        targetMemberId: researchTarget.id
                    }}
                    onClose={() => setResearchTarget(null)}
                />
            )}

            {profilingTarget && (
                <MemberProfilingModal 
                    member={profilingTarget} 
                    onClose={() => setProfilingTarget(null)}
                    onSuccess={loadLeads}
                />
            )}

            {isInviteModalOpen && (
                <InviteMembersModal 
                    isOpen={isInviteModalOpen}
                    onClose={() => setIsInviteModalOpen(false)}
                    selectedMemberIds={Array.from(selectedLeadIds)}
                    onSuccess={() => {
                        setSelectedLeadIds(new Set());
                        loadLeads();
                    }}
                />
            )}
        </div>
    );
};

export default LeadsDashboard;
