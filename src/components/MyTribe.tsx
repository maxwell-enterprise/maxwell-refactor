
import React, { useState, useEffect } from 'react';
import { TribeService } from '../services/tribeService';
import { TribeMember, TribeMentoringSession } from '../types/tribe';
import { useAuth } from '../context/AuthContext';
import { Users, Calendar, BrainCircuit, Search, ChevronRight, User } from 'lucide-react';
import WhatsAppQuickAction from './common/WhatsAppQuickAction';
import RoundTableModal from './tribe/RoundTableModal';

const MyTribe: React.FC = () => {
    const { user } = useAuth();
    const [members, setMembers] = useState<TribeMember[]>([]);
    const [sessions, setSessions] = useState<TribeMentoringSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState<TribeMember | null>(null);
    const [showRoundTable, setShowRoundTable] = useState(false);
    const tribeDataSourceMode = TribeService.getDataSourceMode();

    useEffect(() => {
        if (user) {
            loadTribe();
        }
    }, [user]);

    const loadTribe = async () => {
        setLoading(true);
        if (user) {
            const [mems, sess] = await Promise.all([
                TribeService.getMyTribe(user.id),
                TribeService.getMentoringSessions(user.id)
            ]);
            setMembers(mems);
            setSessions(sess);
        }
        setLoading(false);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in relative">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <Users className="mr-3 text-indigo-600" /> My Tribe
                    </h1>
                    <p className="text-slate-500 mt-1">Manage your mentees and Round Table groups.</p>
                </div>
                <button 
                    onClick={() => setShowRoundTable(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors"
                >
                    Start Round Table
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Members List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Tribe Members ({members.length})</h3>
                        <div className="relative w-48">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search..." className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
                        </div>
                    </div>

                    {!loading && members.length === 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            Member data for this feature is not available yet.
                            {tribeDataSourceMode === 'UNWIRED' && ' The team is wiring up the backend for this screen.'}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loading ? <div className="col-span-2 text-center text-slate-400 py-10">Loading Tribe...</div> :
                         members.map(member => (
                            <div 
                                key={member.memberId} 
                                onClick={() => setSelectedMember(member)}
                                // Z-Index handling to ensure WA popup isn't clipped
                                className={`bg-white p-5 rounded-xl border transition-all cursor-pointer group relative ${selectedMember?.memberId === member.memberId ? 'border-indigo-500 ring-2 ring-indigo-50 shadow-md z-10' : 'border-slate-200 hover:shadow-lg hover:border-indigo-300 hover:z-20'}`}
                            >
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                            {member.name.substring(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{member.name}</h4>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-slate-500">{member.program}</p>
                                                {/* WA Button - Context set to TRIBE_MEMBER */}
                                                <div onClick={(e) => e.stopPropagation()}>
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
                                    <div className={`p-2 rounded-lg ${selectedMember?.memberId === member.memberId ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                        <BrainCircuit size={18}/>
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
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Sessions & Actions */}
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
                            <button className="text-xs font-bold hover:text-indigo-200">Copy</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showRoundTable && user && (
                <RoundTableModal 
                    facilitatorId={user.id} 
                    onClose={() => setShowRoundTable(false)}
                    onSuccess={() => { setShowRoundTable(false); loadTribe(); }}
                />
            )}
        </div>
    );
};

export default MyTribe;
