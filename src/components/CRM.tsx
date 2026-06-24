
import React, { useEffect, useState, useMemo } from 'react';
import { Member, SupportTicket } from '../types/index';
import { DataService } from '../services/dataService';
import { SupportService } from '../services/supportService';
import { OpsService } from '../services/opsService'; 
import { OpsChecklist } from '../types/ops'; 
// Added AlertCircle and ChevronRight to the imports
import { Search, Filter, Mail, Edit3, LifeBuoy, Sparkles, History, User, CheckSquare, Award, Tag, Square, X, MapPin, Briefcase, Globe, Linkedin, Phone, Building, AlertCircle, ChevronRight, UserPlus, UserCog, CheckCircle } from 'lucide-react';
import WhatsAppQuickAction from './common/WhatsAppQuickAction';
import { useAccess } from '../context/SecurityContext';
import EditMemberModal from './crm/EditMemberModal';
import TicketModal from './crm/TicketModal';
import DeepResearchPanel from './crm/DeepResearchPanel';
import { UserJourneyModal } from './crm/UserJourneyModal'; 
import { useToast } from '../context/ToastContext';
import MemberFilterPanel, { FilterCriteria } from './crm/MemberFilterPanel'; 
import InviteMembersModal from './crm/InviteMembersModal'; 
import MemberProfilingModal from './crm/MemberProfilingModal'; // NEW
import { isMemberDatabaseLifecycle } from '../lib/memberLifecycleViews';

