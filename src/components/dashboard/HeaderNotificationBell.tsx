"use client";

import React from 'react';
import { CalendarDays, CheckCircle, Gift, RefreshCw } from 'lucide-react';
import { BellIcon } from '../ui/bell';
import type { UnifiedTask } from '../../services/taskService';
import type { GiftAllocation } from '../../types/access';
import type { MemberEventReminder } from '../../features/myzone-mobile/logic/memberBellNotices';

export type { MemberEventReminder };

interface HeaderNotificationBellProps {
  /** `workspace` = staff Action Center feed; `member` = gifts + event reminders only. */
  variant?: 'workspace' | 'member';
  tasks: UnifiedTask[];
  gifts: GiftAllocation[];
  eventReminders?: MemberEventReminder[];
  isLoadingGifts: boolean;
  hasUnread: boolean;
  highPriorityCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onSelectTask: (task: UnifiedTask) => void;
  onSelectGift: (gift: GiftAllocation) => void;
  onSelectEventReminder?: (reminder: MemberEventReminder) => void;
  onViewActionCenter?: () => void;
  onViewWallet?: () => void;
}

/** Shared header bell for workspace (staff) and My Zone (member) with different feeds. */
const HeaderNotificationBell: React.FC<HeaderNotificationBellProps> = ({
  variant = 'workspace',
  tasks,
  gifts,
  eventReminders = [],
  isLoadingGifts,
  hasUnread,
  highPriorityCount,
  isOpen,
  onToggle,
  onSelectTask,
  onSelectGift,
  onSelectEventReminder,
  onViewActionCenter,
  onViewWallet,
}) => {
  const isMember = variant === 'member';
  const visibleTasks = isMember ? [] : tasks;
  const visibleReminders = isMember ? eventReminders : [];
  const totalCount = gifts.length + visibleTasks.length + visibleReminders.length;
  const isEmpty = totalCount === 0;

  return (
    <div className="relative" data-notification-root>
      <button
        type="button"
        aria-label={hasUnread ? 'Notifications, unread' : 'Notifications'}
        aria-expanded={isOpen}
        onClick={onToggle}
        className={`touch-target relative flex items-center justify-center rounded-full p-2 transition-all duration-200 sm:p-2.5 ${
          isOpen
            ? 'bg-blue-50 text-blue-600'
            : hasUnread
              ? 'bg-blue-50/90 text-blue-600 shadow-sm ring-1 ring-blue-100'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        }`}
      >
        <BellIcon size={20} className="shrink-0" aria-hidden alertLoop={hasUnread} />
        {hasUnread && (
          <span
            className={`absolute top-2 right-2.5 h-2 w-2 rounded-full ring-2 ring-white ${
              highPriorityCount > 0 ? 'bg-red-500' : 'bg-blue-500'
            }`}
          />
        )}
      </button>

      {isOpen && (
        <div className="fixed right-2 top-[calc(3.75rem+env(safe-area-inset-top,0px))] z-50 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-fade-in-up origin-top-right sm:absolute sm:right-0 sm:top-full sm:mt-4 sm:w-80">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
            <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {totalCount} New
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {isLoadingGifts && isEmpty ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw size={32} className="mx-auto mb-3 animate-spin text-slate-200" />
                <p className="text-xs">Loading...</p>
              </div>
            ) : isEmpty ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle size={32} className="mx-auto mb-3 text-slate-200" />
                <p className="text-xs">You&apos;re all caught up!</p>
              </div>
            ) : (
              <>
                {gifts.slice(0, 5).map((gift) => (
                  <button
                    key={gift.id}
                    type="button"
                    onClick={() => onSelectGift(gift)}
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

                {visibleReminders.slice(0, 5).map((reminder) => (
                  <button
                    key={reminder.id}
                    type="button"
                    onClick={() => onSelectEventReminder?.(reminder)}
                    className="w-full text-left p-4 hover:bg-blue-50/80 border-b border-slate-50 last:border-0 transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          reminder.phase === 'live'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}
                      >
                        <CalendarDays size={10} />
                        {reminder.phase === 'live'
                          ? 'LIVE'
                          : reminder.phase === 'countdown'
                            ? 'STARTING SOON'
                            : 'UPCOMING'}
                      </span>
                      <span className="text-[10px] text-slate-400 group-hover:text-slate-500">
                        {new Date(reminder.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate mb-0.5">
                      {reminder.eventName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{reminder.description}</p>
                  </button>
                ))}

                {visibleTasks.slice(0, 5).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onSelectTask(task)}
                    className="w-full text-left p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          task.priority === 'HIGH'
                            ? 'bg-red-50 text-red-600 border-red-100'
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}
                      >
                        {task.priority}
                      </span>
                      <span className="text-[10px] text-slate-400 group-hover:text-slate-500">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate mb-0.5">
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{task.description}</p>
                  </button>
                ))}
              </>
            )}
          </div>
          {(isMember ? onViewWallet : onViewActionCenter) && (
            <div className="p-2 border-t border-slate-100 bg-slate-50">
              {isMember ? (
                <button
                  type="button"
                  onClick={onViewWallet}
                  className="w-full py-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Open wallet
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onViewActionCenter}
                  className="w-full py-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  View Action Center
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderNotificationBell;
