
import React, { useState, useEffect } from 'react';
import { MASTER_EVENT_REGISTRY } from '../../constants/masterEventRegistry';
import { WhatsAppService } from '../../services/whatsappService';
import { OpsService } from '../../services/opsService';
import { GamificationService } from '../../services/gamificationService';
import { CommunicationService } from '../../services/communicationService';
import { AutomationQueueService } from '../../services/automationQueueService';
import { loadTriggerDefinitions } from '../../services/triggerDefinitions';
import { EventBus } from '../../services/eventBus';
import { isSystemApiMode, systemApi } from '../../lib/systemApi';
import { getWorkspaceToken } from '../../lib/workspaceAuthToken';
import type { TriggerDefinition } from '../../types/automation';
import type { SystemTriggerType } from '../../types/ops';
import { WhatsAppTemplate } from '../../types/index';
import { AutomationQueueItem } from '../../types/automation';
import { OpsTemplate } from '../../types/ops';
import { PointRule, Badge } from '../../types/gamification';
import { 
    Activity, MessageSquare, ClipboardList, Trophy, 
    Play, RotateCw, CheckCircle2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

type TriggerConnectionsSnapshot = {
    triggerId: string;
    communication: {
        whatsappTemplateLabels: string[];
        emailTemplateNames: string[];
    };
    operations: {
        workflowNames: string[];
    };
    gamification: {
        rulePoints: number;
        badgeBonusPoints: number;
        badgeNames: string[];
    };
};

// --- SUB-COMPONENT: QUEUE MONITOR (Migrated from AutomationQueue.tsx) ---
const QueueMonitor = () => {
    const { showToast } = useToast();
    const [queue, setQueue] = useState<AutomationQueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const pendingOrFailed = queue.filter(
        (item) => item.status === 'PENDING' || item.status === 'FAILED',
    );

    useEffect(() => { loadQueue(); }, []);

    useEffect(() => {
        if (!isSystemApiMode()) return;
        let disposed = false;
        let timer: number | null = null;

        const tick = async () => {
            if (disposed) return;
            try {
                const data = await AutomationQueueService.getQueueItems();
                if (!disposed) setQueue(data);
            } catch {
                // Keep previous queue state on transient network issues.
            } finally {
                if (!disposed) {
                    timer = window.setTimeout(tick, 5000);
                }
            }
        };

        timer = window.setTimeout(tick, 5000);
        return () => {
            disposed = true;
            if (timer != null) window.clearTimeout(timer);
        };
    }, []);

    const loadQueue = async () => {
        setLoading(true);
        const data = await AutomationQueueService.getQueueItems();
        setQueue(data);
        setLoading(false);
    };

    const handleProcessBatch = async () => {
        if (pendingOrFailed.length === 0) return;
        setProcessing(true);
        await AutomationQueueService.processBatch(pendingOrFailed, () => {}); // Simplified progress for compact view
        showToast('Batch processed.', 'success');
        setProcessing(false);
        loadQueue();
    };

    return (
        <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <h3 className="flex min-w-0 items-center text-sm font-bold text-slate-800 sm:text-base">
                    <RotateCw size={16} className={`mr-2 shrink-0 ${processing ? 'animate-spin' : ''}`} aria-hidden />
                    <span className="leading-snug">Background Job Queue</span>
                </h3>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                    <button
                        type="button"
                        onClick={loadQueue}
                        className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-100 sm:min-h-0 sm:w-auto sm:border-0 sm:bg-transparent sm:px-2 sm:py-1 sm:text-right sm:underline"
                    >
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={handleProcessBatch}
                        disabled={processing || pendingOrFailed.length === 0}
                        className="min-h-[44px] w-full shrink-0 rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 sm:min-h-0 sm:w-auto sm:py-2"
                    >
                        {processing ? 'Processing…' : `Run Batch (${pendingOrFailed.length})`}
                    </button>
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-0">
                {loading ? (
                    <div className="p-6 text-center text-sm text-slate-400 sm:p-8">
                        Loading queue...
                    </div>
                ) : queue.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-400 sm:p-8">
                        <CheckCircle2 size={24} className="mx-auto mb-2 text-green-300" aria-hidden />
                        All systems operational. Queue empty.
                    </div>
                ) : (
                    <div className="overflow-x-scroll-touch">
                    <table className="w-full min-w-[300px] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                            <tr>
                                <th className="p-3">Trigger</th>
                                <th className="p-3">Context</th>
                                <th className="p-3 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {queue.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-mono text-blue-600">{item.triggerType}</td>
                                    <td className="p-3 text-slate-600 truncate max-w-[200px]">{item.description}</td>
                                    <td className="p-3 text-right">
                                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                                            item.status === 'COMPLETED'
                                                ? 'bg-green-100 text-green-700'
                                                : item.status === 'FAILED'
                                                    ? 'bg-rose-100 text-rose-700'
                                                    : item.status === 'PROCESSING'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: EVENT SIMULATOR ---
const EventSimulator = () => {
    const { showToast } = useToast();
    const [triggerDefs, setTriggerDefs] = useState<TriggerDefinition[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [payload, setPayload] = useState<Record<string, string>>({});
    const [isFiring, setIsFiring] = useState(false);

    useEffect(() => {
        let cancelled = false;
        loadTriggerDefinitions().then((list) => {
            if (cancelled || list.length === 0) return;
            setTriggerDefs(list);
            setSelectedEventId((prev) =>
                prev && list.some((t) => t.id === prev) ? prev : list[0].id,
            );
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const definition = triggerDefs.find((e) => e.id === selectedEventId);

    const resolveCurrentWorkspaceUserId = (): string => {
        const token = getWorkspaceToken();
        if (!token) return 'M0002';
        try {
            const parts = token.split('.');
            if (parts.length < 2) return 'M0002';
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
            const payload = JSON.parse(atob(padded)) as { sub?: string };
            return typeof payload.sub === 'string' && payload.sub.trim() ? payload.sub : 'M0002';
        } catch {
            return 'M0002';
        }
    };

    // Reset payload when event changes
    useEffect(() => {
        if (definition) {
            const workspaceUserId = resolveCurrentWorkspaceUserId();
            const defaults: Record<string, string> = {};
            definition.variables.forEach(v => defaults[v.key] = v.example);
            // Always add standard context keys. Use active workspace JWT subject to
            // avoid RBAC false positives on simulator-triggered profile updates.
            defaults['memberId'] = workspaceUserId;
            defaults['userId'] = workspaceUserId;
            defaults['name'] = 'David Pratomo';
            defaults['email'] = 'david@example.com';
            defaults['phone'] = '628123456789';
            setPayload(defaults);
        }
    }, [selectedEventId, definition]);

    const handleFire = async () => {
        if (!definition) return;
        setIsFiring(true);
        
        // Convert payload number strings to actual numbers if needed (Mock logic)
        const finalPayload = { ...payload };
        if (finalPayload.amount) finalPayload['amount'] = parseInt(finalPayload.amount.replace(/\D/g, '')) as any;

        try {
            if (isSystemApiMode()) {
                const res = await systemApi.postAutomationSimulate({
                    triggerId: definition.id,
                    payload: finalPayload as Record<string, unknown>,
                });
                showToast(
                    `Permintaan otomatisasi berhasil dikirim dan sedang diproses di background. Pantau progresnya di Automation Queue (Ref: ${res.queueId}).`,
                    'success',
                );
            } else {
                await EventBus.emit(definition.id as SystemTriggerType, finalPayload);
                showToast(
                    `Permintaan otomatisasi berhasil dikirim. Pantau progresnya di Automation Queue.`,
                    'success',
                );
            }
        } catch (error) {
            const detail =
                error instanceof Error && error.message.trim()
                    ? ` ${error.message.trim()}`
                    : '';
            showToast(`Failed to dispatch automation event.${detail}`, 'error');
        }
        setIsFiring(false);
    };

    return (
        <div className="bg-slate-900 text-white rounded-xl shadow-lg overflow-hidden flex flex-col h-auto lg:h-full border border-slate-700">
            <div className="p-4 border-b border-slate-700 bg-slate-950 flex items-center gap-2">
                <Play size={18} className="text-green-400 fill-green-400" />
                <h3 className="font-bold">Event Simulator (DevTools)</h3>
            </div>
            
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6 lg:max-h-none lg:flex-1">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select Trigger</label>
                    <select 
                        className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500"
                        value={selectedEventId}
                        onChange={e => setSelectedEventId(e.target.value)}
                        disabled={triggerDefs.length === 0}
                    >
                        {triggerDefs.map(e => (
                            <option key={e.id} value={e.id}>{e.label} ({e.id})</option>
                        ))}
                    </select>
                </div>

                {definition && (
                    <div className="space-y-4">
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <p className="text-xs text-slate-300">{definition.description}</p>
                        </div>
                        
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase">Payload Context Data</h4>
                            {Object.keys(payload).map(key => (
                                <div key={key}>
                                    <label className="block text-[10px] text-blue-300 font-mono mb-1">{key}</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-green-300 focus:border-green-500 outline-none"
                                        value={payload[key]}
                                        onChange={e => setPayload({...payload, [key]: e.target.value})}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-slate-800 border-t border-slate-700">
                <button 
                    onClick={handleFire}
                    disabled={isFiring}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center disabled:opacity-50"
                >
                    {isFiring ? 'Firing Event...' : '⚡ Emit Event Now'}
                </button>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const AutomationCenter: React.FC = () => {
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [emailTemplates, setEmailTemplates] = useState<Array<Record<string, unknown>>>([]);
    const [opsWorkflows, setOpsWorkflows] = useState<OpsTemplate[]>([]);
    const [gameRules, setGameRules] = useState<PointRule[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [connectionsSnapshot, setConnectionsSnapshot] = useState<Record<string, TriggerConnectionsSnapshot>>({});
    const [activeTab, setActiveTab] = useState<'REGISTRY' | 'SIMULATOR'>('REGISTRY');

    const normalizeTrigger = (value: unknown): string =>
        String(value ?? '').trim().toUpperCase();

    const mapGamificationTriggerAliases = (triggerId: string): string[] => {
        const normalized = normalizeTrigger(triggerId);
        const aliases = new Set<string>([normalized]);
        // Business alias: payment success in automation maps to purchase completion points.
        if (normalized === 'PAYMENT_SUCCESS') {
            aliases.add('PURCHASE_COMPLETE');
        }
        return Array.from(aliases);
    };

    useEffect(() => {
        // Load all consumers of events to map them
        Promise.all([
            WhatsAppService.getTemplates(),
            CommunicationService.getTemplates(),
            OpsService.getTemplates(),
            GamificationService.getRules(),
            GamificationService.getBadges(),
        ]).then(([wa, email, ops, game, badgeRows]) => {
            setTemplates(wa);
            setEmailTemplates(email as Array<Record<string, unknown>>);
            setOpsWorkflows(ops);
            setGameRules(game);
            setBadges(badgeRows);
        });
    }, []);

    useEffect(() => {
        if (!isSystemApiMode()) return;
        let cancelled = false;
        systemApi
            .getAutomationConnections()
            .then((rows) => {
                if (cancelled) return;
                const mapped: Record<string, TriggerConnectionsSnapshot> = {};
                for (const row of rows) {
                    mapped[normalizeTrigger(row.triggerId)] = row as TriggerConnectionsSnapshot;
                }
                setConnectionsSnapshot(mapped);
            })
            .catch(() => {
                if (!cancelled) setConnectionsSnapshot({});
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const getConnections = (triggerId: string) => {
        const normalized = normalizeTrigger(triggerId);
        const gameKeys = mapGamificationTriggerAliases(triggerId);
        const snapshot = connectionsSnapshot[normalized];

        const wa = templates.find(
            (t) => normalizeTrigger(t.linkedTriggerId) === normalized,
        );
        const email = emailTemplates.find(
            (t) => normalizeTrigger((t as { linkedTriggerId?: string }).linkedTriggerId) === normalized,
        );
        const ops = opsWorkflows.find((t) => {
            if (!t.isActive) return false;
            if (t.triggerType === 'SYSTEM_EVENT') {
                return normalizeTrigger(t.triggerEventId) === normalized;
            }
            // PRODUCT_PURCHASE flows are materialized from successful checkout/payment.
            if (t.triggerType === 'PRODUCT_PURCHASE' && normalized === 'PAYMENT_SUCCESS') {
                return true;
            }
            return false;
        });
        const game = gameRules.find(
            (r) => r.isActive && gameKeys.includes(normalizeTrigger(r.triggerType)),
        );
        const gameBadge = badges.find((b) =>
            gameKeys.includes(normalizeTrigger(b.autoTrigger)),
        );
        const gamePointsLocal = (game?.points ?? 0) + (gameBadge?.pointBonus ?? 0);
        const gamePoints = snapshot
            ? Number(snapshot.gamification.rulePoints ?? 0) +
              Number(snapshot.gamification.badgeBonusPoints ?? 0)
            : gamePointsLocal;

        const hasCommSnapshot =
            !!snapshot &&
            (snapshot.communication.whatsappTemplateLabels.length > 0 ||
                snapshot.communication.emailTemplateNames.length > 0);
        const commLabelSnapshot = snapshot
            ? snapshot.communication.whatsappTemplateLabels[0] ||
              snapshot.communication.emailTemplateNames[0] ||
              ''
            : '';
        const hasOpsSnapshot =
            !!snapshot && snapshot.operations.workflowNames.length > 0;
        const opsNameSnapshot = snapshot?.operations.workflowNames[0] ?? '';
        const hasGameSnapshot =
            !!snapshot &&
            (snapshot.gamification.rulePoints > 0 ||
                snapshot.gamification.badgeBonusPoints > 0 ||
                snapshot.gamification.badgeNames.length > 0);

        return {
            wa,
            email,
            ops,
            game,
            gameBadge,
            gamePoints,
            hasCommSnapshot,
            commLabelSnapshot,
            hasOpsSnapshot,
            opsNameSnapshot,
            hasGameSnapshot,
        };
    };

    return (
        <div className="page-container relative flex min-h-0 flex-1 flex-col animate-fade-in min-w-0 pb-8">
            
            {/* Header */}
            <div className="mb-4 flex flex-col gap-4 sm:mb-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
                        <Activity className="mr-2 h-7 w-7 shrink-0 text-blue-600 sm:mr-3" strokeWidth={2} aria-hidden />
                        Automation Center
                    </h1>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500 sm:text-[15px]">
                        The central nervous system: triggers, workflows, and reactions.
                    </p>
                </div>
                <div className="max-w-full overflow-x-scroll-touch rounded-xl bg-slate-100 p-1 shadow-inner">
                    <div className="inline-flex flex-nowrap gap-0.5">
                        <button
                            type="button"
                            onClick={() => setActiveTab('REGISTRY')}
                            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'REGISTRY' ? 'bg-white text-blue-700 shadow' : 'text-slate-500'}`}
                        >
                            Event Registry
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('SIMULATOR')}
                            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'SIMULATOR' ? 'bg-white text-purple-700 shadow' : 'text-slate-500'}`}
                        >
                            Dev Simulator
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-visible lg:flex-row lg:overflow-hidden">
                
                {/* MAIN CONTENT — below queue on mobile (order-2), left column on desktop */}
                <div className="order-2 min-h-0 min-w-0 flex-1 overflow-y-auto lg:order-1 lg:pr-2">
                    
                    {activeTab === 'REGISTRY' && (
                        <div className="space-y-4">
                            {MASTER_EVENT_REGISTRY.map(event => {
                                const {
                                    wa,
                                    email,
                                    ops,
                                    game,
                                    gameBadge,
                                    gamePoints,
                                    hasCommSnapshot,
                                    commLabelSnapshot,
                                    hasOpsSnapshot,
                                    opsNameSnapshot,
                                    hasGameSnapshot,
                                } = getConnections(event.id);
                                const hasComm = hasCommSnapshot || !!wa || !!email;
                                const commLabel =
                                    commLabelSnapshot ||
                                    wa?.label ||
                                    (typeof email?.name === 'string' ? email.name : 'Email Template');
                                const hasOps = hasOpsSnapshot || !!ops;
                                const opsName = opsNameSnapshot || ops?.name || '';
                                const hasGame = hasGameSnapshot || !!game || !!gameBadge;

                                return (
                                    <div key={event.id} className="group rounded-xl border border-slate-300 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-5">
                                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                                                <div className={`p-3 rounded-xl ${
                                                    event.category === 'FINANCE' ? 'bg-emerald-50 text-emerald-600' :
                                                    event.category === 'CRM' ? 'bg-blue-50 text-blue-600' :
                                                    event.category === 'EVENT' ? 'bg-purple-50 text-purple-600' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {React.createElement(event.icon, { size: 24 })}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">{event.label}</h3>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                                        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{event.id}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{event.category}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Connection Map */}
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            {/* WA */}
                                            <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between h-24 ${hasComm ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                                <div className="flex items-center text-green-700 font-bold mb-1">
                                                    <MessageSquare size={14} className="mr-1.5"/> Communication
                                                </div>
                                                {hasComm ? (
                                                    <div>
                                                        <span className="block font-bold text-slate-800 line-clamp-1">{commLabel}</span>
                                                        <span className="text-[10px] text-green-600">Active Template</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">No message configured</span>
                                                )}
                                            </div>

                                            {/* OPS */}
                                            <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between h-24 ${hasOps ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                                <div className="flex items-center text-blue-700 font-bold mb-1">
                                                    <ClipboardList size={14} className="mr-1.5"/> Operations
                                                </div>
                                                {hasOps ? (
                                                    <div>
                                                        <span className="block font-bold text-slate-800 line-clamp-1">{opsName}</span>
                                                        <span className="text-[10px] text-blue-600">Triggers Workflow</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">No SOP triggered</span>
                                                )}
                                            </div>

                                            {/* GAME */}
                                            <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between h-24 ${hasGame ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                                <div className="flex items-center text-amber-700 font-bold mb-1">
                                                    <Trophy size={14} className="mr-1.5"/> Gamification
                                                </div>
                                                {hasGame ? (
                                                    <div>
                                                        <span className="block font-bold text-slate-800">+{gamePoints} Points</span>
                                                        <span className="text-[10px] text-amber-600">Awarded automatically</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">No points awarded</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'SIMULATOR' && (
                        <div className="h-full flex items-center justify-center">
                            <div className="max-w-md w-full text-center text-slate-400">
                                <Activity size={64} className="mx-auto mb-4 opacity-20"/>
                                <h3 className="text-lg font-bold text-slate-600">Developer Mode Active</h3>
                                <p className="text-sm text-slate-500">
                                    Use the simulator panel below (desktop: right) to fire test events.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* SIDEBAR: queue / simulator — top on mobile, right column on desktop */}
                <div className="order-1 flex w-full shrink-0 flex-col gap-6 min-h-0 lg:order-2 lg:w-80 lg:min-w-[18rem]">
                    
                    {activeTab === 'SIMULATOR' ? (
                        <EventSimulator />
                    ) : (
                         <div className="min-h-[280px] lg:h-full lg:min-h-[320px]">
                            <QueueMonitor />
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AutomationCenter;
