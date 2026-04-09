
import { Member } from '../types/index';
import { CertificationRule, MasterDoneTag, MemberAchievement } from '../types/certification'; // Fixed Import
import { CERTIFICATION_RULES_SEED } from '../seeds/certification_rules';
import { SEED_MASTER_DONE_TAGS } from '../seeds/master_done_tags';
import { DevDatabase } from '../utils/devDatabase';
import { APP_CONFIG, assertExternalApiMode, BackendMode } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import { EventBus } from './eventBus';
import { AuditService } from './auditService'; // Import Audit
import { PermissionService } from './permissionService';
import { apiRequest } from '../repositories/api/apiClient';
import { DataService } from './dataService';

const shouldUseApi = () =>
    !APP_CONFIG.USE_MOCK_GLOBAL &&
    (APP_CONFIG.DOMAINS.OPS === 'API' || APP_CONFIG.DOMAINS.EVENTS === 'API');

const membersViaApi = () =>
    !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.MEMBERS === 'API';

const getMasterTagMode = (): BackendMode =>
    shouldUseApi() ? 'API' : APP_CONFIG.USE_MOCK ? 'MOCK' : 'SUPABASE';

interface ApiMasterDoneTag {
    id: string;
    code: string;
    label: string;
    category: 'CORE' | 'ELECTIVE' | 'SPECIAL';
    description?: string | null;
}

const mapApiMasterDoneTag = (tag: ApiMasterDoneTag): MasterDoneTag => ({
    id: tag.id,
    code: tag.code,
    label: tag.label,
    category: tag.category,
    description: tag.description ?? undefined
});

/** Nest returns flattened rules; DB stores logic/tags in `criteria` jsonb */
interface ApiCertificationRule {
    id: string;
    name: string;
    description: string;
    logic: CertificationRule['logic'];
    requiredTags: string[];
    minCountValue?: number;
    tagWeights?: Record<string, number>;
    badgeUrl?: string | null;
    isActive: boolean;
    validityPeriodMonths?: number;
    createdAt?: string;
}

const mapApiCertificationRule = (r: ApiCertificationRule): CertificationRule => ({
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    logic: r.logic,
    requiredTags: r.requiredTags ?? [],
    minCountValue: r.minCountValue,
    tagWeights: r.tagWeights,
    badgeUrl: r.badgeUrl ?? undefined,
    isActive: r.isActive,
    validityPeriodMonths: r.validityPeriodMonths,
});

function isUuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
    );
}

