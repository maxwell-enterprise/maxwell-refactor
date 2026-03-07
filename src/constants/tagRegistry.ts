
import { TagDefinition } from '../types/access';

/**
 * TAG REGISTRY (MASTER CONFIGURATION)
 * This acts as the "Brain" for the Access Control system.
 * It maps the string tags found in Events to actual logic.
 */
export const TAG_REGISTRY: TagDefinition[] = [
    // --- UNLIMITED ACCESS TAGS (Like a Badge) ---
    {
        id: 'SERIES_2025_FULL',
        description: 'Annual Pass Holder - Unlimited Access to all Series Events',
        usageType: 'UNLIMITED_ACCESS'
    },
    {
        id: 'IMC_VIP_ACCESS',
        description: 'VIP Badge for Conference',
        usageType: 'UNLIMITED_ACCESS'
    },
    {
        id: 'ACCESS_PRAYER',
        description: 'Open Access to Prayer Meetings',
        usageType: 'UNLIMITED_ACCESS'
    },
    
    // --- CONSUMABLE TAGS (Like a Punch Card) ---
    {
        id: 'TICKET_JAN_25',
        description: 'Single Entry Ticket for January',
        usageType: 'CONSUMABLE_CREDIT',
        defaultDeduction: 1
    },
    {
        id: 'TICKET_GALA_25',
        description: 'Single Entry for Gala Dinner',
        usageType: 'CONSUMABLE_CREDIT',
        defaultDeduction: 1
    },
    // Generic Credit Tag used by Bundles (e.g. "Buy 5 Get 1 Free")
    {
        id: 'FLEX_CREDIT_2025',
        description: 'Flexible Credit for any Standard Class',
        usageType: 'CONSUMABLE_CREDIT',
        defaultDeduction: 1
    }
];

export const getTagDefinition = (tagId: string): TagDefinition => {
    return TAG_REGISTRY.find(t => t.id === tagId) || {
        id: tagId,
        description: 'Unknown Tag - Defaulting to Consumable',
        usageType: 'CONSUMABLE_CREDIT', // Fail-safe: Default to consumable to prevent revenue leakage
        defaultDeduction: 1
    };
};
