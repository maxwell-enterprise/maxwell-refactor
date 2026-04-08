
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { isSystemApiMode, systemApi } from '../../lib/systemApi';

type Tab = 'AUDIT' | 'BASELINE' | 'MODIFIED' | 'GAP_ANALYSIS' | 'STORIES' | 'ARCHITECT' | 'PROPOSED' | 'BLUEPRINT';

const AIBlueprintArchitect: React.FC = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<Tab>('AUDIT');
    const [tables, setTables] = useState<TableDefinition[]>([]);
    
    // Audit State (browser IndexedDB)
    const [actualStores, setActualStores] = useState<string[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);

    // Postgres via Nest (when SYSTEM → API)
    const [backendTables, setBackendTables] = useState<
        { name: string; rowEstimate: number }[]
    >([]);
    const [backendActivity, setBackendActivity] = useState<{
        items: Array<{
            pid: number;
            state: string | null;
            secondsRunning: number | null;
            querySnippet: string;
            applicationName: string | null;
        }>;
        note?: string;
    } | null>(null);
    const [backendErr, setBackendErr] = useState<string | null>(null);
    const [backendLoadedAt, setBackendLoadedAt] = useState<string | null>(null);
    /** Nest meta + pg_activity — default on in API mode (~4s poll, pauses when tab hidden). */
    const [autoRefreshBackend, setAutoRefreshBackend] = useState(() =>
        isSystemApiMode(),
    );
    const [tabVisible, setTabVisible] = useState(true);

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

    useEffect(() => {
        const onVis = () => setTabVisible(!document.hidden);
        onVis();
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, []);

    const loadBackendMeta = useCallback(async () => {
        if (!isSystemApiMode()) return;
        try {
            const [meta, act] = await Promise.all([
                systemApi.getPublicTablesMeta(),
                systemApi.getPgActivity(),
            ]);
            setBackendTables(
                [...meta].sort((a, b) => b.rowEstimate - a.rowEstimate),
            );
            setBackendActivity(act);
            setBackendErr(null);
            setBackendLoadedAt(new Date().toISOString());
        } catch (e) {
            setBackendErr(e instanceof Error ? e.message : String(e));
        }
    }, []);

    const loadData = async () => {
        setAuditLoading(true);
        try {
            // Load Registered
            const regTables = await SchemaService.getTables();
            setTables(regTables);

            // IndexedDB only when not on Nest system API (legacy dev / hybrid)
            if (!isSystemApiMode()) {
                const realStores = await SchemaService.getRealDBStructure();
                setActualStores(realStores.sort());
            } else {
                setActualStores([]);
            }

            await loadBackendMeta();

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

    useEffect(() => {
        if (
            activeTab !== 'AUDIT' ||
            !isSystemApiMode() ||
            !autoRefreshBackend ||
            !tabVisible
        ) {
            return;
        }
        const POLL_MS = 4000;
        const t = setInterval(() => {
            void loadBackendMeta();
        }, POLL_MS);
        return () => clearInterval(t);
    }, [activeTab, autoRefreshBackend, tabVisible, loadBackendMeta]);

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

    const usePostgresAudit = isSystemApiMode();

    const registeredNames = useMemo(
        () => tables.map((t) => t.tableName),
        [tables],
    );

    /** Source of truth for “live” side: Postgres (Nest) or IndexedDB. */
    const liveDbNames = useMemo(() => {
        if (usePostgresAudit) {
            return backendTables.map((t) => t.name);
        }
        return actualStores;
    }, [usePostgresAudit, backendTables, actualStores]);

    const missingInRegistry = useMemo(
        () => liveDbNames.filter((s) => !registeredNames.includes(s)),
        [liveDbNames, registeredNames],
    );

    const missingInDB = useMemo(
        () =>
            registeredNames.filter(
                (s) => !liveDbNames.includes(s) && s !== 'ops_tasks',
            ),
        [registeredNames, liveDbNames],
    );

    /** API: both directions must match. Legacy IDB: only “in DB but not in code” blocked 100%. */
    const auditHealthy = useMemo(() => {
        if (usePostgresAudit) {
            return (
                missingInRegistry.length === 0 && missingInDB.length === 0
            );
        }
        return missingInRegistry.length === 0;
    }, [usePostgresAudit, missingInRegistry, missingInDB]);

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
                            {usePostgresAudit ? (
                                <p className="text-slate-500 max-w-2xl mx-auto">
                                    Membandingkan <strong>registry di kode</strong> (
                                    <code className="text-xs">SchemaService</code>) dengan{' '}
                                    <strong>tabel public</strong> di PostgreSQL lewat{' '}
                                    <strong>Nest</strong>. Tanpa IndexedDB. Daftar tabel +{' '}
                                    <code className="text-xs">pg_stat_activity</code> di-refresh otomatis ~4
                                    detik (bisa dimatikan).
                                </p>
                            ) : (
                                <p className="text-slate-500 max-w-2xl mx-auto">
                                    Membandingkan registry di kode dengan{' '}
                                    <strong>IndexedDB</strong> (mode dev lokal). Untuk audit terhadap
                                    Supabase, set <code className="text-xs">NEXT_PUBLIC_SYSTEM_BACKEND=API</code>.
                                </p>
                            )}
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

                            {/* Card 2: Live side */}
                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                <h3 className="font-bold text-slate-700 flex items-center mb-3">
                                    <ShieldCheck size={18} className="mr-2 text-green-500"/> Live Database
                                </h3>
                                <div className="text-3xl font-bold text-slate-900 mb-1">{liveDbNames.length}</div>
                                <p className="text-xs text-slate-500">
                                    {usePostgresAudit
                                        ? 'Public tables on Postgres (via Nest /fe/system/database/tables).'
                                        : 'Object stores in browser IndexedDB.'}
                                </p>
                            </div>

                            {/* Card 3: Health Status */}
                            <div className={`bg-white border rounded-xl p-5 shadow-sm ${auditHealthy ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                                <h3 className={`font-bold flex items-center mb-3 ${auditHealthy ? 'text-green-700' : 'text-amber-700'}`}>
                                    {auditHealthy ? <CheckCircle2 size={18} className="mr-2"/> : <AlertOctagon size={18} className="mr-2"/>}
                                    System Health
                                </h3>
                                <div className={`text-3xl font-bold mb-1 ${auditHealthy ? 'text-green-700' : 'text-amber-700'}`}>
                                    {auditHealthy ? '100%' : 'Needs Sync'}
                                </div>
                                <p className="text-xs opacity-80">
                                    {auditHealthy
                                        ? 'Registry matches live database.'
                                        : usePostgresAudit
                                          ? `${missingInRegistry.length} in DB not in code; ${missingInDB.length} in code not in DB.`
                                          : `${missingInRegistry.length} store(s) in IndexedDB missing from registry.`}
                                </p>
                            </div>
                        </div>

                        {isSystemApiMode() && (
                            <div className="mt-10 border border-indigo-200 bg-indigo-50/40 rounded-xl p-6">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                    <div>
                                        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                            <Database size={20} />
                                            Detail & query aktif
                                        </h3>
                                        <p className="text-xs text-indigo-800/80 mt-1">
                                            Sama dengan sumber kartu &quot;Live Database&quot; di atas. Ukuran
                                            baris ≈ <code className="text-[10px]">reltuples</code>; jalankan{' '}
                                            <code className="text-[10px]">ANALYZE</code> bila perlu.
                                            {backendLoadedAt && (
                                                <span className="ml-2">
                                                    Terakhir:{' '}
                                                    {new Date(backendLoadedAt).toLocaleString()}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 text-xs text-indigo-900 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={autoRefreshBackend}
                                                onChange={(e) =>
                                                    setAutoRefreshBackend(e.target.checked)
                                                }
                                                className="rounded border-indigo-300"
                                            />
                                            Live poll ~4s
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => void loadBackendMeta()}
                                            disabled={auditLoading}
                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                                        >
                                            <RefreshCw size={12} /> Refresh backend
                                        </button>
                                    </div>
                                </div>
                                {backendErr && (
                                    <p className="text-sm text-red-600 mb-3">{backendErr}</p>
                                )}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-2">
                                            Tabel public ({backendTables.length})
                                        </h4>
                                        <div className="max-h-56 overflow-y-auto rounded-lg border border-indigo-100 bg-white text-xs font-mono">
                                            {backendTables.slice(0, 40).map((t) => (
                                                <div
                                                    key={t.name}
                                                    className="flex justify-between px-3 py-1 border-b border-slate-50 last:border-0"
                                                >
                                                    <span>{t.name}</span>
                                                    <span className="text-slate-500">
                                                        ~{t.rowEstimate.toLocaleString()} rows
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        {backendTables.length > 40 && (
                                            <p className="text-[10px] text-indigo-700 mt-1">
                                                Menampilkan 40 pertama (urut estimasi baris).
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-2">
                                            Sesi / query aktif (ringkas)
                                        </h4>
                                        {backendActivity?.note && (
                                            <p className="text-xs text-amber-800 mb-2">
                                                {backendActivity.note}
                                            </p>
                                        )}
                                        <div className="max-h-56 overflow-y-auto rounded-lg border border-indigo-100 bg-white text-[11px]">
                                            {(backendActivity?.items ?? []).length === 0 &&
                                            !backendActivity?.note ? (
                                                <p className="p-3 text-slate-500">
                                                    Belum ada data atau sedang memuat…
                                                </p>
                                            ) : (
                                                (backendActivity?.items ?? []).map((row) => (
                                                    <div
                                                        key={row.pid}
                                                        className="p-2 border-b border-slate-50 last:border-0"
                                                    >
                                                        <div className="flex justify-between text-slate-600">
                                                            <span>
                                                                pid {row.pid}{' '}
                                                                <span className="text-slate-400">
                                                                    {row.state ?? '—'}
                                                                </span>
                                                            </span>
                                                            {row.secondsRunning != null && (
                                                                <span>{row.secondsRunning}s</span>
                                                            )}
                                                        </div>
                                                        <pre className="whitespace-pre-wrap break-all text-slate-700 mt-1">
                                                            {row.querySnippet || '(no query text)'}
                                                        </pre>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <p className="text-[10px] text-indigo-700 mt-2">
                                            Endpoint:{' '}
                                            <code className="bg-white/80 px-1 rounded">
                                                GET /fe/system/database/activity
                                            </code>{' '}
                                            — untuk analitik mendalam pakai Supabase Dashboard →
                                            Reports / Query Performance.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Missing Tables Alert */}
                        {missingInRegistry.length > 0 && (
                            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
                                <h4 className="font-bold text-amber-800 flex items-center mb-4">
                                    <AlertTriangle size={20} className="mr-2"/> 
                                    Discrepancy Detected: Missing Registrations
                                </h4>
                                <p className="text-sm text-amber-700 mb-4">
                                    {usePostgresAudit
                                        ? 'Tabel berikut ada di PostgreSQL (public) tetapi tidak terdaftar di schemaService — tidak akan masuk AI Architect sampai ditambah.'
                                        : 'The following tables exist in your local database but are not registered in schemaService.ts. They will not appear in the AI Architect analysis until added.'}
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
                                    {usePostgresAudit
                                        ? 'Didefinisikan di kode tetapi belum ada tabel yang sama di PostgreSQL (migration / sync belum jalan).'
                                        : "These tables are defined in code but haven't been created in IndexedDB yet (Empty/Uninitialized)."}
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
