'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, Eye, Share2, X } from 'lucide-react';
import { ContentService } from '../../services/contentService';
import { ContentPost } from '../../types/index';
import { useToast } from '../../context/ToastContext';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(post: ContentPost, maxLen = 160): string {
  const plain = stripHtml(post.body || '');
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen).trim()}…`;
}

function typeLabel(post: ContentPost): string {
  if (post.type === 'ADVERTISEMENT') return 'Featured';
  if (post.type === 'NEWS') return 'News';
  return post.tags[0] || 'Article';
}

type Props = {
  onRequireLogin?: () => void;
};

const LandingCmsSection: React.FC<Props> = ({ onRequireLogin }) => {
  const { showToast } = useToast();
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await ContentService.getPublishedContent();
        if (!cancelled) {
          setPosts(data);
        }
      } catch {
        if (!cancelled) {
          setPosts([]);
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
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const openPost = (post: ContentPost) => {
    void ContentService.trackView(post.id);
    setSelectedPost(post);
    document.body.style.overflow = 'hidden';
  };

  const closePost = () => {
    setSelectedPost(null);
    document.body.style.overflow = '';
  };

  const handleShare = (e: React.MouseEvent, post: ContentPost) => {
    e.stopPropagation();
    void ContentService.trackShare(post.id, 'link');
    const url = `${window.location.origin}${window.location.pathname}#articles`;
    void navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard', 'success');
  };

  const handleProductCta = (post: ContentPost) => {
    if (!post.linkedProductId) return;
    void ContentService.trackClick(post.id);
    const url = new URL(window.location.href);
    url.searchParams.set('product', post.linkedProductId);
    url.hash = 'articles';
    window.location.assign(url.toString());
  };

  if (!loading && posts.length === 0) {
    return null;
  }

  return (
    <>
      <section id="articles" className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <span className="text-blue-600 font-semibold tracking-wider uppercase text-xs">
                From Content Hub
              </span>
              <h2 className="text-3xl font-bold text-slate-900 mt-2">
                Latest Insights
              </h2>
              <p className="mt-2 text-slate-500">
                Leadership stories, news, and resources curated for you.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse"
                >
                  <div className="h-48 bg-slate-200" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-6 bg-slate-200 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => {
                if (post.type === 'ADVERTISEMENT') {
                  return (
                    <div
                      key={post.id}
                      className="col-span-1 md:col-span-2 lg:col-span-3 group bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800 flex flex-col md:flex-row"
                    >
                      {post.imageUrl && (
                        <div className="md:w-2/5 h-52 md:h-auto min-h-[12rem] relative overflow-hidden">
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/40 to-transparent md:hidden" />
                        </div>
                      )}
                      <div className="flex-1 p-8 md:p-10 text-white flex flex-col justify-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-3">
                          {typeLabel(post)}
                        </span>
                        <h3 className="text-2xl md:text-3xl font-bold mb-3 leading-tight">
                          {post.title}
                        </h3>
                        <p className="text-slate-300 text-sm md:text-base mb-6 line-clamp-3">
                          {excerpt(post, 220)}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => openPost(post)}
                            className="px-6 py-2.5 rounded-full bg-white text-slate-900 text-sm font-bold hover:bg-blue-50 transition-colors"
                          >
                            Read more
                          </button>
                          {post.linkedProductId && (
                            <button
                              type="button"
                              onClick={() => handleProductCta(post)}
                              className="px-6 py-2.5 rounded-full border border-white/30 text-white text-sm font-bold hover:bg-white/10 transition-colors inline-flex items-center gap-2"
                            >
                              {post.ctaLabel || 'View offer'}
                              <ArrowRight size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <article
                    key={post.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openPost(post)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openPost(post);
                      }
                    }}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full cursor-pointer"
                  >
                    <div className="h-48 overflow-hidden relative bg-slate-100">
                      {post.imageUrl ? (
                        <img
                          src={post.imageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-300 text-sm">
                          Maxwell Leadership
                        </div>
                      )}
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-900 shadow-sm">
                        {typeLabel(post)}
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-slate-600 text-sm mb-6 line-clamp-3 flex-1">
                        {excerpt(post)}
                      </p>
                      <div className="mt-auto flex justify-between items-center text-xs text-slate-400 border-t border-slate-100 pt-4">
                        <span>
                          {post.author} •{' '}
                          {new Date(post.publishDate).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center">
                            <Eye size={14} className="mr-1" />
                            {post.stats.views}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleShare(e, post)}
                            className="hover:text-blue-600 p-1"
                            aria-label="Share"
                          >
                            <Share2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {selectedPost && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="landing-cms-article-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closePost}
            aria-label="Close article"
          />
          <div className="relative w-full max-w-3xl max-h-[92dvh] sm:max-h-[88dvh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
            {selectedPost.imageUrl && (
              <div className="h-44 sm:h-56 shrink-0 relative">
                <img
                  src={selectedPost.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    {typeLabel(selectedPost)}
                  </span>
                  <h2
                    id="landing-cms-article-title"
                    className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 leading-tight"
                  >
                    {selectedPost.title}
                  </h2>
                  <p className="text-sm text-slate-500 mt-2">
                    {selectedPost.author} •{' '}
                    {new Date(selectedPost.publishDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePost}
                  className="shrink-0 p-2 rounded-full hover:bg-slate-100 text-slate-500"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div
                className="prose prose-slate max-w-none text-slate-600 prose-headings:text-slate-900 prose-a:text-blue-600"
                dangerouslySetInnerHTML={{ __html: selectedPost.body || '' }}
              />

              {selectedPost.linkedProductId && (
                <div className="mt-8 p-6 rounded-2xl bg-slate-900 text-white">
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-2">
                    Related offer
                  </p>
                  <p className="text-slate-300 text-sm mb-4">
                    Explore the program or product linked to this story.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      handleProductCta(selectedPost);
                      closePost();
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-900 text-sm font-bold hover:bg-blue-50 transition-colors"
                  >
                    {selectedPost.ctaLabel || 'View product'}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {!selectedPost.linkedProductId && onRequireLogin && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      closePost();
                      onRequireLogin();
                    }}
                    className="text-blue-600 font-semibold text-sm hover:underline inline-flex items-center gap-1"
                  >
                    Sign in to explore more
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LandingCmsSection;
