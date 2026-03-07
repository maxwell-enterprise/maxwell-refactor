
import { Transaction, Discount } from '../types/index';

// Generating Transactions based on Key Members in Member Seed
export const TRANSACTIONS_DATA_SEED: Transaction[] = [
  // David Pratomo - Active Faculty
  { 
      id: 'PO-2023-DP-001', 
      date: '2023-03-15', 
      type: 'PO', 
      description: 'Store Sale: Full Access (Renewal) - David Pratomo', 
      amount: 35000000, 
      status: 'Paid',
      eventId: 'SERIES-2025'
  },
  // Julia Tan - Partner
  { 
      id: 'PO-2024-JT-002', 
      date: '2024-08-10', 
      type: 'PO', 
      description: 'Store Sale: Full Access - Julia Tan', 
      amount: 35000000, 
      status: 'Paid',
      eventId: 'SERIES-2025'
  },
  // Lydia - 1x105 Payment
  { 
      id: 'PO-2025-LY-003', 
      date: '2025-11-01', 
      type: 'PO', 
      description: 'Store Sale: MLCT PAYMENT 1X105 - Lydia', 
      amount: 105000000, 
      status: 'Paid',
      eventId: 'SERIES-2025'
  },
  // Robertus - Essentia (Ordered Tag)
  { 
      id: 'PO-2024-RH-004', 
      date: '2024-09-05', 
      type: 'PO', 
      description: 'Store Sale: Essentia Program - Robertus Haryanto', 
      amount: 15000000, 
      status: 'Paid'
  },
  // Operational Expenses
  { id: 'EXP-2025-001', date: '2025-01-10', type: 'Expense', description: 'Catering Vendor - Jan Summit', amount: 12500000, status: 'Approved', eventId: 'EVT-25-JAN' },
  { id: 'EXP-2025-002', date: '2025-02-12', type: 'Expense', description: 'Venue Rental - Feb Ballroom', amount: 45000000, status: 'Pending', eventId: 'EVT-25-FEB' },
  
  // Royalty
  { id: 'ROY-2024-Q4', date: '2024-12-31', type: 'Royalty', description: 'Q4 Royalty Provision - Maxwell US', amount: 450000000, status: 'Paid' }
];

export const DISCOUNT_DATA_SEED: Discount[] = [
  {
    id: "DSC-001",
    code: "WELCOME20",
    title: "New Member Welcome",
    description: "Get 20% off your first Certification Purchase",
    type: "PERCENTAGE",
    value: 20,
    scope: "CATEGORY_SPECIFIC",
    targetIds: ["Certification"],
    currentUsageCount: 45,
    maxUsageLimit: 100,
    currentBudgetBurned: 13500000,
    validFrom: "2025-01-01",
    validUntil: "2025-12-31",
    isFeatured: true
  }
];
