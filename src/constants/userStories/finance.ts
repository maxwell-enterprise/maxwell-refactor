
import { UserStory } from '../../types/schemaOptimizer';

export const FINANCE_STORIES: UserStory[] = [
  {
    id: 'US-FIN-01',
    epic: 'FINANCE',
    role: 'Finance Manager',
    intent: 'split revenue automatically',
    benefit: 'pay royalties to IP owners accurately',
    text: 'As a Finance Manager, I want revenue from specific products to be automatically split into royalty ledgers so that IP owners are paid accurately.'
  },
  {
    id: 'US-FIN-02',
    epic: 'FINANCE',
    role: 'Finance Staff',
    intent: 'generate tax invoices (Faktur Pajak)',
    benefit: 'comply with Indonesian tax regulations',
    text: 'As a Finance Staff, I want to generate tax invoice details (NPWP, Address) linked to a transaction so that we comply with tax regulations.'
  },
  {
    id: 'US-FIN-03',
    epic: 'FINANCE',
    role: 'System',
    intent: 'prevent deletion of paid transactions',
    benefit: 'ensure audit integrity',
    text: 'As the System, I must prevent deletion or modification of any transaction marked as "PAID" to ensure financial audit integrity.'
  }
];
