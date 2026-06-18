'use client';

import React from 'react';
import FormResponderPage from '@/features/forms/pages/FormResponderPage';

interface PublicFormResponderProps {
  formId: string;
  sessionId?: string;
}

const PublicFormResponder: React.FC<PublicFormResponderProps> = ({
  formId,
  sessionId,
}) => {
  const handleComplete = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('formId');
    url.searchParams.delete('sessionId');
    window.history.replaceState({}, '', url.pathname + (url.search || ''));
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto text-sm font-bold text-indigo-700">
          Maxwell Leadership — Form & Quiz
        </div>
      </header>
      <FormResponderPage
        formId={formId}
        sessionId={sessionId}
        onComplete={handleComplete}
      />
    </div>
  );
};

export default PublicFormResponder;
