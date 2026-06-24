import React, { useEffect, useMemo, useState } from 'react';
import { TribeService } from '../services/tribeService';
import { TribeMember, TribeMemberNote, TribeMentoringSession } from '../types/tribe';
import { useAuth } from '../context/AuthContext';
import { Users, Calendar, BrainCircuit, Search, Pencil, X } from 'lucide-react';
import WhatsAppQuickAction from './common/WhatsAppQuickAction';
import RoundTableModal from './tribe/RoundTableModal';
import AddMemberModal from './tribe/AddMemberModal';
import { useToast } from '../context/ToastContext';

const MyTribe: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [members, setMembers] = useState<TribeMember[]>([]);
    const [sessions, setSessions] = useState<TribeMentoringSession[]>([]);
    const [memberNotes, setMemberNotes] = useState<TribeMemberNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState<TribeMember | null>(null);
    const [showRoundTable, setShowRoundTable] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [noteEditorMember, setNoteEditorMember] = useState<TribeMember | null>(null);
    const [noteDraft, setNoteDraft] = useState('');
    const [noteSaving, setNoteSaving] = useState(false);
    const [noteDeleting, setNoteDeleting] = useState(false);
    const tribeDataSourceMode = TribeService.getDataSourceMode();

    useEffect(() => {
        if (user) {
            void loadTribe();
        }
    }, [user]);

    const loadTribe = async () => {
        setLoading(true);
        if (user) {
            const [mems, sess, notes] = await Promise.all([
                TribeService.getMyTribe(user.id),
                TribeService.getMentoringSessions(user.id),
                TribeService.getMemberNotes(user.id),
            ]);
            setMembers(mems);
            setSessions(sess);
            setMemberNotes(notes);
        }
        setLoading(false);
    };

    const memberNotesById = useMemo(
        () => new Map(memberNotes.map((note) => [note.memberId, note])),
        [memberNotes],
    );

    const handleCopyReferralLink = async () => {
        const referralLink = TribeService.getReferralLink(user?.id || '');
        if (!referralLink) {
            showToast('Referral link is not available.', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(referralLink);
            showToast('Referral link copied.', 'success');
        } catch {
            showToast('Failed to copy referral link.', 'error');
        }
    };

    const openNoteEditor = (member: TribeMember) => {
        const existing = memberNotesById.get(member.memberId);
        setNoteEditorMember(member);
        setNoteDraft(existing?.notes ?? '');
    };

    const closeNoteEditor = () => {
        if (noteSaving || noteDeleting) return;
        setNoteEditorMember(null);
        setNoteDraft('');
    };

    const handleSaveMemberNote = async () => {
        if (!noteEditorMember) return;
        const trimmed = noteDraft.trim();
        if (!trimmed) {
            showToast('Note is required.', 'error');
            return;
        }
        setNoteSaving(true);
        try {
            await TribeService.saveMemberNote(noteEditorMember.memberId, trimmed);
            await loadTribe();
            showToast('Member note saved.', 'success');
            setNoteEditorMember(null);
            setNoteDraft('');
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : 'Failed to save member note.',
                'error',
            );
        } finally {
            setNoteSaving(false);
        }
    };

    const handleDeleteMemberNote = async () => {
        if (!noteEditorMember) return;
        setNoteDeleting(true);
        try {
            await TribeService.deleteMemberNote(noteEditorMember.memberId);
            await loadTribe();
            showToast('Member note deleted.', 'success');
            setNoteEditorMember(null);
            setNoteDraft('');
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : 'Failed to delete member note.',
                'error',
            );
        } finally {
            setNoteDeleting(false);
        }
    };

    return (
        <div className="page-container relative min-w-0 animate-fade-in space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <Users className="mr-3 text-indigo-600" /> My Tribe
                    </h1>
                    <p className="text-slate-500 mt-1">Manage your mentees and Round Table groups.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                        onClick={() => setShowAddMember(true)}
                        className="min-h-11 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-emerald-700 sm:w-auto sm:min-h-0"
                    >
                        Add Member
                    </button>
                    <button
                        onClick={() => setShowRoundTable(true)}
                        className="min-h-11 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-indigo-700 sm:w-auto sm:min-h-0"
                    >
                        Start Round Table
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="font-bold text-slate-800">Tribe Members ({members.length})</h3>
                        <div className="relative w-full sm:w-48">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search..." className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
                        </div>
                    </div>

                    {!loading && members.length === 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            No tribe members assigned yet.
                            {tribeDataSourceMode === 'UNWIRED'
                              ? ' Backend for this screen is not configured.'
                              : ' Assign mentees in CRM (nTagStatus = your user id) or check your facilitator account.'}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loading ? <div className="col-span-2 text-center text-slate-400 py-10">Loading Tribe...</div> :
                         members.map((member) => {
                            const memberNote = memberNotesById.get(member.memberId);
                            return (
                                <div
                                    key={member.memberId}
                                    onClick={() => setSelectedMember(member)}
                                    className={`bg-white p-5 rounded-xl border transition-all cursor-pointer group relative overflow-visible ${selectedMember?.memberId === member.memberId ? 'border-indigo-500 ring-2 ring-indigo-50 shadow-md z-10' : 'border-slate-200 hover:shadow-lg hover:border-indigo-300 hover:z-20'}`}
                                >
                                    <div className="flex justify-between items-start mb-4 relative z-20 gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">
                                                {member.name.substring(0,2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{member.name}</h4>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <p className="text-xs text-slate-500 truncate">{member.program}</p>
                                                    <div className="relative z-30" onClick={(e) => e.stopPropagation()}>
                                                        <WhatsAppQuickAction
                                                            phone={member.phone}
                                                            name={member.name}
                                                            context="TRIBE_MEMBER"
                                                            variant="icon"
                                                            compact
                                                            contextData={{
                                                                member_name: member.name,
                                                                program: member.program,
                                                                next_event: member.nextEventName || 'Upcoming Session'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openNoteEditor(member);
                                                }}
                                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600"
                                                title={memberNote?.notes ? 'Edit note' : 'Add note'}
                                            >
                                                <Pencil size={14}/>
                                            </button>
                                            <div className={`p-2 rounded-lg ${selectedMember?.memberId === member.memberId ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                                <BrainCircuit size={18}/>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 relative z-10">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Mentoring Progress</span>
                                            <span className="font-bold text-indigo-600">{member.mentoringProgress}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500" style={{width: `${member.mentoringProgress}%`}}></div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${member.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700' : member.paymentStatus === 'OVERDUE' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {member.paymentStatus}
                                            </span>
                                            <div className="text-[10px] text-slate-400">Next: {member.nextEventDate || 'TBD'}</div>
                                        </div>
                                        {(member.facilitatorType || member.facilitatorName || memberNote?.notes) && (
                                            <div className="pt-2 border-t border-slate-50 flex items-start justify-between gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[10px] uppercase tracking-widest text-slate-400">Facilitator Tribe</div>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        {member.facilitatorType && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-indigo-50 text-indigo-700">
                                                                {member.facilitatorType}
                                                            </span>
                                                        )}
                                                        {member.facilitatorName && (
                                                            <span className="text-[11px] text-slate-600 font-medium truncate">
                                                                {member.facilitatorName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1 sm:max-w-[11rem] sm:text-right sm:shrink-0">
                                                    <div className="text-[10px] uppercase tracking-widest text-slate-400">Facilitator Note</div>
                                                    {memberNote?.notes ? (
                                                        <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium leading-4 text-amber-900 line-clamp-3">
                                                            {memberNote.notes}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-1 text-[10px] italic text-slate-300">No note yet</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                         })}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                            <Calendar size={18} className="mr-2 text-slate-500"/> Upcoming Sessions
                        </h3>
                        <div className="space-y-4">
                            {sessions.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No sessions available right now.</p> :
                             sessions.map(sess => (
                                <div key={sess.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-sm text-slate-800">{sess.title}</span>
                                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{sess.status}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-2">{new Date(sess.date).toLocaleDateString()} • {sess.time}</div>
                                    <button className="w-full text-center text-xs font-bold text-blue-600 hover:bg-blue-50 py-1.5 rounded transition-colors">
                                        Launch Meeting
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={80} /></div>
                        <h3 className="font-bold text-lg mb-2 relative z-10">Grow Your Tribe</h3>
                        <p className="text-xs text-indigo-200 mb-4 relative z-10">Share your referral link to invite new members.</p>
                        <div className="bg-white/10 p-3 rounded-lg flex items-center justify-between mb-3 relative z-10">
                            <code className="text-xs font-mono truncate mr-2">{TribeService.getReferralLink(user?.id || '')}</code>
                            <button onClick={handleCopyReferralLink} className="text-xs font-bold hover:text-indigo-200">
                                Copy
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showRoundTable && user && (
                <RoundTableModal
                    facilitatorId={user.id}
                    onClose={() => setShowRoundTable(false)}
                    onSuccess={() => { setShowRoundTable(false); void loadTribe(); }}
                />
            )}
            {showAddMember && user && (
                <AddMemberModal
                    facilitatorName={user.fullName}
                    onClose={() => setShowAddMember(false)}
                    onSuccess={() => { setShowAddMember(false); void loadTribe(); }}
                />
            )}
            {noteEditorMember && (
                <div className="modal-overlay z-[120]">
                    <div className="modal-panel sm:max-w-lg sm:h-auto sm:max-h-[90dvh]">
                        <div className="flex items-start justify-between border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Tribe Member Note</div>
                                <h3 className="mt-1 text-lg font-bold text-slate-900">{noteEditorMember.name}</h3>
                                <p className="mt-1 text-sm text-slate-500">Save an internal mentoring note for this tribe member.</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeNoteEditor}
                                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-4 py-4 sm:px-6 sm:py-5">
                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                                Note
                            </label>
                            <textarea
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                rows={6}
                                maxLength={2000}
                                placeholder="Write mentoring context, follow-up, or important member reminder..."
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                            <div className="mt-2 text-right text-[11px] text-slate-400">
                                {noteDraft.trim().length}/2000
                            </div>
                        </div>
                        <div className="safe-area-bottom flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <button
                                type="button"
                                onClick={() => void handleDeleteMemberNote()}
                                disabled={!memberNotesById.get(noteEditorMember.memberId) || noteSaving || noteDeleting}
                                className="min-h-11 w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:w-auto"
                            >
                                {noteDeleting ? 'Deleting...' : 'Delete Note'}
                            </button>
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
                                <button
                                    type="button"
                                    onClick={closeNoteEditor}
                                    disabled={noteSaving || noteDeleting}
                                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleSaveMemberNote()}
                                    disabled={noteSaving || noteDeleting}
                                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {noteSaving ? 'Saving...' : 'Save Note'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTribe;
