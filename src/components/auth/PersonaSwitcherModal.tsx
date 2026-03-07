
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, UserProfile, Member } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { UserService } from '../../services/userService';
import { DataService } from '../../services/dataService';
import { 
    X, Search, ShieldCheck, Users, Briefcase, Crown, 
    Star, User, UserPlus, CheckCircle2, LogOut, RefreshCw 
} from 'lucide-react';

interface PersonaSwitcherModalProps {
    onClose: () => void;
}

const PersonaSwitcherModal: React.FC<PersonaSwitcherModalProps> = ({ onClose }) => {
    const { user: currentUser, login } = useAuth();
    const [activeTab, setActiveTab] = useState<'INTERNAL' | 'JOURNEY'>('INTERNAL');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Data Stores
    const [staffUsers, setStaffUsers] = useState<UserProfile[]>([]);
    const [memberMap, setMemberMap] = useState<Record<string, Member>>({});
    const [allUserProfiles, setAllUserProfiles] = useState<UserProfile[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch parallel to ensure we get the latest state from DB
            const [users, members] = await Promise.all([
                UserService.getAllUsers(),
                DataService.getMembers()
            ]);

            // Filter purely internal staff (exclude members who might be in the user table)
            // Note: In mock logic, UserService.getAllUsers might merge them, so we separate them visually.
            const pureStaff = users.filter(u => 
                [UserRole.SUPER_ADMIN, UserRole.FINANCE, UserRole.OPERATIONS, UserRole.MARKETING, UserRole.SALES, UserRole.GATE_KEEPER].includes(u.role)
            );
            
            // Map members to UserProfiles for consistent rendering
            const memberProfiles: UserProfile[] = members.map(m => ({
                id: m.id,
                email: m.email,
                fullName: m.name,
                role: m.lifecycleStage === 'FACILITATOR' ? UserRole.FACILITATOR : UserRole.MEMBER,
                avatarUrl: `https://ui-avatars.com/api/?name=${m.name.replace(' ','+')}&background=random`,
                provider: 'email'
            }));

            // Map full member details for Lifecycle checks
            const mMap: Record<string, Member> = {};
            members.forEach(m => mMap[m.id] = m);

            setStaffUsers(pureStaff);
            setAllUserProfiles([...pureStaff, ...memberProfiles]);
            setMemberMap(mMap);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitch = async (targetUser: UserProfile) => {
        // Trigger login with the specific email. 
        // The AuthService will look up this email in the DB and return the full profile.
        await login(targetUser.role, targetUser.email, 'email');
        onClose();
        // Force reload to ensure UI context updates completely
        window.location.reload(); 
    };

    const getLifecycleIcon = (stage: string) => {
        switch(stage) {
            case 'GUEST': return <UserPlus size={14} className="text-slate-400"/>;
            case 'IDENTIFIED': return <Search size={14} className="text-blue-400"/>;
            case 'PARTICIPANT': return <Users size={14} className="text-indigo-400"/>;
            case 'MEMBER': return <Crown size={14} className="text-amber-500"/>;
            case 'CERTIFIED': return <Star size={14} className="text-purple-500"/>;
            case 'FACILITATOR': return <Briefcase size={14} className="text-green-500"/>;
            default: return <User size={14}/>;
        }
    };

    const filteredUsers = useMemo(() => {
        const source = activeTab === 'INTERNAL' 
            ? staffUsers 
            : allUserProfiles.filter(u => !staffUsers.find(s => s.id === u.id)); // Exclude staff from journey tab

        return source.filter(u => 
            u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.role.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [activeTab, staffUsers, allUserProfiles, searchTerm]);

    // Grouping for Journey Tab
    // Fix: Explicitly type useMemo and avoid returning {} to ensure proper type inference in JSX
    const journeyGroups = useMemo<Record<string, UserProfile[]>>(() => {
        const groups: Record<string, UserProfile[]> = {
            'FACILITATOR': [], 'CERTIFIED': [], 'MEMBER': [], 
            'PARTICIPANT': [], 'IDENTIFIED': [], 'GUEST': []
        };
        
        if (activeTab !== 'JOURNEY') return groups;
        
        filteredUsers.forEach(u => {
            // Find member data to get true lifecycle stage, fallback to Role mapping
            const member = memberMap[u.id];
            const stage = member?.lifecycleStage || (u.role === UserRole.FACILITATOR ? 'FACILITATOR' : 'GUEST');
            
            if (groups[stage]) groups[stage].push(u);
            else groups['GUEST'].push(u); // Fallback
        });
        return groups;
    }, [filteredUsers, activeTab, memberMap]);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex overflow-hidden animate-scale-in">
                
                {/* SIDEBAR */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
                    <div className="p-5 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center">
                            <RefreshCw size={18} className="mr-2 text-indigo-600"/> Switch Persona
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Select an identity to simulate.</p>
                    </div>

                    <div className="p-3 space-y-1">
                        <button 
                            onClick={() => setActiveTab('INTERNAL')}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all ${activeTab === 'INTERNAL' ? 'bg-white shadow-sm ring-1 ring-slate-200 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <span className="flex items-center text-sm font-bold">
                                <ShieldCheck size={16} className="mr-2"/> Internal Team
                            </span>
                            <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">
                                {staffUsers.length}
                            </span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('JOURNEY')}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all ${activeTab === 'JOURNEY' ? 'bg-white shadow-sm ring-1 ring-slate-200 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <span className="flex items-center text-sm font-bold">
                                <Users size={16} className="mr-2"/> Customer Journey
                            </span>
                            <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">
                                {allUserProfiles.length - staffUsers.length}
                            </span>
                        </button>
                    </div>

                    <div className="mt-auto p-4 border-t border-slate-200">
                         <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                             <p className="text-[10px] font-bold text-blue-800 uppercase mb-1">Current Identity</p>
                             <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
                                     {currentUser?.fullName.substring(0,1)}
                                 </div>
                                 <div className="overflow-hidden">
                                     <p className="text-xs font-bold text-slate-900 truncate w-32">{currentUser?.fullName}</p>
                                     <p className="text-[10px] text-slate-500 truncate w-32">{currentUser?.role}</p>
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="flex-1 flex flex-col bg-white">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder={`Search ${activeTab === 'INTERNAL' ? 'staff' : 'members'} by name or email...`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-full transition-colors ml-4">
                            <X size={20} />
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <RefreshCw size={32} className="animate-spin mb-2"/>
                                <p className="text-sm">Syncing with database...</p>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'INTERNAL' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {filteredUsers.map(user => (
                                            <button
                                                key={user.id}
                                                onClick={() => handleSwitch(user)}
                                                className={`flex items-center p-3 rounded-xl border text-left transition-all hover:shadow-md group ${currentUser?.id === user.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                                            >
                                                <img src={user.avatarUrl} alt={user.fullName} className="w-10 h-10 rounded-full border border-slate-100 mr-3" />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-slate-900 truncate">{user.fullName}</h4>
                                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                                    <div className="flex items-center mt-1">
                                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                                                            {user.role}
                                                        </span>
                                                        {currentUser?.id === user.id && <span className="ml-2 text-[10px] font-bold text-indigo-600 flex items-center"><CheckCircle2 size={10} className="mr-1"/> Active</span>}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'JOURNEY' && (
                                    <div className="space-y-6">
                                        {/* Fixed: cast Object.entries(journeyGroups) to [string, UserProfile[]][] for accurate typing in loop */}
                                        {(Object.entries(journeyGroups) as [string, UserProfile[]][]).map(([stage, users]) => {
                                            if (users.length === 0) return null;
                                            return (
                                                <div key={stage}>
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                                        {getLifecycleIcon(stage)} <span className="ml-2">{stage}</span>
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {users.map(user => (
                                                            <button
                                                                key={user.id}
                                                                onClick={() => handleSwitch(user)}
                                                                className={`flex items-center p-3 rounded-xl border text-left transition-all hover:shadow-md group ${currentUser?.id === user.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                                                            >
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs mr-3 border-2 border-white shadow-sm
                                                                    ${stage === 'GUEST' ? 'bg-slate-400' : 
                                                                      stage === 'MEMBER' ? 'bg-amber-500' :
                                                                      stage === 'CERTIFIED' ? 'bg-purple-500' :
                                                                      stage === 'FACILITATOR' ? 'bg-green-500' : 'bg-blue-400'}
                                                                `}>
                                                                    {user.fullName.substring(0,1)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="text-sm font-bold text-slate-900 truncate">{user.fullName}</h4>
                                                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                                                    {currentUser?.id === user.id && <span className="text-[10px] font-bold text-indigo-600 flex items-center mt-1"><CheckCircle2 size={10} className="mr-1"/> You are here</span>}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PersonaSwitcherModal;
