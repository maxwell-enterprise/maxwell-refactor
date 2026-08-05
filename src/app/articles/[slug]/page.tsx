'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import ArticleReaderView from '@/components/cms/ArticleReaderView';
import { ArticleReaderSkeleton } from '@/components/ui/page-skeletons';

function ArticlePageInner() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params?.slug ?? '');

  return <ArticleReaderView slug={slug} />;
}

export default function ArticlePage() {
  return (
    <Suspense fallback={<ArticleReaderSkeleton />}>
      <ArticlePageInner />
    </Suspense>
  );
}
