import React from 'react';
import { Loader2 } from 'lucide-react';

export type SessionLoadingScreenProps = {
  title?: string;
};

/**
 * Minimal full-viewport shell while auth/session hydrates.
 */
const SessionLoadingScreen: React.FC<SessionLoadingScreenProps> = ({
  title = 'Memuat sesi…',
}) => (
  <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 font-sans antialiased">
    <div
      className="flex flex-col items-center gap-2.5 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-6 w-6 shrink-0 animate-spin text-slate-400" strokeWidth={2} aria-hidden />
      <p className="text-[13px] font-medium text-slate-500">{title}</p>
    </div>
  </div>
);

export default SessionLoadingScreen;
