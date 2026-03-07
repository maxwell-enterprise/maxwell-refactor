
import React from 'react';
import { Event } from '../../../types/index';
import { RotateCw, Award, Monitor, Calendar, Clock, MapPin, Users, Settings, ScanLine, Projector, ListFilter, EyeOff, Trash2, History } from 'lucide-react';

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
    // Check if event is past
    const isPast = new Date(event.date) < new Date(new Date().setHours(0,0,0,0));

    return (
        <div key={event.id} className={`flex items-center justify-between p-4 bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors ${isChild ? 'pl-10 bg-slate-50/50' : ''} ${isPast ? 'opacity-80' : ''}`}>
            <div className="flex items-center gap-4">
                <div className={`w-1 h-10 rounded-full ${
                    isPast ? 'bg-slate-300' :
                    event.type === 'CONTAINER' ? 'bg-slate-800' : 
                    event.type === 'SESSION' ? 'bg-blue-500' :
                    event.isRecurring ? 'bg-amber-500' :
                    'bg-green-500'
                }`}></div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isPast ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'}`}>{event.name}</span>
                        
                        {isPast && (
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 flex items-center">
                                <History size={8} className="mr-1"/> PAST EVENT
                            </span>
                        )}

                        {event.isVisibleInCatalog === false && (
                            <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded border border-slate-300 flex items-center" title="Hidden from Catalogue">
                                <EyeOff size={8} className="mr-1"/> HIDDEN
                            </span>
                        )}

                        {event.type === 'CONTAINER' && event.selectionConfig?.mode === 'OPTION' && (
                             <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 flex items-center shadow-sm">
                                 <ListFilter size={8} className="mr-1"/> 
                                 Pick {event.selectionConfig.minSelect}-{event.selectionConfig.maxSelect} Sessions
                             </span>
                        )}

                        {event.type !== 'CONTAINER' && (
                             <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                event.admissionPolicy === 'OPEN_MEMBER' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                                {event.admissionPolicy.replace('_', ' ')}
                            </span>
                        )}
                        {event.isRecurring && (
                             <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 flex items-center">
                                 <RotateCw size={8} className="mr-1"/> {event.recurringMeta?.frequency || 'RECURRING'}
                             </span>
                        )}
                        {event.doneTag && (
                            <span className="text-[9px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200 flex items-center" title={`Grants: ${event.doneTag}`}>
                                <Award size={8} className="mr-1"/> Certified
                            </span>
                        )}
                        {event.locationMode === 'ONLINE' && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100"><Monitor size={8} className="inline mr-1"/>Online</span>}
                    </div>
                    <div className="text-xs text-slate-500 flex gap-3 mt-0.5">
                        <span className="flex items-center"><Calendar size={10} className="mr-1"/> {event.isRecurring ? `Starts ${event.date}` : event.date}</span>
                        {event.endDate && <span className="flex items-center text-slate-400"> - {event.endDate}</span>}
                        {event.time && <span className="flex items-center"><Clock size={10} className="mr-1"/> {event.time}</span>}
                        {event.location && <span className="flex items-center"><MapPin size={10} className="mr-1"/> {event.location}</span>}
                        <span className="flex items-center"><Users size={10} className="mr-1"/> {event.attendees}/{event.capacity}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                {event.type !== 'CONTAINER' && canWrite && onGateConfig && (
                    <button 
                        onClick={() => onGateConfig(event)} 
                        className="p-1.5 text-slate-400 hover:text-purple-600 rounded hover:bg-purple-50" 
                        title="Configure Gate Scanning"
                    >
                        <ScanLine size={16} />
                    </button>
                )}
                {event.type !== 'CONTAINER' && onProjector && (
                    <button onClick={() => onProjector(event)} className="p-1.5 text-slate-400 hover:text-purple-600 rounded hover:bg-purple-50" title="Projector Mode">
                        <Projector size={16} />
                    </button>
                )}
                {canWrite && (
                    <>
                        <button onClick={() => onEdit(event)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Edit">
                            <Settings size={16} />
                        </button>
                        {onDelete && (
                            <button 
                                onClick={() => onDelete(event.id)} 
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50" 
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
