"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import CommandPalette from '../components/common/CommandPalette'; 
import { ViewState, UserRole } from '../types/index';
import { Menu, Search, UserCircle, ChevronDown, CheckCircle, RefreshCw, Gift } from 'lucide-react';
import { BellIcon } from '../components/ui/bell';
import { useAuth } from '../context/AuthContext';
import {
  TaskService,
  UnifiedTask,
  MAXWELL_TASKS_UPDATED_EVENT,
} from '../services/taskService';
import { EntitlementService } from '../services/entitlementService';
import PersonaSwitcherModal from '../components/auth/PersonaSwitcherModal'; // NEW IMPORT
import { useToast } from '../context/ToastContext';
import { useDialog } from '../context/DialogContext';
import { markRbacInboxRead } from '../lib/rbacInboxClient';
import type { GiftAllocation } from '../types/access';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isPersonalZone: boolean;
  onToggleZone: (isPersonal: boolean) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, currentView, onNavigate, isPersonalZone, onToggleZone }) => {
  const { user, userRole, logout } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useDialog();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Replace simple menu state with modal state
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  
  // Command Palette State
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  
  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<UnifiedTask[]>([]);
  const [pendingGifts, setPendingGifts] = useState<GiftAllocation[]>([]);
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
  const notificationsDigest = useMemo(
    () => `${tasksDigest}::${giftsDigest}`,
    [tasksDigest, giftsDigest],
  );

  const hasUnreadNotifications =
    (pendingTasks.length > 0 || pendingGifts.length > 0) && notificationsSeenDigest !== notificationsDigest;

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

  // Hotkey Listener for Cmd+K / Ctrl+K
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              setIsCmdOpen(prev => !prev);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tasks for header bell: role changes matter; view switches should not re-hit all backends.
  useEffect(() => {
      if (userRole !== UserRole.GUEST) {
          TaskService.getMyTasks(userRole).then(tasks => {
              setPendingTasks(tasks);
          });
      }
  }, [userRole]);

  useEffect(() => {
      void loadGiftInbox();
  }, [loadGiftInbox]);

  useEffect(() => {
      if (userRole === UserRole.GUEST) return;
      const syncBell = () => {
          TaskService.getMyTasks(userRole).then(setPendingTasks);
      };
      window.addEventListener(MAXWELL_TASKS_UPDATED_EVENT, syncBell);
      return () => window.removeEventListener(MAXWELL_TASKS_UPDATED_EVENT, syncBell);
  }, [userRole]);

  const highPriorityCount = pendingTasks.filter(t => t.priority === 'HIGH').length;
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
    markNotificationsAsSeen();
    setShowNotifications(false);
    onNavigate(ViewState.WALLET);
  };

  /** Close mobile drawer after navigation; desktop layout ignores `isSidebarOpen` via `lg:translate-x-0`. */
  const handleNavigate = (view: ViewState) => {
    onNavigate(view);
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
      />

      {/* No overflow-x-hidden here — it clips wide tables/cards; <main> handles scroll */}
      <div className="relative flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col">
        
        {/* --- MODERN HEADER START --- */}
        <header className="h-[72px] z-40 sticky top-0 flex items-center justify-between px-3 transition-all duration-300 sm:px-6
            bg-white/85 backdrop-blur-xl border-b border-slate-200/80 
            shadow-[0_8px_30px_rgb(0,0,0,0.04)] shrink-0"
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
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <Menu size={24} />
                </button>
                
                {/* Mobile Search Trigger */}
                <button 
                  onClick={() => setIsCmdOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <Search size={24} />
                </button>
                
                {/* Breadcrumb / Title area */}
                <div className="hidden md:flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center">
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse ${isPersonalZone ? 'bg-indigo-500' : 'bg-blue-500'}`}></span>
                        {isPersonalZone ? 'Personal Zone' : 'Workspace'}
                    </span>
                    <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                        {currentView === ViewState.DASHBOARD 
                            ? (isPersonalZone ? 'Member Dashboard' : 'Executive Dashboard') 
                            : currentView.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h2>
                </div>
              </div>

              {/* Center/Right: Actions Area */}
              <div className="flex items-center gap-4 md:gap-6">
                
                {/* Global Command Trigger (Desktop) */}
                <div 
                    onClick={() => setIsCmdOpen(true)}
                    className="hidden lg:flex relative group w-72 cursor-pointer"
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

                {/* --- NEW PERSONA SWITCHER --- */}
                {canOpenPersonaSwitcher && (
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
                {canOpenPersonaSwitcher && (
                  <div className="hidden md:block w-px h-8 bg-slate-200 mx-1"></div>
                )}

                {/* Notification & Profile Group */}
                <div className="flex items-center gap-3">
                    {/* Notification Bell */}
                    <div className="relative">
                        <button 
                            type="button"
                            aria-label={hasUnreadNotifications ? 'Notifications, unread' : 'Notifications'}
                            onClick={() => {
                              setShowNotifications((open) => !open);
                              markNotificationsAsSeen();
                            }}
                            className={`relative p-2.5 rounded-full transition-all duration-200 ${
                              showNotifications
                                ? 'bg-blue-50 text-blue-600'
                                : hasUnreadNotifications
                                  ? 'bg-blue-50/90 text-blue-600 shadow-sm ring-1 ring-blue-100'
                                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                        >
                            <BellIcon
                              size={20}
                              className="shrink-0"
                              aria-hidden
                              alertLoop={hasUnreadNotifications}
                            />
                            {hasUnreadNotifications && (
                                <span
                                  className={`absolute top-2 right-2.5 h-2 w-2 rounded-full ring-2 ring-white ${
                                    highPriorityCount > 0 ? 'bg-red-500' : 'bg-blue-500'
                                  }`}
                                />
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute top-full right-0 mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fade-in-up origin-top-right">
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
                                    <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                      {pendingTasks.length + pendingGifts.length} New
                                    </span>
                                </div>
                                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                    {isLoadingGiftInbox && pendingTasks.length === 0 && pendingGifts.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <RefreshCw size={32} className="mx-auto mb-3 animate-spin text-slate-200"/>
                                            <p className="text-xs">Loading invitations...</p>
                                        </div>
                                    ) : pendingTasks.length === 0 && pendingGifts.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <CheckCircle size={32} className="mx-auto mb-3 text-slate-200"/>
                                            <p className="text-xs">You're all caught up!</p>
                                        </div>
                                    ) : (
                                        <>
                                          {pendingGifts.slice(0, 5).map((gift) => (
                                              <button
                                                  key={gift.id}
                                                  onClick={() => handleGiftNotificationClick(gift)}
                                                  className="w-full text-left p-4 hover:bg-emerald-50/80 border-b border-slate-50 last:border-0 transition-colors group"
                                              >
                                                  <div className="flex justify-between items-start mb-1.5">
                                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-100">
                                                          <Gift size={10} />
                                                          GIFT
                                                      </span>
                                                      <span className="text-[10px] text-slate-400 group-hover:text-slate-500">
                                                        {new Date(gift.createdAt).toLocaleDateString()}
                                                      </span>
                                                  </div>
                                                  <p className="text-sm font-semibold text-slate-800 truncate mb-0.5">
                                                    {gift.itemName}
                                                  </p>
                                                  <p className="text-xs text-slate-500 truncate">
                                                    From {gift.sourceUserName} · Tap to accept
                                                  </p>
                                              </button>
                                          ))}
                                          {pendingTasks.slice(0, 5).map(task => (
                                              <button 
                                                  key={task.id}
                                                  onClick={() => void handleNotificationItemClick(task)}
                                                  className="w-full text-left p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors group"
                                              >
                                                  <div className="flex justify-between items-start mb-1.5">
                                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${task.priority === 'HIGH' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                          {task.priority}
                                                      </span>
                                                      <span className="text-[10px] text-slate-400 group-hover:text-slate-500">{new Date(task.createdAt).toLocaleDateString()}</span>
                                                  </div>
                                                  <p className="text-sm font-semibold text-slate-800 truncate mb-0.5">{task.title}</p>
                                                  <p className="text-xs text-slate-500 truncate">{task.description}</p>
                                              </button>
                                          ))}
                                        </>
                                    )}
                                </div>
                                <div className="p-2 border-t border-slate-100 bg-slate-50">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                          markNotificationsAsSeen();
                                          onNavigate(ViewState.MY_TASKS);
                                          setShowNotifications(false);
                                        }}
                                        className="w-full py-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        View Action Center
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Profile */}
                    <div className="flex items-center gap-3 pl-1 cursor-pointer group" onClick={() => onNavigate(ViewState.SETTINGS)}>
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

        <main className="relative flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-y-auto bg-slate-50 p-0">
          {children}
        </main>

        {/* Global Command Palette */}
        <CommandPalette 
            isOpen={isCmdOpen} 
            onClose={() => setIsCmdOpen(false)} 
            onNavigate={handleNavigate} 
        />
        
        {/* New Persona Switcher Modal */}
        {showPersonaModal && (
            <PersonaSwitcherModal onClose={() => setShowPersonaModal(false)} />
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;
