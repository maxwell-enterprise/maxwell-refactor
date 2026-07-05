
import React, { useCallback, useEffect, useState } from 'react';
import { Member, PaidConversionRecord } from '../types/index';
import { PaidConversionService } from '../services/paidConversionService';
import { DataService } from '../services/dataService';
import { UserJourneyModal } from './crm/UserJourneyModal';
import { useToast } from '../context/ToastContext';
import {
  Search,
  Filter,
  DollarSign,
  User,
  Megaphone,
  Package,
  Calendar,
  LogIn,
  History,
} from 'lucide-react';

type StageFilter = 'ALL' | 'LEAD' | 'PAID';

type StageCounts = { all: number; lead: number; paid: number };

const EMPTY_COUNTS: StageCounts = { all: 0, lead: 0, paid: 0 };

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

const lifecycleBadgeClass = (stage: string | null | undefined) => {
  switch (String(stage ?? '').toUpperCase()) {
    case 'GUEST':
      return 'bg-slate-100 text-slate-600';
    case 'IDENTIFIED':
      return 'bg-sky-100 text-sky-700';
    case 'PARTICIPANT':
      return 'bg-indigo-100 text-indigo-700';
    case 'MEMBER':
      return 'bg-emerald-100 text-emerald-700';
    case 'CERTIFIED':
      return 'bg-amber-100 text-amber-800';
    case 'FACILITATOR':
      return 'bg-violet-100 text-violet-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

const stageBadgeClass = (displayStage: string) => {
  if (displayStage === 'LEAD') {
    return 'bg-sky-100 text-sky-700';
  }
  return 'bg-emerald-100 text-emerald-700';
};

const stageLabel = (row: PaidConversionRecord) => {
  const display = row.displayStage ?? row.eventType;
  if (display === 'LEAD' || display === 'SIGNED_IN') return 'Lead';
  if (display === 'PAID') return 'Paid';
  return String(display).replace(/_/g, ' ');
};

const stageTitle = (row: PaidConversionRecord) => {
  const display = row.displayStage ?? row.eventType;
  if (display === 'LEAD' || display === 'SIGNED_IN') {
    return 'Pipeline lead — belum konversi berbayar';
  }
  if (display === 'PAID') return 'Pembayaran berhasil / converted member';
  return stageLabel(row);
};

const PaidConversionsDashboard: React.FC = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<PaidConversionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [campaignOnly, setCampaignOnly] = useState(false);
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL');
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<StageCounts>(EMPTY_COUNTS);
  const [journeyMember, setJourneyMember] = useState<Member | null>(null);
  const [journeyLoadingId, setJourneyLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await PaidConversionService.list({
        limit: 200,
        search: debouncedSearch || undefined,
        stageSegment: stageFilter,
        campaignOnly: campaignOnly || undefined,
      });
      setRecords(res.items);
      setTotal(res.total);
      setCounts(res.counts ?? EMPTY_COUNTS);
    } catch {
      setRecords([]);
      setTotal(0);
      setCounts(EMPTY_COUNTS);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, stageFilter, campaignOnly]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const shownCount = stageFilter === 'ALL' ? counts.all : total;

  const openJourney = async (row: PaidConversionRecord) => {
    setJourneyLoadingId(row.id);
    try {
      const memberId = row.memberPublicId || row.buyerMemberId;
      if (memberId) {
        const member = await DataService.getMemberById(memberId);
        if (member) {
          setJourneyMember(member);
          return;
        }
      }
      const allMembers = await DataService.getMembers();
      const byEmail = allMembers.find(
        (m) => m.email.trim().toLowerCase() === row.buyerEmail.trim().toLowerCase(),
      );
      if (byEmail) {
        setJourneyMember(byEmail);
        return;
      }
      showToast('Member profile not found for journey timeline.', 'error');
    } catch {
      showToast('Failed to load user journey.', 'error');
    } finally {
      setJourneyLoadingId(null);
    }
  };

  return (
    <div className="page-container space-y-5 sm:space-y-6 animate-fade-in relative pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
            <DollarSign className="shrink-0 text-emerald-600" size={28} />
            <span className="leading-tight">Paid Conversions</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Unified conversion ledger — one row per person, current state + financial summary.
          </p>
          {!loading && (
            <p className="text-xs text-slate-400 mt-1">
              {shownCount} shown · {counts.lead} pipeline lead · {counts.paid} paid
            </p>
          )}
        </div>
        <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap lg:w-auto">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as StageFilter)}
            className="mobile-safe-select rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
            title="Lead = CRM lifecycle GUEST/IDENTIFIED/PARTICIPANT. Paid = converted member or payment."
          >
            <option value="ALL">All stages</option>
            <option value="LEAD">Lead only (pipeline)</option>
            <option value="PAID">Paid only</option>
          </select>

          <button
            type="button"
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
        <div className="responsive-table-wrap">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-emerald-50 text-emerald-800 font-bold border-b border-emerald-100">
              <tr>
                <th className="px-3 py-4 w-[4.5rem] whitespace-nowrap">Stage</th>
                <th className="px-4 py-4 w-[6.5rem]">Lifecycle</th>
                <th className="px-6 py-4">Buyer</th>
                <th className="px-6 py-4">Campaign</th>
                <th className="px-6 py-4">PIC</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-4 py-4 w-[7rem]">Journey</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Loading conversion records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No records found.
                  </td>
                </tr>
              ) : (
                records.map((row) => {
                  const displayStage = row.displayStage ?? (row.eventType === 'PAID' ? 'PAID' : 'LEAD');
                  const isPaid = displayStage === 'PAID';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-4 align-top">
                        <span
                          title={stageTitle(row)}
                          className={`inline-flex items-center justify-center gap-0.5 min-w-[3.25rem] px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none whitespace-nowrap ${stageBadgeClass(displayStage)}`}
                        >
                          {!isPaid ? (
                            <LogIn size={11} className="shrink-0" />
                          ) : (
                            <DollarSign size={11} className="shrink-0" />
                          )}
                          {stageLabel(row)}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${lifecycleBadgeClass(row.lifecycleStage)}`}
                        >
                          {row.lifecycleStage || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <User size={14} className="text-slate-400" />
                          {row.buyerName || '—'}
                        </div>
                        <div className="text-xs text-slate-500">{row.buyerEmail}</div>
                        {row.orderId && isPaid && (
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
                            {!isPaid ? '—' : row.productsSummary || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                        {!isPaid ? (
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
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void openJourney(row)}
                          disabled={journeyLoadingId === row.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                          title="Full journey timeline"
                        >
                          <History size={12} />
                          {journeyLoadingId === row.id ? '...' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {journeyMember && (
        <UserJourneyModal
          member={journeyMember}
          onClose={() => setJourneyMember(null)}
        />
      )}
    </div>
  );
};

export default PaidConversionsDashboard;
