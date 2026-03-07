
import { Member } from '../types/index';
import { DataService } from './dataService';

export type ImportStrategy = 'SKIP' | 'OVERWRITE' | 'SMART_MERGE';

export interface ImportConflict {
    incoming: Member;
    existing: Member;
}

export const ImportStrategyService = {
    
    detectConflicts: async (incomingMembers: Member[]): Promise<{ safe: Member[], conflicts: ImportConflict[] }> => {
        const currentMembers = await DataService.getMembers();
        const normalize = (s: string) => s ? s.toLowerCase().trim() : '';
        
        // Improved Phone Normalization: Handle +62, 62, 08
        const normalizePhone = (p: string) => {
            if (!p) return '';
            let clean = p.replace(/\D/g, '');
            if (clean.startsWith('0')) clean = '62' + clean.slice(1);
            if (clean.startsWith('8')) clean = '62' + clean; // assume 62 if starts with 8
            return clean;
        };

        const emailMap = new Map(currentMembers.map(m => [normalize(m.email), m]));
        const phoneMap = new Map(currentMembers.map(m => [normalizePhone(m.phone), m]));

        const safe: Member[] = [];
        const conflicts: ImportConflict[] = [];

        incomingMembers.forEach(newM => {
            const matchEmail = newM.email ? emailMap.get(normalize(newM.email)) : null;
            const matchPhone = newM.phone ? phoneMap.get(normalizePhone(newM.phone)) : null;
            const existing = matchEmail || matchPhone;

            if (existing) {
                conflicts.push({ incoming: newM, existing });
            } else {
                if (!newM.id) newM.id = `M-IMP-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                safe.push(newM);
            }
        });

        return { safe, conflicts };
    },

    resolveConflict: (conflict: ImportConflict, strategy: ImportStrategy): Member | null => {
        if (strategy === 'SKIP') return null;

        if (strategy === 'OVERWRITE') {
            return {
                ...conflict.incoming,
                id: conflict.existing.id, // CRITICAL: Preserve ID for relational integrity
                joinMonth: conflict.existing.joinMonth // Usually preserve join date
            };
        }

        if (strategy === 'SMART_MERGE') {
            // DEEP MERGE LOGIC
            
            // 1. Tags Union (Don't lose existing tags)
            const existingTags = conflict.existing.tags || [];
            const newTags = conflict.incoming.tags || [];
            const mergedTags = Array.from(new Set([...existingTags, ...newTags]));

            // 2. Address Merge (Field level)
            const mergedAddress = {
                ...conflict.existing.address,
                ...conflict.incoming.address
            };
            // Cleanup undefined in address
            Object.keys(mergedAddress).forEach(key => {
                if ((mergedAddress as any)[key] === undefined || (mergedAddress as any)[key] === '') {
                    delete (mergedAddress as any)[key];
                }
            });

            return {
                ...conflict.existing, // Base is existing
                
                // Fields: Prefer Incoming if present, else keep Existing
                name: conflict.incoming.name || conflict.existing.name,
                email: conflict.incoming.email || conflict.existing.email,
                phone: conflict.incoming.phone || conflict.existing.phone,
                company: conflict.incoming.company || conflict.existing.company,
                jobTitle: conflict.incoming.jobTitle || conflict.existing.jobTitle,
                
                // Deep Merged Fields
                tags: mergedTags,
                address: mergedAddress,
                
                // Sensitive fields: Usually keep existing unless explicitly updated via overwrite, 
                // but for smart merge, we might want to fill gaps
                lifecycleStage: conflict.existing.lifecycleStage === 'GUEST' ? (conflict.incoming.lifecycleStage || 'GUEST') : conflict.existing.lifecycleStage,
            };
        }

        return null;
    }
};
