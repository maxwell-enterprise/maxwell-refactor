
import { useState, useEffect, useMemo } from 'react';
import { WalletItem, Event } from '../types/index';
import { DataService } from '../services/dataService';
import { AttendanceService } from '../services/attendanceService';
import { useToast } from '../context/ToastContext';
import { QrCode, Monitor, Info, Layers } from 'lucide-react';

export type TicketTab = 'ACCESS' | 'VIRTUAL' | 'DETAILS' | 'SESSIONS';

export const useTicketLogic = (item: WalletItem, onClose: () => void) => {
    const { showToast } = useToast();
    
    // Core Data
    const [eventData, setEventData] = useState<Event | null>(null);
    const [subEvents, setSubEvents] = useState<Event[]>([]); // For Container Tickets
    
    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TicketTab>('ACCESS');
    const [isJoining, setIsJoining] = useState(false);
    const [isAttended, setIsAttended] = useState(item.status === 'USED' || item.status === 'CLAIMED');
    
    // Drill Down State (For viewing a specific session within a container)
    const [selectedSession, setSelectedSession] = useState<Event | null>(null);

    // 1. Fetch Real-time Event Data & Sub Events
    useEffect(() => {
        const fetchContext = async () => {
            if (!item.meta?.eventId) {
                setIsLoading(false);
                return;
            }
            try {
                const allEvents = await DataService.getEvents();
                const found = allEvents.find(e => e.id === item.meta!.eventId);
                
                if (found) {
                    setEventData(found);

                    // If Container, fetch children
                    if (found.type === 'CONTAINER') {
                        const children = allEvents
                            .filter(e => e.parentEventId === found.id)
                            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        
                        setSubEvents(children);
                        setActiveTab('SESSIONS'); // Default to list view for containers
                    } else {
                        // Default tab based on mode for single events
                        if (found.locationMode === 'ONLINE') {
                            setActiveTab('VIRTUAL');
                        } else {
                            setActiveTab('ACCESS');
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load event context", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchContext();
    }, [item.meta?.eventId]);

    // 2. Determine Display Context (Master Event or Selected Session)
    const activeContext = selectedSession || eventData;
    const mode = activeContext?.locationMode || item.meta?.locationMode || 'OFFLINE';
    
    // 3. Define Available Tabs based on Mode & Hierarchy
    const availableTabs = useMemo(() => {
        const tabs: { id: TicketTab; label: string; icon: any }[] = [];
        
        // If viewing main container list
        if (eventData?.type === 'CONTAINER' && !selectedSession) {
             tabs.push({ id: 'SESSIONS', label: 'All Sessions', icon: Layers });
             tabs.push({ id: 'DETAILS', label: 'Series Info', icon: Info });
             return tabs;
        }

        // If viewing single event or drilled-down session
        if (mode === 'OFFLINE' || mode === 'HYBRID') {
            tabs.push({ id: 'ACCESS', label: 'Entry Pass', icon: QrCode });
        }

        if (mode === 'ONLINE' || mode === 'HYBRID') {
            tabs.push({ id: 'VIRTUAL', label: 'Join Stream', icon: Monitor });
        }

        tabs.push({ id: 'DETAILS', label: 'Details', icon: Info });
        
        return tabs;
    }, [mode, eventData, selectedSession]);

    // 4. Secure Link Opener (Sanitization Logic)
    const openSecureLink = (url: string) => {
        if (!url) return;
        
        // Ensure protocol exists
        let secureUrl = url.trim();
        if (!/^https?:\/\//i.test(secureUrl)) {
            secureUrl = 'https://' + secureUrl;
        }
        
        window.open(secureUrl, '_blank');
    };

    // 5. Handle Join Online
    const joinOnlineSession = async () => {
        // Priority: Selected Session -> Event Data -> Ticket Meta
        const link = activeContext?.onlineMeetingLink || item.meta?.onlineMeetingLink;

        if (!link) {
            showToast("Meeting link is not available yet. Please check back later.", "error");
            return;
        }

        setIsJoining(true);
        
        try {
            // Record attendance for the specific session ID if available
            const memberId = item.userId;
            const dummyMember: any = { id: memberId, name: item.meta?.recipientName || 'User', email: item.meta?.recipientEmail || '' };
            
            // Use active context (session) ID for accurate logging
            const targetEventId = activeContext?.id || item.meta?.eventId || '';
            const dummyEvent: any = { id: targetEventId, name: activeContext?.name || item.title };

            await AttendanceService.recordAttendance(dummyMember, dummyEvent, 'LINK_CLICKED');
            setIsAttended(true);
        } catch (e) {
            console.warn("Auto-attendance failed, proceeding to link anyway", e);
        }

        setTimeout(() => {
            openSecureLink(link);
            setIsJoining(false);
        }, 800);
    };

    const handleSelectSession = (session: Event) => {
        setSelectedSession(session);
        // Auto switch tab based on session type
        if (session.locationMode === 'ONLINE') setActiveTab('VIRTUAL');
        else setActiveTab('ACCESS');
    };

    const handleBackToSeries = () => {
        setSelectedSession(null);
        setActiveTab('SESSIONS');
    };

    return {
        eventData,
        subEvents,
        selectedSession,
        isLoading,
        mode,
        activeTab,
        setActiveTab,
        availableTabs,
        joinOnlineSession,
        handleSelectSession,
        handleBackToSeries,
        openSecureLink, // Exported for use in UI
        isJoining,
        isAttended,
        displayDate: activeContext?.date || item.expiryDate,
        displayTime: activeContext?.recurringMeta?.time || item.meta?.time,
        displayLocation: activeContext?.location || item.meta?.location,
        displayTitle: activeContext?.name || item.title,
        locationMapLink: activeContext?.locationMapLink || item.meta?.locationMapLink
    };
};
