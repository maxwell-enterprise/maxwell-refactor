import React from 'react';

type StatusType = 'success' | 'warning' | 'error' | 'neutral' | 'info';

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  icon?: React.ReactNode;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type, icon, className = '' }) => {
  let derivedType: StatusType = type || 'neutral';
  if (!type) {
    const lower = status.toLowerCase();
    if (['paid', 'active', 'completed', 'approved', 'resolved', 'success', 'sent'].includes(lower)) derivedType = 'success';
    else if (['pending', 'in_progress', 'waiting', 'ordered', 'scheduled'].includes(lower)) derivedType = 'warning';
    else if (['failed', 'expired', 'rejected', 'cancelled', 'revoked'].includes(lower)) derivedType = 'error';
    else if (['new', 'draft', 'open'].includes(lower)) derivedType = 'info';
  }

  const styles = {
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${styles[derivedType]} ${className}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export default StatusBadge;