export const CertificationService = {

    getRules: async (): Promise<CertificationRule[]> => {
        if (shouldUseApi()) {
            const data = await apiRequest<ApiCertificationRule[]>('/certification-rules');
            return data.map(mapApiCertificationRule);
        }
        if (APP_CONFIG.USE_MOCK) {
            try {
                if (await DevDatabase.isEmpty('certification_rules')) {
                    await DevDatabase.bulkAdd('certification_rules', CERTIFICATION_RULES_SEED);
                    return CERTIFICATION_RULES_SEED;
                }
                return await DevDatabase.getAll<CertificationRule>('certification_rules');
            } catch(e) { return CERTIFICATION_RULES_SEED; }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('certification_rules').select('*');
        return data || [];
    },

    saveRule: async (rule: CertificationRule): Promise<void> => {
        if (shouldUseApi()) {
            const payload = {
                name: rule.name,
                description: rule.description ?? '',
                logic: rule.logic,
                requiredTags: rule.requiredTags,
                minCountValue: rule.minCountValue,
                tagWeights: rule.tagWeights,
                badgeUrl: rule.badgeUrl ?? null,
                isActive: rule.isActive,
                validityPeriodMonths: rule.validityPeriodMonths,
            };
            const body = JSON.stringify(payload);
            if (isUuid(rule.id)) {
                await apiRequest<ApiCertificationRule>(
                    `/certification-rules/${encodeURIComponent(rule.id)}`,
                    { method: 'PATCH', body },
                );
            } else {
                await apiRequest<ApiCertificationRule>('/certification-rules', {
                    method: 'POST',
                    body,
                });
            }
            return;
        }
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('certification_rules', rule);
            return;
        }
        if (!supabase) return;
        await supabase.from('certification_rules').upsert(rule);
    },

    // --- NEW: MASTER TAG MANAGEMENT ---
    getMasterTags: async (): Promise<MasterDoneTag[]> => {
        assertExternalApiMode('Master done tags', getMasterTagMode());
        if (shouldUseApi()) {
            const data = await apiRequest<ApiMasterDoneTag[]>('/master-done-tags');
            return data.map(mapApiMasterDoneTag);
        }

        if (APP_CONFIG.USE_MOCK) {
            try {
                if (await DevDatabase.isEmpty('master_done_tags')) {
                    await DevDatabase.bulkAdd('master_done_tags', SEED_MASTER_DONE_TAGS);
                    return SEED_MASTER_DONE_TAGS;
                }
                return await DevDatabase.getAll<MasterDoneTag>('master_done_tags');
            } catch(e) { return SEED_MASTER_DONE_TAGS; }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('master_done_tags').select('*');
        return data || [];
    },

    saveMasterTag: async (tag: MasterDoneTag): Promise<void> => {
        assertExternalApiMode('Master done tags', getMasterTagMode());
        if (shouldUseApi()) {
            const payload = JSON.stringify({
                code: tag.code,
                label: tag.label,
                category: tag.category,
                description: tag.description
            });

            if (tag.id && !tag.id.startsWith('TAG-')) {
                await apiRequest<ApiMasterDoneTag>(`/master-done-tags/${encodeURIComponent(tag.id)}`, {
                    method: 'PATCH',
                    body: payload
                });
                return;
            }

            await apiRequest<ApiMasterDoneTag>('/master-done-tags', {
                method: 'POST',
                body: payload
            });
            return;
        }

        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('master_done_tags', tag);
            return;
        }
        if (!supabase) return;
        await supabase.from('master_done_tags').upsert(tag);
    },

    /**
     * Evaluates if a member qualifies for any new certificates based on their Done Tags.
     * Triggers updates if found.
     */
    evaluateMember: async (member: Member): Promise<MemberAchievement[]> => {
        const rules = await CertificationService.getRules();
        const earnedTags = new Set(member.earnedDoneTags || []);
        const existingCertIds = new Set((member.achievements || []).map(a => a.ruleId));

        const newAchievements: MemberAchievement[] = [];

        for (const rule of rules) {
            if (!rule.isActive) continue;
            if (existingCertIds.has(rule.id)) continue; // Already earned

            let qualifies = false;

            if (rule.logic === 'REQUIRE_ALL') {
                // Must have EVERY tag in the required list
                qualifies = rule.requiredTags.every(tag => earnedTags.has(tag));
            } else if (rule.logic === 'REQUIRE_ANY') {
                // Must have AT LEAST ONE tag from the list
                qualifies = rule.requiredTags.some(tag => earnedTags.has(tag));
            } else if (rule.logic === 'MIN_COUNT') {
                // Must have weighted score above threshold (default weight=1 for backward compatibility)
                const weightedScore = rule.requiredTags.reduce((sum, tag) => {
                    if (!earnedTags.has(tag)) return sum;
                    const w = Number(rule.tagWeights?.[tag] ?? 1);
                    return sum + (Number.isFinite(w) && w > 0 ? w : 1);
                }, 0);
                qualifies = weightedScore >= (rule.minCountValue || 1);
            }

            if (qualifies) {
                const achievement: MemberAchievement = {
                    id: `CERT-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
                    ruleId: rule.id,
                    name: rule.name,
                    issuedAt: new Date().toISOString(),
                    metadata: {
                        description: rule.description,
                        badgeUrl: rule.badgeUrl
                    }
                };
                newAchievements.push(achievement);
            }
        }

        return newAchievements;
    },

    /**
     * Called when a member's tags change (System or Manual).
     * Calculates new certs, updates member, and fires events.
     */
    processNewTags: async (member: Member, newTags: string[]): Promise<void> => {
        // 1. Update Member Tags in DB (Merge with existing)
        const currentTags = new Set(member.earnedDoneTags || []);
        let tagsAdded = false;
        
        newTags.forEach(t => {
            if (!currentTags.has(t)) {
                currentTags.add(t);
                tagsAdded = true;
            }
        });

        if (!tagsAdded) return; // Nothing changed

        const updatedMember = { ...member, earnedDoneTags: Array.from(currentTags) };

        // 2. Evaluate Certificates
        const newCerts = await CertificationService.evaluateMember(updatedMember);
        
        if (newCerts.length > 0) {
            updatedMember.achievements = [...(updatedMember.achievements || []), ...newCerts];
        }

        // 3. Persist Member (Nest API when MEMBERS=API; else mock / Supabase)
        if (membersViaApi()) {
            await DataService.updateMember(member.id, {
                earnedDoneTags: updatedMember.earnedDoneTags,
                achievements: updatedMember.achievements,
            });
        } else if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('members', updatedMember);
        } else if (supabase) {
            await supabase.from('members').upsert(updatedMember);
        }

        // 4. Fire Events
        if (newCerts.length > 0) {
            newCerts.forEach(cert => {
                EventBus.emit('CERTIFICATE_ISSUED', {
                    memberId: member.id,
                    member_name: member.name,
                    certificate_name: cert.name,
                    issued_date: new Date().toLocaleDateString()
                });
            });
        }
    },

    /**
     * ADMIN MANUAL OVERRIDE
     * Logs the action to Audit Trail and grants the tag.
     */
    grantManualOverride: async (memberId: string, tagCode: string, reason: string, adminId: string): Promise<void> => {
        let member: Member | undefined;
        if (membersViaApi()) {
            member = (await DataService.getMemberById(memberId)) ?? undefined;
        } else if (APP_CONFIG.USE_MOCK) {
            const members = await DevDatabase.getAll<Member>('members');
            member = members.find((m) => m.id === memberId);
        } else if (supabase) {
            const { data } = await supabase
                .from('members')
                .select('*')
                .eq('id', memberId)
                .maybeSingle();
            member = (data as Member | undefined) ?? undefined;
        }

        if (!member) throw new Error('Member not found');

        // Grant Tag Logic
        await CertificationService.processNewTags(member, [tagCode]);

        // Audit Log
        await AuditService.logRealtimeEvent({
            category: 'SYSTEM',
            title: `Manual Certification Override`,
            description: `Admin ${adminId} manually granted tag ${tagCode}. Reason: ${reason}`,
            userId: memberId,
            metadata: {
                action: 'GRANT_TAG',
                tagCode,
                adminId
            }
        });

        // Mirror into System Security Logs so admin can inspect from Admin Security audit trail.
        await PermissionService.logEvent(
            adminId,
            'MANUAL_CERTIFICATION_OVERRIDE',
            `Granted tag ${tagCode} to member ${memberId}. Reason: ${reason}`,
        );
    }
};
