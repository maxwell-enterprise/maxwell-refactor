
import React, { useMemo, useEffect, useState } from 'react';
import { MONTH_ORDER } from '../constants';
import { DataService } from '../services/dataService';
import { Member, ViewState } from '../types/index';
import { 
  Users, DollarSign, Award, Activity, Lock, Calendar, Filter, 
  Globe, Layers, TrendingUp, ArrowUpRight, ArrowDownRight, 
  Target, BarChart3, Zap 
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, Legend 
} from 'recharts';
import StatCard from './molecules/StatCard';
import { useAccess } from '../context/SecurityContext';

type TimeRange = 'ALL' | 'LAST_30' | 'THIS_QUARTER' | 'YTD';

const Dashboard: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- FILTERS STATE ---
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  // --- ACCESS CONTROL ---
  const { can: canViewFinance } = useAccess('fin_invoices');
  const { can: canViewMembers } = useAccess('crm_members');

  useEffect(() => {
    if (canViewMembers('READ')) {
        setLoading(true);
        DataService.getMembers().then(data => {
            setMembers(data);
            setLoading(false);
        });
    }
  }, [canViewMembers]);

  // --- FILTER LOGIC ---
  const filteredMembers = useMemo(() => {
      const now = new Date();
      return members.filter(m => {
          // 1. Time Filter
          let timeMatch = true;
          const joinDate = new Date(`${m.joinMonth}-01`); // Approx
          
          if (timeRange === 'LAST_30') {
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(now.getDate() - 30);
              timeMatch = joinDate >= thirtyDaysAgo;
          } else if (timeRange === 'THIS_QUARTER') {
              const currentQuarter = Math.floor((now.getMonth() + 3) / 3);
              const joinQuarter = Math.floor((joinDate.getMonth() + 3) / 3);
              timeMatch = joinDate.getFullYear() === now.getFullYear() && currentQuarter === joinQuarter;
          } else if (timeRange === 'YTD') {
              timeMatch = joinDate.getFullYear() === now.getFullYear();
          }

          // 2. Program Filter
          const programMatch = selectedProgram === 'ALL' || m.program === selectedProgram;

          // 3. Region Filter (Mock logic based on Platform/Address)
          const regionMatch = selectedRegion === 'ALL' || (selectedRegion === 'INTL' ? m.regInUS : !m.regInUS);

          return timeMatch && programMatch && regionMatch;
      });
  }, [members, timeRange, selectedProgram, selectedRegion]);

  // --- ANALYTICS CALCULATION ---

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMembers.forEach(m => counts[m.category] = (counts[m.category] || 0) + 1);
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).sort((a,b) => b.value - a.value);
  }, [filteredMembers]);

  const growthData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMembers.forEach(m => counts[m.joinMonth] = (counts[m.joinMonth] || 0) + 1);
    // Sort by date logic handled by MONTH_ORDER or simple string sort for ISO YYYY-MM
    const sortedKeys = Object.keys(counts).sort();
    return sortedKeys.map(month => ({ name: month, members: counts[month] || 0 }));
  }, [filteredMembers]);

  // Strategic KPIs
  const totalRevenueSimulated = filteredMembers.length * 15000000; 
  const scholarshipCount = filteredMembers.filter(m => m.scholarship).length;
  
  // CLTV: Total Revenue / Total Unique Paying Customers (Simplified)
  const avgLTV = filteredMembers.length > 0 ? totalRevenueSimulated / filteredMembers.length : 0;
  
  // Retention: Active (Received N-Tag as proxy for active) / Total
  const activeMembers = filteredMembers.filter(m => m.nTagStatus === 'Received').length;
  const retentionRate = filteredMembers.length > 0 ? (activeMembers / filteredMembers.length) * 100 : 0;

  const uniquePrograms = Array.from(new Set(members.map(m => m.program)));
  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* 1. HEADER & CONTROL BAR */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-2">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
           <p className="text-slate-500 mt-1 flex items-center">
              <Activity size={16} className="mr-2 text-green-500"/> 
              System Status: <span className="font-bold text-slate-700 ml-1">Live & Healthy</span>
           </p>
        </div>
        
        {/* STRATEGIC FILTER BAR */}
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            {/* Time Filter */}
            <div className="relative group">
                <div className="flex items-center px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 group-hover:border-blue-300 transition-all cursor-pointer">
                    <Calendar size={14} className="mr-2 text-slate-400"/>
                    {timeRange === 'ALL' ? 'All Time' : timeRange.replace('_', ' ')}
                </div>
                <select 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                >
                    <option value="ALL">All Time</option>
                    <option value="LAST_30">Last 30 Days</option>
                    <option value="THIS_QUARTER">This Quarter</option>
                    <option value="YTD">Year to Date</option>
                </select>
            </div>

            {/* Program Filter */}
            <div className="relative group">
                <div className="flex items-center px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 group-hover:border-blue-300 transition-all cursor-pointer">
                    <Layers size={14} className="mr-2 text-slate-400"/>
                    {selectedProgram === 'ALL' ? 'All Programs' : selectedProgram}
                </div>
                <select 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                >
                    <option value="ALL">All Programs</option>
                    {uniquePrograms.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            {/* Region Filter */}
            <div className="relative group">
                <div className="flex items-center px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 group-hover:border-blue-300 transition-all cursor-pointer">
                    <Globe size={14} className="mr-2 text-slate-400"/>
                    {selectedRegion === 'ALL' ? 'Global' : selectedRegion === 'INTL' ? 'International' : 'Domestic'}
                </div>
                <select 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                >
                    <option value="ALL">Global View</option>
                    <option value="DOMESTIC">Indonesia Only</option>
                    <option value="INTL">International</option>
                </select>
            </div>
            
            <button 
                onClick={() => { setTimeRange('ALL'); setSelectedProgram('ALL'); setSelectedRegion('ALL'); }}
                className="px-3 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Reset Filters"
            >
                <Filter size={14} />
            </button>
        </div>
      </div>

      {/* 2. OPERATIONAL KPIs (The "Now") */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {canViewMembers('READ') ? (
            <StatCard title="Active Members" value={filteredMembers.length} change="+12%" isPositive={true} icon={<Users className="text-blue-600" size={24} />} color="bg-blue-50" />
        ) : (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400"><Lock size={20} className="mb-2" /><span className="text-xs font-medium">Locked</span></div>
        )}

        {canViewFinance('READ') ? (
            <StatCard title="Revenue (Est)" value={formatIDR(totalRevenueSimulated)} change="+8.4%" isPositive={true} icon={<DollarSign className="text-emerald-600" size={24} />} color="bg-emerald-50" />
        ) : (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400"><Lock size={20} className="mb-2" /><span className="text-xs font-medium">Locked</span></div>
        )}

        <StatCard title="Impact Scholarships" value={scholarshipCount} change={`${((scholarshipCount/filteredMembers.length || 0)*100).toFixed(1)}%`} icon={<Award className="text-purple-600" size={24} />} color="bg-purple-50" />
        <StatCard title="Engagement Score" value="87%" change="-2%" isPositive={false} icon={<Activity className="text-amber-600" size={24} />} color="bg-amber-50" />
      </div>

      {/* 3. STRATEGIC INSIGHT CARDS (The "Future") */}
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center mt-8 mb-4">
          <Zap size={14} className="mr-2 text-yellow-500"/> Strategic Health Indicators
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LTV CARD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={100} /></div>
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><BarChart3 size={18}/></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Customer Lifetime Value</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{formatIDR(avgLTV)}</div>
                  <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center"><ArrowUpRight size={12} className="mr-1"/> High Value</span>
                      <span className="text-[10px] text-slate-400">Avg. revenue per member</span>
                  </div>
              </div>
          </div>

          {/* RETENTION CARD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={100} /></div>
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Target size={18}/></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Retention Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{retentionRate.toFixed(1)}%</div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{width: `${retentionRate}%`}}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Active members vs Total enrolled</p>
              </div>
          </div>

          {/* CAC / EFFICIENCY (MOCK) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={100} /></div>
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-white/10 rounded-lg text-yellow-400"><Zap size={18}/></div>
                      <span className="text-xs font-bold text-slate-300 uppercase">Marketing Efficiency</span>
                  </div>
                  <div className="text-2xl font-bold">4.2x ROAS</div>
                  <p className="text-xs text-slate-400 mt-1">Return on Ad Spend (Simulated)</p>
                  <div className="mt-4 flex gap-2">
                      <div className="flex-1 bg-white/10 rounded px-2 py-1 text-center">
                          <div className="text-[9px] text-slate-400 uppercase">CAC</div>
                          <div className="text-xs font-bold">Rp 1.2jt</div>
                      </div>
                      <div className="flex-1 bg-white/10 rounded px-2 py-1 text-center">
                          <div className="text-[9px] text-slate-400 uppercase">Payback</div>
                          <div className="text-xs font-bold">3 Mo</div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* 4. CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-slate-800">Acquisition Trajectory</h3>
              <div className="flex gap-2 text-xs">
                  <span className="flex items-center text-slate-500"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span> New Members</span>
              </div>
          </div>
          {canViewMembers('READ') ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} dy={10} minTickGap={30} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                    <Area type="monotone" dataKey="members" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorMembers)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
          ) : (
              <div className="h-72 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-center text-slate-400">
                      <Users size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Restricted View</p>
                  </div>
              </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-semibold text-slate-800 mb-2">Member Distribution</h3>
          {canViewMembers('READ') ? (
              <div className="flex-1 min-h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{fontSize: '10px'}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
          ) : (
              <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-center text-slate-400">
                      <Lock size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Restricted</p>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
