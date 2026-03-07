
import { APP_CONFIG } from '../lib/config';
import {
    IMemberRepository,
    IProductRepository,
    ITransactionRepository,
    IPaymentRepository,
    IInventoryRepository,
    IWorkflowRepository,
    IGamificationRepository,
    IContentRepository,
    ICommunicationRepository,
    IWhatsappRepository,
    IEventRepository,
    IEntitlementRepository,
    ICreditTagRepository,
    ICartRepository,
    IInvitationRepository
} from './contracts';
import { MockMemberRepository } from './mock/mockMemberRepository';
import { SupabaseMemberRepository } from './supabase/supabaseMemberRepository';
import { MockProductRepository } from './mock/mockProductRepository';
import { SupabaseProductRepository } from './supabase/supabaseProductRepository';
import { MockTransactionRepository } from './mock/mockTransactionRepository';
import { SupabaseTransactionRepository } from './supabase/supabaseTransactionRepository';
import { MockPaymentRepository } from './mock/mockPaymentRepository';
import { SupabasePaymentRepository } from './supabase/supabasePaymentRepository';
import { MockInventoryRepository } from './mock/mockInventoryRepository';
import { SupabaseInventoryRepository } from './supabase/supabaseInventoryRepository';
import { MockWorkflowRepository } from './mock/mockWorkflowRepository';
import { SupabaseWorkflowRepository } from './supabase/supabaseWorkflowRepository';
import { MockGamificationRepository } from './mock/mockGamificationRepository';
import { SupabaseGamificationRepository } from './supabase/supabaseGamificationRepository';
import { MockContentRepository } from './mock/mockContentRepository';
import { SupabaseContentRepository } from './supabase/supabaseContentRepository';
import { MockCommunicationRepository } from './mock/mockCommunicationRepository';
import { SupabaseCommunicationRepository } from './supabase/supabaseCommunicationRepository';
import { MockWhatsappRepository } from './mock/mockWhatsappRepository';
import { SupabaseWhatsappRepository } from './supabase/supabaseWhatsappRepository';
import { MockEventRepository } from './mock/mockEventRepository';
import { SupabaseEventRepository } from './supabase/supabaseEventRepository';
import { MockEntitlementRepository } from './mock/mockEntitlementRepository';
import { SupabaseEntitlementRepository } from './supabase/supabaseEntitlementRepository';
import { MockCreditTagRepository } from './mock/mockCreditTagRepository';
import { SupabaseCreditTagRepository } from './supabase/supabaseCreditTagRepository';
import { MockCartRepository } from './mock/mockCartRepository';
import { SupabaseCartRepository } from './supabase/supabaseCartRepository';
import { MockInvitationRepository } from './mock/mockInvitationRepository';
import { SupabaseInvitationRepository } from './supabase/supabaseInvitationRepository';

// Re-export contracts for consumers
export * from './contracts';

// Singleton instances
let memberRepo: IMemberRepository;
let productRepo: IProductRepository;
let transactionRepo: ITransactionRepository;
let paymentRepo: IPaymentRepository;
let inventoryRepo: IInventoryRepository;
let workflowRepo: IWorkflowRepository;
let gamificationRepo: IGamificationRepository;
let contentRepo: IContentRepository;
let commsRepo: ICommunicationRepository;
let waRepo: IWhatsappRepository;
let eventRepo: IEventRepository;
let entitlementRepo: IEntitlementRepository;
let creditTagRepo: ICreditTagRepository;
let cartRepo: ICartRepository;
let invitationRepo: IInvitationRepository;

export const RepositoryFactory = {
    getMemberRepository: (): IMemberRepository => {
        if (!memberRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.MEMBERS === 'SUPABASE';
            memberRepo = useRealDb ? new SupabaseMemberRepository() : new MockMemberRepository();
        }
        return memberRepo;
    },

    getProductRepository: (): IProductRepository => {
        if (!productRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.PRODUCTS === 'SUPABASE';
            productRepo = useRealDb ? new SupabaseProductRepository() : new MockProductRepository();
        }
        return productRepo;
    },

    getEventRepository: (): IEventRepository => {
        if (!eventRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.EVENTS === 'SUPABASE';
            eventRepo = useRealDb ? new SupabaseEventRepository() : new MockEventRepository();
        }
        return eventRepo;
    },

    getInvitationRepository: (): IInvitationRepository => {
        if (!invitationRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.EVENTS === 'SUPABASE'; // Grouped with Events Domain
            invitationRepo = useRealDb ? new SupabaseInvitationRepository() : new MockInvitationRepository();
        }
        return invitationRepo;
    },

    getTransactionRepository: (): ITransactionRepository => {
        if (!transactionRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.TRANSACTIONS === 'SUPABASE';
            transactionRepo = useRealDb ? new SupabaseTransactionRepository() : new MockTransactionRepository();
        }
        return transactionRepo;
    },

    getPaymentRepository: (): IPaymentRepository => {
        if (!paymentRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.PAYMENTS === 'SUPABASE';
            paymentRepo = useRealDb ? new SupabasePaymentRepository() : new MockPaymentRepository();
        }
        return paymentRepo;
    },

    getInventoryRepository: (): IInventoryRepository => {
        if (!inventoryRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.OPS === 'SUPABASE';
            inventoryRepo = useRealDb ? new SupabaseInventoryRepository() : new MockInventoryRepository();
        }
        return inventoryRepo;
    },

    getWorkflowRepository: (): IWorkflowRepository => {
        if (!workflowRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.OPS === 'SUPABASE';
            workflowRepo = useRealDb ? new SupabaseWorkflowRepository() : new MockWorkflowRepository();
        }
        return workflowRepo;
    },

    getGamificationRepository: (): IGamificationRepository => {
        if (!gamificationRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.GAMIFICATION === 'SUPABASE';
            gamificationRepo = useRealDb ? new SupabaseGamificationRepository() : new MockGamificationRepository();
        }
        return gamificationRepo;
    },

    getContentRepository: (): IContentRepository => {
        if (!contentRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.CONTENT === 'SUPABASE';
            contentRepo = useRealDb ? new SupabaseContentRepository() : new MockContentRepository();
        }
        return contentRepo;
    },

    getCommunicationRepository: (): ICommunicationRepository => {
        if (!commsRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.COMMUNICATION === 'SUPABASE';
            commsRepo = useRealDb ? new SupabaseCommunicationRepository() : new MockCommunicationRepository();
        }
        return commsRepo;
    },

    getWhatsappRepository: (): IWhatsappRepository => {
        if (!waRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.COMMUNICATION === 'SUPABASE';
            waRepo = useRealDb ? new SupabaseWhatsappRepository() : new MockWhatsappRepository();
        }
        return waRepo;
    },

    getEntitlementRepository: (): IEntitlementRepository => {
        if (!entitlementRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.MEMBERS === 'SUPABASE';
            entitlementRepo = useRealDb ? new SupabaseEntitlementRepository() : new MockEntitlementRepository();
        }
        return entitlementRepo;
    },

    getCreditTagRepository: (): ICreditTagRepository => {
        if (!creditTagRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.OPS === 'SUPABASE';
            creditTagRepo = useRealDb ? new SupabaseCreditTagRepository() : new MockCreditTagRepository();
        }
        return creditTagRepo;
    },

    getCartRepository: (): ICartRepository => {
        if (!cartRepo) {
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.COMMERCE === 'SUPABASE';
            cartRepo = useRealDb ? new SupabaseCartRepository() : new MockCartRepository();
        }
        return cartRepo;
    }
};
