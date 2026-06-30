import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarHeart,
  CheckSquare,
  Loader2,
  Search,
  Send,
  Square,
  Users,
} from 'lucide-react';
import type { Discount, Product } from '../../types/index';
import type { FormDefinition } from '@/features/forms/types';
import { FormService } from '../../services/formService';
import {
  EventCampaign,
  EventCampaignService,
  FormRespondentOption,
} from '../../services/eventCampaignService';
import { useToast } from '../../context/ToastContext';

type EventCampaignPanelProps = {
  products: Product[];
  discounts: Discount[];
  onSent?: () => void;
};

const EventCampaignPanel: React.FC<EventCampaignPanelProps> = ({
  products,
  discounts,
  onSent,
}) => {
  const { showToast } = useToast();
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [campaigns, setCampaigns] = useState<EventCampaign[]>([]);
  const [respondents, setRespondents] = useState<FormRespondentOption[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [loadingRespondents, setLoadingRespondents] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    formId: '',
    productId: '',
    discountCode: '',
    mustBeAccepted: false,
  });
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  const loadFormsAndCampaigns = useCallback(async () => {
    setLoadingForms(true);
    setLoadingCampaigns(true);
    try {
      const [formRows, campaignRows] = await Promise.all([
        FormService.getForms(),
        EventCampaignService.listCampaigns(),
      ]);
      setForms(formRows.filter((f) => f.active));
      setCampaigns(campaignRows);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to load event campaigns',
        'error',
      );
    } finally {
      setLoadingForms(false);
      setLoadingCampaigns(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadFormsAndCampaigns();
  }, [loadFormsAndCampaigns]);

  useEffect(() => {
    if (!formData.formId) {
      setRespondents([]);
      setSelectedEmails(new Set());
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingRespondents(true);
      try {
        const rows = await EventCampaignService.listFormRespondents(
          formData.formId,
        );
        if (!cancelled) {
          setRespondents(rows);
          setSelectedEmails(new Set(rows.map((r) => r.email.toLowerCase())));
        }
      } catch (error) {
        if (!cancelled) {
          showToast(
            error instanceof Error
              ? error.message
              : 'Failed to load form respondents',
            'error',
          );
          setRespondents([]);
          setSelectedEmails(new Set());
        }
      } finally {
        if (!cancelled) setLoadingRespondents(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [formData.formId, showToast]);

  const filteredCampaigns = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.formTitle.toLowerCase().includes(q),
    );
  }, [campaigns, searchTerm]);

  const allSelected =
    respondents.length > 0 && selectedEmails.size === respondents.length;

  const toggleEmail = (email: string) => {
    const key = email.toLowerCase();
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedEmails(new Set());
      return;
    }
    setSelectedEmails(
      new Set(respondents.map((r) => r.email.toLowerCase())),
    );
  };

  const handleSend = async () => {
    if (!formData.name.trim()) {
      showToast('Isi nama campaign dulu.', 'error');
      return;
    }
    if (!formData.formId) {
      showToast('Pilih target form.', 'error');
      return;
    }
    if (!formData.productId) {
      showToast('Pilih target product.', 'error');
      return;
    }
    const recipientEmails = respondents
      .filter((r) => selectedEmails.has(r.email.toLowerCase()))
      .map((r) => r.email);
    if (recipientEmails.length === 0) {
      showToast('Pilih minimal satu responden.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await EventCampaignService.sendCampaign({
        name: formData.name.trim(),
        formId: formData.formId,
        targetProductId: formData.productId,
        linkedDiscountCode: formData.discountCode || undefined,
        mustBeAccepted: formData.mustBeAccepted,
        recipientEmails,
      });
      showToast(
        `Campaign sent: ${result.stats.active ?? 0} active, ${result.stats.pendingLogin ?? 0} pending login, ${result.stats.skippedHasTicket ?? 0} skipped.`,
        'success',
      );
      setFormData({
        name: '',
        formId: '',
        productId: '',
        discountCode: '',
        mustBeAccepted: false,
      });
      setRespondents([]);
      setSelectedEmails(new Set());
      await loadFormsAndCampaigns();
      onSent?.();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to send campaign',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 min-w-0">
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 h-fit lg:sticky lg:top-4 min-w-0">
        <h3 className="font-bold text-slate-900 flex items-center">
          <CalendarHeart size={18} className="mr-2 text-violet-600" />
          Create Event Campaign
        </h3>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Campaign Name
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-violet-500"
            placeholder="e.g. Summit Alumni Offer"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Target Product
          </label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white"
            value={formData.productId}
            onChange={(e) =>
              setFormData({ ...formData, productId: e.target.value })
            }
          >
            <option value="">-- Select product --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Auto-Apply Voucher (Optional)
          </label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white"
            value={formData.discountCode}
            onChange={(e) =>
              setFormData({ ...formData, discountCode: e.target.value })
            }
          >
            <option value="">-- No Discount --</option>
            {discounts.map((d) => (
              <option key={d.id} value={d.code}>
                {d.code} ({d.value}
                {d.type === 'PERCENTAGE' ? '%' : ''} Off)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Target Form
          </label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white"
            value={formData.formId}
            onChange={(e) =>
              setFormData({ ...formData, formId: e.target.value })
            }
            disabled={loadingForms}
          >
            <option value="">-- Select form / quiz --</option>
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
                {f.isQuiz ? ' (Quiz)' : ''}
              </option>
            ))}
          </select>
        </div>

        {formData.formId ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-500 uppercase">
                Respondents
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-bold text-violet-600 hover:text-violet-800"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {loadingRespondents ? (
                <div className="p-4 text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Loading respondents...
                </div>
              ) : respondents.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">
                  No respondents with email for this form.
                </div>
              ) : (
                respondents.map((row) => {
                  const checked = selectedEmails.has(row.email.toLowerCase());
                  return (
                    <label
                      key={row.email}
                      className="flex items-start gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                    >
                      <span className="mt-0.5 text-slate-500">
                        {checked ? <CheckSquare size={16} /> : <Square size={16} />}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleEmail(row.email)}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900 truncate">
                          {row.name}
                        </span>
                        <span className="block text-xs text-slate-500 truncate">
                          {row.email}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        <label className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={formData.mustBeAccepted}
            onChange={(e) =>
              setFormData({ ...formData, mustBeAccepted: e.target.checked })
            }
          />
          <span>
            <span className="block text-sm font-bold text-amber-900">
              Must be accepted?
            </span>
            <span className="block text-xs text-amber-800 mt-0.5">
              When checked, popup keeps showing until the user completes
              checkout.
            </span>
          </span>
        </label>

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={
            submitting ||
            !formData.name.trim() ||
            !formData.formId ||
            !formData.productId
          }
          className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send size={16} className="mr-2" />
              Send link generate
            </>
          )}
        </button>
      </div>

      <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 min-w-0">
          <div>
            <h3 className="font-bold text-slate-900">Event Campaign Manager</h3>
            <p className="text-xs text-slate-500">
              {filteredCampaigns.length} campaigns
            </p>
          </div>
          <div className="relative min-w-0 sm:min-w-[14rem]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-violet-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loadingCampaigns ? (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Loading campaigns...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500 text-sm">
            No event campaigns yet.
          </div>
        ) : (
          filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900">{campaign.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Form: {campaign.formTitle}
                  </p>
                  <p className="text-xs text-slate-500">
                    {campaign.mustBeAccepted
                      ? 'Must be accepted until purchase'
                      : 'Dismissible offer'}
                  </p>
                </div>
                <div className="text-xs text-slate-500 shrink-0">
                  {new Date(campaign.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
                {[
                  ['Targeted', campaign.stats.targeted],
                  ['Active', campaign.stats.active],
                  ['Pending login', campaign.stats.pendingLogin],
                  ['Converted', campaign.stats.converted],
                  ['Dismissed', campaign.stats.dismissed],
                  ['Skipped', campaign.stats.skippedHasTicket],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2"
                  >
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      {label}
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventCampaignPanel;
