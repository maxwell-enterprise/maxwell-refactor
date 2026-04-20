
import React from 'react';
import { Event } from '../../../types/index';
import { RotateCw, Award, Monitor, Calendar, Clock, MapPin, Users, Settings, ScanLine, Projector, ListFilter, EyeOff, Trash2, History } from 'lucide-react';

/** Compare calendar YYYY-MM-DD without UTC midnight shift from `new Date("YYYY-MM-DD")`. */
function startOfLocalDayFromYmd(ymd: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
    if (!m) return new Date(ymd);
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

interface EventListItemProps {
    event: Event;
    isChild?: boolean;
    onEdit: (event: Event) => void;
    onDelete?: (eventId: string) => void;
    onGateConfig?: (event: Event) => void;
    onProjector?: (event: Event) => void;
    canWrite: boolean;
}

const EventListItem: React.FC<EventListItemProps> = ({ event, isChild = false, onEdit, onDelete, onGateConfig, onProjector, canWrite }) => {
    const isPast =
        startOfLocalDayFromYmd(event.date) < new Date(new Date().setHours(0, 0, 0, 0));

    return (
        <div
            key={event.id}
            className={`flex min-w-0 max-w-full flex-col gap-3 bg-white p-3 transition-colors sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-4 ${
                isChild ? 'bg-slate-50/50 pl-4 sm:pl-10' : ''
            } ${isPast ? 'opacity-80' : ''} hover:bg-slate-50`}
        >
            <div className="flex min-w-0 flex-1 gap-3">
                <div
                    className={`mt-0.5 h-10 w-1 shrink-0 rounded-full sm:h-12 ${
                        isPast
                            ? 'bg-slate-300'
                            : event.type === 'CONTAINER'
                              ? 'bg-slate-800'
                              : event.type === 'SESSION'
                                ? 'bg-blue-500'
                                : event.isRecurring
                                  ? 'bg-amber-500'
                                  : 'bg-green-500'
                    }`}
                />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <span
                            className={`min-w-0 max-w-full text-[15px] font-bold leading-snug break-words sm:text-sm ${
                                isPast ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'
                            }`}
                        >
                            {event.name}
                        </span>

                        {isPast && (
                            <span className="inline-flex shrink-0 items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                                <History size={8} className="mr-1 shrink-0" /> PAST EVENT
                            </span>
                        )}

                        {event.isVisibleInCatalog === false && (
                            <span
                                className="inline-flex shrink-0 items-center rounded border border-slate-300 bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
                                title="Hidden from Catalogue"
                            >
                                <EyeOff size={8} className="mr-1 shrink-0" /> HIDDEN
                            </span>
                        )}

                        {event.type === 'CONTAINER' && event.selectionConfig?.mode === 'OPTION' && (
                            <span className="inline-flex max-w-full items-center rounded border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 shadow-sm">
                                <ListFilter size={8} className="mr-1 shrink-0" />
                                <span className="break-words">
                                    Pick {event.selectionConfig.minSelect}-{event.selectionConfig.maxSelect} Sessions
                                </span>
                            </span>
                        )}

                        {event.type !== 'CONTAINER' && (
                            <span
                                className={`inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                    event.admissionPolicy === 'OPEN_MEMBER'
                                        ? 'border-green-200 bg-green-50 text-green-700'
                                        : 'border-slate-200 bg-slate-100 text-slate-500'
                                }`}
                            >
                                {event.admissionPolicy.replace('_', ' ')}
                            </span>
                        )}
                        {event.isRecurring && (
                            <span className="inline-flex shrink-0 items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                <RotateCw size={8} className="mr-1 shrink-0" /> {event.recurringMeta?.frequency || 'RECURRING'}
                            </span>
                        )}
                        {event.doneTag && (
                            <span
                                className="inline-flex shrink-0 items-center rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-700"
                                title={`Grants: ${event.doneTag}`}
                            >
                                <Award size={8} className="mr-1 shrink-0" /> Certified
                            </span>
                        )}
                        {event.locationMode === 'ONLINE' && (
                            <span className="inline-flex shrink-0 items-center rounded border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-600">
                                <Monitor size={8} className="mr-1 inline shrink-0" />
                                Online
                            </span>
                        )}
                    </div>
                    <div className="mt-2 flex flex-col gap-1.5 text-[13px] text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1 sm:text-xs">
                        <span className="inline-flex min-w-0 items-start gap-1 break-words">
                            <Calendar size={12} className="mt-0.5 shrink-0 text-slate-400" />
                            {event.isRecurring ? `Starts ${event.date}` : event.date}
                            {event.endDate && <span className="text-slate-400"> – {event.endDate}</span>}
                        </span>
                        {event.time && (
                            <span className="inline-flex items-center gap-1">
                                <Clock size={12} className="shrink-0 text-slate-400" /> {event.time}
                            </span>
                        )}
                        {event.location && (
                            <span className="inline-flex min-w-0 items-start gap-1 break-words">
                                <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" /> {event.location}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                            <Users size={12} className="shrink-0 text-slate-400" /> {event.attendees}/{event.capacity}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 border-t border-slate-200 pt-2 sm:border-t-0 sm:pt-0">
                {event.type !== 'CONTAINER' && canWrite && onGateConfig && (
                    <button
                        type="button"
                        onClick={() => onGateConfig(event)}
                        className="touch-target rounded p-2 text-slate-400 hover:bg-purple-50 hover:text-purple-600 sm:min-h-0 sm:min-w-0 sm:p-1.5"
                        title="Configure Gate Scanning"
                    >
                        <ScanLine size={16} />
                    </button>
                )}
                {event.type !== 'CONTAINER' && onProjector && (
                    <button
                        type="button"
                        onClick={() => onProjector(event)}
                        className="touch-target rounded p-2 text-slate-400 hover:bg-purple-50 hover:text-purple-600 sm:min-h-0 sm:min-w-0 sm:p-1.5"
                        title="Projector Mode"
                    >
                        <Projector size={16} />
                    </button>
                )}
                {canWrite && (
                    <>
                        <button
                            type="button"
                            onClick={() => onEdit(event)}
                            className="touch-target rounded p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 sm:min-h-0 sm:min-w-0 sm:p-1.5"
                            title="Edit"
                        >
                            <Settings size={16} />
                        </button>
                        {onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(event.id)}
                                className="touch-target rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 sm:min-h-0 sm:min-w-0 sm:p-1.5"
                                title="Delete Event"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default EventListItem;
