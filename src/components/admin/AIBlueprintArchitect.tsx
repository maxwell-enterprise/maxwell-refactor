
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
import { metadata } from '@/app/layout';

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
        <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
            {/* TOP NAVIGATION TABS */}
            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-5 sm:pt-4 lg:px-8">
                <div className="max-w-full min-w-0 overflow-x-scroll-touch">
                    <div className="inline-flex gap-1 pb-0.5">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        const isDisabled = (tab.id === 'PROPOSED' || tab.id === 'BLUEPRINT') && !optimizationResult;
                        
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => !isDisabled && setActiveTab(tab.id)}
                                disabled={isDisabled}
                                className={`
                                    inline-flex shrink-0 items-center whitespace-nowrap rounded-lg border px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors sm:px-3.5 sm:py-2.5 sm:text-xs
                                    ${isActive 
                                        ? 'border-slate-200 bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/90' 
                                        : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                    }
                                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                {React.createElement(tab.icon, { size: 14, className: `mr-1.5 shrink-0 sm:mr-2 ${isActive ? 'text-blue-500' : 'text-slate-400'}` })}
                                {tab.label}
                                {tab.id === 'PROPOSED' && optimizationResult && (
                                    <span className="ml-1.5 bg-amber-100 text-amber-700 text-[9px] px-1.5 rounded-full font-bold sm:ml-2">
                                        {optimizationResult.changes.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    </div>
                </div>

                {history.length > 0 && (
                    <div className="flex w-full shrink-0 items-center gap-2 sm:mb-1 sm:w-auto sm:justify-end">
                        <History size={16} className="shrink-0 text-slate-400" aria-hidden />
                        <select 
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-2 pr-8 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 sm:flex-none sm:max-w-[220px]"
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
                
                {/* 0. AUDIT TAB */}
                {activeTab === 'AUDIT' && (
                    <div className="mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto overscroll-y-contain px-3 py-5 sm:px-6 sm:py-8">
                        <div className="mb-6 text-center sm:mb-8">
                            <h2 className="mb-2 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">Schema Integrity Audit</h2>
                            {usePostgresAudit ? (
                                <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                                    Compares the in-code registry (<code className="text-xs">SchemaService</code>) with{' '}
                                    <strong>public</strong> PostgreSQL tables via <strong>Nest</strong> (no IndexedDB). Table
                                    list and <code className="text-xs">pg_stat_activity</code> refresh about every 4 seconds
                                    (can be disabled below).
                                </p>
                            ) : (
                                <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                                    Compares the in-code registry with <strong>IndexedDB</strong> (local dev). For Supabase /
                                    Postgres audit, set <code className="text-xs">NEXT_PUBLIC_SYSTEM_BACKEND=API</code>.
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
                            <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
                                <h3 className="mb-3 flex items-center font-bold text-slate-700">
                                    <Database size={18} className="mr-2 shrink-0 text-blue-500"/> App registry
                                </h3>
                                <div className="mb-1 text-3xl font-bold tabular-nums text-slate-900">{tables.length}</div>
                                <p className="text-xs leading-snug text-slate-500">Tables defined in SchemaService.</p>
                            </div>

                            <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
                                <h3 className="mb-3 flex items-center font-bold text-slate-700">
                                    <ShieldCheck size={18} className="mr-2 shrink-0 text-green-500"/> Live database
                                </h3>
                                <div className="mb-1 text-3xl font-bold tabular-nums text-slate-900">{liveDbNames.length}</div>
                                <p className="text-xs leading-snug text-slate-500">
                                    {usePostgresAudit
                                        ? 'Public tables (Nest /fe/system/database/tables).'
                                        : 'Object stores in browser IndexedDB.'}
                                </p>
                            </div>

                            <div className={`rounded-xl border p-5 shadow-sm ${auditHealthy ? 'border-green-200 bg-green-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
                                <h3 className={`mb-3 flex items-center font-bold ${auditHealthy ? 'text-green-800' : 'text-amber-800'}`}>
                                    {auditHealthy ? <CheckCircle2 size={18} className="mr-2 shrink-0"/> : <AlertOctagon size={18} className="mr-2 shrink-0"/>}
                                    System health
                                </h3>
                                <div className={`mb-1 text-3xl font-bold tabular-nums ${auditHealthy ? 'text-green-800' : 'text-amber-800'}`}>
                                    {auditHealthy ? 'OK' : 'Needs sync'}
                                </div>
                                <p className="text-xs leading-snug text-slate-600/90">
                                    {auditHealthy
                                        ? 'Registry matches live database.'
                                        : usePostgresAudit
                                          ? `${missingInRegistry.length} in DB not in code; ${missingInDB.length} in code not in DB.`
                                          : `${missingInRegistry.length} store(s) in IndexedDB missing from registry.`}
                                </p>
                            </div>
                        </div>

                        {isSystemApiMode() && (
                            <div className="mt-8 rounded-xl border border-indigo-200/90 bg-indigo-50/50 p-4 sm:p-6">
                                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <h3 className="flex items-center gap-2 font-bold text-indigo-950">
                                            <Database size={20} className="shrink-0" aria-hidden />
                                            Live backend detail &amp; activity
                                        </h3>
                                        <p className="mt-1.5 text-xs leading-relaxed text-indigo-900/85">
                                            Same source as the &quot;Live database&quot; card. Row counts are approximate (
                                            <code className="text-[10px]">reltuples</code>); run <code className="text-[10px]">ANALYZE</code> if needed.
                                            {backendLoadedAt && (
                                                <span className="mt-1 block text-indigo-800/90 sm:mt-0 sm:inline sm:ml-2">
                                                    Last updated: {new Date(backendLoadedAt).toLocaleString()}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-indigo-950">
                                            <input
                                                type="checkbox"
                                                checked={autoRefreshBackend}
                                                onChange={(e) =>
                                                    setAutoRefreshBackend(e.target.checked)
                                                }
                                                className="rounded border-indigo-300"
                                            />
                                            Auto-refresh ~4s
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => void loadBackendMeta()}
                                            disabled={auditLoading}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            <RefreshCw size={12} className="shrink-0" aria-hidden /> Refresh now
                                        </button>
                                    </div>
                                </div>
                                {backendErr && (
                                    <p className="mb-3 text-sm text-red-600">{backendErr}</p>
                                )}
                                <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
                                    <div className="min-w-0">
                                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-950">
                                            Public tables ({backendTables.length})
                                        </h4>
                                        <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white text-xs font-mono shadow-inner">
                                            {backendTables.slice(0, 40).map((t) => (
                                                <div
                                                    key={t.name}
                                                    className="flex flex-col gap-0.5 border-b border-slate-100 px-3 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                                                >
                                                    <span className="min-w-0 break-all">{t.name}</span>
                                                    <span className="shrink-0 text-slate-500">
                                                        ~{t.rowEstimate.toLocaleString()} rows
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        {backendTables.length > 40 && (
                                            <p className="mt-1.5 text-[10px] text-indigo-900/80">
                                                Showing first 40 tables (sorted by estimated row count).
                                            </p>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-950">
                                            Active sessions / queries
                                        </h4>
                                        {backendActivity?.note && (
                                            <p className="mb-2 text-xs text-amber-900">
                                                {backendActivity.note}
                                            </p>
                                        )}
                                        <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white text-[11px] shadow-inner">
                                            {(backendActivity?.items ?? []).length === 0 &&
                                            !backendActivity?.note ? (
                                                <p className="p-3 text-slate-500">
                                                    No activity data yet, or still loading…
                                                </p>
                                            ) : (
                                                (backendActivity?.items ?? []).map((row) => (
                                                    <div
                                                        key={row.pid}
                                                        className="border-b border-slate-100 p-2.5 last:border-0"
                                                    >
                                                        <div className="flex justify-between gap-2 text-slate-600">
                                                            <span className="min-w-0">
                                                                pid {row.pid}{' '}
                                                                <span className="text-slate-400">
                                                                    {row.state ?? '—'}
                                                                </span>
                                                            </span>
                                                            {row.secondsRunning != null && (
                                                                <span className="shrink-0">{row.secondsRunning}s</span>
                                                            )}
                                                        </div>
                                                        <pre className="mt-1 whitespace-pre-wrap break-all text-slate-700">
                                                            {row.querySnippet || '(no query text)'}
                                                        </pre>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <p className="mt-2 text-[10px] leading-relaxed text-indigo-900/85">
                                            Endpoint{' '}
                                            <code className="rounded bg-white/90 px-1 py-0.5 text-[10px] ring-1 ring-indigo-100">
                                                GET /fe/system/database/activity
                                            </code>
                                            . For deeper analytics, use Supabase Dashboard → Reports / Query Performance.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {missingInRegistry.length > 0 && (
                            <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50/80 p-4 sm:p-6">
                                <h4 className="mb-3 flex items-center font-bold text-amber-900">
                                    <AlertTriangle size={20} className="mr-2 shrink-0" aria-hidden />
                                    Discrepancy: missing registrations
                                </h4>
                                <p className="mb-4 text-sm leading-relaxed text-amber-900/95">
                                    {usePostgresAudit
                                        ? 'These tables exist in PostgreSQL (public) but are not registered in schemaService — they will not appear in AI Architect until added.'
                                        : 'The following tables exist locally but are not registered in schemaService.ts. They will not appear in AI Architect until added.'}
                                </p>
                                <ul className="divide-y divide-amber-200/80 overflow-hidden rounded-lg border border-amber-200 bg-white">
                                    {missingInRegistry.map((t) => (
                                        <li
                                            key={t}
                                            className="flex items-start gap-2 px-3 py-2.5 font-mono text-xs text-amber-950 sm:items-center"
                                        >
                                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500 sm:mt-0" aria-hidden />
                                            <span className="min-w-0 break-all">{t}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-4 flex justify-start">
                                    <button
                                        type="button"
                                        onClick={() => loadData()}
                                        className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700"
                                    >
                                        <RefreshCw size={14} className="shrink-0" aria-hidden /> Refresh audit
                                    </button>
                                </div>
                            </div>
                        )}

                        {missingInDB.length > 0 && (
                            <div className="mt-8 rounded-xl border border-slate-300 bg-slate-50 p-4 sm:p-6">
                                <h4 className="mb-2 flex items-center font-bold text-slate-800">
                                    <AlertCircle size={20} className="mr-2 shrink-0 text-slate-500" aria-hidden /> Ghost definitions
                                </h4>
                                <p className="mb-4 text-sm leading-relaxed text-slate-600">
                                    {usePostgresAudit
                                        ? 'Defined in code but no matching table exists in PostgreSQL yet (migrations or sync pending).'
                                        : "Defined in code but not created in IndexedDB yet (empty / uninitialized)."}
                                </p>
                                <ul className="space-y-1.5">
                                    {missingInDB.map((t) => (
                                        <li
                                            key={t}
                                            className="rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800"
                                        >
                                            {t}
                                        </li>
                                    ))}
                                </ul>
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
