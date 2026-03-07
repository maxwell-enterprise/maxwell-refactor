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
        <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <BarChartIcon className="mr-3 text-blue-600" /> AI Usage & Cost Center
                    </h1>
                    <p className="text-slate-500 mt-1">Monitor Gemini API consumption and performance.</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setActiveTab('DASHBOARD')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'DASHBOARD' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Dashboard</button>
                        <button onClick={() => setActiveTab('LOGS')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'LOGS' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Raw Logs</button>
                    </div>
                    <button onClick={loadLogs} className="p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-slate-400"/>
                    <span className="text-xs font-bold text-slate-500 uppercase">Filters:</span>
                    <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="text-sm border border-slate-200 rounded-lg p-2 bg-white">
                        {uniqueUsers.map(u => <option key={u} value={u}>{u === 'ALL' ? 'All Users' : u}</option>)}
                    </select>
                    <select value={filterFeature} onChange={e => setFilterFeature(e.target.value)} className="text-sm border border-slate-200 rounded-lg p-2 bg-white">
                        {uniqueFeatures.map(f => <option key={f} value={f}>{f === 'ALL' ? 'All Features' : f}</option>)}
                    </select>
                </div>
                <div className="text-sm text-slate-500">
                    Showing <b>{filteredLogs.length}</b> of <b>{logs.length}</b> total API calls.
                </div>
            </div>

            {activeTab === 'DASHBOARD' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h3 className="text-xs font-bold text-slate-500 uppercase">Total Estimated Cost</h3>
                            <p className="text-3xl font-bold text-slate-900 mt-2">{formatIDR(totalCost)}</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h3 className="text-xs font-bold text-slate-500 uppercase">Total Tokens Processed</h3>
                            <p className="text-3xl font-bold text-slate-900 mt-2">{totalTokens.toLocaleString()}</p>
                        </div>
                         <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h3 className="text-xs font-bold text-slate-500 uppercase">Total API Calls</h3>
                            <p className="text-3xl font-bold text-slate-900 mt-2">{filteredLogs.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px]">
                        <h3 className="font-bold text-slate-800 mb-6">Daily API Cost (IDR)</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{fontSize: 12}} />
                                <YAxis tickFormatter={(val) => `Rp${val.toLocaleString()}`} tick={{fontSize: 12}} />
                                <Tooltip formatter={(value) => formatIDR(Number(value))} />
                                <Legend />
                                <Bar dataKey="costIDR" name="Cost (IDR)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            
            {activeTab === 'LOGS' && (
                 <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left text-xs">
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
    );
};

export default AIUsageDashboard;