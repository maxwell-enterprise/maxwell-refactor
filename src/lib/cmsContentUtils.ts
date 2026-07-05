import { ContentPost } from '../types/index';

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerpt(post: ContentPost, maxLen = 160): string {
  const plain = stripHtml(post.body || '');
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen).trim()}…`;
}

export function typeLabel(post: ContentPost): string {
  if (post.type === 'ADVERTISEMENT') return 'Featured';
  if (post.type === 'NEWS') return 'News';
  return post.tags[0] || 'Article';
}

export function formatArticleDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function isContentLive(post: ContentPost, now = new Date()): boolean {
  if (post.status !== 'PUBLISHED') return false;
  const started = new Date(post.publishDate) <= now;
  const ended = post.unpublishDate
    ? new Date(post.unpublishDate) > now
    : true;
  return started && ended;
}
