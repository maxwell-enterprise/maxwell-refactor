'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  DollarSign,
  Award,
  Activity,
  Lock,
  Calendar,
  Filter,
  Globe,
  Layers,
  TrendingUp,
  ArrowUpRight,
  Target,
  BarChart3,
  Zap,
  AlertCircle,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import StatCard from './molecules/StatCard';
import { useAccess } from '../context/SecurityContext';
import { APP_CONFIG } from '../lib/config';
import { apiRequest } from '../repositories/api/apiClient';

type TimeRange = 'ALL' | 'LAST_30' | 'THIS_QUARTER' | 'YTD';
type RegionFilter = 'ALL' | 'DOMESTIC' | 'INTL';

export type ExecutiveDashboardPayload = {
  filters: {
    timeRange: TimeRange;
    program: string;
    region: RegionFilter;
  };
  uniquePrograms: string[];
  members: {
    total: number;
    momPercent: number | null;
    scholarshipCount: number;
    scholarshipRate: number;
    nonGuestCount: number;
    engagementScore: number;
    nTagReceivedCount: number;
    retentionRate: number;
    qualifiedCount: number;
    qualifiedRate: number;
    growthData: Array<{
      name: string;
      members: number;
      cumulativeMembers: number;
    }>;
    categoryData: Array<{ name: string; value: number }>;
  } | null;
  finance: {
    totalPaidRevenue: number;
    momPercent: number | null;
    payingCustomerCount: number;
    avgLtv: number;
  } | null;
};

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

