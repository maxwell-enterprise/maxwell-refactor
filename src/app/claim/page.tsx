import { Suspense } from 'react';
import ClaimGiftPageContent from '@/components/wallet/ClaimGiftPageContent';

function ClaimLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
      Loading gift...
    </div>
  );
}

export default function ClaimGiftPage() {
  return (
    <Suspense fallback={<ClaimLoading />}>
      <ClaimGiftPageContent />
    </Suspense>
  );
}
