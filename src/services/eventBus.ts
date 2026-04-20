
import { SystemTriggerType } from '../types/ops';
import { PointTriggerType } from '../types/gamification';
import { WhatsAppService } from './whatsappService';
import { OpsService } from './opsService';
import { GamificationService } from './gamificationService';
import { AutomationQueueService } from './automationQueueService';

const safe = async (label: string, fn: () => Promise<void>): Promise<void> => {
    try {
        await fn();
    } catch (e) {
        console.warn(`[EVENT BUS] ${label} skipped:`, e instanceof Error ? e.message : e);
    }
};

/**
 * THE EVENT BUS
 * Acts as the central dispatcher. When a business event occurs (e.g. Payment),
 * this service notifies all interested subscribers (WA, Ops, Gamification, etc).
 */
export const EventBus = {
    
    emit: async (eventId: SystemTriggerType, payload: any) => {
        console.log(`⚡ [EVENT BUS] Fired: ${eventId}`, payload);

        const memberKey = String(
            payload.memberId || payload.userId || '',
        ).trim();
        /** Rules use PURCHASE_COMPLETE; PAYMENT_SUCCESS is only on the commerce bus. */
        const gamificationTrigger: PointTriggerType =
            eventId === 'PAYMENT_SUCCESS'
                ? 'PURCHASE_COMPLETE'
                : (eventId as unknown as PointTriggerType);

        // We use Promise.allSettled so one failure doesn't stop others; each branch is also wrapped.
        await Promise.allSettled([
            safe('WhatsApp automation', () =>
                WhatsAppService.processSystemTrigger(
                    eventId,
                    {
                        name: payload.name || payload.member_name || 'Member',
                        phone: payload.phone || '',
                    },
                    payload,
                ),
            ),

            safe('Ops automation', () =>
                OpsService.handleSystemTrigger(eventId, payload),
            ),

            safe('Gamification', async () => {
                if (!memberKey) return;
                await GamificationService.processTrigger(
                    memberKey,
                    gamificationTrigger,
                    payload,
                );
            }),

            safe('Automation queue', async () => {
                if (
                    !['PAYMENT_SUCCESS', 'NEW_MEMBER_REGISTRATION'].includes(
                        eventId,
                    )
                ) {
                    return;
                }
                await AutomationQueueService.addToQueue(
                    eventId,
                    payload,
                    `Event Bus Trigger: ${eventId}`,
                );
            }),
        ]);
    }
};
