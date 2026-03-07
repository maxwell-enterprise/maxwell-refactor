
import React, { useEffect, useState } from 'react';
import { DiscountAnalyticsService, RulePerformance } from '../../services/discountAnalyticsService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, DollarSign, PieChart as PieChartIcon } from 'lucide-react';

const DiscountAnalytics: React.FC = () => {
    const [data, setData] = useState<RulePerformance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        DiscountAnalyticsService.analyzePerformance().then(d => {
            setData(d);
            setLoading(false);
        });
    }, []);

    const totalDiscount = data.reduce((sum, d) => sum + d.totalDiscountGiven, 0);
    const totalRevenue = data.reduce((sum, d) => sum + d.revenueDriven, 0);
    const avgRoi = data.length > 0 ? data.reduce((sum, d) => sum + d.roi, 0) / data.length : 0;

    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (loading) return <div className="p-8 text-center text-slate-400">Loading Financial Data...</div>;

    return (
        <div className="p-6 space-y-6 bg-slate-50 h-full overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <TrendingUp className="mr-2 text-blue-600" /> Discount Efficiency & Budget Burn
            </h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Discount Given</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{formatIDR(totalDiscount)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Attributed Revenue</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{formatIDR(totalRevenue)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Avg. ROI (Rev / Disc)</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{avgRoi.toFixed(1)}x</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Budget Utilization Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center"><PieChartIcon size={16} className="mr-2"/> Budget Utilization (%)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                                <XAxis type="number" domain={[0, 100]} />
                                <YAxis dataKey="ruleName" type="category" width={120} tick={{fontSize: 10}} />
                                <Tooltip formatter={(val: number) => `${val.toFixed(1)}% Used`} />
                                <Bar dataKey="budgetUtilization" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.budgetUtilization > 90 ? '#ef4444' : entry.budgetUtilization > 50 ? '#f59e0b' : '#10b981'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ROI Efficiency */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center"><DollarSign size={16} className="mr-2"/> Revenue Multiplier (ROI)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="ruleName" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" height={40}/>
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="roi" fill="#3b82f6" name="ROI Multiplier">
                                     {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                            <th className="p-4">Rule Name</th>
                            <th className="p-4 text-right">Transactions</th>
                            <th className="p-4 text-right">Discount</th>
                            <th className="p-4 text-right">Revenue</th>
                            <th className="p-4 text-right">Budget Used</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map(row => (
                            <tr key={row.ruleId} className="hover:bg-slate-50">
                                <td className="p-4 font-medium text-slate-900">{row.ruleName}</td>
                                <td className="p-4 text-right">{row.transactionsCount}</td>
                                <td className="p-4 text-right text-red-600">-{formatIDR(row.totalDiscountGiven)}</td>
                                <td className="p-4 text-right text-green-600">{formatIDR(row.revenueDriven)}</td>
                                <td className="p-4 text-right">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${row.budgetUtilization > 90 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {row.budgetUtilization.toFixed(1)}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DiscountAnalytics;
