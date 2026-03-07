
import { SystemTriggerType } from '../types/ops';
import { WhatsAppService } from './whatsappService';
import { OpsService } from './opsService';
import { GamificationService } from './gamificationService';
import { AutomationQueueService } from './automationQueueService';
import { CommunicationService } from './communicationService';

/**
 * THE EVENT BUS
 * Acts as the central dispatcher. When a business event occurs (e.g. Payment),
 * this service notifies all interested subscribers (WA, Ops, Gamification, etc).
 */
export const EventBus = {
    
    emit: async (eventId: SystemTriggerType, payload: any) => {
        console.log(`⚡ [EVENT BUS] Fired: ${eventId}`, payload);

        // We use Promise.allSettled to ensure one failure doesn't stop others
        await Promise.allSettled([
            
            // 1. COMMUNICATION (WhatsApp Automation)
            // Checks if there is a WA Template linked to this trigger
            WhatsAppService.processSystemTrigger(eventId, {
                name: payload.name || payload.member_name || 'Member',
                phone: payload.phone || ''
            }, payload),

            // 2. OPERATIONS (SOP & Task Automation)
            // Checks if there are any Ops Tasks waiting for this event
            OpsService.handleSystemTrigger(eventId, payload),

            // 3. GAMIFICATION (Points & Badges)
            // Checks if this event awards points
            GamificationService.processTrigger(
                payload.memberId || payload.userId, 
                eventId as any, // Cast to PointTriggerType (Overlap exists)
                payload
            ),

            // 4. AUTOMATION QUEUE (Background Workers)
            // Adds to the admin visible queue for heavy tasks
            // Note: We only add specific heavy events to the visual queue to avoid clutter
            (['PAYMENT_SUCCESS', 'NEW_MEMBER_REGISTRATION'].includes(eventId)) 
                ? AutomationQueueService.addToQueue(eventId, payload, `Event Bus Trigger: ${eventId}`)
                : Promise.resolve()
        ]);
    }
};
