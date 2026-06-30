import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { EntitlementService } from '../services/entitlementService';
import { WalletItem } from '../types/access';
import { ContractService } from '../services/contractService';
import { ContractInstance } from '../types/contract';
import { Calendar, MapPin, Award, Clock, Lock, LockOpen, QrCode } from 'lucide-react';
import type { Member } from '../types/index';
import { ViewState } from '../types/index';
import { UserEntitlements, LifecycleStage } from '../types/access';
import WalletSummaryWidget from './dashboard/WalletSummaryWidget';
import ContractSigningModal from './member/ContractSigningModal';
import { DataService } from '../services/dataService';
import { resolveJourneyLifecycleStage } from '../lib/memberLifecycleViews';
import {
  readWalletSessionCache,
  writeWalletSessionCache,
} from '../lib/walletSessionCache';
import {
  readMemberZoneSessionCache,
  writeMemberZoneSessionCache,
  invalidateMemberZoneSessionCache,
} from '../lib/memberZoneSessionCache';
import { WALLET_REFRESH_EVENT } from '../services/paymentService';
import EventCampaignOfferStack from './marketing/EventCampaignOfferStack';

interface MemberDashboardProps {
  onNavigate: (view: ViewState) => void;
}

const MemberDashboard: React.FC<MemberDashboardProps> = ({ onNavigate }) => {
  const { user, isProfileComplete } = useAuth();
  const profileLocked = !isProfileComplete;

  const guardedNavigate = useCallback(
    (view: ViewState) => {
      if (profileLocked && view !== ViewState.SETTINGS) {
        onNavigate(ViewState.SETTINGS);
        return;
      }
      onNavigate(view);
    },
    [profileLocked, onNavigate],
  );
  const [wallet, setWallet] = useState<WalletItem[]>([]);
  const [nextEvent, setNextEvent] = useState<WalletItem | null>(null);
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [pendingContract, setPendingContract] = useState<ContractInstance | null>(null); 
  const [showSignModal, setShowSignModal] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [journeyLifecycle, setJourneyLifecycle] = useState<LifecycleStage>('GUEST');

  const applyDashboardData = useCallback(
    (
      walletItems: WalletItem[],
      userEntitlements: UserEntitlements | null,
      contracts: ContractInstance[],
      crmMember: Member | null,
    ) => {
      setJourneyLifecycle(
        resolveJourneyLifecycleStage({
          member: crmMember ?? null,
          entitlementLifecycle: userEntitlements?.attributes?.lifecycle,
        }),
      );
      setWallet(walletItems);
      const tickets = walletItems
        .filter(
          (i) =>
            i.type === 'TICKET' &&
            i.status === 'ACTIVE' &&
            i.expiryDate,
        )
        .sort(
          (a, b) =>
            new Date(a.expiryDate!).getTime() -
            new Date(b.expiryDate!).getTime(),
        );
      setNextEvent(tickets.length > 0 ? tickets[0] : null);
      setEntitlements(userEntitlements);
      const unsigned = contracts.find((c) => c.status === 'PUBLISHED');
      setPendingContract(unsigned ?? null);
    },
    [],
  );

  const loadDashboard = useCallback(
    async (mode: 'full' | 'background' = 'full') => {
      if (!user) return;

      const runFetch = async () => {
        const walletSnap = readWalletSessionCache(user.id);
        const walletItemsPromise = walletSnap
          ? Promise.resolve(walletSnap.items)
          : Promise.all([
              EntitlementService.getMyWallet(user.id),
              EntitlementService.getWalletMemberHub(user.id),
            ]).then(([wi, hub]) => {
              writeWalletSessionCache(user.id, wi, hub);
              return wi;
            });
        const [walletItems, userEntitlements, contracts, crmMember] =
          await Promise.all([
            walletItemsPromise,
            EntitlementService.getUserEntitlements(user.id),
            ContractService.getMyContracts(user.id),
            DataService.resolveMeCrmMember({
              id: user.id,
              email: user.email ?? null,
            }),
          ]);
        applyDashboardData(
          walletItems,
          userEntitlements,
          contracts,
          crmMember,
        );
        const jl = resolveJourneyLifecycleStage({
          member: crmMember ?? null,
          entitlementLifecycle: userEntitlements?.attributes?.lifecycle,
        });
        const unsigned = contracts.find((c) => c.status === 'PUBLISHED');
        writeMemberZoneSessionCache({
          userId: user.id,
          walletItems,
          entitlements: userEntitlements,
          pendingContract: unsigned ?? null,
          journeyLifecycle: jl,
          fetchedAt: Date.now(),
        });
      };

      if (mode === 'background') {
        try {
          await runFetch();
        } catch (e) {
          console.error('[MemberDashboard] background refresh failed', e);
        }
        return;
      }

      const zoneSnap = readMemberZoneSessionCache(user.id);
      if (zoneSnap) {
        setWallet(zoneSnap.walletItems);
        setEntitlements(zoneSnap.entitlements);
        setPendingContract(zoneSnap.pendingContract);
        setJourneyLifecycle(zoneSnap.journeyLifecycle);
        const tickets = zoneSnap.walletItems
          .filter(
            (i) =>
              i.type === 'TICKET' &&
              i.status === 'ACTIVE' &&
              i.expiryDate,
          )
          .sort(
            (a, b) =>
              new Date(a.expiryDate!).getTime() -
              new Date(b.expiryDate!).getTime(),
          );
        setNextEvent(tickets.length > 0 ? tickets[0] : null);
        setLoading(false);
        try {
          await runFetch();
        } catch (e) {
          console.error('[MemberDashboard] background refresh failed', e);
        }
        return;
      }

      setLoading(true);
      try {
        await runFetch();
      } catch (e) {
        console.error('[MemberDashboard] load failed', e);
        setWallet([]);
        setNextEvent(null);
        setEntitlements(null);
        setPendingContract(null);
        setJourneyLifecycle('GUEST');
      } finally {
        setLoading(false);
      }
    },
    [user, applyDashboardData],
  );

  useEffect(() => {
    if (!user) return;
    void loadDashboard('full');
  }, [user, loadDashboard]);

  useEffect(() => {
    if (!user) return;
    const onWalletRefresh = () => {
      void loadDashboard('full');
    };
    window.addEventListener(WALLET_REFRESH_EVENT, onWalletRefresh);
    return () => window.removeEventListener(WALLET_REFRESH_EVENT, onWalletRefresh);
  }, [user, loadDashboard]);

  const STAGES: { id: LifecycleStage, label: string }[] = useMemo(
    () => [
      { id: 'GUEST', label: 'Guest' },
      { id: 'IDENTIFIED', label: 'Identified' },
      { id: 'PARTICIPANT', label: 'Participant' },
      { id: 'MEMBER', label: 'Member' },
      { id: 'CERTIFIED', label: 'Certified' },
      { id: 'FACILITATOR', label: 'Facilitator' },
    ],
    [],
  );

  const currentStage = journeyLifecycle;
  const currentStageIdx = useMemo(() => {
    const idx = STAGES.findIndex((s) => s.id === currentStage);
    return idx >= 0 ? idx : 0;
  }, [STAGES, currentStage]);

  const currentStageLabel =
    STAGES.find((s) => s.id === currentStage)?.label ?? currentStage;

  const progressPercent =
    STAGES.length <= 1 ? 0 : (currentStageIdx / (STAGES.length - 1)) * 100;

  const canSelfAttend = useMemo(() => {
    if (!nextEvent) return false;
    if (nextEvent.type !== 'TICKET' || nextEvent.status !== 'ACTIVE') return false;
    if (!nextEvent.expiryDate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(nextEvent.expiryDate).getTime() >= today.getTime();
  }, [nextEvent]);

  if (loading) {
    return (
      <div className="relative w-full min-w-0 animate-fade-in bg-slate-50">
        <div className="page-container flex w-full flex-col gap-6 sm:gap-8">
          <div className="h-10 w-64 rounded-xl bg-slate-200 animate-pulse" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="h-64 animate-pulse rounded-[2rem] bg-slate-100 lg:col-span-2" />
            <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-w-0 animate-fade-in bg-slate-50">
      <div className="page-container flex w-full flex-col gap-6 sm:gap-8">
        
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    Hello,{' '}
                    <span className="text-blue-600">
                      {user?.fullName?.split(' ')[0] ?? 'there'}
                    </span>
                </h1>
                <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
                
                {/* Evolution Journey */}
                <div className="rounded-[1.5rem] border border-slate-300 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
                    <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="flex items-center font-bold text-slate-900">
                            <Award size={20} className="mr-2 text-blue-600" /> Evolution Journey
                        </h3>
                        <span className="w-fit text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-blue-700">
                            {currentStageLabel}
                        </span>
                    </div>
                    
                    <div className="relative overflow-x-auto px-2 py-3 sm:px-4">
                        {/* Track line — centered through step dots */}
                        <div
                            className="pointer-events-none absolute left-4 right-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200"
                            aria-hidden
                        />
                        <div
                            className="pointer-events-none absolute left-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-blue-600 transition-all duration-700 ease-out"
                            style={{
                                width: `calc((100% - 2rem) * ${progressPercent / 100})`,
                            }}
                            aria-hidden
                        />

                        <div className="relative flex min-w-[280px] justify-between items-center">
                            {STAGES.map((stage, idx) => {
                                const isCompleted = idx < currentStageIdx;
                                const isCurrent = idx === currentStageIdx;
                                const isLocked = !isCompleted && !isCurrent;
                                const StepIcon = isLocked ? Lock : LockOpen;
                                return (
                                    <div key={stage.id} className="relative flex flex-col items-center">
                                        <div
                                            className={[
                                                'relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ease-out',
                                                isCurrent
                                                    ? 'h-10 w-10 scale-110 border-blue-600 bg-white shadow-lg shadow-blue-600/20'
                                                    : isCompleted
                                                      ? 'h-8 w-8 border-blue-600 bg-white'
                                                      : 'h-8 w-8 border-slate-200 bg-white',
                                            ].join(' ')}
                                        >
                                            <StepIcon
                                                size={isCurrent ? 16 : isCompleted ? 14 : 13}
                                                className={
                                                    isLocked ? 'text-slate-400' : 'text-blue-600'
                                                }
                                                strokeWidth={2.25}
                                                aria-hidden
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Next Event Card */}
                <div
                  className={`group relative overflow-hidden rounded-[1.5rem] bg-slate-900 p-5 text-white shadow-xl sm:rounded-[2.5rem] sm:p-8 ${
                    profileLocked
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer'
                  }`}
                  onClick={() => guardedNavigate(ViewState.WALLET)}
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all scale-125">
                        <Calendar size={140} />
                    </div>
                    
                    {nextEvent ? (
                        <div className="relative z-10">
                            <span className="bg-blue-600 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest mb-4 inline-block">Next Up</span>
                            <h2 className="mb-2 text-2xl font-bold sm:text-3xl">{nextEvent.title}</h2>
                            <p className="mb-6 text-sm text-slate-400 sm:mb-8">{nextEvent.subtitle}</p>
                            
                            <div className="grid max-w-sm grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10">
                                    <Clock size={18} className="text-blue-400" />
                                    <div>
                                        <p className="text-[10px] font-bold text-blue-300 uppercase">Date</p>
                                        <p className="text-xs font-bold">{nextEvent.expiryDate}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10">
                                    <MapPin size={18} className="text-red-400" />
                                    <div>
                                        <p className="text-[10px] font-bold text-red-300 uppercase">Venue</p>
                                        <p className="text-xs font-bold truncate">{nextEvent.meta?.location || 'TBD'}</p>
                                    </div>
                                </div>
                            </div>

                            {canSelfAttend && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        guardedNavigate(ViewState.MEMBER_ATTENDANCE);
                                    }}
                                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-900 transition-colors hover:bg-indigo-50"
                                >
                                    <QrCode size={16} />
                                    Scan Attendance
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="relative z-10 py-10 text-center">
                            <h2 className="text-xl font-bold mb-2">Discover Your Next Masterclass</h2>
                            <p className="text-slate-400 text-sm mb-6">Elevate your leadership with proven signature frameworks.</p>
                            <button onClick={() => guardedNavigate(ViewState.STORE_CATALOG)} className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black text-xs hover:bg-indigo-50">EXPLORE NOW</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:col-span-1">
                <WalletSummaryWidget walletItems={wallet} onNavigate={guardedNavigate} />
            </div>
        </div>

        {showSignModal && pendingContract && (
            <ContractSigningModal
                instance={pendingContract}
                onClose={() => setShowSignModal(false)}
                onSigned={() => {
                    setShowSignModal(false);
                    setPendingContract(null);
                    invalidateMemberZoneSessionCache();
                    void loadDashboard('full');
                }}
            />
        )}

        <EventCampaignOfferStack
          enabled={isProfileComplete}
          onNavigate={guardedNavigate}
        />
      </div>
    </div>
  );
};

export default MemberDashboard;
