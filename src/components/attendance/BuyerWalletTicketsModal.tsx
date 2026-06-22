import React, { useMemo, useState } from 'react';
import { GiftAllocation, WalletItem } from '../../types/access';
import { X, Ticket, User, Share2, Clock } from 'lucide-react';
import TicketDetailModal from '../wallet/TicketDetailModal';
import {
  WalletBuyerRow,
  classifyWalletTicketForBuyer,
  buyerTicketBucketLabel,
  buyerSummaryLabels,
  buyerSummaryHints,
  isAssignedToExternalRecipient,
  readTicketRecipientEmail,
  readTicketRecipientName,
  readTicketRecipientPhone,
  formatRecipientToLine,
} from './participantWalletBuyers';

interface BuyerWalletTicketsModalProps {
  buyer: WalletBuyerRow;
  gifts: GiftAllocation[];
  eventName?: string;
  onClose: () => void;
}

const bucketTone: Record<string, string> = {
  SELF: 'bg-slate-100 text-slate-700 border-slate-200',
  SHARING_POOL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PENDING_SEND: 'bg-amber-50 text-amber-800 border-amber-200',
  CLAIMED_RECIPIENT: 'bg-violet-50 text-violet-700 border-violet-200',
};

const BuyerWalletTicketsModal: React.FC<BuyerWalletTicketsModalProps> = ({
  buyer,
  gifts,
  eventName,
  onClose,
}) => {
  const [viewingTicket, setViewingTicket] = useState<WalletItem | null>(null);
  const giftByEntitlementId = useMemo(
    () => new Map(gifts.map((g) => [g.entitlementId, g])),
    [gifts],
  );

  const ticketRows = useMemo(
    () =>
      buyer.tickets.map((ticket) => {
        const gift = giftByEntitlementId.get(ticket.id);
        const bucket = classifyWalletTicketForBuyer(
          ticket,
          buyer.sourceUserId,
          gift,
          buyer.buyerEmail,
          buyer.buyerName,
        );
        const recipientEmail = readTicketRecipientEmail(ticket);
        const recipientName = readTicketRecipientName(ticket);
        const recipientPhone =
          readTicketRecipientPhone(ticket) || gift?.recipientPhone?.trim() || '';
        const recipientToLine = formatRecipientToLine({
          name: recipientName,
          email: recipientEmail,
          phone: recipientPhone,
        });
        const showRecipient =
          bucket !== 'SELF' &&
          bucket !== 'SHARING_POOL' &&
          isAssignedToExternalRecipient(ticket, buyer.buyerEmail, buyer.buyerName);
        const tier =
          typeof ticket.meta?.targetTier === 'string' && ticket.meta.targetTier.trim()
            ? ticket.meta.targetTier
            : ticket.subtitle?.trim() || 'General';

        return {
          ticket,
          bucket,
          tier,
          holderUserId: ticket.userId,
          recipientEmail,
          recipientName,
          recipientPhone,
          recipientToLine,
          showRecipient,
          giftStatus: gift?.status,
        };
      }),
    [buyer.buyerEmail, buyer.buyerName, buyer.sourceUserId, buyer.tickets, giftByEntitlementId],
  );

  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                Wallet tickets
              </p>
              <h3 className="truncate text-lg font-bold text-slate-900">{buyer.buyerName}</h3>
              <p className="truncate text-xs text-slate-500">
                {buyer.buyerEmail || 'No email on file'}
                {eventName ? ` · ${eventName}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 bg-white px-5 py-3 sm:grid-cols-5">
            <SummaryChip
              label={buyerSummaryLabels.total}
              hint={buyerSummaryHints.total}
              value={buyer.ticketCount}
            />
            <SummaryChip
              label={buyerSummaryLabels.self}
              hint={buyerSummaryHints.self}
              value={buyer.selfCount}
            />
            <SummaryChip
              label={buyerSummaryLabels.pool}
              hint={buyerSummaryHints.pool}
              value={buyer.poolCount}
            />
            <SummaryChip
              label={buyerSummaryLabels.sent}
              hint={buyerSummaryHints.sent}
              value={buyer.pendingShareCount}
            />
            <SummaryChip
              label={buyerSummaryLabels.claimed}
              hint={buyerSummaryHints.claimed}
              value={buyer.claimedCount}
              className="col-span-2 sm:col-span-1"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {ticketRows.map(
                ({
                  ticket,
                  bucket,
                  tier,
                  holderUserId,
                  recipientEmail,
                  recipientName,
                  recipientPhone,
                  recipientToLine,
                  showRecipient,
                  giftStatus,
                }) => (
                  <div
                    key={ticket.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${bucketTone[bucket] ?? bucketTone.SELF}`}
                          >
                            {buyerTicketBucketLabel(bucket)}
                          </span>
                          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {tier}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {ticket.status}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900">{ticket.title}</div>
                        {ticket.subtitle ? (
                          <div className="text-xs text-slate-500">{ticket.subtitle}</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingTicket(ticket)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 transition-all hover:border-indigo-400 hover:bg-indigo-100 hover:shadow-sm"
                        aria-label="View ticket"
                        title="View ticket"
                      >
                        <Ticket size={18} />
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2 text-[11px] text-slate-600 sm:grid-cols-2">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-400" />
                        <span>
                          Holder: <span className="font-mono">{holderUserId.slice(-8)}</span>
                          {holderUserId === buyer.sourceUserId ? ' (buyer)' : ' (recipient)'}
                        </span>
                      </div>
                      {showRecipient ? (
                        <div className="flex items-start gap-1.5 sm:col-span-2">
                          <Share2 size={12} className="mt-0.5 shrink-0 text-slate-400" />
                          <span className="min-w-0 break-words">{recipientToLine}</span>
                        </div>
                      ) : null}
                      {giftStatus && bucket !== 'SELF' ? (
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-400" />
                          <span>Gift: {giftStatus}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      {viewingTicket ? (
        <TicketDetailModal item={viewingTicket} onClose={() => setViewingTicket(null)} />
      ) : null}
    </>
  );
};

const SummaryChip: React.FC<{
  label: string;
  hint: string;
  value: number;
  className?: string;
}> = ({ label, hint, value, className = '' }) => (
  <div
    className={`rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 ${className}`}
    title={hint}
  >
    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
    <div className="text-lg font-black text-slate-800">{value}</div>
  </div>
);

export default BuyerWalletTicketsModal;
