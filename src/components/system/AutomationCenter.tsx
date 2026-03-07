
import React, { useState, useEffect } from 'react';
import { MASTER_EVENT_REGISTRY, MasterEventDefinition } from '../../constants/masterEventRegistry';
import { WhatsAppService } from '../../services/whatsappService';
import { OpsService } from '../../services/opsService';
import { GamificationService } from '../../services/gamificationService';
import { AutomationQueueService } from '../../services/automationQueueService';
import { EventBus } from '../../services/eventBus';
import { WhatsAppTemplate } from '../../types/index';
import { AutomationQueueItem } from '../../types/automation';
import { OpsTemplate } from '../../types/ops';
import { PointRule } from '../../types/gamification';
import { 
    Activity, Zap, MessageSquare, ClipboardList, Trophy, 
    Play, RotateCw, CheckCircle2, AlertCircle, Clock, List
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

// --- SUB-COMPONENT: QUEUE MONITOR (Migrated from AutomationQueue.tsx) ---
const QueueMonitor = () => {
    const { showToast } = useToast();
    const [queue, setQueue] = useState<AutomationQueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => { loadQueue(); }, []);

    const loadQueue = async () => {
        setLoading(true);
        const data = await AutomationQueueService.getPendingItems();
        setQueue(data);
        setLoading(false);
    };

    const handleProcessBatch = async () => {
        if (queue.length === 0) return;
        setProcessing(true);
        await AutomationQueueService.processBatch(queue, () => {}); // Simplified progress for compact view
        showToast('Batch processed.', 'success');
        setProcessing(false);
        loadQueue();
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center">
                    <RotateCw size={16} className={`mr-2 ${processing ? 'animate-spin' : ''}`}/> Background Job Queue
                </h3>
                <div className="flex gap-2">
                    <button onClick={loadQueue} className="text-xs text-slate-500 hover:text-slate-800 underline">Refresh</button>
                    <button 
                        onClick={handleProcessBatch}
                        disabled={processing || queue.length === 0}
                        className="bg-slate-900 text-white px-3 py-1 text-xs rounded font-bold hover:bg-slate-800 disabled:opacity-50"
                    >
                        {processing ? 'Processing...' : `Run Batch (${queue.length})`}
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
                {queue.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        <CheckCircle2 size={24} className="mx-auto mb-2 text-green-300"/>
                        All systems operational. Queue empty.
                    </div>
                ) : (
                    <table className="w-full text-left text-xs">
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
                                        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: EVENT SIMULATOR ---
const EventSimulator = () => {
    const { showToast } = useToast();
    const [selectedEventId, setSelectedEventId] = useState<string>(MASTER_EVENT_REGISTRY[0].id);
    const [payload, setPayload] = useState<Record<string, string>>({});
    const [isFiring, setIsFiring] = useState(false);

    const definition = MASTER_EVENT_REGISTRY.find(e => e.id === selectedEventId);

    // Reset payload when event changes
    useEffect(() => {
        if (definition) {
            const defaults: Record<string, string> = {};
            definition.variables.forEach(v => defaults[v.key] = v.example);
            // Always add standard context keys
            defaults['memberId'] = 'M0002'; // David Pratomo (Seed)
            defaults['name'] = 'David Pratomo';
            defaults['email'] = 'david@example.com';
            defaults['phone'] = '628123456789';
            setPayload(defaults);
        }
    }, [selectedEventId]);

    const handleFire = async () => {
        if (!definition) return;
        setIsFiring(true);
        
        // Convert payload number strings to actual numbers if needed (Mock logic)
        const finalPayload = { ...payload };
        if (finalPayload.amount) finalPayload['amount'] = parseInt(finalPayload.amount.replace(/\D/g, '')) as any;

        try {
            await EventBus.emit(definition.id, finalPayload);
            showToast(`Event ${definition.id} fired successfully. Check logs/queue.`, 'success');
        } catch (e) {
            showToast('Failed to fire event.', 'error');
        }
        setIsFiring(false);
    };

    return (
        <div className="bg-slate-900 text-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full border border-slate-700">
            <div className="p-4 border-b border-slate-700 bg-slate-950 flex items-center gap-2">
                <Play size={18} className="text-green-400 fill-green-400" />
                <h3 className="font-bold">Event Simulator (DevTools)</h3>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select Trigger</label>
                    <select 
                        className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500"
                        value={selectedEventId}
                        onChange={e => setSelectedEventId(e.target.value)}
                    >
                        {MASTER_EVENT_REGISTRY.map(e => (
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
    const [opsWorkflows, setOpsWorkflows] = useState<OpsTemplate[]>([]);
    const [gameRules, setGameRules] = useState<PointRule[]>([]);
    const [activeTab, setActiveTab] = useState<'REGISTRY' | 'SIMULATOR'>('REGISTRY');

    useEffect(() => {
        // Load all consumers of events to map them
        Promise.all([
            WhatsAppService.getTemplates(),
            OpsService.getTemplates(),
            GamificationService.getRules()
        ]).then(([wa, ops, game]) => {
            setTemplates(wa);
            setOpsWorkflows(ops);
            setGameRules(game);
        });
    }, []);

    const getConnections = (triggerId: string) => {
        const wa = templates.find(t => t.linkedTriggerId === triggerId);
        const ops = opsWorkflows.find(t => t.triggerType === 'SYSTEM_EVENT' && t.triggerEventId === triggerId);
        const game = gameRules.find(r => r.triggerType === triggerId && r.isActive);
        return { wa, ops, game };
    };

    return (
        <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col animate-fade-in relative">
            
            {/* Header */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <Activity className="mr-3 text-blue-600" /> Automation Center
                    </h1>
                    <p className="text-slate-500 mt-1">The Central Nervous System. Manage triggers, workflows, and reactions.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('REGISTRY')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'REGISTRY' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Event Registry</button>
                    <button onClick={() => setActiveTab('SIMULATOR')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'SIMULATOR' ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}>Dev Simulator</button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                
                {/* LEFT: MAIN CONTENT */}
                <div className="flex-1 overflow-y-auto pr-2">
                    
                    {activeTab === 'REGISTRY' && (
                        <div className="space-y-4">
                            {MASTER_EVENT_REGISTRY.map(event => {
                                const { wa, ops, game } = getConnections(event.id);
                                const hasConnection = wa || ops || game;

                                return (
                                    <div key={event.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${
                                                    event.category === 'FINANCE' ? 'bg-emerald-50 text-emerald-600' :
                                                    event.category === 'CRM' ? 'bg-blue-50 text-blue-600' :
                                                    event.category === 'EVENT' ? 'bg-purple-50 text-purple-600' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {React.createElement(event.icon, { size: 24 })}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900">{event.label}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{event.id}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{event.category}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Connection Map */}
                                        <div className="grid grid-cols-3 gap-3">
                                            {/* WA */}
                                            <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between h-24 ${wa ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                                <div className="flex items-center text-green-700 font-bold mb-1">
                                                    <MessageSquare size={14} className="mr-1.5"/> Communication
                                                </div>
                                                {wa ? (
                                                    <div>
                                                        <span className="block font-bold text-slate-800 line-clamp-1">{wa.label}</span>
                                                        <span className="text-[10px] text-green-600">Active Template</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">No message configured</span>
                                                )}
                                            </div>

                                            {/* OPS */}
                                            <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between h-24 ${ops ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                                <div className="flex items-center text-blue-700 font-bold mb-1">
                                                    <ClipboardList size={14} className="mr-1.5"/> Operations
                                                </div>
                                                {ops ? (
                                                    <div>
                                                        <span className="block font-bold text-slate-800 line-clamp-1">{ops.name}</span>
                                                        <span className="text-[10px] text-blue-600">Triggers Workflow</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">No SOP triggered</span>
                                                )}
                                            </div>

                                            {/* GAME */}
                                            <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between h-24 ${game ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                                <div className="flex items-center text-amber-700 font-bold mb-1">
                                                    <Trophy size={14} className="mr-1.5"/> Gamification
                                                </div>
                                                {game ? (
                                                    <div>
                                                        <span className="block font-bold text-slate-800">+{game.points} Points</span>
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
                                <p className="text-sm">Use the panel on the right to simulate events.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: SIDEBAR (Contextual) */}
                <div className="w-80 flex flex-col gap-6 shrink-0">
                    
                    {activeTab === 'SIMULATOR' ? (
                        <EventSimulator />
                    ) : (
                         <div className="h-full">
                            <QueueMonitor />
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AutomationCenter;