const CRM: React.FC = () => {
    const { can } = useAccess('crm_members');
    const { showToast } = useToast();
    
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filter & Drawer State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterCriteria>({});
    const [selectedMemberForView, setSelectedMemberForView] = useState<Member | null>(null);
    const [showQualifiedOnly, setShowQualifiedOnly] = useState(false); // NEW

    // Selection State
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    // Auxiliary Data
    const [checklists, setChecklists] = useState<OpsChecklist[]>([]);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [ticketMember, setTicketMember] = useState<Member | null>(null);
    const [researchMember, setResearchMember] = useState<Member | null>(null);
    const [journeyMember, setJourneyMember] = useState<Member | null>(null);
    const [profilingMember, setProfilingMember] = useState<Member | null>(null); // NEW
    const [memberTickets, setMemberTickets] = useState<SupportTicket[]>([]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        const [membersData, opsData] = await Promise.all([
            DataService.getMembers(),
            OpsService.getChecklists() 
        ]);
        setMembers(membersData);
        setChecklists(opsData);
        setLoading(false);
    };

    const handleEditSave = async (updated: Member) => {
        await DataService.updateMember(updated.id, updated);
        showToast('Member updated', 'success');
        setEditingMember(null);
        setSelectedMemberForView(updated); // Sync drawer
        loadData();
    };

    // --- REFACTORED ROBUST FILTER LOGIC ---
    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            // Member Database: hanya ekosistem berbayar / certified / facilitator (satu tabel, filter by lifecycle)
            if (!isMemberDatabaseLifecycle(m.lifecycleStage)) return false;

            // 0. Qualified Filter
            if (showQualifiedOnly) {
                if (!m.tags?.includes('Qualified')) return false;
            }

            // 1. Text Search
            const matchesSearch = 
                m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.company && m.company.toLowerCase().includes(searchTerm.toLowerCase()));
            
            if (!matchesSearch) return false;

            // 2. Date Normalization Helper ("Mar 2024" -> "2024-03")
            const normalizeDate = (dateStr: string) => {
                if (!dateStr) return "";
                if (dateStr.includes('-')) return dateStr; 
                const parts = dateStr.split(' ');
                if (parts.length === 2) {
                    const months: any = { 'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06','Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12' };
                    return `${parts[1]}-${months[parts[0]] || '01'}`;
                }
                return dateStr;
            };

            const memberDateNorm = normalizeDate(m.joinMonth);

            // 3. Advanced Criteria
            if (activeFilters.lifecycleStage && m.lifecycleStage !== activeFilters.lifecycleStage) return false;
            if (activeFilters.joinDateStart && memberDateNorm < activeFilters.joinDateStart) return false;
            if (activeFilters.joinDateEnd && memberDateNorm > activeFilters.joinDateEnd) return false;

            return true;
        });
    }, [members, searchTerm, activeFilters, showQualifiedOnly]);

    const toggleSelection = (id: string) => {
        const next = new Set(selectedMemberIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedMemberIds(next);
    };

    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    const engagementPct = (id: string) => {
        let h = 0;
        for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 60;
        return 40 + h;
    };

    return (
        <div className="page-container space-y-5 sm:space-y-6 animate-fade-in relative pb-20 min-w-0">
            {/* Header Area */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between min-w-0">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <User className="h-5 w-5" strokeWidth={2} />
                        </span>
                        <span className="leading-tight">Member Directory</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm sm:text-base">Manage profiles, memberships, and engagement history.</p>
                </div>
                
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 w-full lg:w-auto min-w-0">
                    <button 
                        type="button"
                        onClick={() => setShowQualifiedOnly(!showQualifiedOnly)}
                        className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${showQualifiedOnly ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Award size={14} className="shrink-0"/> Qualified Only
                    </button>

                    <div className="relative min-w-0 flex-1 sm:min-w-[12rem] sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search name, company, or ID..." 
                            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative shrink-0">
                        <button 
                            type="button"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`rounded-lg border p-2 transition-all flex items-center gap-2 ${Object.values(activeFilters).some(v => !!v) ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-300 text-slate-500 bg-white hover:bg-slate-50'}`}
                        >
                            <Filter size={18} />
                            {Object.values(activeFilters).some(v => !!v) && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                        </button>
                        <MemberFilterPanel 
                            isOpen={isFilterOpen} 
                            onClose={() => setIsFilterOpen(false)}
                            onApply={setActiveFilters}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile: stacked cards (no horizontal table scroll) */}
            <div className="space-y-3 md:hidden min-w-0">
                {loading ? (
                    <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-400">Loading directory...</div>
                ) : filteredMembers.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-400 flex flex-col items-center px-4">
                        <AlertCircle size={32} className="mb-2 text-slate-300"/>
                        <p>No results found for your filters.</p>
                    </div>
                ) : (
                    filteredMembers.map(member => (
                        <div
                            key={member.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedMemberForView(member)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedMemberForView(member); } }}
                            className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors cursor-pointer text-left min-w-0 max-w-full ${selectedMemberForView?.id === member.id ? 'ring-2 ring-blue-200 bg-blue-50/40' : 'hover:bg-slate-50'}`}
                        >
                            <div className="flex gap-3 min-w-0">
                                <button
                                    type="button"
                                    className="shrink-0 pt-0.5 text-slate-400"
                                    onClick={(e) => { e.stopPropagation(); toggleSelection(member.id); }}
                                    aria-label={selectedMemberIds.has(member.id) ? 'Deselect' : 'Select'}
                                >
                                    {selectedMemberIds.has(member.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20} className="text-slate-300" />}
                                </button>
                                <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                                    {member.name.substring(0,2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                                        <span className="break-words">{member.name}</span>
                                        {member.tags?.includes('Qualified') && <CheckCircle size={14} className="text-blue-500 shrink-0" />}
                                    </div>
                                    <div className="text-xs text-slate-500 break-all">{member.email}</div>
                                </div>
                            </div>
                            <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Current status</p>
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${member.lifecycleStage === 'CERTIFIED' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                        {member.lifecycleStage}
                                    </span>
                                    {member.program && <p className="text-xs text-slate-600 mt-1.5">{member.program}</p>}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Engagement</p>
                                    <div className="h-2 max-w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${engagementPct(member.id)}%` }} />
                                    </div>
                                    {member.joinMonth && <p className="text-[11px] text-slate-500 mt-1">{member.joinMonth}</p>}
                                </div>
                                <div className="flex items-center justify-between gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setProfilingMember(member); }}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
                                    >
                                        <UserCog size={16} /> Profile
                                    </button>
                                    <ChevronRight size={20} className="text-slate-300 shrink-0" aria-hidden />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
                <div className="responsive-table-wrap">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-4 w-10">
                                    <Square size={18} className="text-slate-300" />
                                </th>
                                <th className="px-6 py-4">Name & Contact</th>
                                <th className="px-6 py-4">Current Status</th>
                                <th className="px-6 py-4">Engagement</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400">Loading directory...</td></tr>
                            ) : filteredMembers.length === 0 ? (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400"><div className="flex flex-col items-center"><AlertCircle size={32} className="mb-2 text-slate-300"/><p>No results found for your filters.</p></div></td></tr>
                            ) : filteredMembers.map(member => (
                                <tr 
                                    key={member.id} 
                                    onClick={() => setSelectedMemberForView(member)}
                                    className={`hover:bg-slate-50 transition-colors cursor-pointer group ${selectedMemberForView?.id === member.id ? 'bg-blue-50/50' : ''}`}
                                >
                                    <td className="px-4 py-4" onClick={(e) => { e.stopPropagation(); toggleSelection(member.id); }}>
                                        {selectedMemberIds.has(member.id) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18} className="text-slate-300 group-hover:text-slate-400" />}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center min-w-0">
                                            <div className="h-9 w-9 shrink-0 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs mr-3">
                                                {member.name.substring(0,2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-900 flex items-center gap-1">
                                                    <span className="truncate">{member.name}</span>
                                                    {member.tags?.includes('Qualified') && <CheckCircle size={12} className="text-blue-500 fill-blue-50 shrink-0"/>}
                                                </div>
                                                <div className="text-xs text-slate-500 truncate">{member.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${member.lifecycleStage === 'CERTIFIED' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                            {member.lifecycleStage}
                                        </span>
                                        <div className="text-[10px] text-slate-400 mt-1">{member.program}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: `${engagementPct(member.id)}%` }}></div>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1">{member.joinMonth}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2">
                                             <button 
                                                type="button"
                                                onClick={() => setProfilingMember(member)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                title="Profile / Stalk"
                                             >
                                                 <UserCog size={16}/>
                                             </button>
                                             <ChevronRight size={18} className="text-slate-300 ml-2" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FLOATING SELECTION BAR - WORLD CLASS UX */}
            {selectedMemberIds.size > 0 && (
                <div className="fixed bottom-6 left-4 right-4 z-[90] flex justify-center animate-fade-in-up sm:bottom-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-0">
                    <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex flex-col gap-3 border border-slate-700 w-full max-w-lg sm:flex-row sm:items-center sm:gap-6 sm:px-6">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-3 sm:border-b-0 sm:pb-0 sm:border-r sm:pr-6">
                            <div className="flex items-center gap-2">
                            <span className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                                {selectedMemberIds.size}
                            </span>
                            <span className="text-sm font-medium text-slate-300">Selected</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                            <button 
                                onClick={() => setIsInviteModalOpen(true)}
                                className="flex items-center gap-2 text-sm font-bold hover:text-blue-400 transition-colors"
                            >
                                <Mail size={18} className="text-blue-500"/>
                                Invite to Event
                            </button>
                            
                            <div className="w-px h-4 bg-slate-700"></div>
                            
                            <button 
                                onClick={() => setSelectedMemberIds(new Set())}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUICK-VIEW SIDE DRAWER - WORLD CLASS UX */}
            {selectedMemberForView && (
                <>
                    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100]" onClick={() => setSelectedMemberForView(null)}></div>
                    <div className="fixed top-0 right-0 w-full max-w-md h-full bg-white shadow-2xl z-[101] animate-fade-in-right flex flex-col border-l border-slate-200">
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-900">Member Insights</h3>
                            <button onClick={() => setSelectedMemberForView(null)} className="p-1.5 text-slate-400 hover:text-slate-800 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Profile Header */}
                            <div className="text-center">
                                <div className="w-24 h-24 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-3xl font-bold mx-auto shadow-xl shadow-blue-200 mb-4">
                                    {selectedMemberForView.name.substring(0,2).toUpperCase()}
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
                                    {selectedMemberForView.name}
                                    {selectedMemberForView.tags?.includes('Qualified') && <CheckCircle size={18} className="text-blue-500 fill-blue-50"/>}
                                </h2>
                                <p className="text-sm text-slate-500">{selectedMemberForView.email}</p>
                                <div className="flex justify-center gap-2 mt-4">
                                    <button onClick={() => setEditingMember(selectedMemberForView)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={16}/></button>
                                    <button onClick={() => setProfilingMember(selectedMemberForView)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><UserCog size={16}/></button>
                                    <WhatsAppQuickAction phone={selectedMemberForView.phone} name={selectedMemberForView.name} contextData={{ member_name: selectedMemberForView.name }} variant="button" label="WhatsApp" />
                                </div>
                            </div>

                            {/* Data Grid */}
                            <div className="grid grid-cols-1 gap-4 pt-6 border-t border-slate-100">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Professional Context</h4>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Building className="text-slate-400 mt-1" size={16}/>
                                        <div><p className="text-xs text-slate-400">Company</p><p className="text-sm font-bold text-slate-800">{selectedMemberForView.company || 'Private Practice'}</p></div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Briefcase className="text-slate-400 mt-1" size={16}/>
                                        <div><p className="text-xs text-slate-400">Role & Industry</p><p className="text-sm font-bold text-slate-800">{selectedMemberForView.jobTitle || '-'} • {selectedMemberForView.industry || 'Unknown'}</p></div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="text-slate-400 mt-1" size={16}/>
                                        <div><p className="text-xs text-slate-400">Location</p><p className="text-sm font-bold text-slate-800">{selectedMemberForView.address?.city || 'Not set'}</p></div>
                                    </div>
                                    {selectedMemberForView.socialProfile && (
                                        <div className="bg-indigo-50 p-3 rounded-lg text-xs space-y-2">
                                            <p className="font-bold text-indigo-800">Social Intelligence</p>
                                            <p>IG Followers: {selectedMemberForView.socialProfile.igFollowers}</p>
                                            <p>Type: {selectedMemberForView.socialProfile.businessType}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedMemberForView.socialProfile.businessAccounts.map((b,i) => <span key={i} className="bg-white px-1 rounded">{b}</span>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Membership Details */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Membership Standing</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="text-[10px] text-slate-400">Category</p><p className="text-xs font-bold text-slate-800">{selectedMemberForView.category}</p></div>
                                    <div><p className="text-[10px] text-slate-400">Joined</p><p className="text-xs font-bold text-slate-800">{selectedMemberForView.joinMonth}</p></div>
                                    <div><p className="text-[10px] text-slate-400">Service Level</p><p className="text-xs font-bold text-slate-800">{selectedMemberForView.serviceLevel || 'Standard'}</p></div>
                                    <div><p className="text-[10px] text-slate-400">Scholarship</p><p className="text-xs font-bold text-slate-800">{selectedMemberForView.scholarship ? 'Yes' : 'No'}</p></div>
                                </div>
                            </div>

                            {/* Achievements */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Award size={14}/> Certifications</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(selectedMemberForView.achievements && selectedMemberForView.achievements.length > 0) ? 
                                        selectedMemberForView.achievements.map((ach: any) => (
                                            <span key={ach.id} className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200">
                                                {ach.name}
                                            </span>
                                        )) : <p className="text-xs text-slate-400 italic">No certificates issued yet.</p>
                                    }
                                </div>
                            </div>

                            {/* Action History Quick Link */}
                            <div className="pt-4 flex flex-col gap-2">
                                <button onClick={() => setJourneyMember(selectedMemberForView)} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                                    <History size={14}/> Full Journey Timeline
                                </button>
                                <button onClick={() => setResearchMember(selectedMemberForView)} className="w-full py-2.5 border border-blue-600 text-blue-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
                                    <Sparkles size={14}/> AI Profile Deep Research
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* MODALS */}
            {editingMember && <EditMemberModal member={editingMember} onClose={() => setEditingMember(null)} onSave={handleEditSave} />}
            {ticketMember && <TicketModal member={ticketMember} existingTickets={memberTickets} onClose={() => setTicketMember(null)} onSave={() => {}} />}
            {researchMember && <DeepResearchPanel context={{ fullName: researchMember.name, targetMemberId: researchMember.id }} onClose={() => setResearchMember(null)} />}
            {journeyMember && <UserJourneyModal member={journeyMember} onClose={() => setJourneyMember(null)} />}
            {profilingMember && <MemberProfilingModal member={profilingMember} onClose={() => setProfilingMember(null)} onSuccess={loadData} />}
            
            {isInviteModalOpen && (
                <InviteMembersModal 
                    isOpen={isInviteModalOpen} 
                    onClose={() => setIsInviteModalOpen(false)} 
                    selectedMemberIds={Array.from(selectedMemberIds)}
                    onSuccess={() => {
                        setSelectedMemberIds(new Set());
                        loadData();
                    }}
                />
            )}
        </div>
    );
};

export default CRM;
