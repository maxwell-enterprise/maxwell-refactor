
import { ReactNode } from 'react';

export interface EventTierDefinition {
    id: string;
    name: string;
    masterCode?: string;
    quota: number;
    quotaSold?: number;
    price?: number;
    grantTagIds: string[];
    bundledTiers?: { eventId: string, eventName: string, tierId: string, tierName: string }[];
}

export type EventType = 'SOLO' | 'CONTAINER' | 'SESSION';

export interface EventInvitation {
    id: string;
    eventId: string;
    eventName: string;
    tierId?: string;   
    tierName?: string; 
    memberId: string;
    memberName: string;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
    validUntil: string;
    sentAt: string;
    sentBy: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  CRM = 'CRM',
  LEADS = 'LEADS',
  PAID_CONVERSIONS = 'PAID_CONVERSIONS',
  FINANCE = 'FINANCE',
  OPERATIONS = 'OPERATIONS',
  EVENTS_ADMIN = 'EVENTS_ADMIN',
  CERTIFICATION_GRID = 'CERTIFICATION_GRID',
  CERTIFICATION_RULES = 'CERTIFICATION_RULES',
  TAG_MANAGEMENT = 'TAG_MANAGEMENT',
  CONTRACTS = 'CONTRACTS',
  STORE_ADMIN = 'STORE_ADMIN',
  MARKETING = 'MARKETING',
  COMMUNICATION = 'COMMUNICATION',
  SECURITY = 'SECURITY',
  DB_SCHEMA = 'DB_SCHEMA',
  AUTOMATION_QUEUE = 'AUTOMATION_QUEUE',
  AI_USAGE = 'AI_USAGE',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  GAMIFICATION = 'GAMIFICATION',
  COMMISSION_CONFIG = 'COMMISSION_CONFIG',
  YOUTH_ADMIN = 'YOUTH_ADMIN',
  MY_TRIBE = 'MY_TRIBE',
  CMS_ADMIN = 'CMS_ADMIN',
  AUTOMATION_CENTER = 'AUTOMATION_CENTER',
  ATTENDANCE_CONSOLE = 'ATTENDANCE_CONSOLE',
  MY_TASKS = 'MY_TASKS',
  WALLET = 'WALLET',
  STORE_CATALOG = 'STORE_CATALOG',
  EVENT_MARKETPLACE = 'EVENT_MARKETPLACE',
  ENABLEMENT = 'ENABLEMENT',
  AI_COACH = 'AI_COACH',
  SETTINGS = 'SETTINGS',
  GATE_SCANNER = 'GATE_SCANNER',
  MEMBER_ATTENDANCE = 'MEMBER_ATTENDANCE'
}

export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  FINANCE = 'Finance',
  OPERATIONS = 'Operations',
  MARKETING = 'Marketing',
  SALES = 'Sales',
  FACILITATOR = 'Facilitator',
  GATE_KEEPER = 'Gate Keeper',
  MEMBER = 'Member',
  GUEST = 'Guest'
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  roles?: UserRole[];
  customRole?: {
    id: string;
    name: string;
    allowedFeatures: string[];
    createdAt: string;
    locked: true;
  } | null;
  activeCustomRoleId?: string | null;
  avatarUrl?: string;
  phone?: string;
  jobTitle?: string;
  company?: string;
  domicile?: string;
  instagram?: string;
  linkedinUrl?: string;
  provider: 'email' | 'google';
}

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: ReactNode;
  color: string;
}

export type LifecycleStage = 'GUEST' | 'IDENTIFIED' | 'PARTICIPANT' | 'MEMBER' | 'CERTIFIED' | 'FACILITATOR';

