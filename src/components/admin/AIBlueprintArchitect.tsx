
import React, { useState, useEffect } from 'react';
import { SchemaService, TableDefinition } from '../../services/schemaService';
import { AIOptimizerService } from '../../services/aiOptimizerService';
import { OptimizationResult, OptimizationHistoryItem } from '../../types/schemaOptimizer';
import { ALL_USER_STORIES } from '../../constants/userStories';
import { 
    BrainCircuit, Sparkles, Layers, FileText, Database, 
    ArrowRight, Code, Loader2, History, ShieldCheck, AlertOctagon, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, FileCode2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import SchemaExplorer from './schema/SchemaExplorer';
import UserStoriesViewer from './schema/UserStoriesViewer';
import AISchemaArchitect from './AISchemaArchitect';
import ModifiedSchemaViewer from './schema/ModifiedSchemaViewer';
import SchemaGapAnalyzer from './schema/SchemaGapAnalyzer'; // New Import

type Tab = 'AUDIT' | 'BASELINE' | 'MODIFIED' | 'GAP_ANALYSIS' | 'STORIES' | 'ARCHITECT' | 'PROPOSED' | 'BLUEPRINT';

const AIBlueprintArchitect: React.FC = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<Tab>('AUDIT');
    const [tables, setTables] = useState<TableDefinition[]>([]);
    
    // Audit State
    const [actualStores, setActualStores] = useState<string[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);

    // Architect State
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
    const [userFeedback, setUserFeedback] = useState('');
    
    // Persistence & History State
    const [history, setHistory] = useState<OptimizationHistoryItem[]>([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState<string>('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setAuditLoading(true);
        try {
            // Load Registered
            const regTables = await SchemaService.getTables();
            setTables(regTables);

            // Load Actual DB
            const realStores = await SchemaService.getRealDBStructure();
            setActualStores(realStores.sort());
            
            // Load History
            const hist = await AIOptimizerService.getHistory();
            setHistory(hist);
            if (hist.length > 0) {
                setOptimizationResult(hist[0].result);
                setSelectedHistoryId(hist[0].id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setAuditLoading(false), 500);
        }
    };

    const handleRunOptimizer = async () => {
        setLoading(true);
        setProgress('Initializing AI Agents...');
        try {
            const result = await AIOptimizerService.optimizeSchema(
                tables, 
                ALL_USER_STORIES,
                userFeedback,
                (stage) => setProgress(stage)
            );
            setOptimizationResult(result);
            
            // Refresh history list
            const updatedHistory = await AIOptimizerService.getHistory();
            setHistory(updatedHistory);
            if(updatedHistory.length > 0) setSelectedHistoryId(updatedHistory[0].id);

            showToast('Analysis complete and saved.', 'success');
            setActiveTab('PROPOSED');
        } catch (e) {
            showToast('Optimization failed. Check Console/API Key.', 'error');
            console.error(e);
        } finally {
            setLoading(false);
            setProgress('');
        }
    };

    const handleHistorySelect = (id: string) => {
        const item = history.find(h => h.id === id);
        if (item) {
            setOptimizationResult(item.result);
            setSelectedHistoryId(id);
            if(activeTab === 'ARCHITECT') setActiveTab('PROPOSED');
            showToast(`Loaded Version ${item.version}`, 'info');
        }
    };

    const tabs: {id: Tab, label: string, icon: any}[] = [
        { id: 'AUDIT', label: '0. Audit', icon: ShieldCheck },
        { id: 'BASELINE', label: '1. Registered', icon: Database },
        { id: 'MODIFIED', label: '2. Target SQL', icon: FileCode2 },
        { id: 'GAP_ANALYSIS', label: '3. Data Opname', icon: AlertOctagon }, // New Tab
        { id: 'STORIES', label: '4. Context', icon: FileText },
        { id: 'ARCHITECT', label: '5. AI Architect', icon: BrainCircuit },
        { id: 'PROPOSED', label: '6. Review', icon: Layers },
        { id: 'BLUEPRINT', label: '7. Blueprint', icon: Code },
    ];

    // Audit Calculations
    const registeredNames = tables.map(t => t.tableName);
    const missingInRegistry = actualStores.filter(s => !registeredNames.includes(s));
    const missingInDB = registeredNames.filter(s => !actualStores.includes(s) && s !== 'ops_tasks');

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* TOP NAVIGATION TABS */}
            <div className="bg-white border-b border-slate-200 px-6 pt-4 flex justify-between items-end shadow-sm shrink-0">
                <div className="flex items-end gap-2 overflow-x-auto">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        const isDisabled = (tab.id === 'PROPOSED' || tab.id === 'BLUEPRINT') && !optimizationResult;
                        
                        return (
                            <button
                                key={tab.id}
                                onClick={() => !isDisabled && setActiveTab(tab.id)}
                                disabled={isDisabled}
                                className={`
                                    flex items-center px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all border-t border-x border-b-0 whitespace-nowrap
                                    ${isActive 
                                        ? 'bg-white text-blue-600 border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.02)] translate-y-[1px]' 
                                        : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100'
                                    }
                                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                {React.createElement(tab.icon, { size: 14, className: `mr-2 ${isActive ? 'text-blue-500' : 'text-slate-400'}` })}
                                {tab.label}
                                {tab.id === 'PROPOSED' && optimizationResult && (
                                    <span className="ml-2 bg-amber-100 text-amber-700 text-[9px] px-1.5 rounded-full font-bold">
                                        {optimizationResult.changes.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* VERSION HISTORY SELECTOR */}
                {history.length > 0 && (
                    <div className="mb-3 flex items-center gap-2">
                        <History size={16} className="text-slate-400"/>
                        <select 
                            className="bg-slate-50 border border-slate-200 rounded-lg text-xs py-1.5 pl-2 pr-8 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                            value={selectedHistoryId}
                            onChange={(e) => handleHistorySelect(e.target.value)}
                        >
                            {history.map(h => (
                                <option key={h.id} value={h.id}>v{h.version} - {new Date(h.timestamp).toLocaleTimeString()}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-hidden bg-white p-0">
                
                {/* 0. AUDIT TAB */}
                {activeTab === 'AUDIT' && (
                    <div className="p-8 max-w-5xl mx-auto h-full overflow-y-auto">
                        <div className="mb-8 text-center">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Schema Integrity Audit</h2>
                            <p className="text-slate-500">Verifying alignment between Application Code Registry and actual IndexedDB Storage.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: Registered Tables */}
                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                <h3 className="font-bold text-slate-700 flex items-center mb-3">
                                    <Database size={18} className="mr-2 text-blue-500"/> App Registry
                                </h3>
                                <div className="text-3xl font-bold text-slate-900 mb-1">{tables.length}</div>
                                <p className="text-xs text-slate-500">Tables defined in SchemaService code.</p>
                            </div>

                            {/* Card 2: Actual DB */}
                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                <h3 className="font-bold text-slate-700 flex items-center mb-3">
                                    <ShieldCheck size={18} className="mr-2 text-green-500"/> Live Database
                                </h3>
                                <div className="text-3xl font-bold text-slate-900 mb-1">{actualStores.length}</div>
                                <p className="text-xs text-slate-500">Object Stores found in IndexedDB.</p>
                            </div>

                            {/* Card 3: Health Status */}
                            <div className={`bg-white border rounded-xl p-5 shadow-sm ${missingInRegistry.length === 0 ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                                <h3 className={`font-bold flex items-center mb-3 ${missingInRegistry.length === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                                    {missingInRegistry.length === 0 ? <CheckCircle2 size={18} className="mr-2"/> : <AlertOctagon size={18} className="mr-2"/>}
                                    System Health
                                </h3>
                                <div className={`text-3xl font-bold mb-1 ${missingInRegistry.length === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                                    {missingInRegistry.length === 0 ? '100%' : 'Needs Sync'}
                                </div>
                                <p className="text-xs opacity-80">
                                    {missingInRegistry.length === 0 ? 'Registry matches Database perfectly.' : `${missingInRegistry.length} tables found in DB but missing in App code.`}
                                </p>
                            </div>
                        </div>

                        {/* Missing Tables Alert */}
                        {missingInRegistry.length > 0 && (
                            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
                                <h4 className="font-bold text-amber-800 flex items-center mb-4">
                                    <AlertTriangle size={20} className="mr-2"/> 
                                    Discrepancy Detected: Missing Registrations
                                </h4>
                                <p className="text-sm text-amber-700 mb-4">
                                    The following tables exist in your local database but are not registered in <code>schemaService.ts</code>. 
                                    They will not appear in the AI Architect analysis until added.
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {missingInRegistry.map(t => (
                                        <div key={t} className="bg-white px-3 py-2 rounded border border-amber-100 text-xs font-mono text-amber-900 shadow-sm flex items-center">
                                            <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                                            {t}
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => loadData()}
                                    className="mt-6 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 flex items-center"
                                >
                                    <RefreshCw size={14} className="mr-2"/> Refresh Audit
                                </button>
                            </div>
                        )}

                        {/* Ghost Tables Alert (Code has it, DB doesn't) */}
                        {missingInDB.length > 0 && (
                            <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6 opacity-75">
                                <h4 className="font-bold text-slate-700 flex items-center mb-2">
                                    <AlertCircle size={20} className="mr-2"/> Ghost Definitions
                                </h4>
                                <p className="text-sm text-slate-500 mb-4">
                                    These tables are defined in code but haven't been created in IndexedDB yet (Empty/Uninitialized).
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {missingInDB.map(t => (
                                        <span key={t} className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs font-mono">{t}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {/* 1. BASELINE EXPLORER */}
                {activeTab === 'BASELINE' && (
                    <SchemaExplorer tables={tables} mode="BASELINE" />
                )}

                {/* 2. MODIFIED SQL SCHEMA */}
                {activeTab === 'MODIFIED' && (
                    <ModifiedSchemaViewer liveTables={tables} />
                )}

                {/* 3. GAP ANALYSIS (NEW) */}
                {activeTab === 'GAP_ANALYSIS' && (
                    <SchemaGapAnalyzer liveTables={tables} />
                )}

                {/* 4. USER STORIES */}
                {activeTab === 'STORIES' && (
                    <div className="p-6 h-full bg-slate-50">
                        <UserStoriesViewer />
                    </div>
                )}

                {/* 5. ARCHITECT AGENT */}
                {activeTab === 'ARCHITECT' && (
                    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col items-center justify-center text-center">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-full shadow-2xl mb-8 animate-pulse-slow">
                            <BrainCircuit size={64} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">AI Schema Architect</h2>
                        <p className="text-slate-500 max-w-lg mb-8 leading-relaxed">
                            I will analyze your <b>{tables.length} tables</b> against <b>{ALL_USER_STORIES.length} user stories</b> and your <b>Modified SQL Schema</b> to propose a standardized, normalized, and optimized database schema.
                        </p>
                        
                        <div className="w-full max-w-lg mb-8">
                            <textarea
                                className="w-full p-4 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                                placeholder="Optional: Provide specific instructions (e.g., 'Ensure strict snake_case naming' or 'Optimize for high-volume transactions')..."
                                rows={3}
                                value={userFeedback}
                                onChange={e => setUserFeedback(e.target.value)}
                            />
                        </div>

                        <button 
                            onClick={handleRunOptimizer}
                            disabled={loading}
                            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 shadow-xl transition-transform active:scale-95 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin mr-3"/> : <Sparkles className="mr-3 text-yellow-400"/>}
                            {loading ? 'Analyzing Schema...' : 'Run Optimization'}
                        </button>
                        
                        {progress && (
                            <div className="mt-6 text-sm font-mono text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg animate-fade-in">
                                {progress}
                            </div>
                        )}
                    </div>
                )}

                {/* 6. PROPOSED CHANGES */}
                {activeTab === 'PROPOSED' && optimizationResult && (
                    <SchemaExplorer 
                        tables={tables} // Pass original for fallback reference
                        mode="PROPOSED" 
                        optimizationResult={optimizationResult} 
                    />
                )}

                {/* 7. SQL BLUEPRINT */}
                {activeTab === 'BLUEPRINT' && (
                    <AISchemaArchitect />
                )}
            </div>
        </div>
    );
};

export default AIBlueprintArchitect;
