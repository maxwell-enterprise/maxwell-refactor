
import { ICreditTagRepository } from '../contracts';
import { CreditTagMaster } from '../../types/access';
import { DevDatabase } from '../../utils/devDatabase';
import { SEED_CREDIT_TAGS } from '../../seeds/credit_tags';

export class MockCreditTagRepository implements ICreditTagRepository {
    async getAll(): Promise<CreditTagMaster[]> {
        try {
            if (await DevDatabase.isEmpty('credit_tags')) {
                await DevDatabase.bulkAdd('credit_tags', SEED_CREDIT_TAGS);
                return SEED_CREDIT_TAGS;
            }
            return await DevDatabase.getAll<CreditTagMaster>('credit_tags');
        } catch (e) {
            return SEED_CREDIT_TAGS;
        }
    }

    async upsert(tag: CreditTagMaster): Promise<void> {
        await DevDatabase.add('credit_tags', tag);
    }

    async delete(id: string): Promise<void> {
        await DevDatabase.delete('credit_tags', id);
    }
}
