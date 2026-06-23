
import React, { useState, useMemo } from 'react';
import { EVENTS_DATA } from '../../constants';
import { Event } from '../../types/index';
import { CalendarDays, MapPin, Clock, Search, BookOpen, CheckCircle, Monitor } from 'lucide-react';
import { useAccess } from '../../context/SecurityContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { resolveEventDisplayTime } from '../../lib/eventDisplayTime';

const EventsCatalog: React.FC = () => {
  const { can } = useAccess('cat_events');
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  const today = new Date().toISOString().split('T')[0];

  const processedEvents = useMemo(() => {
      return EVENTS_DATA.filter(e => {
          // EXCLUDE CONTAINERS (SERIES HEADERS) - Users see specific sessions or solo events
          const isNotContainer = e.type !== 'CONTAINER'; 
          const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
          
          let matchesType = true;
          if (filterType === 'SESSION') matchesType = e.type === 'SESSION';
          if (filterType === 'SOLO') matchesType = e.type === 'SOLO';
          if (filterType === 'ONLINE') matchesType = e.locationMode === 'ONLINE';

          // VISIBILITY FILTER: Default to true if undefined
          const isVisible = e.isVisibleInCatalog !== false;

          return isNotContainer && matchesSearch && matchesType && isVisible;
      }).sort((a,b) => {
          // Sort Logic: Upcoming first (ASC), then Past (DESC)
          const isAFuture = a.date >= today;
          const isBFuture = b.date >= today;
          
          if (isAFuture && !isBFuture) return -1;
          if (!isAFuture && isBFuture) return 1;
          
          // If both future, closest first
          if (isAFuture) return new Date(a.date).getTime() - new Date(b.date).getTime();
          // If both past, most recent first
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [searchTerm, filterType]);

  const handleNavigateToMaterials = (eventId: string) => {
      showToast("Redirecting to Success Toolkit for event materials...", "success");
  };

  if (!can('READ')) {
      return <div className="p-10 text-center text-slate-400">Content not available.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Event Catalog</h1>
                <p className="text-slate-500 mt-2">Discover upcoming sessions and access materials for past events.</p>
            </div>
            
            <div className="flex gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search events..." 
                        className="w-full pl-9 pr-4 py-2 border-none outline-none text-sm bg-transparent"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-px bg-slate-200"></div>
                <select 
                    className="bg-transparent text-sm font-medium text-slate-600 outline-none cursor-pointer"
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                >
                    <option value="All">All Types</option>
                    <option value="SESSION">Sessions</option>
                    <option value="SOLO">Special Events</option>
                    <option value="ONLINE">Online Only</option>
                </select>
            </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedEvents.map(event => {
                const isPast = event.date < today;
                const hasAttended = isPast; // Mock logic

                return (
                    <div key={event.id} className={`bg-white rounded-2xl border p-6 hover:shadow-lg transition-all group flex flex-col h-full ${isPast ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${isPast ? 'bg-slate-200 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>
                                {isPast ? 'Completed' : event.type}
                            </div>
                            {isPast && hasAttended && (
                                <span className="text-xs font-bold text-green-600 flex items-center">
                                    <CheckCircle size={14} className="mr-1"/> Attended
                                </span>
                            )}
                        </div>
                        
                        <h3 className={`text-xl font-bold mb-2 transition-colors ${isPast ? 'text-slate-600' : 'text-slate-900 group-hover:text-blue-600'}`}>{event.name}</h3>
                        
                        <div className="mt-auto space-y-3 pt-6">
                            <div className="flex items-center text-sm text-slate-500">
                                <CalendarDays size={16} className="mr-3 text-slate-400" />
                                {new Date(event.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-sm text-slate-500">
                                <Clock size={16} className="mr-3 text-slate-400" />
                                {resolveEventDisplayTime(event) || '09:00 AM - 05:00 PM'}
                            </div>
                            <div className="flex items-center text-sm text-slate-500">
                                {event.locationMode === 'ONLINE' ? <Monitor size={16} className="mr-3 text-blue-400"/> : <MapPin size={16} className="mr-3 text-red-400" />}
                                {event.location}
                            </div>
                            
                            {isPast && hasAttended ? (
                                <button 
                                    onClick={() => handleNavigateToMaterials(event.id)}
                                    className="w-full py-2.5 mt-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm hover:bg-indigo-100 transition-all flex items-center justify-center"
                                >
                                    <BookOpen size={16} className="mr-2"/> View Materials
                                </button>
                            ) : (
                                <button 
                                    className={`w-full py-2.5 mt-2 rounded-lg border font-bold text-sm transition-all ${isPast ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-transparent'}`}
                                    disabled={isPast}
                                >
                                    {isPast ? 'Event Ended' : 'Register Now'}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        {processedEvents.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400">No events found matching your criteria.</p>
            </div>
        )}
    </div>
  );
};

export default EventsCatalog;
