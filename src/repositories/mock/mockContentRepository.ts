
import { IContentRepository } from '../contracts';
import { ContentPost } from '../../types/index';
import { DevDatabase } from '../../utils/devDatabase';

const SEED_CMS: ContentPost[] = [
    {
        id: 'CNT-001',
        title: '5 Levels of Leadership: Where Do You Stand?',
        slug: '5-levels-leadership',
        body: 'Leadership is not about titles, positions or flowcharts. It is about one life influencing another. In this deep dive, we explore John Maxwell\'s signature framework...',
        imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1000',
        type: 'ARTICLE',
        status: 'PUBLISHED',
        publishDate: '2025-01-15T09:00:00Z',
        linkedProductId: 'PKG-2025-FULL',
        ctaLabel: 'Master The 5 Levels',
        author: 'John C. Maxwell',
        tags: ['Leadership', 'Growth'],
        stats: { views: 1250, shares: 340, clicks: 120, conversions: 5, revenueAttributed: 120000000 }
    },
    {
        id: 'CNT-AD-001',
        title: 'Limited Offer: Early Bird IMC 2025',
        slug: 'ad-imc-2025',
        body: 'Secure your VIP seat at the International Maxwell Conference Jakarta. Prices go up next week!',
        imageUrl: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=1000',
        type: 'ADVERTISEMENT',
        status: 'PUBLISHED',
        publishDate: '2025-02-01T09:00:00Z',
        unpublishDate: '2025-04-01T09:00:00Z',
        linkedProductId: 'ITM-IMC-25',
        ctaLabel: 'Get Early Bird',
        author: 'Marketing Team',
        tags: ['Promo', 'Event'],
        stats: { views: 5000, shares: 50, clicks: 800, conversions: 25, revenueAttributed: 75000000 }
    }
];

export class MockContentRepository implements IContentRepository {
    async getAll(): Promise<ContentPost[]> {
        try {
            if (await DevDatabase.isEmpty('cms_content')) {
                await DevDatabase.bulkAdd('cms_content', SEED_CMS);
                return SEED_CMS;
            }
            return await DevDatabase.getAll<ContentPost>('cms_content');
        } catch (e) {
            return SEED_CMS;
        }
    }

    async create(post: ContentPost): Promise<ContentPost> {
        await DevDatabase.add('cms_content', post);
        return post;
    }

    async update(id: string, updates: Partial<ContentPost>): Promise<ContentPost | null> {
        const all = await this.getAll();
        const existing = all.find(c => c.id === id);
        if (existing) {
            const updated = { ...existing, ...updates };
            await DevDatabase.add('cms_content', updated);
            return updated;
        }
        return null;
    }

    async delete(id: string): Promise<void> {
        await DevDatabase.delete('cms_content', id);
    }
}
