
import React, { useEffect, useState } from 'react';
import { PaidConversionRecord } from '../types/index';
import { PaidConversionService } from '../services/paidConversionService';
import { Search, Filter, DollarSign, User, Megaphone, Package, Calendar, LogIn } from 'lucide-react';

type StageFilter = 'ALL' | 'SIGNED_IN' | 'PAID';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const acquisitionBadgeClass = (type: string) => {
  switch (type) {
    case 'CAMPAIGN':
      return 'bg-purple-100 text-purple-700';
    case 'PIC_REFERRAL':
      return 'bg-emerald-100 text-emerald-700';
    case 'DIRECT':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

const stageBadgeClass = (eventType: string) => {
  if (eventType === 'SIGNED_IN') {
    return 'bg-sky-100 text-sky-700';
  }
  return 'bg-emerald-100 text-emerald-700';
};

const stageLabel = (eventType: string) => {
  if (eventType === 'SIGNED_IN') return 'Lead';
  if (eventType === 'PAID') return 'Paid';
  return eventType.replace(/_/g, ' ');
};

const stageTitle = (eventType: string) => {
  if (eventType === 'SIGNED_IN') return 'Masuk / sign-in lewat campaign';
  if (eventType === 'PAID') return 'Pembayaran berhasil';
  return stageLabel(eventType);
};

const PaidConversionsDashboard: React.FC = () => {
  const [records, setRecords] = useState<PaidConversionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignOnly, setCampaignOnly] = useState(false);
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await PaidConversionService.list({ limit: 200 });
      setRecords(res.items);
      setTotal(res.total);
    } catch {
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((row) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      row.buyerName?.toLowerCase().includes(q) ||
      row.buyerEmail.toLowerCase().includes(q) ||
      (row.orderId || '').toLowerCase().includes(q) ||
      row.campaignSourceCode?.toLowerCase().includes(q) ||
      row.campaignName?.toLowerCase().includes(q) ||
      row.picNameSnapshot?.toLowerCase().includes(q) ||
      row.productsSummary?.toLowerCase().includes(q);

    if (campaignOnly && !row.campaignSourceCode?.trim()) {
      return false;
    }

    if (stageFilter !== 'ALL' && row.eventType !== stageFilter) {
      return false;
    }

    return matchesSearch;
  });

  const signedInCount = records.filter((r) => r.eventType === 'SIGNED_IN').length;
  const paidCount = records.filter((r) => r.eventType === 'PAID').length;

  return (
    <div className="page-container space-y-5 sm:space-y-6 animate-fade-in relative pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
            <DollarSign className="shrink-0 text-emerald-600" size={28} />
            <span className="leading-tight">Paid Conversions</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Campaign journey: sign-in and successful payments with PIC snapshot.
          </p>
          {!loading && (
            <p className="text-xs text-slate-400 mt-1">
              {total} record(s) · {signedInCount} lead · {paidCount} paid
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full lg:w-auto min-w-0 flex-wrap">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as StageFilter)}
            className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All stages</option>
            <option value="SIGNED_IN">Lead only</option>
            <option value="PAID">Paid only</option>
          </select>

          <button
            onClick={() => setCampaignOnly(!campaignOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center transition-all ${
              campaignOnly
                ? 'bg-purple-50 border-purple-300 text-purple-700'
                : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Filter size={14} className="mr-1.5" /> Campaign Only
          </button>

          <div className="relative w-full sm:w-64 min-w-0">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={16}
            />
            <input
              type="text"
              placeholder="Search buyer, campaign, PIC..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
        <div className="overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-emerald-50 text-emerald-800 font-bold border-b border-emerald-100">
              <tr>
                <th className="px-3 py-4 w-[4.5rem] whitespace-nowrap">Stage</th>
                <th className="px-6 py-4">Buyer</th>
                <th className="px-6 py-4">Campaign</th>
                <th className="px-6 py-4">PIC</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading attribution records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-4 align-top">
                      <span
                        title={stageTitle(row.eventType)}
                        className={`inline-flex items-center justify-center gap-0.5 min-w-[3.25rem] px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none whitespace-nowrap ${stageBadgeClass(row.eventType)}`}
                      >
                        {row.eventType === 'SIGNED_IN' ? (
                          <LogIn size={11} className="shrink-0" />
                        ) : (
                          <DollarSign size={11} className="shrink-0" />
                        )}
                        {stageLabel(row.eventType)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <User size={14} className="text-slate-400" />
                        {row.buyerName || '—'}
                      </div>
                      <div className="text-xs text-slate-500">{row.buyerEmail}</div>
                      {row.orderId && row.eventType === 'PAID' && (
                        <div className="text-[10px] text-slate-400 font-mono">{row.orderId}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {row.campaignSourceCode ? (
                        <>
                          <div className="font-medium text-slate-800 flex items-center gap-1">
                            <Megaphone size={14} className="text-purple-500" />
                            {row.campaignName || row.campaignSourceCode}
                          </div>
                          <div className="text-xs text-purple-600 font-mono">
                            {row.campaignSourceCode}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400">Direct / none</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {row.picNameSnapshot ? (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold">
                          {row.picNameSnapshot}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">No PIC</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-1 text-slate-700">
                        <Package size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-xs leading-relaxed">
                          {row.eventType === 'SIGNED_IN'
                            ? '—'
                            : row.productsSummary || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                      {row.eventType === 'SIGNED_IN' ? (
                        <span className="text-slate-400 font-normal">—</span>
                      ) : (
                        formatCurrency(row.totalAmount)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <Calendar size={12} className="text-slate-400" />
                        {formatDate(row.paidAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${acquisitionBadgeClass(row.acquisitionType)}`}
                      >
                        {row.acquisitionType.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaidConversionsDashboard;
