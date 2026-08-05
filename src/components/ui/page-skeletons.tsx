import React from 'react';

/** Soft pulse block for page skeletons (My Zone + shared member views). */
export function SkeletonBlock({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-slate-200/90 ${className}`}
      aria-hidden
    />
  );
}

function SkeletonSectionLabel() {
  return <SkeletonBlock className="mb-3 h-4 w-28 rounded-lg" />;
}

/** Full home layout: hero, shortcuts, next session, horizontal event rails, wallet, articles. */
export function MyZoneHomeSkeleton() {
  return (
    <div
      className="flex w-full flex-col gap-6 px-4 pt-3 pb-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading My Zone"
    >
      <div className="relative pb-5">
        <SkeletonBlock className="aspect-[16/9] min-h-[10.5rem] rounded-2xl" />
        <SkeletonBlock className="absolute inset-x-3 -bottom-0 h-11 rounded-full shadow-md" />
      </div>

      <div>
        <SkeletonSectionLabel />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <SkeletonBlock className="h-12 w-12 rounded-2xl" />
              <SkeletonBlock className="h-2.5 w-12 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <SkeletonSectionLabel />
        <SkeletonBlock className="h-40 rounded-3xl" />
      </div>

      <div>
        <SkeletonSectionLabel />
        <div className="-mx-4 flex gap-3 overflow-hidden px-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-[220px] shrink-0 overflow-hidden rounded-3xl border border-slate-100 bg-white">
              <SkeletonBlock className="h-28 w-full rounded-none" />
              <div className="space-y-2 p-3">
                <SkeletonBlock className="h-3.5 w-[80%] rounded-md" />
                <SkeletonBlock className="h-3 w-1/2 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SkeletonSectionLabel />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBlock className="h-24 rounded-3xl" />
          <SkeletonBlock className="h-24 rounded-3xl" />
        </div>
      </div>

      <div>
        <SkeletonSectionLabel />
        <div className="-mx-4 flex gap-3 overflow-hidden px-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-[220px] shrink-0 overflow-hidden rounded-3xl border border-slate-100 bg-white">
              <SkeletonBlock className="h-28 w-full rounded-none" />
              <div className="space-y-2 p-3">
                <SkeletonBlock className="h-3.5 w-[75%] rounded-md" />
                <SkeletonBlock className="h-3 w-1/3 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Wallet: header + card + ticket list. */
export function WalletPageSkeleton() {
  return (
    <div
      className="relative w-full min-w-0 bg-slate-50"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading wallet"
    >
      <div className="page-container flex w-full flex-col gap-5 sm:gap-6">
        <div className="flex items-center gap-3 md:hidden">
          <SkeletonBlock className="h-11 w-11 shrink-0 rounded-full" />
          <SkeletonBlock className="h-12 w-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-5 w-24 rounded-lg" />
            <SkeletonBlock className="h-3 w-32 rounded-md" />
          </div>
        </div>
        <div className="hidden space-y-2 md:block">
          <SkeletonBlock className="h-8 w-40 rounded-xl" />
          <SkeletonBlock className="h-4 w-64 rounded-lg" />
        </div>

        <SkeletonBlock className="h-36 rounded-[2rem] sm:h-40" />

        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-9 flex-1 rounded-full" />
          ))}
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28 rounded-[2rem] sm:h-32" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Event catalogue grid. */
export function EventCatalogueSkeleton() {
  return (
    <div
      className="relative w-full min-w-0 bg-slate-50"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading events"
    >
      <div className="page-container flex w-full flex-col gap-6 sm:gap-8">
        <div className="flex items-start gap-3">
          <SkeletonBlock className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-7 w-48 rounded-xl" />
            <SkeletonBlock className="h-4 w-full max-w-md rounded-lg" />
          </div>
        </div>

        <div className="flex gap-3">
          <SkeletonBlock className="h-16 flex-1 rounded-xl" />
          <SkeletonBlock className="h-16 w-28 shrink-0 rounded-xl sm:w-36" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-slate-100 bg-white"
            >
              <SkeletonBlock className="h-40 w-full rounded-none" />
              <div className="space-y-2 p-4">
                <SkeletonBlock className="h-4 w-[75%] rounded-md" />
                <SkeletonBlock className="h-3 w-1/2 rounded-md" />
                <SkeletonBlock className="mt-2 h-9 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Store product grid. */
export function StoreCatalogueSkeleton() {
  return (
    <div
      className="w-full p-3 sm:p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading products"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-slate-100 bg-white"
          >
            <SkeletonBlock className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-4">
              <SkeletonBlock className="h-4 w-[80%] rounded-md" />
              <SkeletonBlock className="h-3 w-1/3 rounded-md" />
              <SkeletonBlock className="h-5 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Generic list / tools page (forms, tribe, toolkit). */
export function ListPageSkeleton({
  titleWidth = 'w-48',
  cards = 4,
}: {
  titleWidth?: string;
  cards?: number;
}) {
  return (
    <div
      className="page-container animate-fade-in relative min-w-0 space-y-6 pb-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
        <SkeletonBlock className={`h-7 ${titleWidth} rounded-xl`} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonBlock key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** Desktop member dashboard cockpit. */
export function MemberDashboardSkeleton() {
  return (
    <div
      className="relative w-full min-w-0 bg-slate-50"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="page-container flex w-full flex-col gap-6 sm:gap-8">
        <SkeletonBlock className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <SkeletonBlock className="h-64 rounded-[2rem] lg:col-span-2" />
          <SkeletonBlock className="h-72 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkeletonBlock className="h-36 rounded-2xl" />
          <SkeletonBlock className="h-36 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/** Article reader full page. */
export function ArticleReaderSkeleton() {
  return (
    <div
      className="min-h-screen bg-[#faf9f7] px-4 py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading article"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <SkeletonBlock className="aspect-[21/9] w-full rounded-2xl" />
        <SkeletonBlock className="h-10 w-[75%] rounded-xl" />
        <SkeletonBlock className="h-4 w-40 rounded-md" />
        <div className="space-y-3 pt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock
              key={i}
              className={`h-3.5 rounded-md ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
