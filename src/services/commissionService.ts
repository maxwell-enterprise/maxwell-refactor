
import { CommissionRule, CommissionCandidate } from '../types/commission';
import { PayoutTransaction } from '../types/tribe';
import { DataService } from './dataService';
import { TribeService } from './tribeService';
import { EntitlementService } from './entitlementService';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import { apiRequest } from '../repositories/api/apiClient';

/** Master commission rules: only persisted via Nest (`/fe/commission-rules` → Postgres). No IndexedDB / no direct Supabase from FE. */
function commissionRulesUseNestApi(): boolean {
    return (
        !APP_CONFIG.USE_MOCK_GLOBAL &&
        APP_CONFIG.DOMAINS.COMMERCE === 'API'
    );
}

const COMMISSION_RULES_API_REQUIRED_MSG =
    'Commission rules require the Maxwell API: set `NEXT_PUBLIC_API_BASE_URL` to your Nest `/fe` base and run migration `020_commission_rules_fe.sql` on the server database.';

export const CommissionService = {
    
    // --- RULES MANAGEMENT ---
    getRules: async (): Promise<CommissionRule[]> => {
        if (commissionRulesUseNestApi()) {
            return apiRequest<CommissionRule[]>('/commission-rules');
        }
        return [];
    },

    saveRule: async (rule: CommissionRule): Promise<void> => {
        if (commissionRulesUseNestApi()) {
            await apiRequest(`/commission-rules/${encodeURIComponent(rule.id)}`, {
                method: 'PUT',
                body: JSON.stringify(rule),
            });
            return;
        }
        throw new Error(COMMISSION_RULES_API_REQUIRED_MSG);
    },

    deleteRule: async (id: string): Promise<void> => {
        if (commissionRulesUseNestApi()) {
            await apiRequest(`/commission-rules/${encodeURIComponent(id)}`, {
                method: 'DELETE',
            });
            return;
        }
        throw new Error(COMMISSION_RULES_API_REQUIRED_MSG);
    },

    // --- CANDIDATE FINDING ---
    // Finds recent transactions that might need commission assignment
    getUnassignedCandidates: async (): Promise<CommissionCandidate[]> => {
        const [transactions, existingPayouts, members] = await Promise.all([
            DataService.getTransactions(),
            TribeService.getAllPayouts(),
            DataService.getMembers()
        ]);

        // Filter: Only Paid POs from Store Sales that don't have a payout yet
        const salesTransactions = transactions.filter(t => 
            t.type === 'PO' && 
            t.description.includes('Store Sale') && 
            t.status === 'Paid'
        );

        const candidates: CommissionCandidate[] = [];

        for (const tx of salesTransactions) {
            // Check if already paid out
            const hasPayout = existingPayouts.some(p => p.sourceTransactionId === tx.id);
            if (hasPayout) continue;

            // Extract Buyer Info (Simple parsing from mock description or metadata)
            // Ideally Transaction should store userId directly. 
            // In mock DataService, description is "Store Sale: ORD-123 (Method)"
            // We'll rely on member matching by ID if possible, or skip simple logic for demo
            
            // NOTE: In a real system, Transaction table has `memberId`.
            // Here we try to find a member who might have made this purchase or use a mock logic
            // For demo purposes, we'll iterate members to find who might have this order or simulate
            const randomMember = members[Math.floor(Math.random() * members.length)]; // Simulating lookup
            
            // Check for Sponsor
            let suggestedBeneficiary: CommissionCandidate['suggestedBeneficiary'];
            if (randomMember) {
                const entitlements = await EntitlementService.getUserEntitlements(randomMember.id);
                const sponsorId = entitlements?.attributes.sponsorId;
                
                if (sponsorId) {
                    const sponsor = members.find(m => m.id === sponsorId);
                    if (sponsor) {
                        suggestedBeneficiary = {
                            id: sponsor.id,
                            name: sponsor.name,
                            role: sponsor.lifecycleStage,
                            reason: 'Direct Referrer (Sponsor)'
                        };
                    }
                }
            }

            candidates.push({
                transactionId: tx.id,
                buyerId: randomMember?.id || 'Unknown',
                buyerName: randomMember?.name || 'Guest User',
                amount: tx.amount,
                productName: 'General Product', // Should ideally come from Order Details
                date: tx.date,
                suggestedBeneficiary
            });
        }

        return candidates;
    },

    // --- CALCULATION ---
    calculateCommission: (amount: number, rule: CommissionRule): number => {
        if (rule.type === 'FIXED_AMOUNT') return rule.value;
        return Math.round(amount * (rule.value / 100));
    },

    // --- FINALIZATION ---
    assignCommission: async (
        candidate: CommissionCandidate, 
        beneficiaryId: string, 
        rule: CommissionRule
    ): Promise<void> => {
        const amount = CommissionService.calculateCommission(candidate.amount, rule);
        
        const payout: PayoutTransaction = {
            id: `PAY-${Date.now()}`,
            sourceTransactionId: candidate.transactionId,
            sourceMemberName: candidate.buyerName,
            productName: candidate.productName,
            beneficiaryId: beneficiaryId,
            amount: amount,
            ruleApplied: rule.name,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };

        if (supabase) {
            await supabase.from('payout_transactions').insert(payout);
            return;
        }
        console.warn(
            '[CommissionService] assignCommission: no Supabase client; payout not recorded.',
        );
    }
};
