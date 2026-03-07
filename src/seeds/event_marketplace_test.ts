
import { Event } from '../types/index';
import { WalletItem } from '../types/access';

// 1. Future Events valid for redemption
export const SEED_MARKETPLACE_EVENTS: Event[] = [
    {
        id: 'EVT-MKT-001',
        name: 'Leadership Masterclass: Visionary Thinking',
        date: '2026-10-15',
        time: '09:00 - 16:00',
        location: 'Grand Ballroom, Jakarta',
        locationMode: 'OFFLINE',
        capacity: 100,
        attendees: 20,
        revenue: 0,
        status: 'Upcoming',
        type: 'SOLO',
        admissionPolicy: 'PRE_BOOKED',
        creditTags: ['FLEX_CREDIT_2026', 'SERIES_2026_FULL'],
        banner_url: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=1000'
    },
    {
        id: 'EVT-MKT-002',
        name: 'Online Workshop: Digital Influence',
        date: '2026-11-05',
        time: '19:00 - 21:00',
        location: 'Zoom',
        locationMode: 'ONLINE',
        capacity: 500,
        attendees: 50,
        revenue: 0,
        status: 'Upcoming',
        type: 'SESSION',
        admissionPolicy: 'PRE_BOOKED',
        creditTags: ['FLEX_CREDIT_2026'],
        banner_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1000'
    },
    {
        id: 'EVT-MKT-003',
        name: 'Networking Night: Founders Circle',
        date: '2026-12-01',
        time: '18:00 - 22:00',
        location: 'Rooftop Lounge',
        locationMode: 'OFFLINE',
        capacity: 50,
        attendees: 5,
        revenue: 0,
        status: 'Upcoming',
        type: 'SOLO',
        admissionPolicy: 'PRE_BOOKED',
        creditTags: ['VIP_ACCESS_ONLY'], // Special tag
        banner_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1000'
    }
];

// 2. Test Wallet for Marketplace User
export const SEED_MARKETPLACE_WALLET: WalletItem[] = [
    {
        id: 'W-MKT-001',
        userId: 'M-MARKET-TEST',
        type: 'CREDIT_PASS',
        title: 'Universal Flex Pass 2026',
        subtitle: '5 Credits Remaining',
        status: 'ACTIVE',
        isTransferable: true,
        expiryDate: '2026-12-31',
        meta: { credits: 5, total: 5, tag: 'FLEX_CREDIT_2026' }
    },
    {
        id: 'W-MKT-002',
        userId: 'M-MARKET-TEST',
        type: 'TICKET',
        title: 'Draft Ticket (Unassigned)',
        subtitle: 'Leadership Masterclass',
        status: 'ACTIVE', // Active but unused
        isTransferable: true,
        expiryDate: '2026-10-15',
        meta: { 
            eventId: 'EVT-MKT-001', 
            recipientHint: 'Unassigned / Draft' 
        }
    }
];
