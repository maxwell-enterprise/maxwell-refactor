
import { PointTriggerType } from '../types/gamification';
import { QrCode, ShoppingCart, Users, Clock, Flame } from 'lucide-react';

export interface TriggerDefinition {
    id: PointTriggerType;
    label: string;
    description: string;
    icon: any;
    defaultPoints: number;
}

export const GAMIFICATION_TRIGGERS: TriggerDefinition[] = [
    {
        id: 'EVENT_CHECK_IN',
        label: 'Event Attendance',
        description: 'Triggered when a user scans their ticket QR at the venue gate.',
        icon: QrCode,
        defaultPoints: 100
    },
    {
        id: 'EVENT_EARLY_ARRIVAL',
        label: 'Early Bird Arrival',
        description: 'Triggered if check-in occurs >30 mins before start time.',
        icon: Clock,
        defaultPoints: 50
    },
    {
        id: 'PURCHASE_COMPLETE',
        label: 'Store Purchase',
        description: 'Triggered when a payment is successfully verified. (Points usually scaled by amount).',
        icon: ShoppingCart,
        defaultPoints: 10
    },
    {
        id: 'REFERRAL_SUCCESS',
        label: 'Successful Referral',
        description: 'Triggered when a new user registers using a referral code.',
        icon: Users,
        defaultPoints: 200
    },
    {
        id: 'STREAK_3_EVENTS',
        label: '3-Event Streak',
        description: 'Triggered automatically when attendance history hits 3 consecutive events.',
        icon: Flame,
        defaultPoints: 150
    }
];
