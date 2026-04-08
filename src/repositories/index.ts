
import { APP_CONFIG, assertExternalApiMode, BackendMode } from '../lib/config';
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
import { ApiWorkflowRepository } from './api/apiWorkflowRepository';
import { MockGamificationRepository } from './mock/mockGamificationRepository';
import { SupabaseGamificationRepository } from './supabase/supabaseGamificationRepository';
import { MockContentRepository } from './mock/mockContentRepository';
import { SupabaseContentRepository } from './supabase/supabaseContentRepository';
import { MockCommunicationRepository } from './mock/mockCommunicationRepository';
import { SupabaseCommunicationRepository } from './supabase/supabaseCommunicationRepository';
import { MockWhatsappRepository } from './mock/mockWhatsappRepository';
import { SupabaseWhatsappRepository } from './supabase/supabaseWhatsappRepository';
import { ApiWhatsappRepository } from './api/apiWhatsappRepository';
import { MockEventRepository } from './mock/mockEventRepository';
import { SupabaseEventRepository } from './supabase/supabaseEventRepository';
import { ApiEventRepository } from './api/apiEventRepository';
import { MockEntitlementRepository } from './mock/mockEntitlementRepository';
import { SupabaseEntitlementRepository } from './supabase/supabaseEntitlementRepository';
import { MockCreditTagRepository } from './mock/mockCreditTagRepository';
import { SupabaseCreditTagRepository } from './supabase/supabaseCreditTagRepository';
import { ApiCreditTagRepository } from './api/apiCreditTagRepository';
import { MockCartRepository } from './mock/mockCartRepository';
import { SupabaseCartRepository } from './supabase/supabaseCartRepository';
import { ApiCartRepository } from './api/apiCartRepository';
import { MockInvitationRepository } from './mock/mockInvitationRepository';
import { SupabaseInvitationRepository } from './supabase/supabaseInvitationRepository';
import { ApiInvitationRepository } from './api/apiInvitationRepository';
import { ApiEntitlementRepository } from './api/apiEntitlementRepository';
import { ApiMemberRepository } from './api/apiMemberRepository';
import { ApiProductRepository } from './api/apiProductRepository';
import { ApiInventoryRepository } from './api/apiInventoryRepository';
import { ApiTransactionRepository } from './api/apiTransactionRepository';
import { ApiPaymentRepository } from './api/apiPaymentRepository';
import { ApiWorkflowRepository } from './api/apiWorkflowRepository';
import { ApiGamificationRepository } from './api/apiGamificationRepository';
import { ApiCommunicationRepository } from './api/apiCommunicationRepository';
import { ApiWhatsappRepository } from './api/apiWhatsappRepository';

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

function getDomainMode(feature: string, mode: BackendMode): BackendMode {
    assertExternalApiMode(feature, mode);
    return mode;
}

