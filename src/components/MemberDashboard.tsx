
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { EntitlementService } from '../services/entitlementService';
import { WalletItem } from '../types/access';
import { ContractService } from '../services/contractService'; 
import { ContractInstance } from '../types/contract'; 
import { Calendar, MapPin, Award, Clock, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { ViewState } from '../types/index';
import { UserEntitlements, LifecycleStage } from '../types/access';
import WalletSummaryWidget from './dashboard/WalletSummaryWidget'; 
import ContractSigningModal from './member/ContractSigningModal'; 

interface MemberDashboardProps {
  onNavigate: (view: ViewState) => void;
}

const MemberDashboard: React.FC<MemberDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletItem[]>([]);
  const [nextEvent, setNextEvent] = useState<WalletItem | null>(null);
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [pendingContract, setPendingContract] = useState<ContractInstance | null>(null); 
  const [showSignModal, setShowSignModal] = useState(false); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
        setLoading(true);
        Promise.all([
            EntitlementService.getMyWallet(user.id),
            EntitlementService.getUserEntitlements(user.id),
            ContractService.getMyContracts(user.id) 
        ]).then(([walletItems, userEntitlements, contracts]) => {
            setWallet(walletItems);
            // Logic: Find next ACTIVE ticket sorted by date
            const tickets = walletItems
                .filter(i => i.type === 'TICKET' && i.status === 'ACTIVE' && i.expiryDate)
                .sort((a,b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());
            
            setNextEvent(tickets.length > 0 ? tickets[0] : null);
            setEntitlements(userEntitlements);
            const unsigned = contracts.find(c => c.status === 'PUBLISHED');
            if (unsigned) setPendingContract(unsigned);
            setLoading(false);
        });
    }
  }, [user]);

  const STAGES: { id: LifecycleStage, label: string }[] = [
      { id: 'GUEST', label: 'Guest' },
      { id: 'IDENTIFIED', label: 'Identified' },
      { id: 'PARTICIPANT', label: 'Participant' },
      { id: 'MEMBER', label: 'Member' },
      { id: 'CERTIFIED', label: 'Certified' },
      { id: 'FACILITATOR', label: 'Facilitator' },
  ];

  const currentStage = entitlements?.attributes.lifecycle || 'GUEST';
  const currentStageIdx = STAGES.findIndex(s => s.id === currentStage);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    Hello, <span className="text-blue-600">{user?.fullName.split(' ')[0]}</span>
                </h1>
                <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                
                {/* Evolution Journey */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-bold text-slate-900 flex items-center">
                            <Award size={20} className="text-blue-600 mr-2" /> Evolution Journey
                        </h3>
                        <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                            {currentStage}
                        </span>
                    </div>
                    
                    <div className="relative px-2">
                        <div className="absolute top-4 left-0 w-full h-1 bg-slate-100 rounded-full -z-10"></div>
                        <div 
                            className="absolute top-4 left-0 h-1 bg-blue-600 rounded-full -z-10 transition-all duration-1000"
                            style={{ width: `${(currentStageIdx / (STAGES.length - 1)) * 100}%` }}
                        ></div>

                        <div className="flex justify-between items-start">
                            {STAGES.map((stage, idx) => {
                                const isCompleted = idx <= currentStageIdx;
                                const isCurrent = idx === currentStageIdx;
                                return (
                                    <div key={stage.id} className="flex flex-col items-center group">
                                        <div 
                                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                                                ${isCurrent ? 'bg-blue-600 border-blue-600 text-white scale-125 shadow-lg' : 
                                                isCompleted ? 'bg-white border-blue-600 text-blue-600' : 'bg-white border-slate-200 text-slate-300'}
                                            `}
                                        >
                                            {isCompleted ? <CheckCircle2 size={16} /> : <Lock size={12} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Next Event Card */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group cursor-pointer" onClick={() => onNavigate(ViewState.WALLET)}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all scale-125">
                        <Calendar size={140} />
                    </div>
                    
                    {nextEvent ? (
                        <div className="relative z-10">
                            <span className="bg-blue-600 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest mb-4 inline-block">Next Up</span>
                            <h2 className="text-3xl font-bold mb-2">{nextEvent.title}</h2>
                            <p className="text-slate-400 text-sm mb-8">{nextEvent.subtitle}</p>
                            
                            <div className="grid grid-cols-2 gap-4 max-w-sm">
                                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10">
                                    <Clock size={18} className="text-blue-400" />
                                    <div>
                                        <p className="text-[10px] font-bold text-blue-300 uppercase">Date</p>
                                        <p className="text-xs font-bold">{nextEvent.expiryDate}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10">
                                    <MapPin size={18} className="text-red-400" />
                                    <div>
                                        <p className="text-[10px] font-bold text-red-300 uppercase">Venue</p>
                                        <p className="text-xs font-bold truncate">{nextEvent.meta?.location || 'TBD'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-10 py-10 text-center">
                            <h2 className="text-xl font-bold mb-2">Discover Your Next Masterclass</h2>
                            <p className="text-slate-400 text-sm mb-6">Elevate your leadership with proven signature frameworks.</p>
                            <button onClick={() => onNavigate(ViewState.STORE_CATALOG)} className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black text-xs hover:bg-indigo-50">EXPLORE NOW</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:col-span-1">
                {/* Replaced Leaderboard with Wallet Summary */}
                <WalletSummaryWidget walletItems={wallet} onNavigate={onNavigate} />
            </div>
        </div>

        {/* Sign Modal */}
        {showSignModal && pendingContract && (
            <ContractSigningModal instance={pendingContract} onClose={() => setShowSignModal(false)} onSigned={() => { setShowSignModal(false); setPendingContract(null); }} />
        )}
    </div>
  );
};

export default MemberDashboard;
