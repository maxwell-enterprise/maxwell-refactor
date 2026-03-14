
import React, { useState, useMemo, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { ReferenceService } from '../services/referenceService';
import { CertificationService } from '../services/certificationService'; 
import { CreditTagService } from '../services/creditTagService'; 
import { Event, EventType } from '../types/index';
import { MasterTier } from '../types/reference';
import { MasterDoneTag } from '../types/certification'; 
import { useAccess } from '../context/SecurityContext'; 
import { Calendar, Plus, X, Settings, FolderOpen, Layers, AlertTriangle, Trash2, Unlink } from 'lucide-react';
import QRCodeDisplay from './common/QRCodeDisplay';
import { useToast } from '../context/ToastContext';
import { useDialog } from '../context/DialogContext'; // NEW IMPORT
import GateConfigModal from './attendance/GateConfigModal'; 

// Imported Sub-Components
import EventListItem from './ops/events/EventListItem';
import EventForm from './ops/events/EventForm';
import MasterTierConfig from './ops/events/MasterTierConfig';

const EventsAdmin: React.FC = () => {
  const { can } = useAccess('ops_event_mgmt');
  const { showToast } = useToast();
  const { confirm } = useDialog(); // USE DIALOG HOOK

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [gateConfigEvent, setGateConfigEvent] = useState<Event | null>(null);
  const [projectorEvent, setProjectorEvent] = useState<Event | null>(null);
  
  // View Modes
  const [viewMode, setViewMode] = useState<'list' | 'series'>('series'); 
  const [mainTab, setMainTab] = useState<'EVENTS' | 'MASTER_TIERS'>('EVENTS'); 
  
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedSeries, setExpandedSeries] = useState<string[]>([]); 
  
  // New/Edit Event State
  const [isEditing, setIsEditing] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({});

  const [availableCreditTags, setAvailableCreditTags] = useState<{code: string, label: string}[]>([]);
  const [masterTiers, setMasterTiers] = useState<MasterTier[]>([]);
  const [masterDoneTags, setMasterDoneTags] = useState<MasterDoneTag[]>([]); 
  
  useEffect(() => {
      loadEvents();
      loadReferences();
  }, [mainTab]); 

  const loadEvents = async () => {
      const data = await DataService.getEvents();
      setEvents(data);
      const firstSeries = data.find(e => e.type === 'CONTAINER');
      if(firstSeries) setExpandedSeries([firstSeries.id]);
  };

  const loadReferences = async () => {
      const tiers = await ReferenceService.getMasterTiers();
      setMasterTiers(tiers);
      const doneTags = await CertificationService.getMasterTags(); 
      setMasterDoneTags(doneTags);
      const creditTags = await CreditTagService.getTagOptions(); 
      setAvailableCreditTags(creditTags);
  };

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
        const matchesYear = e.date.startsWith(selectedYear) || selectedYear === 'All';
        const matchesType = selectedType === 'All' || e.type === selectedType;
        return matchesYear && matchesType;
    });
  }, [events, selectedYear, selectedType]);

  const seriesGroupedEvents = useMemo(() => {
      const seriesList = events.filter(e => e.type === 'CONTAINER' && (selectedYear === 'All' || e.date.startsWith(selectedYear)));
      const recurringList = events.filter(e => e.isRecurring && (selectedYear === 'All' || e.date.startsWith(selectedYear)));
      const orphans = events.filter(e => e.type === 'SOLO' && !e.isRecurring && !e.parentEventId && (selectedYear === 'All' || e.date.startsWith(selectedYear)));
      return { seriesList, recurringList, orphans };
  }, [events, selectedYear]);

  const bundleableEvents = useMemo(() => {
      return events.filter(e => e.type === 'SOLO' && e.admissionPolicy === 'PRE_BOOKED');
  }, [events]);

  const availableContainers = useMemo(() => {
      return events.filter(e => e.type === 'CONTAINER');
  }, [events]);

  const currentLinkedChildren = useMemo(() => {
      if (!isEditing || !newEvent.id || newEvent.type !== 'CONTAINER') return [];
      return events.filter(e => e.parentEventId === newEvent.id);
  }, [events, isEditing, newEvent]);

  const availableOrphans = useMemo(() => {
      if (!isEditing || !newEvent.id || newEvent.type !== 'CONTAINER') return [];
      return events.filter(e => 
          !e.parentEventId && 
          e.id !== newEvent.id && 
          e.type !== 'CONTAINER'
      );
  }, [events, isEditing, newEvent]);

  const handleManageChild = async (childId: string, action: 'LINK' | 'UNLINK') => {
      if (!newEvent.id) return;
      const childEvent = events.find(e => e.id === childId);
      if (!childEvent) return;

      const updatedChild = { 
          ...childEvent, 
          parentEventId: action === 'LINK' ? newEvent.id : undefined,
          type: action === 'LINK' ? 'SESSION' as EventType : 'SOLO' as EventType 
      };

      await DataService.upsertEvent(updatedChild);
      showToast(action === 'LINK' ? 'Event added to series' : 'Event removed from series', 'success');
      loadEvents(); 
  };

  // --- REFACTORED DELETE LOGIC USING GLOBAL DIALOG ---
  const handleClickDelete = async (eventId: string) => {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      if (event.type === 'CONTAINER') {
          const children = events.filter(e => e.parentEventId === event.id);
          if (children.length > 0) {
              // Complex Delete Dialog
              const confirmed = await confirm({
                  title: 'Delete Series Container?',
                  variant: 'danger',
                  message: (
                      <div>
                          <p>You are about to delete <b>{event.name}</b>.</p>
                          <p className="mt-2 text-sm">This container has <b>{children.length} child sessions</b>. How should we handle them?</p>
                          <p className="mt-2 text-xs italic text-slate-500">Note: This action will delete the container and UNLINK the children (converting them to Solo events). To delete everything, delete children first.</p>
                      </div>
                  ),
                  confirmLabel: 'Delete & Unlink Children'
              });

              if (confirmed) {
                  await handleSeriesDelete(event.id, 'ORPHAN'); // Defaulting to Orphan strategy for safety in this UI flow
              }
              return;
          }
      }

      // Simple Delete Dialog
      const confirmed = await confirm({
          title: 'Delete Event?',
          variant: 'danger',
          message: `Are you sure you want to delete "${event.name}"? This action cannot be undone.`,
          confirmLabel: 'Delete Permanently'
      });

      if (confirmed) {
          processDelete(eventId);
      }
  };

  const processDelete = async (id: string) => {
      try {
          await DataService.deleteEvent(id);
          showToast('Event deleted successfully', 'success');
          loadEvents();
      } catch (e) {
          showToast('Failed to delete event', 'error');
      }
  };

  const handleSeriesDelete = async (seriesId: string, strategy: 'CASCADE' | 'ORPHAN') => {
      try {
          await DataService.deleteSeries(seriesId, strategy);
          showToast(`Series deleted. Children ${strategy === 'CASCADE' ? 'deleted' : 'unlinked'}.`, 'success');
          loadEvents();
      } catch (e) {
          showToast('Failed to process series deletion', 'error');
      }
  };

  const handleOpenCreate = () => {
      setIsEditing(false);
      setNewEvent({ 
        name: '', description: '', location: '', date: new Date().toISOString().split('T')[0], endDate: '', time: '09:00', capacity: 100, type: 'SOLO', creditTags: [], parentEventId: '',
        admissionPolicy: 'PRE_BOOKED',
        tiers: [{ id: `TIER-GEN-${Date.now()}`, name: 'General Admission', quota: 100, grantTagIds: [] }],
        doneTag: '',
        locationMode: 'OFFLINE',
        isRecurring: false,
        recurringMeta: { frequency: 'WEEKLY', time: '09:00', patternDescription: '', totalSessions: 1 },
        onlineMeetingLink: '',
        locationMapLink: '',
        isVisibleInCatalog: true
      });
      setShowCreateModal(true);
  };

  const handleOpenEdit = (event: Event) => {
      setIsEditing(true);
      setNewEvent(JSON.parse(JSON.stringify(event)));
      setShowCreateModal(true);
  };

  const handleSaveEvent = async (eventData: Partial<Event>) => {
    // Validation Logic...
    if (eventData.type === 'SOLO' && eventData.admissionPolicy === 'PRE_BOOKED' && eventData.tiers) {
        if (eventData.tiers.length === 0) {
            showToast('Please define at least one Ticket Tier for a Pre-Booked event.', 'error');
            return;
        }
    }
    if (eventData.type === 'CONTAINER') {
         if (!eventData.endDate) {
             showToast('Container events must have an End Date.', 'error');
             return;
         }
    }
    if (eventData.type === 'SESSION' && !eventData.parentEventId) {
        showToast('Sub Events must belong to a Parent Series.', 'error');
        return;
    }
    
    let eventToSave: Event;
    
    const existingTags = eventData.creditTags || [];
    let tierTags: string[] = [];
    if (eventData.tiers && eventData.tiers.length > 0) {
        tierTags = eventData.tiers.flatMap(t => t.grantTagIds || []);
    }
    const finalTags = Array.from(new Set([...existingTags, ...tierTags].filter(t => !!t)));

    if (isEditing && eventData.id) {
        eventToSave = { ...events.find(e => e.id === eventData.id)!, ...eventData, creditTags: finalTags } as Event;
    } else {
        eventToSave = {
            id: `EVT-${Date.now()}`,
            name: eventData.name || 'Untitled Event',
            description: eventData.description || '',
            date: eventData.date || new Date().toISOString().split('T')[0],
            endDate: eventData.endDate,
            time: eventData.time || '09:00',
            location: eventData.location || 'TBD',
            locationMode: eventData.locationMode || 'OFFLINE',
            locationMapLink: eventData.locationMapLink,
            onlineMeetingLink: eventData.onlineMeetingLink,
            capacity: eventData.capacity || 100,
            type: eventData.type as EventType,
            status: 'Upcoming',
            revenue: 0,
            attendees: 0,
            parentEventId: eventData.parentEventId,
            creditTags: finalTags,
            admissionPolicy: eventData.admissionPolicy || 'PRE_BOOKED',
            isRecurring: eventData.isRecurring,
            recurringMeta: eventData.recurringMeta,
            tiers: eventData.tiers || [],
            doneTag: eventData.type === 'CONTAINER' ? '' : eventData.doneTag,
            isVisibleInCatalog: eventData.isVisibleInCatalog !== undefined ? eventData.isVisibleInCatalog : true
        };
    }

    await DataService.upsertEvent(eventToSave);
    showToast(isEditing ? 'Event updated' : 'Event created', 'success');
    setShowCreateModal(false);
    loadEvents();
  };

  const toggleSeriesExpand = (seriesId: string) => {
      setExpandedSeries(prev => prev.includes(seriesId) ? prev.filter(id => id !== seriesId) : [...prev, seriesId]);
  };

  if (!can('READ')) return <div className="p-8 text-center text-slate-400">Access Restricted</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
              <Settings size={24} className="mr-3 text-slate-700"/> Event Operations
          </h1>
          <p className="text-slate-500 mt-1">Manage schedules, admission gates, and series structures.</p>
        </div>
        <div className="flex gap-2">
            {can('WRITE') && mainTab === 'EVENTS' && (
                <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-lg transition-transform active:scale-95">
                    <Plus size={18} className="mr-2" /> New Event
                </button>
            )}
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex gap-4 border-b border-slate-200">
          <button 
            onClick={() => setMainTab('EVENTS')}
            className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 ${mainTab === 'EVENTS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              Event Management
          </button>
          <button 
            onClick={() => setMainTab('MASTER_TIERS')}
            className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 flex items-center ${mainTab === 'MASTER_TIERS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <Layers size={14} className="mr-2"/> Master Tiers
          </button>
      </div>

      {/* VIEW: MASTER TIERS */}
      {mainTab === 'MASTER_TIERS' && (
          <div className="h-[600px]">
              <MasterTierConfig />
          </div>
      )}

      {/* VIEW: EVENT LIST */}
      {mainTab === 'EVENTS' && (
        <>
          {/* Filters & View Switcher */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2">
                   <button onClick={() => setViewMode('series')} className={`px-3 py-1.5 text-xs font-bold rounded border ${viewMode === 'series' ? 'bg-slate-100 text-slate-900 border-slate-300' : 'text-slate-500 border-transparent'}`}>
                       Hierarchy View
                   </button>
                   <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-xs font-bold rounded border ${viewMode === 'list' ? 'bg-slate-100 text-slate-900 border-slate-300' : 'text-slate-500 border-transparent'}`}>
                       Flat List
                   </button>
              </div>
              <div className="flex gap-2">
                  <select className="bg-slate-50 border border-slate-200 text-xs rounded px-3 py-2 outline-none" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                      <option value="All">All Years</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                  </select>
                  <select className="bg-slate-50 border border-slate-200 text-xs rounded px-3 py-2 outline-none" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                      <option value="All">All Types</option>
                      <option value="CONTAINER">Series (Container)</option>
                      <option value="SOLO">Single Event</option>
                  </select>
              </div>
          </div>

          {/* Main List Rendering */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {filteredEvents.length === 0 ? (
                 <div className="p-12 text-center text-slate-400">
                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No events found for the selected filters.</p>
                </div>
            ) : viewMode === 'list' ? (
                <div className="divide-y divide-slate-100">
                    {filteredEvents.map(event => (
                        <EventListItem 
                            key={event.id} 
                            event={event} 
                            onEdit={handleOpenEdit} 
                            onDelete={() => handleClickDelete(event.id)}
                            onGateConfig={setGateConfigEvent}
                            onProjector={setProjectorEvent}
                            canWrite={can('WRITE')}
                        />
                    ))}
                </div>
            ) : (
                <div className="p-4 space-y-4 bg-slate-50">
                    {seriesGroupedEvents.seriesList.map(series => {
                        const children = events.filter(e => e.parentEventId === series.id);
                        const isExpanded = expandedSeries.includes(series.id);
                        return (
                            <div key={series.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => toggleSeriesExpand(series.id)}>
                                    <div className="flex items-center gap-3">
                                        <FolderOpen size={18} className="text-slate-500 fill-slate-100" />
                                        <div>
                                            <div className="font-bold text-sm text-slate-900">{series.name}</div>
                                            <div className="text-[10px] text-slate-500">Container ID: {series.id}</div>
                                        </div>
                                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-100">{children.length} Included</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {can('WRITE') && <button onClick={(e) => {e.stopPropagation(); handleOpenEdit(series);}} className="p-1 hover:bg-slate-200 rounded"><Settings size={14}/></button>}
                                        {can('WRITE') && <button onClick={(e) => {e.stopPropagation(); handleClickDelete(series.id);}} className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded"><X size={14}/></button>}
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="border-t border-slate-100">
                                        {children.length === 0 && <div className="p-4 text-xs text-slate-400 italic pl-10">No sessions in this container yet.</div>}
                                        {children.map(child => (
                                            <EventListItem 
                                                key={child.id}
                                                event={child} 
                                                isChild={true}
                                                onEdit={handleOpenEdit} 
                                                onDelete={() => handleClickDelete(child.id)}
                                                onGateConfig={setGateConfigEvent}
                                                onProjector={setProjectorEvent}
                                                canWrite={can('WRITE')}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {seriesGroupedEvents.recurringList.length > 0 && (
                         <div className="mt-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Recurring Sessions (Routine)</h4>
                            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                {seriesGroupedEvents.recurringList.map(e => (
                                    <EventListItem key={e.id} event={e} onEdit={handleOpenEdit} onDelete={() => handleClickDelete(e.id)} onGateConfig={setGateConfigEvent} onProjector={setProjectorEvent} canWrite={can('WRITE')} />
                                ))}
                            </div>
                        </div>
                    )}

                    {seriesGroupedEvents.orphans.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Independent Events</h4>
                            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                {seriesGroupedEvents.orphans.map(e => (
                                    <EventListItem key={e.id} event={e} onEdit={handleOpenEdit} onDelete={() => handleClickDelete(e.id)} onGateConfig={setGateConfigEvent} onProjector={setProjectorEvent} canWrite={can('WRITE')} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
          </div>
        </>
      )}

      {/* PROJECTOR & GATE MODALS */}
      {projectorEvent && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 animate-fade-in">
              <button onClick={() => setProjectorEvent(null)} className="absolute top-6 right-6 text-white/50 hover:text-white">
                  <X size={32} />
              </button>
              <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-4xl w-full">
                  <h1 className="text-4xl font-bold text-slate-900 mb-2">{projectorEvent.name}</h1>
                  <p className="text-xl text-slate-500 mb-8">Scan to Self Check-In</p>
                  <div className="flex justify-center mb-8">
                      <QRCodeDisplay data={`EVENT_ATTENDANCE:${projectorEvent.id}`} size={400} showLabel={false} />
                  </div>
              </div>
          </div>
      )}
      
      {gateConfigEvent && (
          <GateConfigModal 
              event={gateConfigEvent} 
              onClose={() => setGateConfigEvent(null)}
              onSave={() => { setGateConfigEvent(null); loadEvents(); }}
          />
      )}

      {/* CREATE / EDIT MODAL */}
      <EventForm 
          isOpen={showCreateModal}
          isEditing={isEditing}
          initialData={newEvent}
          masterDoneTags={masterDoneTags}
          availableCreditTags={availableCreditTags}
          bundleableEvents={bundleableEvents}
          availableContainers={availableContainers}
          
          orphanEvents={availableOrphans}
          linkedChildren={currentLinkedChildren}
          onManageChild={handleManageChild}

          onClose={() => setShowCreateModal(false)}
          onSave={handleSaveEvent}
      />
    </div>
  );
};

export default EventsAdmin;
