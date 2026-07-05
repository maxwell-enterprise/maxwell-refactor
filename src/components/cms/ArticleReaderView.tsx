'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Share2 } from 'lucide-react';
import { ContentService } from '../../services/contentService';
import { ContentPost } from '../../types/index';
import { useToast } from '../../context/ToastContext';
import ContentLinkedProductCard from './ContentLinkedProductCard';
import { formatArticleDate, typeLabel } from '../../lib/cmsContentUtils';

type ArticleReaderViewProps = {
  slug: string;
  onRequireLogin?: () => void;
};

const ArticleReaderView: React.FC<ArticleReaderViewProps> = ({
  slug,
  onRequireLogin,
}) => {
  const { showToast } = useToast();
  const [post, setPost] = useState<ContentPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const data = await ContentService.getPublishedBySlug(slug);
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          setPost(null);
          return;
        }
        setPost(data);
        void ContentService.trackView(data.id);
      } catch {
        if (!cancelled) {
          setNotFound(true);
          setPost(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleShare = async () => {
    if (!post) return;
    void ContentService.trackShare(post.id, 'link');
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard', 'success');
    } catch {
      showToast('Could not copy link', 'error');
    }
  };

  const handleProductCta = () => {
    if (!post?.linkedProductId) return;
    void ContentService.trackClick(post.id);
    const url = new URL(window.location.origin);
    url.pathname = '/';
    url.searchParams.set('product', post.linkedProductId);
    url.hash = 'articles';
    window.location.assign(url.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7]">
        <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6 animate-pulse">
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-10 w-full bg-slate-200 rounded" />
          <div className="h-4 w-48 bg-slate-100 rounded" />
          <div className="h-64 w-full bg-slate-100 rounded-2xl" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-2/3 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex flex-col">
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            <Link
              href="/#articles"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Insights
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 py-20 text-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Article not found
            </h1>
            <p className="text-slate-500 mb-6">
              This story may have been unpublished or the link is incorrect.
            </p>
            <Link
              href="/#articles"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
            >
              Browse all insights
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          <Link
            href="/#articles"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors min-w-0"
          >
            <ArrowLeft size={16} className="shrink-0" />
            <span className="truncate">Back to Insights</span>
          </Link>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </header>

      {post.imageUrl && (
        <div className="w-full max-h-[min(28rem,50vh)] overflow-hidden bg-slate-200">
          <img
            src={post.imageUrl}
            alt=""
            className="w-full h-full max-h-[min(28rem,50vh)] object-cover"
          />
        </div>
      )}

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-8 sm:mb-10">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">
            {typeLabel(post)}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold leading-[1.15] tracking-tight text-slate-900">
            {post.title}
          </h1>
          <p className="mt-4 text-base text-slate-500">
            {post.author}
            <span className="mx-2 text-slate-300">·</span>
            {formatArticleDate(post.publishDate)}
          </p>
        </div>

        <div
          className="article-prose prose prose-lg prose-slate max-w-none
            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
            prose-p:text-slate-700 prose-p:leading-[1.85]
            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-slate-900
            prose-li:text-slate-700 prose-li:leading-relaxed
            prose-blockquote:border-l-blue-500 prose-blockquote:text-slate-600 prose-blockquote:italic"
          dangerouslySetInnerHTML={{ __html: post.body || '' }}
        />

        {post.linkedProductId && (
          <div className="mt-12 sm:mt-16 pt-10 border-t border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
              Related program
            </h2>
            <ContentLinkedProductCard
              productId={post.linkedProductId}
              ctaLabel={post.ctaLabel}
              onCtaClick={handleProductCta}
            />
          </div>
        )}

        {!post.linkedProductId && onRequireLogin && (
          <div className="mt-12 pt-8 border-t border-slate-200">
            <button
              type="button"
              onClick={onRequireLogin}
              className="text-blue-600 font-semibold text-sm hover:underline inline-flex items-center gap-1"
            >
              Sign in to explore more
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        <div className="mt-14 pt-8 border-t border-slate-200">
          <Link
            href="/#articles"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={16} />
            More leadership insights
          </Link>
        </div>
      </article>
    </div>
  );
};

export default ArticleReaderView;
