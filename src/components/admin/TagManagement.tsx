
import React, { useState, useEffect, useMemo } from 'react';
import { CreditTagService } from '../../services/creditTagService';
import { DataService } from '../../services/dataService';
import { EntitlementService } from '../../services/entitlementService'; // NEW
import { CreditTagMaster, WalletItem } from '../../types/access';
import { formatEventSelectLabel, truncateSelectLabel } from '../../utils/selectLabels';
import { Event, Member } from '../../types/index';
import { useToast } from '../../context/ToastContext';
import { useDialog } from '../../context/DialogContext';
import { Tag, Plus, Edit3, Trash2, X, Save, Zap, Info, Link, ArrowRight, Layers, Ticket, Unlink, CheckCircle2, Lock, Key, AlertCircle, AlertTriangle, Users, Wallet } from 'lucide-react';
import EventForm from '../ops/events/EventForm'; 
import { CertificationService } from '../../services/certificationService';

const TagManagement: React.FC = () => {
    const { showToast } = useToast();
    const { confirm } = useDialog();
    
    // Data Stores
    const [tags, setTags] = useState<CreditTagMaster[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [walletItems, setWalletItems] = useState<WalletItem[]>([]); // NEW
    const [members, setMembers] = useState<Member[]>([]); // NEW
    
    // UI State
    const [activeTab, setActiveTab] = useState<'MASTER' | 'ASSIGNMENT'>('MASTER');
    const [detailViewMode, setDetailViewMode] = useState<'ACCESS' | 'ISSUANCE' | 'HOLDERS'>('ISSUANCE'); 
    const [loading, setLoading] = useState(true);
    
    // CRUD State (For Tag Master)
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<CreditTagMaster>>({});

    // Assignment View State
    const [selectedTagForAssignment, setSelectedTagForAssignment] = useState<CreditTagMaster | null>(null);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null); 
    
    // NEW: Assignment Form State
    const [eventToAddId, setEventToAddId] = useState<string>(''); 
    const [tierToAddId, setTierToAddId] = useState<string>(''); 
    
    // Master data for EventForm if opened
    const [masterDoneTags, setMasterDoneTags] = useState<any[]>([]);
    const [availableCreditTags, setAvailableCreditTags] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Tags, Events, Wallets, and Members concurrently
            const [tagsData, eventsData, dTags, cTags, wItems, membersData] = await Promise.all([
                CreditTagService.getAllTags(),
                DataService.getEvents(),
                CertificationService.getMasterTags(),
                CreditTagService.getTagOptions(),
                EntitlementService.getAllWalletItems(), // NEW: For Holders View
                DataService.getMembers() // NEW: For Name Resolution
            ]);
            setTags(tagsData);
            setEvents(eventsData);
            setMasterDoneTags(dTags);
            setAvailableCreditTags(cTags);
            setWalletItems(wItems);
            setMembers(membersData);
        } catch (error) {
            console.error('Failed to load tag management data', error);
            showToast(error instanceof Error ? error.message : 'Failed to load Credit Tag data.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- COMPUTED: ORPHAN COUNTS ---
    // Efficiently calculate which tags are required by events but granted by NO tiers in those events
    const orphanCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        tags.forEach(tag => {
            const problematicEvents = events.filter(e => {
                const requiresTag = e.creditTags?.includes(tag.code);
                if (!requiresTag) return false;
                
                // Check if ANY tier in this event grants this tag
                const hasGrantingTier = e.tiers?.some(t => t.grantTagIds?.includes(tag.code));
                return !hasGrantingTier; // It's a problem if required but not granted
            });
            if (problematicEvents.length > 0) {
                counts[tag.id] = problematicEvents.length;
            }
        });
        return counts;
    }, [tags, events]);

    // --- COMPUTED: ACTIVE HOLDERS ---
    const activeHolders = useMemo(() => {
        if (!selectedTagForAssignment) return [];
        
        // Filter wallet items for this tag that are active/valid
        const holders = walletItems.filter(item => {
            if (item.type !== 'CREDIT_PASS' && item.type !== 'TICKET') return false;
            // Check Tag Match
            const tagMatch = item.meta?.tag === selectedTagForAssignment.code || 
                             item.meta?.creditTag === selectedTagForAssignment.code; // Handle legacy meta key
            
            // Check Validity
            const isNotExpired = !item.expiryDate || new Date(item.expiryDate) > new Date();
            const hasBalance = (item.meta?.isUnlimited) || (item.meta?.credits > 0);
            
            return tagMatch && item.status === 'ACTIVE' && isNotExpired && hasBalance;
        });

        // Resolve Member Names (Simulating SQL JOIN)
        return holders.map(h => {
            const member = members.find(m => m.id === h.userId);
            return {
                ...h,
                memberName: member?.name || 'Unknown User',
                memberEmail: member?.email || 'N/A'
            };
        }).sort((a,b) => a.memberName.localeCompare(b.memberName));
    }, [selectedTagForAssignment, walletItems, members]);

    // --- MASTER TAB HANDLERS (CRUD) ---
    const handleCreate = () => {
        setEditForm({
            id: `TAG-${Date.now()}`,
            code: '',
            name: '',
            type: 'CONSUMABLE_CREDIT',
            usageLimit: 1,
            description: '',
            isActive: true
        });
        setIsEditing(true);
    };

    const handleEdit = (tag: CreditTagMaster) => {
        setEditForm({ ...tag });
        setIsEditing(true);
    };

    const handleDelete = async (tag: CreditTagMaster) => {
        const ok = await confirm({
            title: 'Delete credit tag?',
            variant: 'danger',
            confirmLabel: 'Delete tag',
            message: (
                <span>
                    Delete <strong className="font-mono text-slate-800">{tag.code}</strong> ({tag.name})?
                    <br />
                    <span className="text-xs text-slate-500">
                        Make sure the tag is not used on active events, tiers, or products — removing it can break access and sales flows.
                    </span>
                </span>
            ),
        });
        if (!ok) return;
        try {
            await CreditTagService.deleteTag(tag.id);
            showToast('Tag deleted successfully', 'success');
            await loadData();
        } catch (e) {
            showToast(
                e instanceof Error ? e.message : 'Could not delete tag.',
                'error',
            );
        }
    };

    const handleSave = async () => {
        if (!editForm.code || !editForm.name) {
            showToast('Code and Name are required.', 'error');
            return;
        }
        await CreditTagService.upsertTag(editForm as CreditTagMaster);
        showToast('Tag saved successfully', 'success');
        setIsEditing(false);
        loadData();
    };

    // --- ASSIGNMENT TAB LOGIC ---
    
    // 1. "Required By": Events that demand this tag for entry
    const requiredByEvents = useMemo(() => {
        if (!selectedTagForAssignment) return [];
        return events.filter(e => e.creditTags && e.creditTags.includes(selectedTagForAssignment.code));
    }, [events, selectedTagForAssignment]);

    // 2. "Available Events": Events (for dropdown)
    const availableEventsToAdd = useMemo(() => {
        if (!selectedTagForAssignment) return [];
        return events.sort((a,b) => a.name.localeCompare(b.name));
    }, [events, selectedTagForAssignment]);

    // 2b. "Available Tiers": Dependent on selected event
    const availableTiersForSelectedEvent = useMemo(() => {
        if (!eventToAddId) return [];
        const evt = events.find(e => e.id === eventToAddId);
        return evt?.tiers || [];
    }, [events, eventToAddId]);

    // 3. "Granted By": Tiers that give this tag
    const grantedByTiers = useMemo(() => {
        if (!selectedTagForAssignment) return [];
        const result: { event: Event, tierName: string, tierId: string, otherTagsCount: number }[] = [];
        
        events.forEach(e => {
            if (e.tiers) {
                e.tiers.forEach(t => {
                    if (t.grantTagIds && t.grantTagIds.includes(selectedTagForAssignment.code)) {
                        result.push({ 
                            event: e, 
                            tierName: t.name,
                            tierId: t.id,
                            otherTagsCount: t.grantTagIds.length - 1 
                        });
                    }
                });
            }
        });
        return result;
    }, [events, selectedTagForAssignment]);

    // Handlers for Assignment Modifications
    const handleAssignTagToEvent = async () => {
        if (!eventToAddId || !selectedTagForAssignment) return;
        
        const targetEvent = events.find(e => e.id === eventToAddId);
        if (!targetEvent) return;

        // MODE 1: GRANTING (Tag added to Tier)
        if (detailViewMode === 'ISSUANCE' && tierToAddId) {
            const updatedTiers = targetEvent.tiers?.map(t => {
                if (t.id === tierToAddId) {
                    const currentGrants = t.grantTagIds || [];
                    if (!currentGrants.includes(selectedTagForAssignment.code)) {
                        return { ...t, grantTagIds: [...currentGrants, selectedTagForAssignment.code] };
                    }
                }
                return t;
            }) || [];

            await DataService.upsertEvent({ ...targetEvent, tiers: updatedTiers });
            showToast(`Tag ${selectedTagForAssignment.code} added to Tier in ${targetEvent.name}`, 'success');
        } 
        // MODE 2: REQUIREMENT (Tag added to Event Access)
        else if (detailViewMode === 'ACCESS') {
             const currentTags = targetEvent.creditTags || [];
             if (!currentTags.includes(selectedTagForAssignment.code)) {
                 const updatedTags = [...currentTags, selectedTagForAssignment.code];
                 await DataService.upsertEvent({ ...targetEvent, creditTags: updatedTags });
                 showToast(`Access Rule: ${targetEvent.name} now requires ${selectedTagForAssignment.code}`, 'success');
             }
        }

        setEventToAddId(''); 
        setTierToAddId('');
        loadData(); // Refresh to update lists
    };

    const handleRemoveTagFromEvent = async (event: Event) => {
        if (!selectedTagForAssignment) return;
        const ok = await confirm({
            title: 'Remove access requirement?',
            variant: 'warning',
            confirmLabel: 'Remove',
            message: (
                <span>
                    Remove access requirement <strong>{selectedTagForAssignment.name}</strong> from event{' '}
                    <strong>{event.name}</strong>?
                </span>
            ),
        });
        if (!ok) return;

        const currentTags = event.creditTags || [];
        const updatedTags = currentTags.filter(t => t !== selectedTagForAssignment.code);

        await DataService.upsertEvent({ ...event, creditTags: updatedTags });
        showToast(`Tag requirement removed from ${event.name}`, 'success');
        loadData();
    };

    const handleRemoveTagFromTier = async (event: Event, tierId: string) => {
         if (!selectedTagForAssignment) return;
         const tierName =
             event.tiers?.find((t) => t.id === tierId)?.name ?? 'this tier';
         const ok = await confirm({
             title: 'Stop granting this tag?',
             variant: 'warning',
             confirmLabel: 'Remove grant',
             message: (
                 <span>
                     Stop granting tag <strong>{selectedTagForAssignment.name}</strong> via tier{' '}
                     <strong>{tierName}</strong> on event <strong>{event.name}</strong>?
                 </span>
             ),
         });
         if (!ok) return;

         const updatedTiers = event.tiers?.map(t => {
            if (t.id === tierId) {
                return { ...t, grantTagIds: (t.grantTagIds || []).filter(g => g !== selectedTagForAssignment.code) };
            }
            return t;
         });

         await DataService.upsertEvent({ ...event, tiers: updatedTiers });
         showToast(`Tag removed from Tier`, 'success');
         loadData();
    };

    const handleJumpToEvent = (event: Event) => {
        setEditingEvent(event);
    };

    const handleSaveEventFromAssignment = async (data: Partial<Event>) => {
        await DataService.upsertEvent({ ...editingEvent!, ...data });
        showToast('Event configuration updated.', 'success');
        setEditingEvent(null);
        loadData();
    };

    const handleTagSelect = (tag: CreditTagMaster) => {
        setSelectedTagForAssignment(tag);
        // Default to Holders view if just browsing, or Issuance if configuring
        // Keeping current view mode is better for UX flow
        setEventToAddId('');
        setTierToAddId('');
    };

    return (
        <div className="page-container relative w-full min-w-0 animate-fade-in">
            <div className="mb-5 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-start lg:justify-between min-w-0">
                <div className="flex min-w-0 gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Tag className="h-6 w-6" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold leading-snug text-slate-900 sm:text-2xl">Credit Tag Master</h1>
                        <p className="mt-1 text-sm text-slate-500 sm:text-base">Manage access tokens, validity, and holders.</p>
                    </div>
                </div>
                
                <div className="w-full max-w-full shrink-0 overflow-x-scroll-touch rounded-lg bg-slate-100 p-1 lg:w-auto">
                    <div className="inline-flex max-w-none flex-nowrap gap-1">
                    <button 
                        type="button"
                        onClick={() => setActiveTab('MASTER')} 
                        className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2.5 text-center text-sm font-bold transition-all sm:min-h-[44px] sm:px-4 ${activeTab === 'MASTER' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                    >
                        Master List
                    </button>
                    <button 
                        type="button"
                        onClick={() => setActiveTab('ASSIGNMENT')} 
                        className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2.5 text-center text-sm font-bold leading-snug transition-all sm:min-h-[44px] sm:px-4 ${activeTab === 'ASSIGNMENT' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
                    >
                        Tag Usage &amp; Assignment
                    </button>
                    </div>
                </div>
            </div>

            {/* TAB CONTENT CONTAINER */}
            <div className="relative flex min-h-[50vh] flex-1 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm sm:min-h-[480px]">
                
                {/* 1. MASTER LIST TAB (Existing Functionality) */}
                {activeTab === 'MASTER' && (
                    <div className="h-full flex flex-col">
                        <div className="p-4 border-b border-slate-300 flex justify-end">
                            <button onClick={handleCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center hover:bg-indigo-700 shadow-sm">
                                <Plus size={16} className="mr-2"/> New Tag
                            </button>
                        </div>
                        <div className="responsive-table-wrap flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4">Tag Code (ID)</th>
                                        <th className="p-4">Name</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Usage Rule</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-300">
                                    {loading ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading tags...</td></tr>
                                    ) : tags.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">No tags defined.</td></tr>
                                    ) : (
                                        tags.map(tag => (
                                            <tr key={tag.id} className="hover:bg-slate-50">
                                                <td className="p-4 font-mono text-xs font-bold text-blue-600">{tag.code}</td>
                                                <td className="p-4 font-bold text-slate-900">
                                                    {tag.name}
                                                    <div className="text-[10px] font-normal text-slate-500">{tag.description}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] px-2 py-1 rounded font-bold border ${tag.type === 'UNLIMITED_ACCESS' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                        {tag.type.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs text-slate-600">
                                                    {tag.type === 'UNLIMITED_ACCESS' ? 'Unlimited Use' : `${tag.usageLimit} Credit(s) per Item`}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] px-2 py-1 rounded-full ${tag.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {tag.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleEdit(tag)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit3 size={16}/></button>
                                                        <button type="button" onClick={() => void handleDelete(tag)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" aria-label={`Delete tag ${tag.code}`}><Trash2 size={16}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 2. ASSIGNMENT TAB (The Master-Detail View) */}
                {activeTab === 'ASSIGNMENT' && (
                    <div className="flex h-full min-h-0 flex-col md:flex-row">
                        {/* Left: Master Selector */}
                        <div className="flex max-h-[min(42vh,360px)] w-full shrink-0 flex-col overflow-hidden border-b border-slate-300 bg-slate-50 md:max-h-none md:w-80 md:border-b-0 md:border-r">
                            <div className="border-b border-slate-300 bg-white p-4">
                                <h3 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Select Tag to Manage</h3>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto">
                                {tags.map(tag => {
                                    const orphans = orphanCounts[tag.id] || 0;
                                    return (
                                        <button
                                            key={tag.id}
                                            onClick={() => handleTagSelect(tag)}
                                            className={`w-full text-left p-4 border-b border-slate-300 hover:bg-blue-50 transition-colors ${selectedTagForAssignment?.id === tag.id ? 'bg-white border-l-4 border-l-blue-600 shadow-sm' : 'border-l-4 border-l-transparent'}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="font-bold text-sm text-slate-800">{tag.name}</div>
                                                {orphans > 0 && (
                                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold flex items-center" title={`${orphans} events require this tag but grant it nowhere!`}>
                                                        <AlertTriangle size={8} className="mr-1"/> {orphans}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{tag.code}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Detail & Assignment */}
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
                            {!selectedTagForAssignment ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                    <Link size={48} className="mb-4 opacity-20"/>
                                    <p className="font-bold text-slate-400">Select a Tag to view usage & assignments</p>
                                </div>
                            ) : (
                                <>
                                    {/* Tag Header Summary */}
                                    <div className="border-b border-slate-300 bg-slate-50/50 p-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <h2 className="text-xl font-bold text-slate-900">{selectedTagForAssignment.name}</h2>
                                            <span className={`text-xs font-bold px-2 py-1 rounded border ${selectedTagForAssignment.type === 'UNLIMITED_ACCESS' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                {selectedTagForAssignment.type.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 font-mono text-blue-600">{selectedTagForAssignment.code}</p>
                                        
                                        {/* DETAIL MODE TABS */}
                                        <div className="flex mt-6 gap-2">
                                            <button 
                                                onClick={() => setDetailViewMode('ISSUANCE')}
                                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all flex items-center justify-center ${
                                                    detailViewMode === 'ISSUANCE' 
                                                    ? 'bg-green-600 text-white border-green-600 shadow-sm' 
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <Key size={14} className="mr-2"/> Granted By (Tiers)
                                            </button>
                                            <button 
                                                onClick={() => setDetailViewMode('ACCESS')}
                                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all flex items-center justify-center ${
                                                    detailViewMode === 'ACCESS' 
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <Lock size={14} className="mr-2"/> Required By (Events)
                                            </button>
                                            <button 
                                                onClick={() => setDetailViewMode('HOLDERS')}
                                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all flex items-center justify-center ${
                                                    detailViewMode === 'HOLDERS' 
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <Users size={14} className="mr-2"/> Active Holders ({activeHolders.length})
                                            </button>
                                        </div>
                                    </div>

                                    {/* SCROLLABLE CONTENT AREA */}
                                    <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
                                        
                                        {/* SHARED ASSIGNMENT TOOL (Only visible in Config Modes) */}
                                        {detailViewMode !== 'HOLDERS' && (
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                                                <label className="block text-xs font-bold text-slate-800 uppercase mb-2">
                                                    {detailViewMode === 'ISSUANCE' ? 'Add to Ticket Tier (Grant)' : 'Add Access Requirement'}
                                                </label>
                                                <div className="flex gap-3 items-end">
                                                    <div className="flex-1 space-y-2">
                                                        {/* Step 1: Event */}
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-500 mb-1 block">1. Select Target Event</span>
                                                            <select 
                                                                className="mobile-safe-select rounded border border-slate-300 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                                value={eventToAddId}
                                                                onChange={e => { setEventToAddId(e.target.value); setTierToAddId(''); }}
                                                            >
                                                                <option value="">-- Choose Event --</option>
                                                                {availableEventsToAdd.map((e) => (
                                                                    <option key={e.id} value={e.id} title={`${e.name} (${new Date(e.date).toLocaleDateString()})`}>
                                                                        {formatEventSelectLabel(e)}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        
                                                        {/* Step 2: Tier (Conditional) */}
                                                        {eventToAddId && detailViewMode === 'ISSUANCE' && (
                                                            <div className="animate-fade-in">
                                                                <span className="text-[10px] font-bold text-slate-500 mb-1 block">2. Select Ticket Tier</span>
                                                                {availableTiersForSelectedEvent.length > 0 ? (
                                                                    <select 
                                                                        className="mobile-safe-select rounded border border-slate-300 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                                        value={tierToAddId}
                                                                        onChange={e => setTierToAddId(e.target.value)}
                                                                    >
                                                                        <option value="">-- Choose Tier --</option>
                                                                        {availableTiersForSelectedEvent.map((t) => (
                                                                            <option key={t.id} value={t.id} title={`${t.name} (${t.quota} seats)`}>
                                                                                {truncateSelectLabel(`${t.name} (${t.quota} seats)`, 40)}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                ) : (
                                                                    <div className="p-2 bg-red-50 border border-red-100 rounded text-xs text-red-600 flex items-center">
                                                                        <AlertCircle size={12} className="mr-2"/> Event has no tiers configured.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button 
                                                        onClick={handleAssignTagToEvent}
                                                        disabled={!eventToAddId || (detailViewMode === 'ISSUANCE' && !tierToAddId)}
                                                        className={`px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-sm mb-0.5 flex items-center h-fit disabled:opacity-50 ${detailViewMode === 'ISSUANCE' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                    >
                                                        <Plus size={16} className="mr-1"/> Assign
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* VIEW A: ISSUANCE (Granted By) */}
                                        {detailViewMode === 'ISSUANCE' && (
                                            <div>
                                                <div className="mb-4 flex items-center justify-between">
                                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center">
                                                        <Key size={16} className="mr-2 text-green-500"/> Source of Tag
                                                    </h3>
                                                    <span className="text-[10px] text-slate-400">Users receive this tag when they buy these tiers</span>
                                                </div>
                                                
                                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                    {grantedByTiers.length === 0 ? (
                                                        <div className="p-8 text-center text-xs text-slate-400 italic">
                                                            No ticket tiers currently grant this tag.
                                                            <br/>Select an event and tier above to assign.
                                                        </div>
                                                    ) : (
                                                        grantedByTiers.map((item, idx) => (
                                                            <div key={`${item.event.id}-${idx}`} className="p-4 border-b border-slate-300 last:border-0 flex justify-between items-center hover:bg-green-50/10 transition-colors">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-sm text-slate-800">{item.event.name}</span>
                                                                        <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200 font-bold">{item.tierName}</span>
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 mt-1 flex items-center">
                                                                        Grants this tag 
                                                                        {item.otherTagsCount > 0 && <span className="ml-1 text-slate-400">(and {item.otherTagsCount} others)</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => handleJumpToEvent(item.event)}
                                                                        className="text-xs bg-white border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 font-medium flex items-center shadow-sm"
                                                                    >
                                                                        Manage Tiers <ArrowRight size={12} className="ml-1"/>
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleRemoveTagFromTier(item.event, item.tierId)}
                                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                                        title="Remove Grant"
                                                                    >
                                                                        <Unlink size={16}/>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* VIEW B: ACCESS CONTROL (Required By) */}
                                        {detailViewMode === 'ACCESS' && (
                                            <div>
                                                <div className="mb-4 flex items-center justify-between">
                                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center">
                                                        <Lock size={16} className="mr-2 text-blue-500"/> Protected Events
                                                    </h3>
                                                    <span className="text-[10px] text-slate-400">Users must have this tag to enter these events</span>
                                                </div>

                                                {/* List of Required Events */}
                                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                    {requiredByEvents.length === 0 ? (
                                                        <div className="p-8 text-center text-xs text-slate-400 italic">
                                                            No events currently require this tag for entry.
                                                            <br/>Use the form above to add an access rule.
                                                        </div>
                                                    ) : (
                                                        requiredByEvents.map(evt => {
                                                            // Calculate Error State: Event Requires Tag but no Tier Grants it
                                                            // We check if any tier of this event grants the currently selected tag
                                                            const isOrphaned = !evt.tiers?.some(t => t.grantTagIds?.includes(selectedTagForAssignment.code));

                                                            return (
                                                                <div key={evt.id} className="p-4 border-b border-slate-300 last:border-0 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2 bg-blue-100 rounded text-blue-600"><CheckCircle2 size={16}/></div>
                                                                        <div>
                                                                            <div className="font-bold text-sm text-slate-800">{evt.name}</div>
                                                                            <div className="text-xs text-slate-500">{new Date(evt.date).toLocaleDateString()} • {evt.location}</div>
                                                                            
                                                                            {/* ERROR BADGE */}
                                                                            {isOrphaned && (
                                                                                <div className="mt-1 flex items-center text-[10px] text-red-600 font-bold animate-pulse">
                                                                                    <AlertTriangle size={10} className="mr-1"/> No Tier Issue: No ticket grants this access!
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button 
                                                                            onClick={() => handleJumpToEvent(evt)}
                                                                            className="text-xs bg-white border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 font-medium flex items-center shadow-sm"
                                                                        >
                                                                            Edit Event <ArrowRight size={12} className="ml-1"/>
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleRemoveTagFromEvent(evt)}
                                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                                            title="Unlink Tag (Remove Access Rule)"
                                                                        >
                                                                            <Unlink size={16}/>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* VIEW C: ACTIVE HOLDERS (User List) */}
                                        {detailViewMode === 'HOLDERS' && (
                                            <div>
                                                 <div className="grid grid-cols-2 gap-4 mb-6">
                                                     <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl shadow-sm">
                                                         <div className="text-xs text-indigo-500 font-bold uppercase mb-1">Total Holders</div>
                                                         <div className="text-2xl font-bold text-indigo-900">{activeHolders.length} Users</div>
                                                     </div>
                                                     <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                                         <div className="text-xs text-slate-400 font-bold uppercase mb-1">Total Credits (Circulating)</div>
                                                         <div className="text-2xl font-bold text-slate-700">
                                                             {activeHolders.reduce((acc, curr) => acc + (curr.meta?.isUnlimited ? 0 : (curr.meta?.credits || 0)), 0)}
                                                             {activeHolders.some(h => h.meta?.isUnlimited) && <span className="text-sm font-normal text-slate-400 ml-1">+ Unlimited</span>}
                                                         </div>
                                                     </div>
                                                 </div>

                                                 <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                     <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 flex justify-between">
                                                         <span>Member & Wallet Info</span>
                                                         <span>Balance & Expiry</span>
                                                     </div>
                                                     {activeHolders.length === 0 ? (
                                                         <div className="p-8 text-center text-slate-400 text-xs italic">
                                                             No active holders found for this tag.
                                                         </div>
                                                     ) : (
                                                         <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                                             {activeHolders.map(holder => (
                                                                 <div key={holder.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                                     <div className="flex items-center gap-3">
                                                                         <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full">
                                                                             <Wallet size={14}/>
                                                                         </div>
                                                                         <div>
                                                                             <div className="text-sm font-bold text-slate-800">{holder.memberName}</div>
                                                                             <div className="text-[10px] text-slate-500 font-mono">{holder.memberEmail}</div>
                                                                         </div>
                                                                     </div>
                                                                     <div className="text-right">
                                                                         <div className="text-sm font-bold text-slate-900">
                                                                             {holder.meta?.isUnlimited ? (
                                                                                 <span className="text-purple-600 flex items-center justify-end"><Zap size={12} className="mr-1"/> Unlimited</span>
                                                                             ) : (
                                                                                 `${holder.meta?.credits} Credits`
                                                                             )}
                                                                         </div>
                                                                         <div className="text-[10px] text-slate-400">
                                                                             Exp: {holder.expiryDate ? new Date(holder.expiryDate).toLocaleDateString() : 'Never'}
                                                                         </div>
                                                                     </div>
                                                                 </div>
                                                             ))}
                                                         </div>
                                                     )}
                                                 </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* EDIT MODAL (Tag CRUD) */}
            {isEditing && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="flex justify-between items-center border-b border-slate-300 bg-indigo-50 p-6">
                            <h3 className="font-bold text-indigo-900 flex items-center">
                                <Zap className="mr-2" size={20}/> {editForm.id?.startsWith('TAG-') ? 'Edit Tag' : 'New Tag'}
                            </h3>
                            <button onClick={() => setIsEditing(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tag Code (Unique Identifier)</label>
                                <input 
                                    type="text" className="w-full p-2 border border-slate-300 rounded font-mono text-sm uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={editForm.code} 
                                    onChange={e => setEditForm({...editForm, code: e.target.value.toUpperCase().replace(/\s/g, '_')})}
                                    placeholder="e.g. VIP_2025"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">This code is used by the system to link Products and Events.</p>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Name</label>
                                <input 
                                    type="text" className="w-full p-2 border border-slate-300 rounded text-sm"
                                    value={editForm.name} 
                                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                                    placeholder="e.g. Annual VIP Pass 2025"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usage Type</label>
                                    <select 
                                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                                        value={editForm.type}
                                        onChange={e => setEditForm({...editForm, type: e.target.value as any})}
                                    >
                                        <option value="CONSUMABLE_CREDIT">Consumable Credit</option>
                                        <option value="UNLIMITED_ACCESS">Unlimited Access</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usage Limit / Deduction</label>
                                    <input 
                                        type="number" className="w-full p-2 border border-slate-300 rounded text-sm"
                                        value={editForm.usageLimit}
                                        onChange={e => setEditForm({...editForm, usageLimit: Number(e.target.value)})}
                                        disabled={editForm.type === 'UNLIMITED_ACCESS'}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                <input 
                                    type="text" className="w-full p-2 border border-slate-300 rounded text-sm"
                                    value={editForm.description} 
                                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                                    placeholder="Internal notes..."
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-indigo-600 rounded"
                                    checked={editForm.isActive}
                                    onChange={e => setEditForm({...editForm, isActive: e.target.checked})}
                                />
                                <span className="text-sm text-slate-700">Tag is Active</span>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-2">
                                <Info size={16} className="text-blue-600 shrink-0 mt-0.5"/>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Creating this tag will make it available in the <b>Product Catalog</b> (to sell) and <b>Event Config</b> (to accept).
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-300 bg-slate-50 p-6">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg text-sm">Cancel</button>
                            <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-lg flex items-center text-sm">
                                <Save size={16} className="mr-2"/> Save Tag
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* EVENT EDIT MODAL (Jump from Assignment) */}
            {editingEvent && (
                <EventForm 
                    isOpen={true}
                    isEditing={true}
                    initialData={editingEvent}
                    masterDoneTags={masterDoneTags}
                    availableCreditTags={availableCreditTags}
                    bundleableEvents={[]} // Simplified context for direct jump
                    availableContainers={[]} // Simplified context
                    orphanEvents={[]}
                    linkedChildren={[]}
                    onManageChild={() => {}}
                    onClose={() => setEditingEvent(null)}
                    onSave={handleSaveEventFromAssignment}
                />
            )}
        </div>
    );
};

export default TagManagement;
