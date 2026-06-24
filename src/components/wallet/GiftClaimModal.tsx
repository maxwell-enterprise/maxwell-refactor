"use client";

import React, { useState } from 'react';
import { GiftAllocation } from '../../types/access';
import { EntitlementService } from '../../services/entitlementService';
import { CheckCircle, Clock, Gift, Loader2, Mail, Phone, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useDialog } from '../../context/DialogContext';

interface GiftClaimModalProps {
  gift: GiftAllocation;
  onClose: () => void;
  onClaimed: () => void;
}

const formatExpiresAt = (value?: string) => {
  if (!value) return 'No expiration';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const GiftClaimModal: React.FC<GiftClaimModalProps> = ({ gift, onClose, onClaimed }) => {
  const { showToast } = useToast();
  const { confirm } = useDialog();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    const approved = await confirm({
      title: 'Accept this ticket?',
      message: `This action will add "${gift.itemName}" to your wallet and complete the transfer to your account.`,
      variant: 'success',
      confirmLabel: 'Yes, Accept',
      cancelLabel: 'No',
      confirmIcon: <CheckCircle size={16} />,
      cancelIcon: <X size={16} />,
      icon: <Gift size={24} />,
    });
    if (!approved) return;

    setLoading(true);
    try {
      await EntitlementService.claimTicketGift(gift.claimToken);
      showToast(`Ticket "${gift.itemName}" has been added to your wallet.`, 'success');
      onClaimed();
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to claim gifted ticket.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gift-claim-title"
    >
      <div className="flex w-full max-w-sm max-h-[min(90dvh,32rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-100 bg-emerald-50/80 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <Gift size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">Gifted Ticket</p>
              <h3 id="gift-claim-title" className="truncate text-sm font-bold text-slate-900">
                Accept invitation
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Ticket waiting</p>
            <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{gift.itemName}</p>
            <p className="mt-0.5 truncate text-xs text-slate-600">
              From <span className="font-semibold">{gift.sourceUserName}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Status</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-700">
                <Clock size={12} />
                Pending
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Expires</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-700">{formatExpiresAt(gift.tokenExpiresAt)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <Mail size={12} />
              Recipient
            </p>
            <p className="mt-1 truncate text-xs text-slate-600">{gift.targetEmail || 'Your account email'}</p>
            {gift.recipientPhone && (
              <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-600">
                <Phone size={12} className="shrink-0 text-slate-400" />
                {gift.recipientPhone}
              </p>
            )}
            {gift.giftMessage && (
              <p className="mt-2 line-clamp-2 rounded-lg bg-white px-2.5 py-2 text-xs text-slate-600">
                {gift.giftMessage}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-2 border-t border-slate-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiftClaimModal;
