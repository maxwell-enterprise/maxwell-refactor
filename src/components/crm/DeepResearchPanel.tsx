
import React, { useState, useEffect } from 'react';
import { ResearchService } from '../../services/researchService';
import { ResearchPersistenceService } from '../../services/researchPersistenceService';
import { ResearchResult, ResearchContext } from '../../types/research';
import { DataService } from '../../services/dataService';
import { Member, SocialProfile } from '../../types/index';
import { 
  Search, ShieldAlert, TrendingUp, DollarSign, ExternalLink, 
  CheckCircle, AlertCircle, Loader2, UserCheck, Briefcase, MapPin, 
  BarChart3, Globe, Sparkles, Linkedin, Instagram, Facebook, Link as LinkIcon,
  MessageSquare, Save, X, Info, UserSearch, RotateCcw, BadgeCheck
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface DeepResearchPanelProps {
  context: ResearchContext;
  onClose: () => void;
}

const DeepResearchPanel: React.FC<DeepResearchPanelProps> = ({ context, onClose }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [userOpinion, setUserOpinion] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkForExistingData = async () => {
      if (!context.targetMemberId) {
        setLoading(false);
        return;
      }
      try {
        const existingResult = await ResearchPersistenceService.getResultByMemberId(context.targetMemberId);
        if (existingResult) {
          setResult(existingResult);
        }
      } catch (e) {
        console.error("Failed to fetch existing research", e);
      } finally {
        setLoading(false);
      }
    };
    checkForExistingData();
  }, [context.targetMemberId]);

  const handleStartResearch = async (isRefresh: boolean = false) => {
    if (isRefresh && !window.confirm("This will re-run the AI analysis and use API credits. Are you sure?")) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await ResearchService.performDeepResearch(context);
      const fullResult: ResearchResult = {
        ...data,
        memberId: context.targetMemberId!
      };
      setResult(fullResult);
      await ResearchPersistenceService.saveResult(fullResult);
    } catch (err) {
      setError("AI was unable to gather sufficient public data. Try providing more context.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToCRM = async () => {
    if (!result || !context.targetMemberId) {
        showToast('Cannot save. Member context is missing.', 'error');
        return;
    }
    setIsSaving(true);
    try {
      // 1. Construct Social Profile from AI Findings
      const aiSocialProfile: SocialProfile = {
          igVerified: result.socialIntelligence?.isVerified || false,
          igFollowers: result.socialIntelligence?.instagramFollowers || 0,
          businessAccounts: result.socialIntelligence?.businessAccounts || [],
          occupation: result.personProfile?.currentRole || '',
          businessType: result.personProfile?.companyScale || '',
          communities: result.socialIntelligence?.primaryCommunity ? [result.socialIntelligence.primaryCommunity] : []
      };

      // 2. Determine Tags (Include Wealth Segment from AI)
      let newTags: string[] = [];
      if (aiSocialProfile.igVerified || aiSocialProfile.igFollowers > 10000) newTags.push('Influencer');
      if (result.scoring.abilityToPay >= 8) newTags.push('High_Net_Worth');
      
      // Map new wealth segment property if available
      const wealthSeg = (result.socialIntelligence as any)?.inferredWealthSegment;
      if (wealthSeg && wealthSeg !== 'MASS') {
          newTags.push(wealthSeg); // e.g., 'HNW', 'AFFLUENT'
      }

      // 3. Fetch current member to merge tags
      const currentMember = await DataService.getMembers().then(ms => ms.find(m => m.id === context.targetMemberId));
      if (currentMember && currentMember.tags) {
          const mergedTags = new Set([...currentMember.tags, ...newTags]);
          newTags = Array.from(mergedTags);
      }

      const summaryNotes = `[AI Research] Strategy: ${result.triage?.salesStrategy}\nManual Note: ${userOpinion}`;

      // 4. Update
      await DataService.updateMember(context.targetMemberId, {
        socialProfile: aiSocialProfile,
        company: result.personProfile?.currentRole?.includes(' at ') ? result.personProfile.currentRole.split(' at ')[1] : context.company,
        jobTitle: result.personProfile?.currentRole?.split(' at ')[0],
        tags: newTags,
        notes: ResearchPersistenceService.mergeNotesWithResult(summaryNotes, result)
      });

      showToast('Profile enriched with AI Data!', 'success');
      onClose();
    } catch (e) {
      showToast('Failed to save to CRM', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin': return <Linkedin size={14} className="text-blue-600" />;
      case 'instagram': return <Instagram size={14} className="text-pink-600" />;
      case 'facebook': return <Facebook size={14} className="text-blue-800" />;
      default: return <LinkIcon size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex justify-end">
        <div className="bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full animate-fade-in-right overflow-hidden w-full max-w-xl">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Lead Intelligence Agent</h3>
                <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">OSINT Depth Search</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {result && (
                <button onClick={() => handleStartResearch(true)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full" title="Refresh Intelligence">
                    <RotateCcw size={16} />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400"><X size={18}/></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {!result && !loading && (
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
                  <UserSearch size={40} />
                </div>
                <div className="max-w-xs mx-auto">
                  <h4 className="font-bold text-slate-900 text-lg">Profile Intelligence</h4>
                  <p className="text-sm text-slate-500 mt-2">
                    No saved data found. Scan public sources to build a detailed sales persona for <b>{context.fullName}</b>.
                  </p>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-200 space-y-2">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Search Parameters</h5>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-slate-400">Target Name:</span><span className="font-bold text-slate-900">{context.fullName}</span>
                    <span className="text-slate-400">Company:</span><span className="font-bold text-slate-900">{context.company || 'Not Specified'}</span>
                    <span className="text-slate-400">Location:</span><span className="font-bold text-slate-900">{context.city || 'Not Specified'}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleStartResearch(false)}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 group"
                >
                  <Search size={18} className="group-hover:scale-110 transition-transform"/> Start OSINT Research
                </button>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Globe size={24} className="text-blue-400 animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-900">
                    {result ? 'Refreshing Intelligence...' : 'Scanning Digital Footprint...'}
                  </p>
                  <p className="text-xs text-slate-400 mt-2 max-w-[250px]">
                    Checking Instagram, LinkedIn, and corporate directories. This takes ~15 seconds.
                  </p>
                </div>
              </div>
            )}

            {result && !loading && (
              <div className="animate-fade-in p-6 space-y-6">
                
                {/* 1. KEY INSIGHTS (INSTAGRAM & ROLE) */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="p-1.5 bg-pink-100 text-pink-600 rounded-lg"><Instagram size={16}/></div>
                             <span className="text-xs font-bold text-slate-500 uppercase">IG Intelligence</span>
                        </div>
                        <div className="space-y-1">
                             <div className="flex items-center gap-2">
                                 <span className="text-lg font-bold text-slate-900">
                                     {result.socialIntelligence?.instagramFollowers > 0 ? `${(result.socialIntelligence.instagramFollowers / 1000).toFixed(1)}k` : 'N/A'}
                                 </span>
                                 <span className="text-xs text-slate-400">followers</span>
                             </div>
                             {result.socialIntelligence?.isVerified && (
                                 <span className="inline-flex items-center text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                     <BadgeCheck size={10} className="mr-1 fill-blue-600 text-white"/> Verified Account
                                 </span>
                             )}
                             <p className="text-[10px] text-slate-400 truncate">{result.socialIntelligence?.instagramHandle || 'No handle found'}</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Briefcase size={16}/></div>
                             <span className="text-xs font-bold text-slate-500 uppercase">Role Analysis</span>
                        </div>
                        <div>
                             <p className="text-sm font-bold text-slate-900 leading-snug">{result.personProfile?.currentRole}</p>
                             <p className="text-xs text-slate-500 mt-1">{result.personProfile?.companyScale}</p>
                             {result.socialIntelligence?.businessAccounts?.length > 0 && (
                                 <div className="flex flex-wrap gap-1 mt-2">
                                     {result.socialIntelligence.businessAccounts.slice(0,2).map(b => (
                                         <span key={b} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{b}</span>
                                     ))}
                                 </div>
                             )}
                        </div>
                    </div>
                </div>

                {/* 2. SALES SCORING */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold text-slate-600 uppercase">Qualification Score</h4>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${result.scoring.accuracyScore > 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                             {result.scoring.accuracyScore}% Confidence
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-500">Willingness</span>
                                <span className="font-bold text-green-600">{result.scoring.willingnessToGrow}/10</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500" style={{width: `${result.scoring.willingnessToGrow * 10}%`}}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-500">Capacity</span>
                                <span className="font-bold text-amber-600">{result.scoring.abilityToPay}/10</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500" style={{width: `${result.scoring.abilityToPay * 10}%`}}></div>
                            </div>
                        </div>
                    </div>
                    {/* NEW: Wealth Segment Display */}
                    {(result.socialIntelligence as any)?.inferredWealthSegment && (
                        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-medium">Inferred Wealth Class:</span>
                            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded">{(result.socialIntelligence as any).inferredWealthSegment}</span>
                        </div>
                    )}
                </div>

                {/* 3. AI SUMMARY & STRATEGY */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Digital Footprint</h4>
                    <p className="text-xs text-slate-600 bg-white border border-slate-200 p-3 rounded-xl italic leading-relaxed">
                        "{result.personProfile?.digitalFootprint}"
                    </p>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800">
                        <span className="font-bold block mb-1">Recommended Strategy:</span>
                        {result.triage?.salesStrategy}
                    </div>
                </div>
                
                {/* 4. LINKS */}
                {result.socialLinks.length > 0 && (
                     <div className="flex flex-wrap gap-2">
                         {result.socialLinks.map((link, i) => (
                             <a key={i} href={link.url} target="_blank" className="flex items-center px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all text-xs text-slate-600">
                                 {getPlatformIcon(link.platform)}
                                 <span className="ml-1.5">{link.platform}</span>
                             </a>
                         ))}
                     </div>
                )}

                {/* 5. MANUAL ASSESSMENT FORM (UPDATED LABEL) */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                      <Save size={16} className="text-blue-600" />
                      <h4 className="font-bold text-slate-900">Confirm & Sync to Profile</h4>
                  </div>
                  
                  <div className="text-[11px] text-slate-500 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      This will automatically fill the member's <b>Social Profile</b> (Followers, Business, Verified) and update qualification tags.
                  </div>

                  <textarea 
                      className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none h-20 bg-white resize-none mb-3" 
                      placeholder="Add manual observation notes (Optional)..." 
                      value={userOpinion} 
                      onChange={(e) => setUserOpinion(e.target.value)} 
                  />
                  
                  <button 
                      onClick={handleSaveToCRM} 
                      disabled={isSaving} 
                      className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle size={16}/>}
                    Update Member Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
};

export default DeepResearchPanel;
