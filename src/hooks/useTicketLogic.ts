
import { useState, useEffect, useMemo, useCallback } from 'react';
import { WalletItem, Event, Member } from '../types/index';
import { DataService } from '../services/dataService';
import { AttendanceService } from '../services/attendanceService';
import { EntitlementService } from '../services/entitlementService';
import { WALLET_REFRESH_EVENT } from '../services/paymentService';
import { subscribeAttendanceUpdated } from '../services/attendanceRealtime';
import { useToast } from '../context/ToastContext';
import { resolveEventDisplayTime } from '../lib/eventDisplayTime';
import { QrCode, Monitor, Info, Layers } from 'lucide-react';

export type TicketTab = 'ACCESS' | 'VIRTUAL' | 'DETAILS' | 'SESSIONS';

const parseEventStart = (dateValue?: string, timeValue?: string): Date | null => {
    if (!dateValue) return null;

    const baseDate = new Date(dateValue);
    if (Number.isNaN(baseDate.getTime())) return null;

    const timeMatch = timeValue?.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return null;

    const [, hoursRaw, minutesRaw] = timeMatch;
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    const start = new Date(baseDate);
    start.setHours(hours, minutes, 0, 0);
    return start;
};

const isAttendanceForTicket = (
    record: { memberId?: string; memberEmail?: string; ticketUniqueId?: string },
    ticket: WalletItem,
): boolean => {
    if (record.ticketUniqueId && record.ticketUniqueId === ticket.id) return true;
    if (record.memberId && record.memberId === ticket.userId) return true;
    const recipientEmail =
        typeof ticket.meta?.recipientEmail === 'string'
            ? ticket.meta.recipientEmail.trim().toLowerCase()
            : '';
    if (
        recipientEmail &&
        record.memberEmail &&
        record.memberEmail.trim().toLowerCase() === recipientEmail
    ) {
        return true;
    }
    return false;
};

