"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import CommandPalette from '../components/common/CommandPalette'; 
import { ViewState, UserRole } from '../types/index';
import { Menu, Search, UserCircle, RefreshCw } from 'lucide-react';
import HeaderNotificationBell from '../components/dashboard/HeaderNotificationBell';
import { useAuth } from '../context/AuthContext';
import {
  TaskService,
  UnifiedTask,
  MAXWELL_TASKS_UPDATED_EVENT,
} from '../services/taskService';
import { EntitlementService } from '../services/entitlementService';
import { DataService } from '../services/dataService';
import { WALLET_REFRESH_EVENT } from '../services/paymentService';
import {
  readWalletSessionCache,
  writeWalletSessionCache,
} from '../lib/walletSessionCache';
import PersonaSwitcherModal from '../components/auth/PersonaSwitcherModal'; // NEW IMPORT
import { useToast } from '../context/ToastContext';
import { useDialog } from '../context/DialogContext';
import { markRbacInboxRead } from '../lib/rbacInboxClient';
import type { GiftAllocation } from '../types/access';
import ProfileCompletionBanner from '../components/settings/ProfileCompletionBanner';
import { getMissingProfileFieldLabels } from '../lib/profileCompletion';
import OnboardingTrigger from '../components/onboarding/OnboardingTrigger';
import {
  ONBOARDING_CLOSE_SIDEBAR_EVENT,
  ONBOARDING_OPEN_SIDEBAR_EVENT,
} from '../features/onboarding/onboarding-sidebar-events';
import { useIsNarrowViewport } from '../features/myzone-mobile/hooks/useIsNarrowViewport';
import {
  buildMemberEventReminders,
  type MemberEventReminder,
} from '../features/myzone-mobile/logic/memberBellNotices';
import MyZoneMobileShell from '../features/myzone-mobile/ui/MyZoneMobileShell';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isPersonalZone: boolean;
  onToggleZone: (isPersonal: boolean) => void;
  profileGateActive?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  currentView,
  onNavigate,
  isPersonalZone,
  onToggleZone,
  profileGateActive = false,
}) => {
  const { user, userRole, logout } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useDialog();
  const isNarrowViewport = useIsNarrowViewport();
  const isMyZoneMobile = isPersonalZone && isNarrowViewport;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Replace simple menu state with modal state
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  
  // Command Palette State
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  
  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<UnifiedTask[]>([]);
  const [pendingGifts, setPendingGifts] = useState<GiftAllocation[]>([]);
  const [memberEventReminders, setMemberEventReminders] = useState<MemberEventReminder[]>(
    [],
  );
  const [isLoadingGiftInbox, setIsLoadingGiftInbox] = useState(false);
  /** Digest of tasks last marked "seen" in the bell; new/changed tasks bring the badge back. */
  const [notificationsSeenDigest, setNotificationsSeenDigest] = useState<string | null>(null);
  const [isHeaderAvatarBroken, setIsHeaderAvatarBroken] = useState(false);

  const tasksDigest = useMemo(
    () => pendingTasks.map((t) => t.id).sort().join('|'),
    [pendingTasks],
  );
  const giftsDigest = useMemo(
    () => pendingGifts.map((gift) => gift.id).sort().join('|'),
    [pendingGifts],
  );
  const memberRemindersDigest = useMemo(
    () => memberEventReminders.map((item) => item.id).sort().join('|'),
    [memberEventReminders],
  );
  const notificationsDigest = useMemo(
    () =>
      isPersonalZone
        ? `member::${giftsDigest}::${memberRemindersDigest}`
        : `workspace::${tasksDigest}::${giftsDigest}`,
    [isPersonalZone, giftsDigest, memberRemindersDigest, tasksDigest],
  );

  const memberNoticeCount = pendingGifts.length + memberEventReminders.length;
  const workspaceNoticeCount = pendingTasks.length + pendingGifts.length;
  const hasUnreadNotifications = isPersonalZone
    ? memberNoticeCount > 0 && notificationsSeenDigest !== notificationsDigest
    : workspaceNoticeCount > 0 && notificationsSeenDigest !== notificationsDigest;

  const missingProfileLabels = useMemo(
    () => (profileGateActive ? getMissingProfileFieldLabels(user) : []),
    [profileGateActive, user],
  );

  const openCommandPalette = useCallback(() => {
    if (isPersonalZone) return;
    if (profileGateActive) {
      showToast(
        'Complete Personal Information in Account Settings first.',
        'info',
      );
      return;
    }
    setIsCmdOpen(true);
  }, [isPersonalZone, profileGateActive, showToast]);

  useEffect(() => {
    if (isPersonalZone) setIsCmdOpen(false);
  }, [isPersonalZone]);

  useEffect(() => {
    if (isPersonalZone) setShowPersonaModal(false);
  }, [isPersonalZone]);

  const markNotificationsAsSeen = useCallback(() => {
    setNotificationsSeenDigest(notificationsDigest);
  }, [notificationsDigest]);

  const loadGiftInbox = useCallback(async () => {
    const email = user?.email?.trim();
    if (!email || userRole === UserRole.GUEST) {
      setPendingGifts([]);
      return;
    }

    setIsLoadingGiftInbox(true);
    try {
      const gifts = await EntitlementService.getGiftInbox(email);
      setPendingGifts(gifts.filter((gift) => gift.status === 'PENDING'));
    } catch {
      setPendingGifts([]);
    } finally {
      setIsLoadingGiftInbox(false);
    }
  }, [user?.email, userRole]);

  // Hotkey Listener for Cmd+K / Ctrl+K (Workspace only)
  useEffect(() => {
      if (isPersonalZone) return;
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              openCommandPalette();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPersonalZone, openCommandPalette]);

  // Staff Action Center feed — skip on My Zone (member-only notices there).
  useEffect(() => {
    if (isPersonalZone || userRole === UserRole.GUEST) {
      if (isPersonalZone) setPendingTasks([]);
      return;
    }
    TaskService.getMyTasks(userRole).then((tasks) => {
      setPendingTasks(tasks);
    });
  }, [userRole, isPersonalZone]);

  useEffect(() => {
    void loadGiftInbox();
  }, [loadGiftInbox]);

  const loadMemberEventReminders = useCallback(async () => {
    if (!isPersonalZone || !user?.id || userRole === UserRole.GUEST) {
      setMemberEventReminders([]);
      return;
    }
    try {
      const cached = readWalletSessionCache(user.id);
      const tickets = cached
        ? cached.items
        : await Promise.all([
            EntitlementService.getMyWallet(user.id),
            EntitlementService.getWalletMemberHub(user.id),
          ]).then(([items, hub]) => {
            writeWalletSessionCache(user.id, items, hub);
            return items;
          });
      const events = await DataService.getEvents();
      setMemberEventReminders(buildMemberEventReminders(tickets, events));
    } catch {
      setMemberEventReminders([]);
    }
  }, [isPersonalZone, user?.id, userRole]);

  useEffect(() => {
    void loadMemberEventReminders();
  }, [loadMemberEventReminders]);

  useEffect(() => {
    const onWalletRefresh = () => {
      void loadGiftInbox();
      void loadMemberEventReminders();
    };
    window.addEventListener(WALLET_REFRESH_EVENT, onWalletRefresh);
    return () => window.removeEventListener(WALLET_REFRESH_EVENT, onWalletRefresh);
  }, [loadGiftInbox, loadMemberEventReminders]);

  useEffect(() => {
    if (isPersonalZone || userRole === UserRole.GUEST) return;
    const syncBell = () => {
      TaskService.getMyTasks(userRole).then(setPendingTasks);
    };
    window.addEventListener(MAXWELL_TASKS_UPDATED_EVENT, syncBell);
    return () => window.removeEventListener(MAXWELL_TASKS_UPDATED_EVENT, syncBell);
  }, [userRole, isPersonalZone]);

  const highPriorityCount = isPersonalZone
    ? memberEventReminders.filter((item) => item.phase === 'live').length
    : pendingTasks.filter((t) => t.priority === 'HIGH').length;
  const personaRoles = useMemo(() => {
    const assignedRoles = Array.isArray(user?.roles) && user.roles.length > 0
      ? user.roles
      : user?.role
        ? [user.role]
        : [];
    return assignedRoles.filter((role) =>
      [
        UserRole.SUPER_ADMIN,
        UserRole.FINANCE,
        UserRole.OPERATIONS,
        UserRole.MARKETING,
        UserRole.SALES,
        UserRole.GATE_KEEPER,
      ].includes(role),
    );
  }, [user]);
  const canOpenPersonaSwitcher =
    personaRoles.length > 1 || Boolean(user?.customRole);
  const isCustomPersonaActive =
    Boolean(user?.customRole) && user?.activeCustomRoleId === user?.customRole?.id;
  const personaBadgeLabel = isCustomPersonaActive
    ? `Custom: ${user?.customRole?.name ?? 'Role'}`
    : userRole.replace('Super ', '');

  const handleNotificationItemClick = async (task: UnifiedTask) => {
    if (profileGateActive) {
      showToast(
        'Complete Personal Information in Account Settings first.',
        'info',
      );
      return;
    }
    markNotificationsAsSeen();
    const inboxId = task.metadata?.rbacInboxId;
    if (task.source === 'SYSTEM' && inboxId) {
      const ok = await confirm({
        title: 'Your access has changed',
        variant: 'warning',
        confirmLabel: 'Mark read & sign out',
        cancelLabel: 'Cancel',
        message: (
          <span>
            To apply your updated access rights, this session will end and you will need to{' '}
            <strong>sign in again</strong>. Continue?
          </span>
        ),
      });
      if (!ok) return;
      setShowNotifications(false);
      await markRbacInboxRead(inboxId);
      showToast('Please sign in again so your menus and permissions stay up to date.', 'info');
      await logout();
      return;
    }
    onNavigate(ViewState.MY_TASKS);
    setShowNotifications(false);
  };

  const handleGiftNotificationClick = (gift: GiftAllocation) => {
    if (profileGateActive) {
      showToast(
        'Complete Personal Information in Account Settings first.',
        'info',
      );
      return;
    }
    markNotificationsAsSeen();
    setShowNotifications(false);
    onNavigate(ViewState.WALLET);
  };

  const handleEventReminderClick = (_reminder: MemberEventReminder) => {
    if (profileGateActive) {
      showToast(
        'Complete Personal Information in Account Settings first.',
        'info',
      );
      return;
    }
    markNotificationsAsSeen();
    setShowNotifications(false);
    onNavigate(ViewState.WALLET);
  };

  const openWalletFromBell = () => {
    if (profileGateActive) {
      showToast('Complete Personal Information in Account Settings first.', 'info');
      return;
    }
    markNotificationsAsSeen();
    setShowNotifications(false);
    onNavigate(ViewState.WALLET);
  };

  /** Close mobile drawer after navigation; desktop layout ignores `isSidebarOpen` via `lg:translate-x-0`. */
  const handleNavigate = (view: ViewState) => {
    onNavigate(view);
    setIsSidebarOpen(false);
  };

  const goToProfileSettings = () => {
    onNavigate(ViewState.SETTINGS);
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [currentView]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setIsHeaderAvatarBroken(false);
  }, [user?.avatarUrl]);

  useEffect(() => {
    const onOpenSidebar = () => setIsSidebarOpen(true);
    const onCloseSidebar = () => setIsSidebarOpen(false);
    window.addEventListener(ONBOARDING_OPEN_SIDEBAR_EVENT, onOpenSidebar);
    window.addEventListener(ONBOARDING_CLOSE_SIDEBAR_EVENT, onCloseSidebar);
    return () => {
      window.removeEventListener(ONBOARDING_OPEN_SIDEBAR_EVENT, onOpenSidebar);
      window.removeEventListener(ONBOARDING_CLOSE_SIDEBAR_EVENT, onCloseSidebar);
    };
  }, []);

  useEffect(() => {
    if (!showNotifications) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-notification-root]')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [showNotifications]);

  const headerViewTitle =
    currentView === ViewState.DASHBOARD
      ? isPersonalZone
        ? 'Member Dashboard'
        : 'Executive Dashboard'
      : currentView.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  useEffect(() => {
    const applyBodyScrollLock = () => {
      const narrow = window.matchMedia('(max-width: 1023px)').matches;
      if (isSidebarOpen && narrow) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };
    applyBodyScrollLock();
    window.addEventListener('resize', applyBodyScrollLock);
    return () => {
      window.removeEventListener('resize', applyBodyScrollLock);
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  const openActionCenter = () => {
    if (profileGateActive) {
      showToast('Complete Personal Information in Account Settings first.', 'info');
      return;
    }
    markNotificationsAsSeen();
    onNavigate(ViewState.MY_TASKS);
    setShowNotifications(false);
  };

  const notificationBell = (
    <HeaderNotificationBell
      variant={isPersonalZone ? 'member' : 'workspace'}
      tasks={isPersonalZone ? [] : pendingTasks}
      gifts={pendingGifts}
      eventReminders={isPersonalZone ? memberEventReminders : []}
      isLoadingGifts={isLoadingGiftInbox}
      hasUnread={hasUnreadNotifications}
      highPriorityCount={highPriorityCount}
      isOpen={showNotifications}
      onToggle={() => {
        setShowNotifications((open) => !open);
        markNotificationsAsSeen();
      }}
      onSelectTask={(task) => void handleNotificationItemClick(task)}
      onSelectGift={handleGiftNotificationClick}
      onSelectEventReminder={handleEventReminderClick}
      onViewActionCenter={isPersonalZone ? undefined : openActionCenter}
      onViewWallet={isPersonalZone ? openWalletFromBell : undefined}
    />
  );

  const profileGateBanner =
    profileGateActive && currentView !== ViewState.SETTINGS ? (
      <ProfileCompletionBanner
        missingLabels={missingProfileLabels}
        onGoToSettings={goToProfileSettings}
      />
    ) : null;

  if (isMyZoneMobile) {
    return (
      <MyZoneMobileShell
        currentView={currentView}
        onNavigate={handleNavigate}
        userName={user?.fullName}
        avatarUrl={user?.avatarUrl}
        pendingGiftCount={pendingGifts.length}
        notificationSlot={notificationBell}
        onboardingSlot={<OnboardingTrigger />}
        banner={profileGateBanner}
      >
        {children}
      </MyZoneMobileShell>
    );
  }

  return (
    <div className="flex h-screen w-full min-w-0 max-w-full overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate} 
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen((v) => !v)}
        userRole={userRole}
        isPersonalZone={isPersonalZone}
        onToggleZone={onToggleZone}
        profileGateActive={profileGateActive}
      />

      {/* No overflow-x-hidden here — it clips wide tables/cards; <main> handles scroll */}
      <div className="relative flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col">
        
        {/* --- MODERN HEADER START --- */}
        <header className="safe-area-top z-40 sticky top-0 flex min-h-[56px] shrink-0 items-center justify-between px-2 py-2 transition-all duration-300 sm:min-h-[72px] sm:px-6 sm:py-0
            bg-white/85 backdrop-blur-xl border-b border-slate-200/80 
            shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          {/* Decorative Pattern Layer */}
          <div 
            className="absolute inset-0 z-0 opacity-40 pointer-events-none" 
            style={{ 
                backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
                backgroundSize: '24px 24px' 
            }}
          ></div>
          
          {/* Content Wrapper */}
          <div className="relative z-10 flex items-center justify-between w-full">
              {/* Left: Mobile Toggle & Context Title */}
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  data-tour="mobile-menu-toggle"
                  className="touch-target lg:hidden -ml-1 flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                  aria-label="Open menu"
                >
                  <Menu size={22} />
                </button>
                
                {!isPersonalZone && (
                <button 
                  onClick={openCommandPalette}
                  className="touch-target lg:hidden flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                  aria-label="Search"
                >
                  <Search size={22} />
                </button>
                )}
                
                {/* Mobile title — visible below md */}
                <div className="flex min-w-0 flex-col md:hidden">
                    <span className="mb-0.5 flex items-center truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span className={`mr-1.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full ${isPersonalZone ? 'bg-indigo-500' : 'bg-blue-500'}`}></span>
                        <span className="truncate">{isPersonalZone ? 'Personal Zone' : 'Workspace'}</span>
                    </span>
                    <h2 className="truncate text-sm font-bold tracking-tight text-slate-800">
                        {headerViewTitle}
                    </h2>
                </div>

                {/* Breadcrumb / Title area — desktop */}
                <div className="hidden min-w-0 flex-col md:flex">
                    <span className="mb-0.5 flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span className={`mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full ${isPersonalZone ? 'bg-indigo-500' : 'bg-blue-500'}`}></span>
                        {isPersonalZone ? 'Personal Zone' : 'Workspace'}
                    </span>
                    <h2 className="truncate text-sm font-bold tracking-tight text-slate-800">
                        {headerViewTitle}
                    </h2>
                </div>
              </div>

              {/* Center/Right: Actions Area */}
              <div className="flex shrink-0 items-center gap-2 sm:gap-4 md:gap-6">

                {isPersonalZone && <OnboardingTrigger />}
                
                {!isPersonalZone && (
                <div 
                    onClick={openCommandPalette}
                    className={`hidden lg:flex relative group w-72 ${profileGateActive ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                   </div>
                   <div 
                      className="block w-full pl-10 pr-12 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm text-slate-500 hover:bg-white hover:border-slate-300 transition-all shadow-sm flex items-center"
                   >
                       Search or type command...
                   </div>
                   <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <kbd className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 border border-slate-200 rounded-md text-[10px] font-medium text-slate-400 bg-slate-100/50">
                        ⌘ K
                      </kbd>
                   </div>
                </div>
                )}

                {/* Persona switcher — workspace only */}
                {canOpenPersonaSwitcher && !profileGateActive && !isPersonalZone && (
                <div className="hidden md:block">
                    <button 
                        onClick={() => setShowPersonaModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600 transition-all hover:border-indigo-300 hover:shadow-md shadow-sm group"
                        title="Switch Persona"
                    >
                        <RefreshCw size={12} className="text-indigo-500 group-hover:rotate-180 transition-transform duration-500" />
                        <span className="text-slate-400">View as:</span>
                        <span className="font-bold text-slate-800 max-w-[100px] truncate">{user?.fullName || 'Guest'}</span>
                        <span
                          className="inline-block max-w-[150px] truncate text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase"
                          title={personaBadgeLabel}
                        >
                          {personaBadgeLabel}
                        </span>
                    </button>
                </div>
                )}
                 
                {/* Divider */}
                {canOpenPersonaSwitcher && !profileGateActive && !isPersonalZone && (
                  <div className="hidden md:block w-px h-8 bg-slate-200 mx-1"></div>
                )}

                {/* Notification & Profile Group */}
                <div className="flex items-center gap-1.5 sm:gap-3">
                    {notificationBell}

                    {/* Profile */}
                    <div className="flex items-center gap-3 pl-1 cursor-pointer group" onClick={goToProfileSettings}>
                      <div className="text-right hidden md:block">
                          <div className="text-sm font-bold text-slate-800 leading-none group-hover:text-blue-600 transition-colors">{user?.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wide">Online</div>
                      </div>
                      <div className="h-10 w-10 rounded-full p-0.5 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md group-hover:shadow-lg transition-all ring-2 ring-white">
                        <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white">
                            {user?.avatarUrl && !isHeaderAvatarBroken ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user.fullName}
                                  className="h-full w-full object-cover"
                                  // Google CDN avatars 403 when Referer is sent from localhost / our domain.
                                  referrerPolicy="no-referrer"
                                  onError={() => setIsHeaderAvatarBroken(true)}
                                />
                            ) : (
                                <UserCircle size={24} className="text-slate-400" />
                            )}
                        </div>
                      </div>
                    </div>
                </div>
              </div>
          </div>
        </header>
        {/* --- MODERN HEADER END --- */}

        <main className="relative flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-y-auto bg-slate-50 overscroll-y-contain">
          {profileGateBanner}
          {children}
        </main>

        {!isPersonalZone && (
        <CommandPalette 
            isOpen={isCmdOpen} 
            onClose={() => setIsCmdOpen(false)} 
            onNavigate={handleNavigate} 
        />
        )}
        
        {/* Persona switcher modal — workspace only */}
        {showPersonaModal && !isPersonalZone && (
            <PersonaSwitcherModal onClose={() => setShowPersonaModal(false)} />
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;
