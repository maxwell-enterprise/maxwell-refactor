
import { MEMBER_DATA_SEED } from './seeds/members';
import { LEAD_DATA_SEED } from './seeds/leads'; // Import Leads
// import { EVENTS_DATA_SEED } from './seeds/events'; // DEPRECATED
import { EVENTS_HIERARCHY_SEED } from './seeds/events_hierarchy'; // NEW HIERARCHY
import { STORE_PRODUCTS_SEED, INVENTORY_DATA_SEED } from './seeds/products';
import { TRANSACTIONS_DATA_SEED, DISCOUNT_DATA_SEED } from './seeds/finance';
import { MOCK_TICKETS_SEED } from './seeds/support';
import { PUBLIC_PROGRAMS_SEED, PUBLIC_STORE_SEED, PUBLIC_ARTICLES_SEED } from './seeds/public';
import { WA_TASKS_SEED, WA_TEMPLATES_SEED } from './seeds/whatsapp';
import { SEED_ARTICLES, SEED_QUIZZES, SEED_ATTEMPTS } from './seeds/enablement';

// Re-exporting for backward compatibility with existing components
// MERGE: Members + Leads
export const MEMBER_DATA = [...MEMBER_DATA_SEED, ...LEAD_DATA_SEED];

// export const EVENTS_DATA = EVENTS_DATA_SEED; // OLD
export const EVENTS_DATA = EVENTS_HIERARCHY_SEED; // NEW SOURCE OF TRUTH

export const STORE_PRODUCTS = STORE_PRODUCTS_SEED;
export const INVENTORY_DATA = INVENTORY_DATA_SEED;
export const TRANSACTIONS_DATA = TRANSACTIONS_DATA_SEED;
export const DISCOUNT_DATA = DISCOUNT_DATA_SEED;
export const MOCK_TICKETS = MOCK_TICKETS_SEED;
export const PUBLIC_PROGRAMS = PUBLIC_PROGRAMS_SEED;
export const PUBLIC_STORE = PUBLIC_STORE_SEED;
export const PUBLIC_ARTICLES = PUBLIC_ARTICLES_SEED;
export const WA_TASKS = WA_TASKS_SEED;
export const WA_TEMPLATES = WA_TEMPLATES_SEED;

// Enablement / Success Toolkit
export const ENABLEMENT_ARTICLES = SEED_ARTICLES;
export const ENABLEMENT_QUIZZES = SEED_QUIZZES;
export const ENABLEMENT_ATTEMPTS = SEED_ATTEMPTS;

export const MONTH_ORDER = [
  "Mar 2024", "Apr 2024", "May 2024", "Jun 2024", "July 2024", "Aug 2024", "Sep 2024", "Oct 2024", "Nov 2024", "Dec 2024",
  "Jan 2025", "Feb 2025", "Mar 2025", "Apr 2025", "May 2025", "Jun 2025", "Jul 2025", "Aug 2025", "Sep 2025", "Oct 2025", "Nov 2025"
];
