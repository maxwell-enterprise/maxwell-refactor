"use client";

import React, { useState } from 'react';
import { GiftAllocation } from '../../types/access';
import { EntitlementService } from '../../services/entitlementService';
import { CheckCircle, Clock, Gift, Loader2, Mail, Phone, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface GiftClaimModalProps {
  gift: GiftAllocation;
  onClose: () => void;
  onClaimed: () => void;
}

const formatExpiresAt = (value?: string) => {
  if (!value) return 'No expiration set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const GiftClaimModal: React.FC<GiftClaimModalProps> = ({ gift, onClose, onClaimed }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-emerald-600 p-3 text-white shadow-lg">
              <Gift size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600">Gifted Ticket</p>
              <h3 className="mt-1 text-2xl font-black text-slate-900">Accept invitation</h3>
              <p className="mt-1 text-sm text-slate-500">This ticket was shared with your account email.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white p-3 text-emerald-600 shadow-sm">
                <CheckCircle size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-emerald-700">You have a ticket waiting</p>
                <p className="mt-1 text-lg font-black text-slate-900">{gift.itemName}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Sent by <span className="font-semibold">{gift.sourceUserName}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Claim status</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-bold text-amber-700">
                <Clock size={16} />
                Pending acceptance
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Expires</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">{formatExpiresAt(gift.tokenExpiresAt)}</p>
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Mail size={16} className="text-slate-400" />
              Recipient
            </div>
            <p className="text-sm text-slate-600">{gift.targetEmail || 'Your account email'}</p>
            {gift.recipientPhone && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={16} className="text-slate-400" />
                {gift.recipientPhone}
              </div>
            )}
            {gift.giftMessage && (
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                {gift.giftMessage}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Accept Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftClaimModal;
