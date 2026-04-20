
import React, { useState, useEffect, useMemo } from 'react';
import { DataService } from '../../services/dataService';
import { CertificationService } from '../../services/certificationService'; // Switch to Cert Service
import { ExcelHelper } from '../../utils/excelHelper';
import { Member } from '../../types/index';
import { CertificationRule, MasterDoneTag } from '../../types/certification';
import { Calendar, Search, RefreshCw, CheckCircle, Circle, AlertTriangle, Database, Info, Download } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { CERT_INTEGRATION_MEMBERS } from '../../seeds/certification_integration_test';
import CertificationOverrideModal from './CertificationOverrideModal';
import { APP_CONFIG } from '../../lib/config';
import { DevDatabase } from '../../utils/devDatabase';

const CertificationGrid: React.FC = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    
    // Data Sources
    const [rules, setRules] = useState<CertificationRule[]>([]);
    const [masterTags, setMasterTags] = useState<MasterDoneTag[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    
    // UI State
    const [selectedRuleId, setSelectedRuleId] = useState<string>('');
    const [memberFilter, setMemberFilter] = useState('');
    
    // Override State
    const [overrideContext, setOverrideContext] = useState<{ member: Member, tag: MasterDoneTag } | null>(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // Load Rules & Tags
            const [rulesData, tagsData] = await Promise.all([
                CertificationService.getRules(),
                CertificationService.getMasterTags()
            ]);
            
            setRules(rulesData);
            setMasterTags(tagsData);

            if (rulesData.length > 0) {
                setSelectedRuleId(rulesData[0].id);
            }

            // Load Members (Including seeded test members for integration check)
            let allMembers = await DataService.getMembers();
            
            if (APP_CONFIG.USE_MOCK) {
                 // Check if integration seeds exist, if not inject them locally for view
                 const hasTest = allMembers.some(m => m.id === 'CERT-TEST-01');
                 if (!hasTest) {
                     // Inject in memory for this session if missing from DB
                     allMembers = [...allMembers, ...CERT_INTEGRATION_MEMBERS];
                 }
            }

            setMembers(allMembers.filter(m => m.lifecycleStage !== 'GUEST').sort((a,b) => a.name.localeCompare(b.name)));

        } catch (e) {
            showToast('Failed to load certification data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        loadInitialData();
        showToast('Data refreshed', 'info');
    };

    // Derived State
    const selectedRule = useMemo(() => rules.find(r => r.id === selectedRuleId), [rules, selectedRuleId]);
    
    // Columns based on Rule Requirements
    const gridColumns = useMemo(() => {
        if (!selectedRule) return [];
        return selectedRule.requiredTags.map(tagCode => {
            const def = masterTags.find(t => t.code === tagCode);
            return {
                code: tagCode,
                label: def ? def.label : tagCode, // Readable Name
                category: def ? def.category : 'UNKNOWN'
            };
        });
    }, [selectedRule, masterTags]);

    const filteredMembers = useMemo(() => {
        if (!memberFilter) return members;
        return members.filter(m => 
            m.name.toLowerCase().includes(memberFilter.toLowerCase()) || 
            m.email.toLowerCase().includes(memberFilter.toLowerCase())
        );
    }, [members, memberFilter]);

    // Calculation Helper
    const getStats = (member: Member) => {
        if (!selectedRule) return { count: 0, weightedScore: 0, percent: 0, qualified: false };
        
        const earnedSet = new Set(member.earnedDoneTags || []);
        const reqCount = selectedRule.requiredTags.length;
        let matchCount = 0;
        
        selectedRule.requiredTags.forEach(tag => {
            if (earnedSet.has(tag)) matchCount++;
        });

        let qualified = false;
        let weightedScore = 0;
        let percent = 0;

        if (selectedRule.logic === 'REQUIRE_ALL') {
            percent = Math.round((matchCount / reqCount) * 100);
            qualified = percent === 100;
        } else if (selectedRule.logic === 'MIN_COUNT') {
            weightedScore = selectedRule.requiredTags.reduce((sum, tag) => {
                if (!earnedSet.has(tag)) return sum;
                const weight = Number(selectedRule.tagWeights?.[tag] ?? 1);
                return sum + (Number.isFinite(weight) && weight > 0 ? weight : 1);
            }, 0);
            const min = selectedRule.minCountValue || 1;
            percent = Math.round(Math.min(100, (weightedScore / min) * 100));
            qualified = weightedScore >= min;
        } else {
            // REQUIRE ANY
            qualified = matchCount > 0;
            percent = qualified ? 100 : 0;
        }

        return { count: matchCount, weightedScore, percent, qualified };
    };

    const exportCertificationProgress = () => {
        if (!selectedRule) {
            showToast('Select a certification rule first.', 'error');
            return;
        }
        const rows = filteredMembers.map((member) => {
            const stats = getStats(member);
            return {
                memberName: member.name,
                email: member.email,
                rule: selectedRule.name,
                logic: selectedRule.logic,
                threshold: selectedRule.minCountValue ?? null,
                weightedScore: selectedRule.logic === 'MIN_COUNT' ? Number(stats.weightedScore.toFixed(2)) : null,
                matchedTags: stats.count,
                progressPercent: stats.percent,
                qualified: stats.qualified ? 'YES' : 'NO',
            };
        });
        ExcelHelper.exportToExcel(
            rows,
            `Certification_Progress_${new Date().toISOString().split('T')[0]}`,
        );
        showToast('Certification progress exported.', 'success');
    };

    const onCellClick = (member: Member, tagCode: string) => {
        const tagDef = masterTags.find(t => t.code === tagCode) || { id: 'temp', code: tagCode, label: tagCode, category: 'CORE' };
        setOverrideContext({ member, tag: tagDef });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 animate-fade-in">
            {/* Header Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                        <Database size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Certification Progress</h2>
                        <p className="text-xs text-slate-500">Evaluation Matrix based on Rules</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                     <div className="relative flex-1 md:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Filter members..." 
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={memberFilter}
                            onChange={(e) => setMemberFilter(e.target.value)}
                        />
                    </div>
                    
                    <select 
                        className="p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 font-bold text-slate-700 outline-none focus:border-indigo-500 max-w-[250px]"
                        value={selectedRuleId}
                        onChange={(e) => setSelectedRuleId(e.target.value)}
                    >
                        {rules.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>

                    <button 
                        onClick={handleRefresh} 
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" 
                        title="Refresh Grid"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={exportCertificationProgress}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        title="Export progress to Excel"
                    >
                        <Download size={14} />
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-auto relative custom-scrollbar bg-white">
                {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[min(50vh,280px)] h-full text-slate-500 text-sm">
                        Loading data…
                    </div>
                ) : rules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[min(50vh,280px)] h-full text-center px-6">
                        <Database className="text-slate-300 mb-3" size={40} strokeWidth={1.25} />
                        <p className="text-slate-600 font-medium">No certification rules yet</p>
                        <p className="text-slate-500 text-sm mt-1 max-w-md">Create rules under Admin → Certification Rules first; the matrix will appear here.</p>
                    </div>
                ) : gridColumns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[min(50vh,280px)] h-full text-slate-400 text-center px-6">
                        <Calendar size={48} className="mb-4 opacity-20"/>
                        <p className="font-medium">No requirements for this rule yet</p>
                        <p className="text-xs mt-1 max-w-md">Add required tags in the rule settings (Certification Rules).</p>
                    </div>
                ) : (
                    <table className="w-full border-collapse text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 z-20 shadow-sm">
                            <tr>
                                {/* Sticky Name Column Header */}
                                <th className="sticky left-0 bg-slate-100 z-30 p-3 text-left border-b border-slate-200 min-w-[200px] shadow-[4px_0_12px_rgba(0,0,0,0.05)]">
                                    Member Name
                                </th>
                                {/* Stats Column Header */}
                                <th className="sticky left-[200px] bg-slate-100 z-30 p-3 text-center border-b border-r border-slate-200 min-w-[100px] shadow-[4px_0_12px_rgba(0,0,0,0.05)]">
                                    Compliance
                                </th>
                                {/* Tag Columns */}
                                {gridColumns.map((col, idx) => (
                                    <th key={idx} className="p-2 border-b border-r border-slate-200 min-w-[100px] text-center bg-slate-50">
                                        <div className="flex flex-col items-center">
                                            <span className="mb-1 text-slate-800 line-clamp-1 max-w-[120px]" title={col.label}>{col.label}</span>
                                            <span className="text-[9px] font-normal text-slate-400 font-mono bg-white px-1 rounded">{col.category}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredMembers.map(member => {
                                const stats = getStats(member);
                                const isDone = stats.qualified;
                                
                                return (
                                    <tr key={member.id} className="group hover:bg-slate-50">
                                        {/* Sticky Name Cell */}
                                        <td className={`sticky left-0 z-10 p-3 border-b border-slate-100 bg-white group-hover:bg-slate-50 font-medium text-slate-900 border-r shadow-[4px_0_12px_rgba(0,0,0,0.05)]`}>
                                            <div className="truncate w-48" title={member.name}>{member.name}</div>
                                            <div className="text-[10px] text-slate-400 truncate w-48">{member.email}</div>
                                        </td>
                                        
                                        {/* Sticky Stats Cell */}
                                        <td className={`sticky left-[200px] z-10 p-2 text-center border-b border-r border-slate-100 bg-white group-hover:bg-slate-50 shadow-[4px_0_12px_rgba(0,0,0,0.05)]`}>
                                            <div className="flex flex-col items-center gap-1">
                                                <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDone ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                                                    {stats.percent}%
                                                </div>
                                                {selectedRule?.logic === 'MIN_COUNT' && (
                                                    <span className="text-[9px] text-slate-400">{stats.weightedScore.toFixed(1)}/{selectedRule.minCountValue}</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Tag Cells */}
                                        {gridColumns.map(col => {
                                            const hasTag = (member.earnedDoneTags || []).includes(col.code);
                                            
                                            return (
                                                <td 
                                                    key={col.code} 
                                                    className="p-2 text-center border-b border-r border-slate-100 last:border-r-0 cursor-pointer hover:bg-black/5 transition-colors"
                                                    onClick={() => onCellClick(member, col.code)}
                                                >
                                                    {hasTag ? (
                                                        <CheckCircle size={18} className="text-green-600 fill-green-50 inline-block" />
                                                    ) : (
                                                        <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-200 inline-block"></div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
            
            {/* Legend / Footer */}
            <div className="px-6 py-2 bg-white border-t border-slate-200 text-[10px] text-slate-400 flex gap-4">
                <span className="flex items-center"><CheckCircle size={12} className="text-green-600 mr-1"/> Requirement Met</span>
                <span className="flex items-center"><div className="w-3 h-3 border-2 border-slate-200 rounded-full mr-1"></div> Missing</span>
                <span className="flex items-center ml-auto">
                    <Info size={12} className="mr-1 text-blue-500"/> Click any cell to perform a manual override (with audit log).
                </span>
            </div>

            {/* Override Modal */}
            {overrideContext && (
                <CertificationOverrideModal 
                    member={overrideContext.member}
                    tag={overrideContext.tag}
                    hasTag={(overrideContext.member.earnedDoneTags || []).includes(overrideContext.tag.code)}
                    onClose={() => setOverrideContext(null)}
                    onSuccess={handleRefresh}
                />
            )}
        </div>
    );
};

export default CertificationGrid;