function formatIDR(num: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatMomPercent(percent: number | null): string | undefined {
  if (percent === null) return undefined;
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<ExecutiveDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>('ALL');

  const { can: canViewFinance } = useAccess('fin_invoices');
  const { can: canViewMembers } = useAccess('crm_members');

  useEffect(() => {
    if (APP_CONFIG.DOMAINS.DASHBOARD !== 'API') {
      setError(
        'Executive dashboard memakai data server. Set `NEXT_PUBLIC_API_BASE_URL` ke Nest `/fe` dan pastikan `NEXT_PUBLIC_DASHBOARD_BACKEND=API`.',
      );
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const sp = new URLSearchParams({
          timeRange,
          program: selectedProgram,
          region: selectedRegion,
        });
        const res = await apiRequest<ExecutiveDashboardPayload>(
          `/dashboard/executive?${sp.toString()}`,
        );
        if (!cancelled) {
          setData(res);
        }
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [timeRange, selectedProgram, selectedRegion]);

  const members = data?.members;
  const finance = data?.finance;
  const uniquePrograms = data?.uniquePrograms ?? [];
  const growthData = members?.growthData ?? [];
  const categoryData = members?.categoryData ?? [];

  const memberMom = formatMomPercent(members?.momPercent ?? null);
  const revenueMom = formatMomPercent(finance?.momPercent ?? null);

  return (
    <div className="page-container space-y-6 sm:space-y-8 animate-fade-in pb-16 sm:pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-2 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-slate-500 mt-1 flex flex-wrap items-center text-sm sm:text-base gap-x-1">
            <Activity size={16} className="mr-2 text-green-500" />
            Data source:{' '}
            <span className="font-bold text-slate-700 ml-1">
              {APP_CONFIG.DOMAINS.DASHBOARD === 'API' ? 'Live database' : 'Unavailable'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative group">
            <div className="flex items-center px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 group-hover:border-blue-300 transition-all cursor-pointer">
              <Calendar size={14} className="mr-2 text-slate-400" />
              {timeRange === 'ALL' ? 'All Time' : timeRange.replace('_', ' ')}
            </div>
            <select
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              disabled={loading}
            >
              <option value="ALL">All Time</option>
              <option value="LAST_30">Last 30 Days</option>
              <option value="THIS_QUARTER">This Quarter</option>
              <option value="YTD">Year to Date</option>
            </select>
          </div>

          <div className="relative group">
            <div className="flex items-center px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 group-hover:border-blue-300 transition-all cursor-pointer">
              <Layers size={14} className="mr-2 text-slate-400" />
              {selectedProgram === 'ALL' ? 'All Programs' : selectedProgram}
            </div>
            <select
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              disabled={loading}
            >
              <option value="ALL">All Programs</option>
              {uniquePrograms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="relative group">
            <div className="flex items-center px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 group-hover:border-blue-300 transition-all cursor-pointer">
              <Globe size={14} className="mr-2 text-slate-400" />
              {selectedRegion === 'ALL'
                ? 'Global'
                : selectedRegion === 'INTL'
                  ? 'International'
                  : 'Domestic'}
            </div>
            <select
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value as RegionFilter)}
              disabled={loading}
            >
              <option value="ALL">Global View</option>
              <option value="DOMESTIC">Indonesia Only</option>
              <option value="INTL">International</option>
            </select>
          </div>

          <button
            onClick={() => {
              setTimeRange('ALL');
              setSelectedProgram('ALL');
              setSelectedRegion('ALL');
            }}
            className="px-3 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Reset Filters"
            disabled={loading}
          >
            <Filter size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {loading && !data && !error && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          Loading dashboard metrics…
        </div>
      )}

      <div className={`space-y-6 sm:space-y-8 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {canViewMembers('READ') ? (
            <StatCard
              title="Active Members"
              value={members?.total ?? 0}
              change={memberMom}
              isPositive={(members?.momPercent ?? 0) >= 0}
              icon={<Users className="text-blue-600" size={24} />}
              color="bg-blue-50"
            />
          ) : (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400">
              <Lock size={20} className="mb-2" />
              <span className="text-xs font-medium">Locked</span>
            </div>
          )}

          {canViewFinance('READ') ? (
            <StatCard
              title="Paid Revenue"
              value={formatIDR(finance?.totalPaidRevenue ?? 0)}
              change={revenueMom}
              isPositive={(finance?.momPercent ?? 0) >= 0}
              icon={<DollarSign className="text-emerald-600" size={24} />}
              color="bg-emerald-50"
            />
          ) : (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400">
              <Lock size={20} className="mb-2" />
              <span className="text-xs font-medium">Locked</span>
            </div>
          )}

          <StatCard
            title="Impact Scholarships"
            value={members?.scholarshipCount ?? 0}
            change={`${(members?.scholarshipRate ?? 0).toFixed(1)}%`}
            icon={<Award className="text-purple-600" size={24} />}
            color="bg-purple-50"
          />
          <StatCard
            title="Engagement Score"
            value={`${(members?.engagementScore ?? 0).toFixed(1)}%`}
            change={`${members?.nonGuestCount ?? 0} active lifecycle`}
            isPositive={(members?.engagementScore ?? 0) >= 50}
            icon={<Activity className="text-amber-600" size={24} />}
            color="bg-amber-50"
          />
        </div>

        <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-6 sm:mt-8 mb-3 sm:mb-4">
          <Zap size={14} className="shrink-0 text-yellow-500" /> Strategic Health
          Indicators
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={100} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <BarChart3 size={18} />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase">
                  Customer Lifetime Value
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {canViewFinance('READ')
                  ? formatIDR(finance?.avgLtv ?? 0)
                  : '—'}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center">
                  <ArrowUpRight size={12} className="mr-1" /> Paid orders
                </span>
                <span className="text-[10px] text-slate-400">
                  {canViewFinance('READ')
                    ? `${finance?.payingCustomerCount ?? 0} unique payers`
                    : 'Finance access required'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users size={100} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Target size={18} />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase">
                  Retention Rate
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {(members?.retentionRate ?? 0).toFixed(1)}%
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{ width: `${members?.retentionRate ?? 0}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                N-Tag received vs total enrolled
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <DollarSign size={100} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-white/10 rounded-lg text-yellow-400">
                  <Zap size={18} />
                </div>
                <span className="text-xs font-bold text-slate-300 uppercase">
                  Qualification Health
                </span>
              </div>
              <div className="text-2xl font-bold">
                {(members?.qualifiedRate ?? 0).toFixed(1)}%
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Qualified tag ratio from filtered members
              </p>
              <div className="mt-4 flex gap-2">
                <div className="flex-1 bg-white/10 rounded px-2 py-1 text-center">
                  <div className="text-[9px] text-slate-400 uppercase">Qualified</div>
                  <div className="text-xs font-bold">{members?.qualifiedCount ?? 0}</div>
                </div>
                <div className="flex-1 bg-white/10 rounded px-2 py-1 text-center">
                  <div className="text-[9px] text-slate-400 uppercase">Total</div>
                  <div className="text-xs font-bold">{members?.total ?? 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-slate-800">Acquisition Trajectory</h3>
              <div className="flex gap-2 text-xs">
                <span className="flex items-center text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-1" /> New Members
                </span>
              </div>
            </div>
            {canViewMembers('READ') ? (
              <div className="h-72">
                {growthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData}>
                      <defs>
                        <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        dy={10}
                        minTickGap={30}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="members"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorMembers)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    No member acquisitions for the selected filters.
                  </div>
                )}
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

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-semibold text-slate-800 mb-2">Member Distribution</h3>
            {canViewMembers('READ') ? (
              <div className="flex-1 min-h-[250px] relative">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${entry.name}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    No members for the selected filters.
                  </div>
                )}
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
    </div>
  );
};

export default Dashboard;
