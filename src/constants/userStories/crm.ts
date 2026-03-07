
import { UserStory } from '../../types/schemaOptimizer';

export const CRM_STORIES: UserStory[] = [
  {
    id: 'US-CRM-01',
    epic: 'CRM',
    role: 'Sales Executive',
    intent: 'track the source of every lead',
    benefit: 'calculate Marketing ROI per channel',
    text: 'As a Sales Executive, I want to track the source of every lead (e.g. Instagram, Referral) so that I can calculate Marketing ROI per channel.'
  },
  {
    id: 'US-CRM-02',
    epic: 'CRM',
    role: 'Admin',
    intent: 'merge duplicate member profiles',
    benefit: 'maintain a clean database',
    text: 'As an Admin, I want to detect and merge duplicate member profiles based on email or phone number so that we maintain a single source of truth.'
  },
  {
    id: 'US-CRM-03',
    epic: 'CRM',
    role: 'Account Manager',
    intent: 'see the full interaction history',
    benefit: 'provide personalized service',
    text: 'As an Account Manager, I want to see a timeline of all tickets, purchases, and event attendance for a member so that I can provide personalized service.'
  }
];
