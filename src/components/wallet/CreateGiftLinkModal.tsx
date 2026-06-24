'use client';

import React, { useState } from 'react';
import { GiftAllocation, WalletItem } from '../../types/access';
import { EntitlementService } from '../../services/entitlementService';
import { WhatsAppService } from '../../services/whatsappService';
import { X, Link as LinkIcon, Gift, CheckCircle, Copy, User, Phone, Mail } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface CreateGiftLinkModalProps {
  donorName: string;
  selectedTicket: WalletItem;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_WHATSAPP_PREFIX = '+62';

const normalizePhone = (phone: string): string => {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('08')) {
    return `62${clean.slice(1)}`;
  }
  if (clean.startsWith('0')) {
    return `62${clean.slice(1)}`;
  }
  return clean;
};

const buildClaimUrl = (claimToken: string) => {
  if (typeof window === 'undefined') return `/claim?token=${claimToken}`;
  return `${window.location.origin}/claim?token=${encodeURIComponent(claimToken)}`;
};

const CreateGiftLinkModal: React.FC<CreateGiftLinkModalProps> = ({
  donorName,
  selectedTicket,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState(DEFAULT_WHATSAPP_PREFIX);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedGift, setGeneratedGift] = useState<GiftAllocation | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const generatedLink = generatedGift ? buildClaimUrl(generatedGift.claimToken) : '';

  const handleGenerateLink = async () => {
    const name = recipientName.trim();
    const phone = normalizePhone(recipientPhone);
    if (!name) {
      showToast('Please enter the recipient name.', 'error');
      return;
    }
    if (phone.length < 10) {
      showToast('Please enter a valid WhatsApp number.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const gift = await EntitlementService.createTicketGiftLink({
        walletItemId: selectedTicket.id,
        recipientName: name,
        recipientPhone: phone,
        recipientEmail: recipientEmail.trim() || undefined,
        giftMessage: `Ticket shared by ${donorName}`,
      });
      setGeneratedGift(gift);
      showToast('Gift link created successfully.', 'success');
      onSuccess();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to create gift link.',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWaMessage = () => {
    return `Hi ${recipientName.trim()}! 👋\n\nI have a special ticket for you: *${selectedTicket.title}* from ${donorName}.\n\nPlease claim your ticket using this link:\n${generatedLink}\n\nCan't wait to see you there!`;
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    showToast('Link copied to clipboard.', 'success');
  };

  const handleCopyMessage = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(getWaMessage());
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
    showToast('Message copied to clipboard.', 'success');
  };

  const handleSendWhatsApp = () => {
    const phone = normalizePhone(recipientPhone);
    const link = WhatsAppService.generateLink(phone, getWaMessage());
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="modal-overlay z-[140]">
      <div className="modal-panel sm:max-w-md sm:h-auto sm:max-h-[90dvh]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="shrink-0 rounded-2xl bg-indigo-600 p-2.5 text-white shadow-lg sm:p-3">
              <Gift size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Create Gift Link</h2>
              <p className="text-xs text-slate-500">One unique link for this ticket</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-400 shadow-sm transition-all hover:bg-slate-200 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="mb-1 text-slate-500">Ticket to gift</div>
            <div className="font-bold text-slate-800">{selectedTicket.title}</div>
            {selectedTicket.subtitle ? (
              <div className="text-xs text-slate-500">{selectedTicket.subtitle}</div>
            ) : null}
          </div>

          {!generatedGift ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Recipient name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="e.g. Budi Santoso"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    WhatsApp number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="tel"
                      placeholder="+62812..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Email <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      placeholder="recipient@email.com"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="safe-area-bottom flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 sm:min-h-0"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleGenerateLink()}
                  disabled={isSubmitting}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50 sm:min-h-0"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <LinkIcon size={18} />
                  )}
                  Generate link
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-4 rounded-2xl border border-green-200 bg-green-50 p-4">
                <CheckCircle className="mt-0.5 shrink-0 text-green-600" size={20} />
                <div>
                  <h4 className="text-sm font-bold text-green-900">Link ready</h4>
                  <p className="mt-1 text-xs text-green-700">
                    Ticket is on hold. Send this link to {recipientName.trim()}.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-300"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 transition-colors group-hover:bg-indigo-100">
                    <LinkIcon size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Copy link only</div>
                    <div className="max-w-[200px] truncate font-mono text-xs text-slate-500">
                      {generatedLink}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                  {copiedLink ? 'Copied!' : 'Copy'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => void handleCopyMessage()}
                className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-300"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="rounded-xl bg-purple-50 p-2 text-purple-600 transition-colors group-hover:bg-purple-100">
                    <Copy size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Copy link + message</div>
                    <div className="max-w-[200px] truncate text-xs text-slate-500">
                      Includes greeting for {recipientName.trim()}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                  {copiedMessage ? 'Copied!' : 'Copy'}
                </div>
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] p-4 font-bold text-white shadow-sm transition-all hover:bg-[#128C7E]"
              >
                Send via WhatsApp
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 text-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateGiftLinkModal;
