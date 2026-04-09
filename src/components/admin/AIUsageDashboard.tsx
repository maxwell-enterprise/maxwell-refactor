import React, { useState, useEffect, useMemo } from 'react';
import { AIUsageService } from '../../services/aiUsageService';
import { AIUsageLog } from '../../types/index';
import { BarChart as BarChartIcon, Bot, Users, Filter, Code, DollarSign, RefreshCw, List } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AIUsageDashboard: React.FC = () => {
    const [logs, setLogs] = useState<AIUsageLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'LOGS'>('DASHBOARD');

    // Filters
    const [filterUser, setFilterUser] = useState('ALL');
    const [filterFeature, setFilterFeature] = useState('ALL');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        const data = await AIUsageService.getLogs();
        setLogs(data);
        setLoading(false);
    };

    const uniqueUsers = useMemo(() => ['ALL', ...Array.from(new Set(logs.map(l => l.userId)))], [logs]);
    const uniqueFeatures = useMemo(() => ['ALL', ...Array.from(new Set(logs.map(l => l.featureName)))], [logs]);

    const filteredLogs = useMemo(() => {
        return logs.filter(l => 
            (filterUser === 'ALL' || l.userId === filterUser) &&
            (filterFeature === 'ALL' || l.featureName === filterFeature)
        );
    }, [logs, filterUser, filterFeature]);
    
    const dailyData = useMemo(() => {
        const data: Record<string, { date: string, costIDR: number, calls: number }> = {};
        filteredLogs.forEach(log => {
            const date = new Date(log.timestamp).toISOString().split('T')[0];
            if (!data[date]) {
                data[date] = { date, costIDR: 0, calls: 0 };
            }
            data[date].costIDR += log.costIDR;
            data[date].calls += 1;
        });
        return Object.values(data).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [filteredLogs]);

    const totalCost = filteredLogs.reduce((sum, log) => sum + log.costIDR, 0);
    const totalTokens = filteredLogs.reduce((sum, log) => sum + log.totalTokens, 0);

    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);

    return (
        <div className="flex min-h-0 flex-1 flex-col animate-fade-in bg-slate-50">
            <div className="shrink-0 border-b border-slate-200 bg-white">
                <div className="page-container flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:py-5">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <BarChartIcon className="h-5 w-5" strokeWidth={2} aria-hidden />
                        </span>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">
                                AI usage &amp; cost
                            </h1>
                            <p className="mt-1.5 text-sm leading-normal text-slate-600 sm:text-[15px]">
                                Gemini API consumption and performance.
                            </p>
                        </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center">
                        <div className="max-w-full min-w-0 overflow-x-scroll-touch rounded-lg bg-slate-100 p-0.5 shadow-inner">
                            <div className="inline-flex gap-0.5">
                                <button type="button" onClick={() => setActiveTab('DASHBOARD')} className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold sm:text-sm ${activeTab === 'DASHBOARD' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/90' : 'text-slate-500 hover:text-slate-700'}`}>Dashboard</button>
                                <button type="button" onClick={() => setActiveTab('LOGS')} className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold sm:text-sm ${activeTab === 'LOGS' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/90' : 'text-slate-500 hover:text-slate-700'}`}>Raw logs</button>
                            </div>
                        </div>
                        <button type="button" onClick={loadLogs} className="touch-target inline-flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 sm:min-h-0 sm:min-w-0" aria-label="Refresh logs">
                            <RefreshCw size={18} className={loading ? 'animate-spin text-slate-600' : 'text-slate-600'} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-container flex min-h-0 flex-1 flex-col py-4 sm:py-6">
            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-300 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                        <Filter size={16} className="shrink-0 text-slate-400" aria-hidden />
                        Filters
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500">
                            {uniqueUsers.map(u => <option key={u} value={u}>{u === 'ALL' ? 'All users' : u}</option>)}
                        </select>
                        <select value={filterFeature} onChange={e => setFilterFeature(e.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500">
                            {uniqueFeatures.map(f => <option key={f} value={f}>{f === 'ALL' ? 'All features' : f}</option>)}
                        </select>
                    </div>
                </div>
                <p className="shrink-0 text-sm text-slate-600">
                    Showing <span className="font-semibold text-slate-900">{filteredLogs.length}</span> of{' '}
                    <span className="font-semibold text-slate-900">{logs.length}</span> calls
                </p>
            </div>

            {activeTab === 'DASHBOARD' && (
                <div className="flex min-h-0 flex-1 flex-col space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
                        <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Estimated cost</h3>
                            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">{formatIDR(totalCost)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Tokens processed</h3>
                            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">{totalTokens.toLocaleString()}</p>
                        </div>
                         <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">API calls</h3>
                            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">{filteredLogs.length}</p>
                        </div>
                    </div>
                    <div className="shrink-0 overflow-hidden rounded-xl border border-slate-300 bg-white p-4 shadow-sm sm:p-6">
                        <h3 className="mb-4 font-bold text-slate-800">Daily cost (IDR)</h3>
                        {/*
                          Recharts needs a parent with a definite height (not flex-1 + vh min()).
                          overflow-hidden keeps SVG/legend inside the card.
                        */}
                        <div className="h-[280px] w-full min-h-0 sm:h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={dailyData}
                                    margin={{ top: 8, right: 8, left: 4, bottom: 8 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} height={36} />
                                    <YAxis
                                        tickFormatter={(val) => `Rp${val.toLocaleString()}`}
                                        tick={{ fontSize: 11 }}
                                        width={64}
                                    />
                                    <Tooltip formatter={(value) => formatIDR(Number(value))} />
                                    <Legend wrapperStyle={{ paddingTop: 8 }} verticalAlign="bottom" />
                                    <Bar dataKey="costIDR" name="Cost (IDR)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'LOGS' && (
                 <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-300 bg-white shadow-sm">
                    <table className="w-full min-w-[640px] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 sticky top-0">
                            <tr>
                                <th className="p-3">Timestamp</th>
                                <th className="p-3">User / Feature</th>
                                <th className="p-3">Model</th>
                                <th className="p-3">Prompt</th>
                                <th className="p-3">Tokens</th>
                                <th className="p-3">Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="p-3">
                                        <div className="font-bold text-slate-900">{log.featureName}</div>
                                        <div className="text-[10px] text-slate-500">{log.userId}</div>
                                    </td>
                                    <td className="p-3 font-mono text-purple-600 bg-purple-50">{log.model}</td>
                                    <td className="p-3">
                                        <p className="max-w-xs truncate text-slate-600" title={log.prompt}>{log.prompt}</p>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="font-bold">{log.totalTokens}</div>
                                        <div className="text-[9px]">P:{log.promptTokens}/C:{log.completionTokens}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="font-bold text-green-700">{formatIDR(log.costIDR)}</div>
                                        <div className="text-[9px] text-slate-400">${log.costUSD.toFixed(6)}</div>
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

export default AIUsageDashboard;