export const RepositoryFactory = {
    getMemberRepository: (): IMemberRepository => {
        if (!memberRepo) {
            const mode = getDomainMode('Members', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.MEMBERS);
            if (mode === 'API') {
                memberRepo = new ApiMemberRepository();
            } else if (mode === 'SUPABASE') {
                memberRepo = new SupabaseMemberRepository();
            } else {
                memberRepo = new MockMemberRepository();
            }
        }
        return memberRepo;
    },

    getProductRepository: (): IProductRepository => {
        if (!productRepo) {
            const mode = getDomainMode('Products', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.PRODUCTS);
            if (mode === 'API') {
                productRepo = new ApiProductRepository();
            } else if (mode === 'SUPABASE') {
                productRepo = new SupabaseProductRepository();
            } else {
                productRepo = new MockProductRepository();
            }
        }
        return productRepo;
    },

    getEventRepository: (): IEventRepository => {
        if (!eventRepo) {
            const mode = getDomainMode('Events', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.EVENTS);
            if (mode === 'API') {
                eventRepo = new ApiEventRepository();
            } else if (mode === 'SUPABASE') {
                eventRepo = new SupabaseEventRepository();
            } else {
                eventRepo = new MockEventRepository();
            }
        }
        return eventRepo;
    },

    getInvitationRepository: (): IInvitationRepository => {
        if (!invitationRepo) {
            const mode = getDomainMode('Invitations', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.INVITATIONS);
            if (mode === 'API') {
                invitationRepo = new ApiInvitationRepository();
            } else if (mode === 'SUPABASE') {
                invitationRepo = new SupabaseInvitationRepository();
            } else {
                invitationRepo = new MockInvitationRepository();
            }
        }
        return invitationRepo;
    },

    getTransactionRepository: (): ITransactionRepository => {
        if (!transactionRepo) {
            const mode = getDomainMode('Transactions', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.TRANSACTIONS);
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && mode === 'SUPABASE';
            transactionRepo = useRealDb ? new SupabaseTransactionRepository() : new MockTransactionRepository();
        }
        return transactionRepo;
    },

    getPaymentRepository: (): IPaymentRepository => {
        if (!paymentRepo) {
            const mode = getDomainMode('Payments', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.PAYMENTS);
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && mode === 'SUPABASE';
            paymentRepo = useRealDb ? new SupabasePaymentRepository() : new MockPaymentRepository();
        }
        return paymentRepo;
    },

    getInventoryRepository: (): IInventoryRepository => {
        if (!inventoryRepo) {
            const mode = getDomainMode('Inventory', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.OPS);
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && mode === 'SUPABASE';
            inventoryRepo = useRealDb ? new SupabaseInventoryRepository() : new MockInventoryRepository();
        }
        return inventoryRepo;
    },

    getWorkflowRepository: (): IWorkflowRepository => {
        if (!workflowRepo) {
            const mode = getDomainMode('Workflows', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.OPS);
            if (mode === 'API') {
                workflowRepo = new ApiWorkflowRepository();
            } else if (mode === 'SUPABASE') {
                workflowRepo = new SupabaseWorkflowRepository();
            } else {
                workflowRepo = new MockWorkflowRepository();
            }
        }
        return workflowRepo;
    },

    getGamificationRepository: (): IGamificationRepository => {
        if (!gamificationRepo) {
            const mode = getDomainMode('Gamification', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.GAMIFICATION);
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && mode === 'SUPABASE';
            gamificationRepo = useRealDb ? new SupabaseGamificationRepository() : new MockGamificationRepository();
        }
        return gamificationRepo;
    },

    getContentRepository: (): IContentRepository => {
        if (!contentRepo) {
            const mode = getDomainMode('Content', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.CONTENT);
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && mode === 'SUPABASE';
            contentRepo = useRealDb ? new SupabaseContentRepository() : new MockContentRepository();
        }
        return contentRepo;
    },

    getCommunicationRepository: (): ICommunicationRepository => {
        if (!commsRepo) {
            const mode = getDomainMode('Communication', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.COMMUNICATION);
            const useRealDb = !APP_CONFIG.USE_MOCK_GLOBAL && mode === 'SUPABASE';
            commsRepo = useRealDb ? new SupabaseCommunicationRepository() : new MockCommunicationRepository();
        }
        return commsRepo;
    },

    getWhatsappRepository: (): IWhatsappRepository => {
        if (!waRepo) {
            const mode = getDomainMode('WhatsApp', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.COMMUNICATION);
            if (mode === 'API') {
                waRepo = new ApiWhatsappRepository();
            } else if (mode === 'SUPABASE') {
                waRepo = new SupabaseWhatsappRepository();
            } else {
                waRepo = new MockWhatsappRepository();
            }
        }
        return waRepo;
    },

    getEntitlementRepository: (): IEntitlementRepository => {
        if (!entitlementRepo) {
            const mode = getDomainMode('Entitlements', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.ENTITLEMENTS);
            if (mode === 'API') {
                entitlementRepo = new ApiEntitlementRepository();
            } else if (mode === 'SUPABASE') {
                entitlementRepo = new SupabaseEntitlementRepository();
            } else {
                entitlementRepo = new MockEntitlementRepository();
            }
        }
        return entitlementRepo;
    },

    getCreditTagRepository: (): ICreditTagRepository => {
        if (!creditTagRepo) {
            const mode = getDomainMode('Credit tags', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.OPS);
            if (mode === 'API') {
                creditTagRepo = new ApiCreditTagRepository();
            } else if (mode === 'SUPABASE') {
                creditTagRepo = new SupabaseCreditTagRepository();
            } else {
                creditTagRepo = new MockCreditTagRepository();
            }
        }
        return creditTagRepo;
    },

    getCartRepository: (): ICartRepository => {
        if (!cartRepo) {
            const mode = getDomainMode('Commerce cart', APP_CONFIG.USE_MOCK_GLOBAL ? 'MOCK' : APP_CONFIG.DOMAINS.COMMERCE);
            if (mode === 'API') {
                cartRepo = new ApiCartRepository();
            } else if (mode === 'SUPABASE') {
                cartRepo = new SupabaseCartRepository();
            } else {
                cartRepo = new MockCartRepository();
            }
        }
        return cartRepo;
    }
};