export const useTicketLogic = (item: WalletItem, onClose: () => void) => {
    const { showToast } = useToast();
    
    // Core Data
    const [eventData, setEventData] = useState<Event | null>(null);
    const [subEvents, setSubEvents] = useState<Event[]>([]); // For Container Tickets
    const [liveItem, setLiveItem] = useState<WalletItem>(item);
    
    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TicketTab>('ACCESS');
    const [isJoining, setIsJoining] = useState(false);
    // Per-session attendance — NOT derived from ticket USED (series passes stay ACTIVE).
    const [isAttended, setIsAttended] = useState(false);
    
    // Drill Down State (For viewing a specific session within a container)
    const [selectedSession, setSelectedSession] = useState<Event | null>(null);

    const isSeriesContainer = eventData?.type === 'CONTAINER';

    useEffect(() => {
        setLiveItem(item);
    }, [item]);

    // 1. Fetch Real-time Event Data & Sub Events
    useEffect(() => {
        const fetchContext = async () => {
            if (!liveItem.meta?.eventId) {
                setIsLoading(false);
                return;
            }
            try {
                const allEvents = await DataService.getEvents();
                const found = allEvents.find(e => e.id === liveItem.meta!.eventId);
                
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
    }, [liveItem.meta?.eventId]);

    const resolveAttendanceTargetId = useCallback((): string | null => {
        if (selectedSession?.id) return selectedSession.id;
        if (eventData?.type === 'CONTAINER') return null;
        return eventData?.id || (typeof liveItem.meta?.eventId === 'string' ? liveItem.meta.eventId : null);
    }, [selectedSession?.id, eventData?.type, eventData?.id, liveItem.meta?.eventId]);

    const refreshSessionAttendance = useCallback(async () => {
        const targetEventId = resolveAttendanceTargetId();
        if (!targetEventId) {
            setIsAttended(false);
            return;
        }

        // Single-event ticket: USED means this event was already checked in.
        if (!isSeriesContainer && liveItem.status === 'USED') {
            setIsAttended(true);
            return;
        }

        try {
            const records = await AttendanceService.getAttendance(targetEventId);
            const mine = records.some((record) => isAttendanceForTicket(record, liveItem));
            setIsAttended(mine);
        } catch {
            // Keep prior state on transient failures
        }
    }, [resolveAttendanceTargetId, isSeriesContainer, liveItem]);

    useEffect(() => {
        void refreshSessionAttendance();
    }, [refreshSessionAttendance]);

    useEffect(() => {
        let cancelled = false;

        const refreshTicket = async () => {
            try {
                const latest = await EntitlementService.getWalletItemById(item.id);
                if (!cancelled && latest) {
                    const becameUsed =
                        latest.status === 'USED' &&
                        liveItem.status !== 'USED';
                    setLiveItem(latest);
                    if (becameUsed) {
                        window.dispatchEvent(new CustomEvent(WALLET_REFRESH_EVENT));
                    }
                }
            } catch {
                // best effort
            }
        };

        void refreshTicket();
        const unsubscribeAttendance = subscribeAttendanceUpdated((payload) => {
            const targetId = resolveAttendanceTargetId();
            const matchesCurrent =
                payload.eventId === targetId ||
                payload.eventId === liveItem.meta?.eventId ||
                payload.eventId === selectedSession?.id;
            if (!matchesCurrent) return;
            void refreshTicket();
            void refreshSessionAttendance();
        });
        const intervalId = window.setInterval(() => {
            void refreshTicket();
        }, 8000);

        return () => {
            cancelled = true;
            unsubscribeAttendance();
            window.clearInterval(intervalId);
        };
    }, [
        item.id,
        liveItem.meta?.eventId,
        liveItem.status,
        selectedSession?.id,
        resolveAttendanceTargetId,
        refreshSessionAttendance,
    ]);

    // 2. Determine Display Context (Master Event or Selected Session)
    const activeContext = selectedSession || eventData;
    const mode = activeContext?.locationMode || liveItem.meta?.locationMode || 'OFFLINE';
    const activeContextTime = resolveEventDisplayTime(
        activeContext ?? undefined,
        typeof liveItem.meta?.time === 'string' ? liveItem.meta.time : undefined,
    );
    const activeContextStart = useMemo(
        () => parseEventStart(activeContext?.date || liveItem.expiryDate, activeContextTime),
        [activeContext?.date, activeContextTime, liveItem.expiryDate],
    );
    const joinWindowStart = useMemo(() => {
        if (!activeContextStart) return null;
        return new Date(activeContextStart.getTime() - 60 * 60 * 1000);
    }, [activeContextStart]);
    const canJoinOnlineSession = useMemo(() => {
        if (!joinWindowStart) return true;
        return Date.now() >= joinWindowStart.getTime();
    }, [joinWindowStart]);
    
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
        const link = activeContext?.onlineMeetingLink || liveItem.meta?.onlineMeetingLink;

        if (!canJoinOnlineSession) {
            showToast("Join session becomes available 1 hour before the event starts.", "info");
            return;
        }

        if (!link) {
            showToast("Meeting link is not available yet. Please check back later.", "error");
            return;
        }

        setIsJoining(true);
        
        try {
            // Record attendance for the specific session ID if available
            const memberId = liveItem.userId;
            const attendanceMember: Member = {
                id: memberId,
                name: liveItem.meta?.recipientName || 'User',
                email: liveItem.meta?.recipientEmail || '',
                phone: '',
                category: 'Member',
                scholarship: false,
                joinMonth: '',
                program: '',
                mentorshipDuration: 0,
                nTagStatus: '',
                platform: 'Digital',
                regInUS: false,
                lifecycleStage: 'IDENTIFIED',
            };

            // Use active context (session) ID for accurate logging
            const targetEventId = activeContext?.id || liveItem.meta?.eventId || '';
            const attendanceEvent = {
                id: targetEventId,
                name: activeContext?.name || liveItem.title,
            } as Event;

            await AttendanceService.recordAttendance(attendanceMember, attendanceEvent, 'LINK_CLICKED');
            setIsAttended(true);
        } catch (e) {
            console.warn("Auto-attendance failed, proceeding to link anyway", e);
            showToast("Attendance could not be recorded automatically. You can still join the session.", "info");
        }

        setTimeout(() => {
            openSecureLink(link);
            setIsJoining(false);
        }, 800);
    };

    const handleSelectSession = (session: Event) => {
        setSelectedSession(session);
        setIsAttended(false);
        // Auto switch tab based on session type
        if (session.locationMode === 'ONLINE') setActiveTab('VIRTUAL');
        else setActiveTab('ACCESS');
    };

    const handleBackToSeries = () => {
        setSelectedSession(null);
        setIsAttended(false);
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
        canJoinOnlineSession,
        joinWindowStart,
        eventStart: activeContextStart,
        handleSelectSession,
        handleBackToSeries,
        openSecureLink, // Exported for use in UI
        isJoining,
        isAttended,
        item: liveItem,
        displayDate: activeContext?.date || liveItem.expiryDate,
        displayTime: resolveEventDisplayTime(
            activeContext ?? undefined,
            typeof liveItem.meta?.time === 'string' ? liveItem.meta.time : undefined,
        ),
        displayLocation: activeContext?.location || liveItem.meta?.location,
        displayTitle: activeContext?.name || liveItem.title,
        locationMapLink: activeContext?.locationMapLink || liveItem.meta?.locationMapLink
    };
};
