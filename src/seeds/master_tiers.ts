
import { MasterTier } from '../types/reference';

export const SEED_MASTER_TIERS: MasterTier[] = [
    { id: 'GENERAL', name: 'General Admission', category: 'PAID', defaultColor: 'bg-slate-100 text-slate-600' },
    { id: 'VIP', name: 'VIP Access', category: 'PAID', defaultColor: 'bg-amber-100 text-amber-700' },
    { id: 'VVIP', name: 'VVIP / Executive', category: 'PAID', defaultColor: 'bg-purple-100 text-purple-700' },
    { id: 'CREW', name: 'Event Crew', category: 'STAFF', defaultColor: 'bg-blue-100 text-blue-700' },
    { id: 'SPEAKER', name: 'Speaker / Talent', category: 'STAFF', defaultColor: 'bg-green-100 text-green-700' },
    { id: 'MEDIA', name: 'Media / Press', category: 'COMPLIMENTARY', defaultColor: 'bg-pink-100 text-pink-700' },
    { id: 'SPONSOR', name: 'Sponsor', category: 'COMPLIMENTARY', defaultColor: 'bg-indigo-100 text-indigo-700' }
];
