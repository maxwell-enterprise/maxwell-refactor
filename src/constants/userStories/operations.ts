
import { UserStory } from '../../types/schemaOptimizer';

export const OPERATIONS_STORIES: UserStory[] = [
  {
    id: 'US-OPS-01',
    epic: 'OPERATIONS',
    role: 'Gate Keeper',
    intent: 'scan QR codes offline',
    benefit: 'process attendees quickly even with bad internet',
    text: 'As a Gate Keeper, I want to scan ticket QR codes and validate entry tier even if the internet is unstable.'
  },
  {
    id: 'US-OPS-02',
    epic: 'OPERATIONS',
    role: 'Ops Manager',
    intent: 'define workflow templates',
    benefit: 'standardize processes for new product launches',
    text: 'As an Ops Manager, I want to define reusable workflow templates (SOPs) that automatically create task lists when a specific product is sold.'
  }
];
