"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContentPost } from '../../../types/index';
import { ContentService } from '../../../services/contentService';
import { typeLabel } from '../../../lib/cmsContentUtils';

interface ContentHubHeroCarouselProps {
  posts: ContentPost[];
  /** Max slides shown in the hero. */
  limit?: number;
  className?: string;
}

const AUTO_ADVANCE_MS = 5000;

/**
 * Content Hub slide banner styled after the My Zone phone reference:
 * full-bleed image, centered title overlay, and bottom pagination dots.
 */
const ContentHubHeroCarousel: React.FC<ContentHubHeroCarouselProps> = ({
  posts,
  limit = 6,
  className = '',
}) => {
  const slides = useMemo(() => {
    const withImage = posts.filter((post) => Boolean(post.imageUrl?.trim()));
    const source = withImage.length > 0 ? withImage : posts;
    return [...source]
      .sort((a, b) => {
        if (a.type === 'ADVERTISEMENT' && b.type !== 'ADVERTISEMENT') return -1;
        if (b.type === 'ADVERTISEMENT' && a.type !== 'ADVERTISEMENT') return 1;
        return 0;
      })
      .slice(0, limit);
  }, [posts, limit]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  const goTo = useCallback(
    (next: number) => {
      if (slides.length === 0) return;
      setIndex(((next % slides.length) + slides.length) % slides.length);
    },
    [slides.length],
  );

  const openSlide = useCallback((post: ContentPost) => {
    void ContentService.trackClick(post.id).catch(() => undefined);
    window.open(
      `/articles/${encodeURIComponent(post.slug)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, []);

  if (slides.length === 0) {
    return (
      <section
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 ${className}`}
        data-tour="member-dashboard-header"
      >
        <div className="flex aspect-[16/9] min-h-[10.5rem] flex-col items-center justify-center px-6 text-center text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
            From Content Hub
          </p>
          <h2 className="mt-2 text-xl font-black leading-tight">Insights coming soon</h2>
        </div>
      </section>
    );
  }

  const active = slides[index] ?? slides[0];

  return (
    <section
      className={`relative overflow-hidden rounded-2xl bg-slate-800 shadow-md ${className}`}
      data-tour="member-dashboard-header"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Content Hub highlights"
    >
      <div className="relative aspect-[16/9] min-h-[10.5rem] w-full">
        {slides.map((post, slideIndex) => {
          const isActive = slideIndex === index;
          return (
            <button
              key={post.id}
              type="button"
              onClick={() => openSlide(post)}
              aria-hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
              className={`absolute inset-0 w-full transition-opacity duration-500 ${
                isActive ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
              }`}
            >
              {post.imageUrl ? (
                <img
                  src={post.imageUrl}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800" />
              )}
              {/* Soft vignette so centered copy stays readable without burying the photo */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/45" />

              <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pb-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/90 drop-shadow-sm">
                  {typeLabel(post)}
                </p>
                <h2 className="mt-1.5 max-w-[18rem] text-[1.35rem] font-black leading-tight tracking-tight text-white drop-shadow-md line-clamp-2 sm:text-2xl">
                  {post.title}
                </h2>
              </div>
            </button>
          );
        })}

        {slides.length > 1 && (
          <div className="absolute bottom-2.5 left-0 right-0 z-20 flex items-center justify-center gap-1.5">
            {slides.map((post, slideIndex) => {
              const isActive = slideIndex === index;
              return (
                <button
                  key={post.id}
                  type="button"
                  aria-label={`Go to slide ${slideIndex + 1}: ${post.title}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(slideIndex);
                  }}
                  className={`rounded-full transition-all ${
                    isActive
                      ? 'h-2 w-2 bg-white shadow-sm'
                      : 'h-1.5 w-1.5 bg-white/55 active:bg-white/80'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      <span className="sr-only">
        Slide {index + 1} of {slides.length}: {active.title}
      </span>
    </section>
  );
};

export default ContentHubHeroCarousel;
