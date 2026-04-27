'use client';

import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, Plus, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import { APP_CONFIG } from '../../lib/config';
import { apiRequest } from '../../repositories/api/apiClient';

export type FinanceForecastPayload = {
  outstandingAr: number;
  pendingApAmount: number;
  pendingApCount: number;
  commissionAccrued: number;
  commissionPendingCount: number;
  commissionBeneficiaryCount: number;
  paidRevenueMomPercent: number | null;
  netCashflowSixMonths: number;
  cashflowByMonth: Array<{
    month: string;
    monthLabel: string;
    rev: number;
    exp: number;
  }>;
};

function formatIDR(num: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

type Props = {
  active: boolean;
  onNewAp: () => void;
  /** Increment after mutating ledger so KPIs refetch while Forecast is open. */
  refreshKey?: number;
};

export const FinanceForecastDashboard: React.FC<Props> = ({
  active,
  onNewAp,
  refreshKey = 0,
}) => {
  const [data, setData] = useState<FinanceForecastPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      if (APP_CONFIG.DOMAINS.TRANSACTIONS !== 'API') {
        setError(
          'Forecast uses server data. Set `NEXT_PUBLIC_API_BASE_URL` to the Nest `/fe` base URL and ensure Nest and the database are running.',
        );
        setData(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<FinanceForecastPayload>('/store/finance-forecast');
        if (!cancelled) {
          setData(res);
        }
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, refreshKey]);

  const chartData =
    data?.cashflowByMonth.map((r) => ({
      month: r.monthLabel,
      rev: r.rev,
      exp: r.exp,
    })) ?? [];

  const maxAxis = Math.max(
    1,
    ...chartData.flatMap((d) => [d.rev, d.exp]),
  );

  const netBarPct = (() => {
    if (!data) return 50;
    const n = data.netCashflowSixMonths;
    if (n >= 0) return Math.min(88, 52 + Math.min(36, (n / (maxAxis * 6 + 1)) * 24));
    return Math.max(12, 48 + Math.max(-36, (n / (maxAxis * 6 + 1)) * 24));
  })();

  return (
    <>
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        <div className="min-w-0 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Outstanding AR</p>
          <h3 className="mt-1 break-words text-xl font-bold text-slate-900 sm:text-2xl">
            {loading ? '…' : data ? formatIDR(data.outstandingAr) : formatIDR(0)}
          </h3>
          <p className="text-xs text-slate-400 mt-3">
            Sum of gateway <code className="text-[10px]">balanceDue</code> (unpaid Midtrans / store
            orders)
          </p>
          {data?.paidRevenueMomPercent != null && (
            <div
              className={`mt-3 flex items-center text-xs font-bold ${
                data.paidRevenueMomPercent >= 0 ? 'text-green-600' : 'text-rose-600'
              }`}
            >
              {data.paidRevenueMomPercent >= 0 ? (
                <TrendingUp size={12} className="mr-1 shrink-0" />
              ) : (
                <TrendingDown size={12} className="mr-1 shrink-0" />
              )}
              {data.paidRevenueMomPercent >= 0 ? '+' : ''}
              {data.paidRevenueMomPercent.toFixed(0)}% paid revenue vs last month
            </div>
          )}
        </div>

        <div className="min-w-0 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Pending AP</p>
          <h3 className="mt-1 break-words text-xl font-bold text-slate-900 sm:text-2xl">
            {loading ? '…' : data ? formatIDR(data.pendingApAmount) : formatIDR(0)}
          </h3>
          <p className="text-xs text-amber-600 mt-4 font-bold flex items-center">
            <AlertCircle size={12} className="mr-1 shrink-0" />
            {loading ? '…' : data ? `${data.pendingApCount} open vendor / PO lines` : '—'}
          </p>
        </div>

        <div className="min-w-0 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Commission accrued</p>
          <h3 className="mt-1 break-words text-xl font-bold text-slate-900 sm:text-2xl">
            {loading ? '…' : data ? formatIDR(data.commissionAccrued) : formatIDR(0)}
          </h3>
          <p className="text-xs text-slate-400 mt-4">
            {loading
              ? '…'
              : data
                ? `${data.commissionPendingCount} payouts · ${data.commissionBeneficiaryCount} beneficiaries`
                : '—'}
          </p>
        </div>

        <div className="min-w-0 bg-slate-900 p-5 rounded-2xl text-white shadow-xl shadow-slate-900/20 sm:col-span-2 xl:col-span-1">
          <p className="text-sm text-slate-400 font-medium">Net cashflow (6 mo)</p>
          <h3 className="mt-1 break-words text-xl font-bold sm:text-2xl">
            {loading ? '…' : data ? formatIDR(data.netCashflowSixMonths) : '—'}
          </h3>
          <p className="text-xs text-slate-500 mt-2">
            Paid gateway in − (paid expenses + paid commissions) per month, rolling six months.
          </p>
          <div className="mt-4 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${data && data.netCashflowSixMonths >= 0 ? 'bg-emerald-500' : 'bg-rose-400'}`}
              style={{ width: `${netBarPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sm:p-6 xl:col-span-2">
          <h3 className="font-bold text-slate-800 mb-6">Cashflow distribution</h3>
          <div className="h-64 sm:h-80">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Loading chart…
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No monthly data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(v) =>
                      `${(Number(v) / 1_000_000).toFixed(0)}M`
                    }
                    width={48}
                  />
                  <Tooltip
                    formatter={(value: number) => formatIDR(value)}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="rev"
                    name="Revenue (paid)"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.1}
                  />
                  <Area
                    type="monotone"
                    dataKey="exp"
                    name="Outflows"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="min-w-0 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sm:p-6">
          <h3 className="font-bold text-slate-800 mb-4">Quick post</h3>
          <div className="space-y-4">
            <button
              type="button"
              onClick={onNewAp}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm">
                  <Receipt size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">New AP record</p>
                  <p className="text-[10px] text-slate-500">Post vendor invoice or expense (Nest ledger)</p>
                </div>
              </div>
              <Plus
                size={18}
                className="text-slate-300 group-hover:text-blue-600 transition-colors"
              />
            </button>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs text-blue-800 font-bold mb-2">Source</p>
              <p className="text-[10px] text-blue-600 leading-relaxed">
                Forecast KPIs are computed on the server from the same tables as Settlement and
                Payouts — no local dummy DB.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
