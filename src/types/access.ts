export type Entitlement = 
  | 'CONTENT_LIBRARY_ACCESS'    // Standard LMS Access
  | 'LIVE_STREAM_ACCESS'        // Webinar Access
  | 'VIP_NETWORKING'            // High-tier community
  | 'CORPORATE_ADMIN'           // Can manage team seats (B2B)
  | 'DISCOUNT_VIP'              // Automatic pricing adjustments
  | 'CERTIFICATION_EXAM';       // Access to take exams

// 1. LIFECYCLE (STATE PROGRESSION)
export type LifecycleStage = 
  | 'GUEST'       // Anonymous
  | 'IDENTIFIED'  // Email/ID exists, no participation
  | 'PARTICIPANT' // Actively joins free events
  | 'MEMBER'      // Has purchased product/subscription
  | 'CERTIFIED'   // Completed official certification
  | 'FACILITATOR'; // Delegated authority

// 2. ENGAGEMENT (BEHAVIORAL SIGNALS - NEVER ACCESS)
export interface EngagementAttributes {
  lastActiveDate: string;
  eventsAttendedCount: number;
  contentCompletionRate: number; // 0-100
  communityReputationScore: number; // 0-1000
  leadScore: number; // AI Calculated
}

// 3. AUTHORITY (DELEGATED TRUST)
export interface AuthorityAttributes {
  canSellPrograms: boolean;
  canCoachUsers: boolean;
  canVerifyCertifications: boolean;
  maxDiscountAuthority: number; // Percentage they can offer others
  managedOrganizationId?: string; // ID of the org they govern
}

// 4. SERVICE LEVEL (QoS & PRESTIGE) - NEW
export type ServiceLevel = 'STANDARD' | 'VIP' | 'PRESTIGE';

// PRIMARY USER ATTRIBUTE OBJECT
export interface UserAttributes {
  // Identity
  region: 'US' | 'ID' | 'SG';
  joinDate: string;
  company?: string; // NEW: Explicit company field for ABAC
  sponsorId?: string; 
  
  // The Core ABAC Pillars
  lifecycle: LifecycleStage;
  serviceLevel: ServiceLevel; // Defines Treatment (VIP)
  tags: string[]; // Flexible markers (e.g. "PARTNER", "FOUNDER")
  
  engagement: EngagementAttributes;
  authority: AuthorityAttributes;
}

export interface UserEntitlements {
  userId: string;
  permissions: Entitlement[]; // EXPLICIT CONTRACTS (What I bought)
  attributes: UserAttributes; // ATTRIBUTES (Who I am & What I do)
  credits: number; // Virtual currency
}

export interface CorporateTeamMember {
  id: string;
  email: string;
  name: string;
  status: 'ACTIVE' | 'INVITED' | 'REVOKED';
  joinedAt?: string;
  lastActive?: string;
}

// --- NEW: WALLET ITEMS (Moved from EntitlementService) ---
export interface WalletItem {
    id: string;
    userId: string; // Added link
    type: 'MEMBERSHIP' | 'TICKET' | 'CREDIT_PASS' | 'DIGITAL_CONTENT' | 'PHYSICAL_ORDER';
    title: string;
    subtitle: string;
    expiryDate?: string;
    qrData?: string; 
    // Fix: Added 'PENDING_CLAIM' and 'CLAIMED' to status to resolve type mismatch and comparison errors in entitlementService
    status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'GIFTED' | 'GIFT_PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'PENDING_CLAIM' | 'CLAIMED'; // Added Shipping statuses
    isTransferable?: boolean; 
    sponsoredBy?: string; // NEW: Name of the person who gifted this
    meta?: any; // Contains { credits: number, tag: string } for passes
}

// --- NEW: TAG REGISTRY DEFINITION (International Standard) ---
export type TagUsageType = 'UNLIMITED_ACCESS' | 'CONSUMABLE_CREDIT';

// This is the shape for the HARDCODED constant registry
export interface TagDefinition {
    id: string; // matches the creditTags string in Event
    description: string;
    usageType: TagUsageType;
    defaultDeduction?: number; // How much to deduct if consumable (usually 1)
}

// --- NEW: MASTER CREDIT TAG (Database Entity) ---
export interface CreditTagMaster {
    id: string;
    code: string; // The actual tag string (e.g. "VIP_2025")
    name: string; // Readable name
    description: string;
    type: TagUsageType;
    usageLimit: number; // 0 for unlimited, >0 for fixed credits
    isActive: boolean;
}

// --- NEW: GIFTING & SPONSORSHIP ---
export interface GiftAllocation {
    id: string;
    sourceUserId: string; // The Purchaser/Sponsor
    sourceUserName: string;
    entitlementId: string; // The specific wallet item ID being moved
    itemName: string;
    
    targetEmail?: string; // Optional: If sent specifically to an email
    claimToken: string; // The magic code
    
    status: 'PENDING' | 'CLAIMED' | 'REVOKED';
    claimedByUserId?: string; // The Recipient
    claimedAt?: string;
    createdAt: string;
}

// --- NEW: WALLET HISTORY LOG (For Ledger) ---
export interface WalletTransactionHistory {
    id: string;
    walletItemId: string;
    userId: string;
    transactionType: 'PURCHASE' | 'REDEMPTION' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'EXPIRY' | 'ADJUSTMENT' | 'USAGE';
    amountChange: number; // +5 or -1
    balanceAfter: number; // Snapshot of credits left
    referenceId?: string; // Event ID or Transaction ID
    referenceName?: string; // "IMC 2025" or "Order #123"
    timestamp: string;
}