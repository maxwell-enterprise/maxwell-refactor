
import React from 'react';
import { MemberPulse, NextBestAction } from '../../types/intelligence';
import { 
  Zap, TrendingUp, AlertTriangle, Target, Users, ArrowRight, 
  MessageSquare, Mail, Calendar, ShieldCheck, Heart, BarChart3, 
  ChevronRight, Award, Flame
} from 'lucide-react';

interface CRMIntelligencePanelProps {
  pulse: MemberPulse;
  onExecute: (action: NextBestAction) => void;
}

const CRMIntelligencePanel: React.FC<CRMIntelligencePanelProps> = ({ pulse, onExecute }) => {
  
  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'RETENTION': return <AlertTriangle size={16} className="text-red-500" />;
      case 'UPSELL': return <TrendingUp size={16} className="text-green-500" />;
      case 'B2B_REFERRAL': return <Target size={16} className="text-blue-500" />;
      case 'NETWORK_GROWTH': return <Users size={16} className="text-purple-500" />;
      default: return <Zap size={16} className="text-amber-500" />;
    }
  };

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. PULSE DASHBOARD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lifetime Value</p>
          <p className="text-lg font-bold text-slate-900">{formatIDR(pulse.lifetimeValue)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Engagement</p>
          <div className="flex items-end gap-2">
            <p className="text-lg font-bold text-blue-600">{pulse.engagementScore}%</p>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mb-1.5 overflow-hidden">
              <div className="h-full bg-blue-500" style={{width: `${pulse.engagementScore}%`}}></div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Churn Risk</p>
          <div className="flex items-center gap-2">
            <p className={`text-lg font-bold ${pulse.churnRisk > 50 ? 'text-red-600' : 'text-green-600'}`}>{pulse.churnRisk}%</p>
            {pulse.churnRisk > 50 && <Flame size={16} className="text-red-500 animate-pulse" />}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Affinity</p>
          <div className="flex items-center gap-1.5">
            <Heart size={14} className={pulse.affinityLevel === 'EVANGELIST' ? 'text-pink-500 fill-pink-500' : 'text-slate-300'} />
            <span className="text-sm font-bold text-slate-800 uppercase">{pulse.affinityLevel}</span>
          </div>
        </div>
      </div>

      {/* 2. NEXT BEST ACTIONS (The Salesforce "Einstein" style cards) */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 size={18} className="text-blue-600" />
          Intelligent Next Best Actions
        </h3>
        
        {pulse.nextBestActions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-400">No priority actions suggested by AI Pulse.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pulse.nextBestActions.map((action) => (
              <div key={action.id} className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-400 hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors shrink-0">
                    {getCategoryIcon(action.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{action.title}</h4>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        action.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-100' :
                        action.priority === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {action.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-md">{action.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                        <Award size={10} /> Impact Score: {action.impactScore}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                        {action.suggestedChannel === 'WHATSAPP' && <MessageSquare size={10} />}
                        {action.suggestedChannel === 'EMAIL' && <Mail size={10} />}
                        {action.suggestedChannel === 'MEETING' && <Calendar size={10} />}
                        Via {action.suggestedChannel}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onExecute(action)}
                  className="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                >
                  {action.ctaLabel} <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. GROWTH PATH VISUALIZER */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={120} /></div>
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Strategical Milestone</p>
          <h4 className="text-xl font-bold mb-4">{pulse.growthPath}</h4>
          
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{width: `${pulse.engagementScore}%`}}></div>
            </div>
            <span className="text-xs font-bold">Level Up {100 - pulse.engagementScore}%</span>
          </div>
          <p className="text-[10px] text-indigo-100 mt-4 italic">"Everything rises and falls on leadership." — John C. Maxwell</p>
        </div>
      </div>
    </div>
  );
};

export default CRMIntelligencePanel;
