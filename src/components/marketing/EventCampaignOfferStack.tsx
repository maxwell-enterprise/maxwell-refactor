import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ticket, X, Sparkles } from 'lucide-react';
import { ViewState } from '../../types/index';
import {
  buildEventCampaignCheckoutSearch,
  EventCampaignOffer,
  EventCampaignService,
} from '../../services/eventCampaignService';
import { toFeatureSlug } from '../../lib/dashboardNavigation';
import { UserVoucherService } from '../../services/userVoucherService';

type EventCampaignOfferStackProps = {
  enabled: boolean;
  onNavigate?: (view: ViewState) => void;
};

const EventCampaignOfferStack: React.FC<EventCampaignOfferStackProps> = ({
  enabled,
  onNavigate,
}) => {
  const [offers, setOffers] = useState<EventCampaignOffer[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOffers = useCallback(async () => {
    if (!enabled) {
      setOffers([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await EventCampaignService.getPendingOffers();
      setOffers(rows);
    } catch (error) {
      console.warn(
        '[EventCampaign] Failed to load pending offers:',
        error instanceof Error ? error.message : error,
      );
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => {
      void loadOffers();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, loadOffers]);

  const visibleOffers = useMemo(() => offers, [offers]);

  const handleDismiss = async (offer: EventCampaignOffer) => {
    if (offer.mustBeAccepted) return;
    try {
      await EventCampaignService.dismissOffer(offer.assignmentId);
      setOffers((prev) =>
        prev.filter((row) => row.assignmentId !== offer.assignmentId),
      );
    } catch (error) {
      console.warn(
        '[EventCampaign] Dismiss failed:',
        error instanceof Error ? error.message : error,
      );
    }
  };

  const handleClaim = async (offer: EventCampaignOffer) => {
    if (offer.linkedDiscountCode?.trim()) {
      try {
        await UserVoucherService.claimMyVoucher(
          offer.linkedDiscountCode.trim(),
          offer.targetProductId,
        );
      } catch (error) {
        console.warn(
          '[EventCampaign] Voucher claim failed:',
          error instanceof Error ? error.message : error,
        );
      }
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('view', toFeatureSlug(ViewState.STORE_CATALOG));
      const campaignParams = new URLSearchParams(
        buildEventCampaignCheckoutSearch(offer),
      );
      campaignParams.forEach((value, key) => params.set(key, value));
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}?${params.toString()}`,
      );
    }
    onNavigate?.(ViewState.STORE_CATALOG);
  };

  if (!enabled || loading || visibleOffers.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-scale-in max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
          <div className="flex items-center gap-2">
            <Sparkles size={18} />
            <h3 className="font-bold text-lg">Claim Your Event Ticket</h3>
          </div>
          <p className="text-indigo-100 text-sm mt-1">
            Special offers from forms you completed.
          </p>
        </div>

        <div className="overflow-y-auto p-4 space-y-3">
          {visibleOffers.map((offer) => (
            <div
              key={offer.assignmentId}
              className="rounded-xl border border-slate-200 p-4 bg-slate-50"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                  <Ticket size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{offer.campaignName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    From: {offer.formTitle}
                  </p>
                  {offer.linkedDiscountCode ? (
                    <p className="text-xs font-mono text-emerald-700 mt-2">
                      Voucher: {offer.linkedDiscountCode}
                    </p>
                  ) : null}
                  {offer.mustBeAccepted ? (
                    <p className="text-[11px] text-amber-700 mt-2">
                      This offer stays visible until you complete checkout.
                    </p>
                  ) : null}
                </div>
                {!offer.mustBeAccepted ? (
                  <button
                    type="button"
                    onClick={() => void handleDismiss(offer)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    aria-label="Dismiss offer"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleClaim(offer)}
                className="mt-3 w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm font-bold hover:bg-slate-800 transition-colors"
              >
                Claim Ticket
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventCampaignOfferStack;
