
import React, { useEffect, useState } from 'react';
import { X, Calendar, ShoppingBag, Tag, Shield, Zap, User, BrainCircuit, Ticket, CreditCard, Sparkles, BarChart3, TrendingUp, Award } from 'lucide-react';
import { Member, JourneyEvent, Transaction } from '../../types/index';
import { AuditService } from '../../services/auditService';
import { EntitlementService } from '../../services/entitlementService';
import { WalletItem } from '../../types/access';
import { DataService } from '../../services/dataService';
import { IntelligenceService } from '../../services/intelligenceService';
import CRMIntelligencePanel from './CRMIntelligencePanel';
import { MemberPulse, NextBestAction } from '../../types/intelligence';

interface UserJourneyModalProps {
  member: Member;
  onClose: () => void;
}

export const UserJourneyModal: React.FC<UserJourneyModalProps> = ({ member, onClose }) => {
  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'ASSETS' | 'INTELLIGENCE'>('TIMELINE');
  
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [walletItems, setWalletItems] = useState<WalletItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [pulse, setPulse] = useState<MemberPulse | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        // Parallel data fetching for 360 view
        const [journeyData, walletData, allTransactions] = await Promise.all([
            AuditService.getUserJourney(member),
            EntitlementService.getMyWallet(member.id),
            DataService.getTransactions()
        ]);
        
        // Filter transactions for this user
        const userTransactions = allTransactions.filter(t => t.description.includes(member.name) || t.id.includes(member.id));
        
        setEvents(journeyData);
        setWalletItems(walletData);
        setTransactions(userTransactions);
        setAnalysis(AuditService.analyzeUserBehavior(journeyData));
        
        // Generate Salesforce-style Pulse
        const generatedPulse = IntelligenceService.calculateMemberPulse(member, journeyData, userTransactions);
        setPulse(generatedPulse);
        
        setLoading(false);
    };
    fetchData();
  }, [member]);

  const handleExecuteNBA = (action: NextBestAction) => {
    alert(`Executing action: ${action.title} via ${action.suggestedChannel}`);
    // Real implementation: trigger email wizard or open WA
  };

  const getIcon = (category: string) => {
      switch(category) {
          case 'ACQUISITION': return <User size={16} />;
          case 'COMMERCE': return <ShoppingBag size={16} />;
          case 'MARKETING': return <Tag size={16} />;
          case 'SYSTEM': return <Shield size={16} />;
          case 'MENTORING': return <BrainCircuit size={16} />;
          default: return <Zap size={16} />;
      }
  };

  const getColor = (category: string) => {
      switch(category) {
          case 'ACQUISITION': return 'bg-slate-100 text-slate-600 border-slate-200';
          case 'COMMERCE': return 'bg-green-100 text-green-600 border-green-200';
          case 'MARKETING': return 'bg-purple-100 text-purple-600 border-purple-200';
          case 'SYSTEM': return 'bg-amber-100 text-amber-600 border-amber-200';
          case 'MENTORING': return 'bg-indigo-100 text-indigo-600 border-indigo-200';
          default: return 'bg-blue-100 text-blue-600 border-blue-200';
      }
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-3xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        {member.name.substring(0,2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-900 truncate">{member.name}</h2>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="font-mono truncate">ID: {member.id}</span>
                            <span className="shrink-0">•</span>
                            <span className="flex items-center shrink-0">
                                <Calendar size={12} className="mr-1"/> <b>{member.joinMonth}</b>
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0">
                    <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                        <button onClick={() => setActiveTab('TIMELINE')} className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${activeTab === 'TIMELINE' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>Journey</button>
                        <button onClick={() => setActiveTab('INTELLIGENCE')} className={`px-3 py-1 text-[10px] font-bold rounded transition-colors flex items-center ${activeTab === 'INTELLIGENCE' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                          <Sparkles size={10} className="mr-1"/> Intelligence
                        </button>
                        <button onClick={() => setActiveTab('ASSETS')} className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${activeTab === 'ASSETS' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>Assets</button>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900 bg-white p-2 rounded-full shadow-sm hover:shadow transition-all border border-slate-200">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-0 bg-slate-50/30">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                        <p className="text-sm">Deep scanning profile data...</p>
                    </div>
                ) : (
                    <>
                        {/* INTELLIGENCE TAB (New Salesforce-style view) */}
                        {activeTab === 'INTELLIGENCE' && pulse && (
                          <div className="p-6">
                            <CRMIntelligencePanel pulse={pulse} onExecute={handleExecuteNBA} />
                          </div>
                        )}

                        {/* TIMELINE TAB */}
                        {activeTab === 'TIMELINE' && (
                            <div className="p-6 relative">
                                {/* Dashboard-in-Modal Preview */}
                                <div className="grid grid-cols-2 gap-3 mb-8">
                                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">LTV</p><p className="font-bold text-slate-900">{formatIDR(pulse?.lifetimeValue || 0)}</p></div>
                                    <TrendingUp size={16} className="text-green-500"/>
                                  </div>
                                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Loyalty Rank</p><p className="font-bold text-slate-900">#45 / Region</p></div>
                                    <Award size={16} className="text-blue-500"/>
                                  </div>
                                </div>

                                <div className="absolute left-9 top-32 bottom-6 w-0.5 bg-slate-200"></div>
                                <div className="space-y-6">
                                    {events.map((event) => (
                                        <div key={event.id} className="relative flex gap-4 group">
                                            {/* Icon Node */}
                                            <div className={`relative z-10 flex-shrink-0 h-8 w-8 rounded-full border-2 flex items-center justify-center bg-white ${getColor(event.category)}`}>
                                                {getIcon(event.category)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${getColor(event.category).split(' ')[0]} ${getColor(event.category).split(' ')[1]}`}>
                                                        {event.category}
                                                    </span>
                                                    <span className="text-xs text-slate-400 flex items-center">
                                                        <Calendar size={10} className="mr-1" />
                                                        {new Date(event.date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
                                                <p className="text-xs text-slate-600 mt-1">{event.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ASSETS TAB */}
                        {activeTab === 'ASSETS' && (
                            <div className="p-6">
                                <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Active Entitlements</h3>
                                {walletItems.length === 0 ? (
                                    <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                                        No active assets found.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {walletItems.map(item => (
                                            <div key={item.id} className="p-4 rounded-xl border border-slate-200 flex items-center bg-white shadow-sm">
                                                <div className={`p-3 rounded-full mr-4 ${
                                                    item.type === 'TICKET' ? 'bg-purple-100 text-purple-600' :
                                                    item.type === 'CREDIT_PASS' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-blue-100 text-blue-600'
                                                }`}>
                                                    {item.type === 'TICKET' ? <Ticket size={20}/> : 
                                                     item.type === 'CREDIT_PASS' ? <CreditCard size={20}/> : <Shield size={20}/>}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                                                    <p className="text-xs text-slate-500">{item.subtitle}</p>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                                    item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    </div>
    );
};
