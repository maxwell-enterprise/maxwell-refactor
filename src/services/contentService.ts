
import { ContentPost } from '../types/index';
import { CampaignService } from './campaignService';
import { RepositoryFactory } from './repositories/index';
import { apiRequest } from '../repositories/api/apiClient';

export const ContentService = {
    
    getAllContent: async (): Promise<ContentPost[]> => {
        return await RepositoryFactory.getContentRepository().getAll();
    },

    getPublishedContent: async (): Promise<ContentPost[]> => {
        const now = new Date();
        const all = await RepositoryFactory.getContentRepository().getAll();
        
        return all.filter(c => {
            const isPublished = c.status === 'PUBLISHED';
            const started = new Date(c.publishDate) <= now;
            const ended = c.unpublishDate ? new Date(c.unpublishDate) > now : true;
            return isPublished && started && ended;
        }).sort((a,b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
    },

    createContent: async (post: Partial<ContentPost>): Promise<ContentPost> => {
        const newPost: ContentPost = {
            id: `CNT-${Date.now()}`,
            title: post.title || 'Untitled',
            slug: post.title?.toLowerCase().replace(/\s+/g, '-') || `post-${Date.now()}`,
            body: post.body || '',
            imageUrl: post.imageUrl,
            type: post.type || 'ARTICLE',
            status: post.status || 'DRAFT',
            publishDate: post.publishDate || new Date().toISOString(),
            unpublishDate: post.unpublishDate,
            linkedProductId: post.linkedProductId,
            ctaLabel: post.ctaLabel || 'Learn More',
            author: 'Admin',
            tags: post.tags || [],
            stats: { views: 0, shares: 0, clicks: 0, conversions: 0, revenueAttributed: 0 }
        };

        return await RepositoryFactory.getContentRepository().create(newPost);
    },

    updateContent: async (id: string, updates: Partial<ContentPost>): Promise<ContentPost | null> => {
        return await RepositoryFactory.getContentRepository().update(id, updates);
    },

    generateAiContent: async (input: {
        prompt: string;
        contentType: 'ARTICLE' | 'ADVERTISEMENT' | 'NEWS';
        existingTitle?: string;
        existingBody?: string;
        ctaLabel?: string;
        linkedProduct?: Record<string, unknown> | null;
    }): Promise<{ title: string; body: string }> => {
        return await apiRequest<{ title: string; body: string }>('/content/posts/ai-generate', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    },

    deleteContent: async (id: string): Promise<void> => {
        return await RepositoryFactory.getContentRepository().delete(id);
    },

    // --- ANALYTICS (Kept in Service Layer) ---

    trackView: async (id: string) => {
        const repo = RepositoryFactory.getContentRepository();
        const all = await repo.getAll();
        const post = all.find(c => c.id === id);
        if (post) {
            // Optimistic update pattern in Repo/Service
            await repo.update(id, { 
                stats: { ...post.stats, views: post.stats.views + 1 } 
            });
        }
    },

    trackShare: async (id: string, platform: string) => {
        const repo = RepositoryFactory.getContentRepository();
        const all = await repo.getAll();
        const post = all.find(c => c.id === id);
        if (post) {
            await repo.update(id, { 
                stats: { ...post.stats, shares: post.stats.shares + 1 } 
            });
        }
    },

    trackClick: async (id: string) => {
        const repo = RepositoryFactory.getContentRepository();
        const all = await repo.getAll();
        const post = all.find(c => c.id === id);
        if (post) {
            await repo.update(id, { 
                stats: { ...post.stats, clicks: post.stats.clicks + 1 } 
            });
            CampaignService.trackClick(`cms_${id}`);
        }
    },

    trackConversion: async (contentId: string, amount: number) => {
        const repo = RepositoryFactory.getContentRepository();
        const all = await repo.getAll();
        const post = all.find(c => c.id === contentId);
        if (post) {
            await repo.update(contentId, {
                stats: { 
                    ...post.stats, 
                    conversions: post.stats.conversions + 1,
                    revenueAttributed: post.stats.revenueAttributed + amount
                }
            });
        }
    }
};
