import { ContentPost } from '../../types/index';
import { apiRequest } from './apiClient';
import { IContentRepository } from '../contracts';

const BASE = '/content/posts';

export class ApiContentRepository implements IContentRepository {
  async getAll(): Promise<ContentPost[]> {
    return apiRequest<ContentPost[]>(BASE);
  }

  async create(post: ContentPost): Promise<ContentPost> {
    const payload = {
      title: post.title,
      slug: post.slug,
      body: post.body,
      imageUrl: post.imageUrl ?? null,
      type: post.type,
      status: post.status,
      publishDate: post.publishDate,
      unpublishDate: post.unpublishDate ?? null,
      linkedProductId: post.linkedProductId ?? null,
      ctaLabel: post.ctaLabel ?? null,
      author: post.author,
      tags: post.tags,
      stats: post.stats,
    };
    return apiRequest<ContentPost>(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async update(
    id: string,
    updates: Partial<ContentPost>,
  ): Promise<ContentPost | null> {
    const payload: Record<string, unknown> = {};
    if (updates.title != null) payload.title = updates.title;
    if (updates.slug != null) payload.slug = updates.slug;
    if (updates.body != null) payload.body = updates.body;
    if (updates.imageUrl !== undefined) payload.imageUrl = updates.imageUrl ?? null;
    if (updates.type != null) payload.type = updates.type;
    if (updates.status != null) payload.status = updates.status;
    if (updates.publishDate != null) payload.publishDate = updates.publishDate;
    if (updates.unpublishDate !== undefined) {
      payload.unpublishDate = updates.unpublishDate ?? null;
    }
    if (updates.linkedProductId !== undefined) {
      payload.linkedProductId = updates.linkedProductId ?? null;
    }
    if (updates.ctaLabel !== undefined) payload.ctaLabel = updates.ctaLabel ?? null;
    if (updates.author != null) payload.author = updates.author;
    if (updates.tags != null) payload.tags = updates.tags;
    if (updates.stats != null) payload.stats = updates.stats;

    return apiRequest<ContentPost>(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async delete(id: string): Promise<void> {
    await apiRequest<{ ok: boolean }>(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}
