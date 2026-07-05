'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import ArticleReaderView from '@/components/cms/ArticleReaderView';

function ArticlePageInner() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug ?? '');

  return <ArticleReaderView slug={slug} />;
}

function ArticleLoading() {
  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center text-slate-500">
      Loading article…
    </div>
  );
}

export default function ArticlePage() {
  return (
    <Suspense fallback={<ArticleLoading />}>
      <ArticlePageInner />
    </Suspense>
  );
}