export interface SocialProfile {
    igVerified: boolean;
    igFollowers: number; // 0 if unknown
    businessAccounts: string[];
    occupation: string;
    businessType: string;
    communities: string[];
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  scholarship: boolean;
  joinMonth: string;
  program: string;
  mentorshipDuration: number;
  nTagStatus: string;
  platform: string;
  regInUS: boolean;
  lifecycleStage: LifecycleStage;
  company?: string;
  jobTitle?: string;
  industry?: string;
  tags?: string[];
  address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
  };
  socialProfile?: SocialProfile; // New Field for Stalking Data
  birthDate?: string;
  gender?: string;
  linkedinUrl?: string;
  serviceLevel?: string;
  achievements?: any[]; 
  earnedDoneTags?: string[];
  engagement?: {
      lastActiveDate: string;
      eventsAttendedCount: number;
      contentCompletionRate: number;
      communityReputationScore: number;
      leadScore: number;
  };
  notes?: string;
}

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface SupportTicket {
  id: string;
  memberId: string;
  memberName: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedRole: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  legacy_id?: string;
  date: string;
  type: 'PO' | 'Expense' | 'Royalty';
  description: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Paid';
  eventId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperationalSession {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
}

export interface EventGateConfig {
    id: string;
    name: string; 
    allowedTiers: string[];
    assignedUserIds: string[];
    isActive: boolean;
}

export type AdmissionPolicy = 'PRE_BOOKED' | 'OPEN_MEMBER' | 'OPEN_PUBLIC' | 'ON_SITE_DEDUCTION' | 'INVITED_ONLY';

export interface EventSelectionConfig {
    mode: 'BUNDLE' | 'OPTION'; 
    minSelect: number;
    maxSelect: number;
}

export type LocationMode = 'OFFLINE' | 'ONLINE' | 'HYBRID';

export interface Event {
  id: string;
  name: string;
  date: string;
  endDate?: string;
  time?: string;
  location: string;
  locationMode: LocationMode;
  onlineMeetingLink?: string;
  locationMapLink?: string;
  banner_url?: string;
  description?: string;
  capacity: number;
  attendees: number;
  revenue: number;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  isVisibleInCatalog?: boolean;
  type: EventType;
  parentEventId?: string;
  classId?: string;
  admissionPolicy: AdmissionPolicy;
  creditTags: string[];
  doneTag?: string;
  isRecurring?: boolean;
  recurringMeta?: {
      frequency: string;
      patternDescription: string;
      time: string;
      totalSessions: number;
  };
  selectionConfig?: EventSelectionConfig;
  gates?: EventGateConfig[]; 
  tiers?: EventTierDefinition[];
  sessions?: OperationalSession[];
}

export type ProductEntitlementType =
  | 'PHYSICAL'
  | 'TICKET'
  | 'EVENT_CREDIT'
  | 'DIGITAL_LINK'
  | 'RECURRING_PASS'
  | 'TOKEN'
  | 'CREDIT'
  | 'FLEX_CREDIT'
  | 'WALLET_CREDIT';

export interface ProductItem {
    id: string;
    name: string;
    type: ProductEntitlementType;
    quantity: number;
    meta?: any; 
}

export interface ProductVariant {
    id: string;
    name: string;
    priceIdr: number;
    items: ProductItem[]; 
}

export interface InstallmentConfig {
    enabled: boolean;
    minDownPaymentPercent: number;
    maxTenorMonths: number;
    interestRatePercent: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  priceIdr: number;
  compareAtPriceIdr?: number;
  category: 'Packages' | 'Certification' | 'Upgrade' | 'Merchandise' | 'Digital' | 'Token';
  imageUrl: string;
  items: ProductItem[];
  hasVariants: boolean;
  variants?: ProductVariant[];
  installmentConfig?: InstallmentConfig;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUNDLE_VOLUME';
export type DiscountScope = 'GLOBAL' | 'CATEGORY_SPECIFIC' | 'Product_SPECIFIC' | 'EVENT_SPECIFIC' | 'USER_ROLE_SPECIFIC' | 'ABAC_COMPLEX';

export interface Discount {
  id: string;
  code: string;
  title: string;
  description: string;
  type: DiscountType;
  value: number;
  scope: DiscountScope;
  targetIds?: string[]; 
  validFrom: string;
  validUntil: string;
  maxUsageLimit?: number;
  currentUsageCount: number;
  maxBudgetLimit?: number;
  currentBudgetBurned: number;
  isFeatured?: boolean;
  conditions?: any; 
  minQty?: number;
}

export interface InstallmentSchedule {
  id: string;
  dueDate: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidAt?: string;
}

export type PaymentMethodType = 'BANK_TRANSFER' | 'VIRTUAL_ACCOUNT_BCA' | 'QRIS' | 'CREDIT_CARD';
export type PaymentStatus = 'PENDING' | 'WAITING_FOR_VERIFICATION' | 'PAID' | 'EXPIRED' | 'FAILED' | 'PARTIAL' | 'OVERPAID' | 'REFUNDED';

export interface RefundRecord {
  id: string;
  amount: number;
  reason: string;
  processedAt: string;
  status: 'PROCESSED' | 'PENDING';
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  amount: number;
  discountAmount?: number;
  uniqueCode?: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  installmentPlan?: InstallmentSchedule[];
  refunds?: RefundRecord[];
  method: PaymentMethodType;
  status: PaymentStatus;
  createdAt: string;
  expiryTime: string;
  customerEmail: string;
  attributionSource?: string;
  virtualAccountNumber?: string;
  qrisUrl?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  proofOfPaymentUrl?: string;
  itemsSnapshot?: { id: string; name: string; price: number; quantity: number; variantId?: string }[];
}

export interface InitiatePaymentPayload {
  items: { id: string; name: string; price: number; quantity: number; variantId?: string }[];
  subTotal: number;
  tax: number;
  discountCode?: string;
  discountAmount?: number;
  totalAmount: number;
  customerEmail: string;
  method: PaymentMethodType;
  attributionSource?: string;
  isInstallment?: boolean;
  downPaymentAmount?: number;
}

export type CampaignCategory = 'SOCIAL_MEDIA' | 'EMAIL_BLAST' | 'OFFLINE_EVENT' | 'PODCAST' | 'PARTNER_REFERRAL' | 'OTHER';

export interface Campaign {
  id: string;
  name: string;
  sourceCode: string; // UTM Source
  category: CampaignCategory;
  targetProductId?: string;
  linkedDiscountCode?: string;
  generatedLink: string;
  createdAt: string;
  clicks: number;
  conversions: number;
  revenue: number;
}

export type ContentType = 'ARTICLE' | 'ADVERTISEMENT' | 'NEWS';
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SCHEDULED';

export interface ContentPostStats {
    views: number;
    shares: number;
    clicks: number;
    conversions: number;
    revenueAttributed: number;
}

export interface ContentPost {
    id: string;
    title: string;
    slug: string;
    body: string;
    imageUrl?: string;
    type: ContentType;
    status: ContentStatus;
    publishDate: string; // ISO
    unpublishDate?: string; // ISO
    linkedProductId?: string;
    ctaLabel?: string;
    author: string;
    tags: string[];
    stats: ContentPostStats;
}

export interface SystemConfig {
  payment: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}

export interface EmailTemplate {
    id: string;
    name: string;
    category: 'TRANSACTIONAL' | 'MARKETING' | 'SYSTEM';
    subject: string;
    body: string; // HTML
    variables: string[];
    linkedTriggerId?: string;
}

export interface EmailCampaign {
    id: string;
    name: string;
    subject: string;
    body: string;
    status: 'DRAFT' | 'SCHEDULED' | 'SENT';
    triggerType: 'IMMEDIATE' | 'SCHEDULED' | 'SYSTEM_EVENT';
    scheduledAt?: string;
    eventRelativeConfig?: { eventId: string, offsetHours: number };
    audienceFilter: { category?: string, lifecycleStage?: string, eventId?: string };
    attachments?: EmailAttachment[];
    stats: { sent: number, opened: number, clicked: number, createdAt: string };
    createdAt: string;
    createdBy: string;
}

export interface EmailLog {
    id: string;
    templateId?: string;
    campaignId?: string;
    recipientEmail: string;
    subject: string;
    sentAt: string;
    status: 'SUCCESS' | 'FAILED' | 'BOUNCED';
    openedAt?: string;
    metadata?: any;
}

export interface EmailAttachment {
    id: string;
    name: string;
    type: 'STATIC_FILE' | 'DYNAMIC_PDF';
    url?: string;
    pdfTemplateId?: string;
}

export type PDFOrientation = 'PORTRAIT' | 'LANDSCAPE';

export interface PDFElement {
    id: string;
    type: 'TEXT' | 'IMAGE' | 'VARIABLE' | 'QR';
    content: string; // Text or URL or Variable Key
    x: number; // Percentage
    y: number; // Percentage
    width?: number;
    height?: number;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    align?: 'left' | 'center' | 'right';
}

export interface PDFPage {
    id: string;
    pageNumber: number;
    backgroundImageUrl?: string;
    elements: PDFElement[];
}

export interface PDFTemplate {
    id: string;
    name: string;
    category: 'CERTIFICATE' | 'INVOICE' | 'TICKET' | 'REPORT';
    orientation: PDFOrientation;
    pages: PDFPage[];
}

export interface SMTPConfig {
    provider: 'SENDGRID' | 'MAILGUN' | 'SMTP';
    host?: string;
    port?: number;
    user?: string;
    apiKey?: string;
    senderEmail: string;
    senderName: string;
}

export type WAUIContext = 
    | 'GENERAL' 
    | 'CRM_MEMBER_LIST' 
    | 'LEADS_PIPELINE' 
    | 'OPS_LOGISTICS' 
    | 'FINANCE_COMMISSION' 
    | 'EVENT_ATTENDANCE' 
    | 'TRIBE_MEMBER' 
    | 'LEGAL_CONTRACT'
    | 'YOUTH_SCHOOL';

export type WATaskCategory = 'REGISTRATION' | 'PAYMENT_REMINDER' | 'EVENT_INFO' | 'MARKETING' | 'GENERAL' | 'FINANCE' | 'LOGISTICS' | 'ENGAGEMENT' | 'LEGAL' | 'CRM' | 'ONBOARDING' | 'EVENT';

export type WATaskStatus = 'PENDING' | 'CLICKED' | 'ARCHIVED';

export interface WhatsAppTask {
    id: string;
    recipientName: string;
    recipientPhone: string;
    message: string;
    category: WATaskCategory;
    status: WATaskStatus;
    createdAt: string;
    metadata?: any;
}

export interface WhatsAppTemplate {
    id: string;
    category: WATaskCategory;
    label: string;
    message: string;
    variables: string[];
    isDefault: boolean;
    linkedTriggerId?: string;
    uiContext?: WAUIContext[]; 
}

export interface KnowledgeArticle {
    id: string;
    title: string;
    category: 'BUSINESS' | 'SYSTEM' | 'EVENT_RECAP' | 'WORKSHEET';
    summary: string;
    content: string;
    readTimeMin: number;
    isFeatured: boolean;
    linkedEventId?: string;
}

export interface QuizQuestion {
    id: string;
    text: string;
    options: string[];
    correctOptionIndex: number;
}

export interface Quiz {
    id: string;
    title: string;
    description: string;
    linkedEventId?: string;
    questions: QuizQuestion[];
    passingScore: number; // Percentage
}

export interface QuizAttempt {
    id: string;
    quizId: string;
    userId: string;
    score: number;
    passed: boolean;
    completedAt: string;
    eventId?: string;
}

export interface JourneyEvent {
    id: string;
    date: string;
    userId: string;
    category: 'ACQUISITION' | 'ENGAGEMENT' | 'COMMERCE' | 'MARKETING' | 'SYSTEM' | 'MENTORING';
    title: string;
    description: string;
    metadata?: any;
}

export interface LeadScore {
    willingness: number; // 1-5
    capacity: number; // 1-5
    tags: string[];
    recommendedProduct?: string;
}

export interface ScoutSession {
    id: string;
    leadName: string;
    leadEmail: string;
    createdAt: string;
    messages: { sender: 'user' | 'ai', text: string, timestamp: number }[];
    score: LeadScore;
    status: 'ACTIVE' | 'COMPLETED';
}

export type InventoryMovementType = 'GR' | 'GI' | 'ADJUSTMENT' | 'INITIAL'; 

export interface InventoryItem {
    sku: string;
    name: string;
    category: string;
    stock: number;
    reorderLevel: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
    price: number;
}

export interface InventoryTransaction {
    id: string;
    sku: string;
    type: InventoryMovementType;
    quantity: number;
    balanceAfter: number;
    reference: string;
    performedBy: string;
    timestamp: string;
}

export interface AttendanceRecord {
    id: string;
    eventId: string;
    eventName: string;
    memberId: string;
    memberName: string;
    memberEmail: string;
    scannedAt: string;
    method: 'GATE_SCAN' | 'SELF_SCAN' | 'ADMIN_OVERRIDE' | 'LINK_CLICKED';
    verificationCode: string;
    eventColor: string;
    gateId?: string;
    sessionId?: string; 
    ticketTier?: string;
    status?: 'SUCCESS' | 'DUPLICATE' | 'INVALID' | 'SYNC_PENDING';
    ticketUniqueId?: string; 
    scannerDevice?: string;
}

export interface AIUsageLog {
    id: string;
    timestamp: string;
    userId: string;
    featureName: string;
    model: string;
    prompt: string;
    response: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUSD: number;
    costIDR: number;
}

export interface WalletItem {
    id: string;
    userId: string;
    type: 'MEMBERSHIP' | 'TICKET' | 'CREDIT_PASS' | 'DIGITAL_CONTENT' | 'PHYSICAL_ORDER';
    title: string;
    subtitle: string;
    expiryDate?: string;
    qrData?: string; 
    status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'GIFTED' | 'GIFT_PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'PENDING_CLAIM' | 'CLAIMED';
    isTransferable?: boolean; 
    sponsoredBy?: string; 
    meta?: {
        eventId?: string;
        location?: string;
        locationMode?: LocationMode;
        onlineMeetingLink?: string;
        locationMapLink?: string;
        creditTag?: string;
        targetTier?: string;
        recipientName?: string;
        recipientEmail?: string;
        recipientPhone?: string;
        [key: string]: any;
    };
}
