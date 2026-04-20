
import { Member, Product, Transaction, PaymentTransaction, InventoryItem, InventoryTransaction, ContentPost, EmailTemplate, EmailCampaign, EmailLog, WhatsAppTask, WhatsAppTemplate, Event, CartItem, EventInvitation } from '../../types/index';
import { OpsChecklist, OpsTemplate } from '../../types/ops';
import { Badge, PointRule, UserGamificationProfile } from '../../types/gamification';
import { UserEntitlements, WalletItem, GiftAllocation, CorporateTeamMember, CreditTagMaster, WalletMemberHub, WalletTransactionHistory } from '../../types/access';
import { ActiveCart } from '../../services/cartService';

// NEW: Query Params for SQL-like filtering
export interface TransactionQueryParams {
    type?: 'PO' | 'Expense' | 'Royalty';
    status?: 'Pending' | 'Approved' | 'Paid';
    startDate?: string; // ISO String
    endDate?: string;   // ISO String
    limit?: number;
    offset?: number;
}

/**
 * `intent: 'create'` — POST only (avoids a spurious GET 404 before every new product).
 * `auto` / omit — GET by id, then PATCH if found else POST (updates & ambiguous saves).
 */
export type ProductUpsertOptions = {
  intent?: 'create' | 'auto';
};

/** Server-backed product listing (Nest `/products` supports page/limit/search/category). */
export interface ProductListQuery {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    sortBy?: 'title' | 'priceIdr' | 'category' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    /** When false, only active products; omit for admin views that need inactive rows too. */
    isActive?: boolean;
}

export interface IMemberRepository {
    getAll(): Promise<Member[]>;
    getById(id: string): Promise<Member | null>;
    /**
     * Server: GET /members?search=… (bounded). Mock/Supabase: filter client-side.
     * Used for My Zone / dashboards — never load the full members table for one row.
     */
    searchForMemberLookup(query: string): Promise<Member[]>;
    create(member: Member): Promise<void>;
    update(id: string, data: Partial<Member>): Promise<void>;
}

export interface IProductRepository {
    getAll(): Promise<Product[]>;
    listProducts(
        query: ProductListQuery,
    ): Promise<{ data: Product[]; total: number }>;
    getById(id: string): Promise<Product | null>;
    upsert(product: Product, options?: ProductUpsertOptions): Promise<Product>;
    delete(id: string): Promise<void>;
}

export interface IEventRepository {
    getAll(): Promise<Event[]>;
    getById(id: string): Promise<Event | null>;
    upsert(event: Event): Promise<Event>;
    delete(id: string): Promise<void>;
}

export interface IInvitationRepository {
    getMemberInvitations(memberId: string): Promise<EventInvitation[]>;
    createInvitations(invitations: EventInvitation[]): Promise<void>;
    updateInvitation(invitation: EventInvitation): Promise<void>;
    getAll(): Promise<EventInvitation[]>; // For admin view if needed
}

export interface ITransactionRepository {
    find(params?: TransactionQueryParams): Promise<Transaction[]>;
    getAll(): Promise<Transaction[]>;
    create(transaction: Transaction): Promise<void>;
    updateStatus(id: string, status: 'Pending' | 'Approved' | 'Paid'): Promise<void>;
}

export interface IPaymentRepository {
    getAll(): Promise<PaymentTransaction[]>;
    getById(id: string): Promise<PaymentTransaction | null>;
    create(transaction: PaymentTransaction): Promise<PaymentTransaction>;
    update(transaction: PaymentTransaction): Promise<void>;
    updateStatus(id: string, status: string): Promise<void>;
}

export interface IInventoryRepository {
    getAll(): Promise<InventoryItem[]>;
    upsert(item: InventoryItem): Promise<void>;
    getTransactions(): Promise<InventoryTransaction[]>;
    logTransaction(tx: InventoryTransaction): Promise<void>;
}

export interface IWorkflowRepository {
    getTemplates(): Promise<OpsTemplate[]>;
    saveTemplate(template: OpsTemplate): Promise<void>;
    deleteTemplate(id: string): Promise<void>;
    getChecklists(): Promise<OpsChecklist[]>;
    getChecklistById(id: string): Promise<OpsChecklist | undefined>;
    saveChecklist(checklist: OpsChecklist): Promise<void>;
}

export interface IGamificationRepository {
    getBadges(): Promise<Badge[]>;
    upsertBadge(badge: Badge): Promise<void>;
    getRules(): Promise<PointRule[]>;
    upsertRule(rule: PointRule): Promise<void>;
    getProfile(userId: string): Promise<UserGamificationProfile | null>;
    getAllProfiles(): Promise<UserGamificationProfile[]>;
    upsertProfile(profile: UserGamificationProfile): Promise<void>;
}

export interface IContentRepository {
    getAll(): Promise<ContentPost[]>;
    create(post: ContentPost): Promise<ContentPost>;
    update(id: string, updates: Partial<ContentPost>): Promise<ContentPost | null>;
    delete(id: string): Promise<void>;
}

export interface ICommunicationRepository {
    getTemplates(): Promise<EmailTemplate[]>;
    getCampaigns(): Promise<EmailCampaign[]>;
    createCampaign(campaign: EmailCampaign): Promise<EmailCampaign>;
    getLogs(): Promise<EmailLog[]>;
    createLog(log: EmailLog): Promise<void>;
}

export interface IWhatsappRepository {
    getQueue(): Promise<WhatsAppTask[]>;
    addTask(task: WhatsAppTask): Promise<WhatsAppTask>;
    updateTask(task: WhatsAppTask): Promise<void>;
    deleteTask(id: string): Promise<void>;
    getTemplates(): Promise<WhatsAppTemplate[]>;
    saveTemplate(template: WhatsAppTemplate): Promise<void>;
    resetTemplates(defaults: WhatsAppTemplate[]): Promise<void>;
}

export interface IEntitlementRepository {
    getUserEntitlements(userId: string): Promise<UserEntitlements | null>;
    upsertUserEntitlements(entitlements: UserEntitlements): Promise<void>;

    getWalletItems(userId: string): Promise<WalletItem[]>;
    getAllWalletItems(): Promise<WalletItem[]>;
    getWalletItemById(id: string): Promise<WalletItem | null>;
    upsertWalletItem(item: WalletItem): Promise<void>;
    upsertWalletItems(items: WalletItem[]): Promise<void>;

    // NEW: Wallet History Methods
    getWalletHistory(userId: string): Promise<WalletTransactionHistory[]>;
    logWalletTransaction(tx: WalletTransactionHistory): Promise<void>;

    /** Nest: JWT session; mock: synthetic from userId. */
    getWalletMemberHub(userId: string): Promise<WalletMemberHub | null>;

    getGiftAllocations(): Promise<GiftAllocation[]>;
    upsertGiftAllocation(gift: GiftAllocation): Promise<void>;

    getTeamMembers(orgId: string): Promise<CorporateTeamMember[]>;
    upsertTeamMember(member: CorporateTeamMember & { orgId: string }): Promise<void>;
    deleteTeamMember(id: string): Promise<void>;
}

export interface ICreditTagRepository {
    getAll(): Promise<CreditTagMaster[]>;
    upsert(tag: CreditTagMaster): Promise<void>;
    delete(id: string): Promise<void>;
}

export interface ICartRepository {
    syncCart(cart: ActiveCart): Promise<void>;
    getCarts(): Promise<ActiveCart[]>;
    getCartBySession(sessionId: string): Promise<ActiveCart | null>;
}
