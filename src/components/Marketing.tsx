import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Campaign, Product, Discount, CampaignCategory } from '../types/index';
import { CampaignService } from '../services/campaignService';
import { AIService, MarketingInsight } from '../services/aiService';
import { DataService } from '../services/dataService';
import { DiscountService, filterSelectableDiscounts } from '../services/discountService';
import { useToast } from '../context/ToastContext';
import { useAccess } from '../context/SecurityContext'; 
import { useAuth } from '../context/AuthContext';
import { getWorkspaceToken } from '../lib/workspaceAuthToken';
import { ApiRequestError } from '../repositories/api/apiClient';
import { 
  Link, QrCode, Copy, BarChart3, Plus, ExternalLink, 
  Target, TrendingUp, DollarSign, MousePointer2, Pencil, Save, X, PieChart as PieIcon, Tag, CheckCircle, Upload, Download, FileSpreadsheet, Filter, Search, Trash2, CalendarHeart, Users
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import AIMarketingAdvisor from './marketing/AIMarketingAdvisor';
import EventCampaignPanel from './marketing/EventCampaignPanel';
import QRCodeDisplay from './common/QRCodeDisplay';
import { ExcelHelper } from '../utils/excelHelper';
import { useCampaignMetricsRealtime } from '../hooks/useCampaignMetricsRealtime';
import {
  CAMPAIGN_SOURCE_CODE_EXAMPLE,
  CAMPAIGN_SOURCE_CODE_RULES_HINT,
  mapCampaignSourceCodeApiError,
  sanitizeCampaignSourceCodeInput,
  validateCampaignSourceCode,
} from '../lib/campaignSourceCode';
import { EventCampaignService, type EventCampaignAnalyticsSummary } from '../services/eventCampaignService';

const Marketing: React.FC = () => {
  const { can: canManageCampaigns } = useAccess('mkt_campaigns');
  const { showToast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'event' | 'analytics'>('create');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<MarketingInsight[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [showQrModal, setShowQrModal] = useState<Campaign | null>(null);
  const [campaignPendingDelete, setCampaignPendingDelete] = useState<Campaign | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [hasShownAuthWarning, setHasShownAuthWarning] = useState(false);
  const [eventCampaignAnalytics, setEventCampaignAnalytics] = useState<EventCampaignAnalyticsSummary | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
      name: '',
      sourceCode: '',
      category: 'OTHER' as CampaignCategory,
      productId: '',
      discountCode: ''
  });

  useEffect(() => {
      loadCampaignContext();
  }, [isAuthenticated, isLoading]);

  useCampaignMetricsRealtime(
      Boolean(isAuthenticated && getWorkspaceToken()),
      setCampaigns,
  );

  const toReadableError = (error: unknown): string => {
      if (error instanceof ApiRequestError && error.status === 401) {
          return 'Your session is invalid. Please sign in again.';
      }
      if (error instanceof Error) {
          const raw = error.message?.trim();
          if (raw.startsWith('{') && raw.endsWith('}')) {
              try {
                  const parsed = JSON.parse(raw) as { message?: string | string[] };
                  if (Array.isArray(parsed.message)) return parsed.message.join('; ');
                  if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message.trim();
              } catch {
                  // noop
              }
          }
          return raw || 'Failed to load campaign data';
      }
      return 'Failed to load campaign data';
  };

  const loadCampaignContext = async () => {
      if (isLoading) return;
      const token = getWorkspaceToken();
      if (!isAuthenticated || !token) {
          setCampaigns([]);
          setProducts([]);
          setDiscounts([]);
          if (!hasShownAuthWarning) {
              showToast('Your session is not ready yet. Please sign in again.', 'error');
              setHasShownAuthWarning(true);
          }
          return;
      }

      setLoading(true);
      try {
          const [campaignData, productData, discountData] = await Promise.all([
              CampaignService.getCampaigns(),
              DataService.getProducts(),
              DiscountService.getDiscounts()
          ]);
          setCampaigns(campaignData);
          setProducts(productData);
          setDiscounts(discountData);
          if (hasShownAuthWarning) setHasShownAuthWarning(false);
      } catch (error) {
          const message = toReadableError(error);
          showToast(message, 'error');
      } finally {
          setLoading(false);
      }
  };

  const runAnalysis = async () => {
      setAnalyzing(true);
      const insights = await AIService.generateMarketingInsights(campaigns, discounts);
      setAiInsights(insights);
      setAnalyzing(false);
  };

  useEffect(() => {
      if (activeTab === 'analytics') {
          if (campaigns.length > 0) {
              runAnalysis();
          }
          void EventCampaignService.getAnalyticsSummary()
            .then(setEventCampaignAnalytics)
            .catch(() => setEventCampaignAnalytics(null));
      }
  }, [activeTab, campaigns]);

  // Computed Filtered List
  const filteredCampaigns = useMemo(() => {
      return campaigns.filter(c => {
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = c.name.toLowerCase().includes(searchLower) || 
                                c.sourceCode.toLowerCase().includes(searchLower);
          const matchesCategory = filterCategory === 'ALL' || c.category === filterCategory;
          return matchesSearch && matchesCategory;
      });
  }, [campaigns, searchTerm, filterCategory]);

  const sourceCodeValidation = useMemo(
      () => validateCampaignSourceCode(formData.sourceCode),
      [formData.sourceCode],
  );

  const selectableDiscounts = useMemo(
      () => filterSelectableDiscounts(discounts),
      [discounts],
  );

  const campaignCreatorDiscountOptions = useMemo(() => {
      if (!editingId || !formData.discountCode) return selectableDiscounts;
      const current = discounts.find((d) => d.code === formData.discountCode);
      if (current && !selectableDiscounts.some((d) => d.code === current.code)) {
          return [current, ...selectableDiscounts];
      }
      return selectableDiscounts;
  }, [discounts, selectableDiscounts, editingId, formData.discountCode]);

  const handleEditClick = (campaign: Campaign) => {
      setEditingId(campaign.id);
      setFormData({
          name: campaign.name,
          sourceCode: campaign.sourceCode,
          category: campaign.category as CampaignCategory,
          productId: campaign.targetProductId || '',
          discountCode: campaign.linkedDiscountCode || ''
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setFormData({ name: '', sourceCode: '', category: 'OTHER', productId: '', discountCode: '' });
  };

  const handleSave = async () => {
      if (!formData.name?.trim()) {
          showToast('Isi nama campaign dulu.', 'error');
          return;
      }

      if (!editingId) {
          const validation = validateCampaignSourceCode(formData.sourceCode);
          if (!validation.valid) {
              showToast(validation.issues[0] ?? 'Source tag tidak valid.', 'error');
              return;
          }

          try {
              await CampaignService.createCampaign({
                  name: formData.name,
                  sourceCode: validation.normalized,
                  category: formData.category,
                  targetProductId: formData.productId,
                  linkedDiscountCode: formData.discountCode
              });
              showToast('Campaign link generated successfully', 'success');
              handleCancelEdit();
              loadCampaignContext();
          } catch (error) {
              const raw = error instanceof Error ? error.message : 'Failed to save campaign';
              showToast(mapCampaignSourceCodeApiError(raw), 'error');
          }
          return;
      }

      try {
          await CampaignService.updateCampaign(editingId, {
              name: formData.name,
              category: formData.category,
              targetProductId: formData.productId,
              linkedDiscountCode: formData.discountCode
          });
          showToast('Campaign updated successfully', 'success');
          handleCancelEdit();
          loadCampaignContext();
      } catch (error) {
          const raw = error instanceof Error ? error.message : 'Failed to save campaign';
          showToast(mapCampaignSourceCodeApiError(raw), 'error');
      }
  };

  // --- EXCEL ACTIONS ---
  const handleDownloadTemplate = () => {
      const template = [{
          Name: 'My New Campaign',
          SourceCode: 'fb_ads_mar_25',
          Category: 'SOCIAL_MEDIA',
          'Target Product ID': 'PKG-2025-FULL',
          'Voucher Code': 'WELCOME20'
      }];
      ExcelHelper.exportToExcel(template, 'Campaign_Import_Template');
      showToast('Template downloaded.', 'info');
  };

  const handleExport = () => {
      const data = campaigns.map(c => ({
          Name: c.name,
          Source: c.sourceCode,
          Category: c.category,
          Clicks: c.clicks,
          Conversions: c.conversions,
          Revenue: c.revenue
      }));
      ExcelHelper.exportToExcel(data, `Campaigns_Report_${new Date().toISOString().split('T')[0]}`);
      showToast('Campaign report exported.', 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      try {
          const raw = await ExcelHelper.importFromExcel<any>(file);
          const items = raw
              .filter(r => r.Name && r.SourceCode)
              .map(r => ({
                  name: r.Name,
                  sourceCode: sanitizeCampaignSourceCodeInput(String(r.SourceCode ?? '')),
                  category: r.Category || 'OTHER',
                  targetProductId: r['Target Product ID'],
                  linkedDiscountCode: r['Voucher Code']
              }))
              .filter(r => validateCampaignSourceCode(r.sourceCode).valid);
          const result = await CampaignService.bulkUpsertCampaigns(items);
          await loadCampaignContext();
          showToast(`Imported ${result.total} campaigns.`, 'success');
      } catch (err) {
          const message = err instanceof Error ? err.message : 'Import failed.';
          showToast(message, 'error');
      }
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopyLink = (link: string) => {
      const fullUrl = `${window.location.origin}${link}`; 
      navigator.clipboard.writeText(fullUrl);
      showToast('Link copied to clipboard', 'success');
  };

  const handleConfirmDeleteCampaign = async () => {
      if (!campaignPendingDelete) return;
      setDeleteSubmitting(true);
      try {
          await CampaignService.deleteCampaign(campaignPendingDelete.id);
          showToast('Campaign deleted.', 'success');
          if (editingId === campaignPendingDelete.id) {
              handleCancelEdit();
          }
          setCampaignPendingDelete(null);
          await loadCampaignContext();
      } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete campaign';
          showToast(message, 'error');
      } finally {
          setDeleteSubmitting(false);
      }
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const getConversionRate = (clicks: number, conversions: number) => {
      if (clicks <= 0) return 0;
      const raw = (conversions / clicks) * 100;
      return Math.min(100, raw);
  };

  const categoryStats = useMemo(() => {
      const stats: Record<string, { revenue: number, clicks: number, conversions: number }> = {};
      campaigns.forEach(c => {
          if (!stats[c.category]) stats[c.category] = { revenue: 0, clicks: 0, conversions: 0 };
          stats[c.category].revenue += c.revenue;
          stats[c.category].clicks += c.clicks;
          stats[c.category].conversions += c.conversions;
      });
      return Object.keys(stats).map(key => ({
          name: key.replace('_', ' '),
          revenue: stats[key].revenue,
          conversionRate: getConversionRate(stats[key].clicks, stats[key].conversions)
      })).sort((a,b) => b.revenue - a.revenue);
  }, [campaigns]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

  return (
    <div className="page-container space-y-6 sm:space-y-8 animate-fade-in relative pb-24 min-w-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end min-w-0">
            <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Marketing & Growth</h1>
                <p className="text-slate-500 mt-1 text-sm sm:text-base">Campaign attribution, smart links, and AI-driven performance tracking.</p>
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end w-full lg:w-auto min-w-0">
                <div className="flex gap-1 items-center shrink-0">
                {canManageCampaigns('WRITE') && (
                    <>
                        <input type="file" ref={fileInputRef} hidden onChange={handleImport} accept=".xlsx,.xls"/>
                        <button onClick={handleDownloadTemplate} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg touch-target sm:min-h-0 sm:min-w-0" title="Template"><FileSpreadsheet size={18}/></button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg touch-target sm:min-h-0 sm:min-w-0" title="Import"><Upload size={18}/></button>
                    </>
                )}
                <button onClick={handleExport} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg touch-target sm:min-h-0 sm:min-w-0" title="Export"><Download size={18}/></button>
                </div>

                <div className="overflow-x-scroll-touch rounded-lg bg-slate-100 p-1">
                    <div className="inline-flex max-w-none flex-nowrap gap-1">
                    {canManageCampaigns('WRITE') && (
                        <button 
                            onClick={() => setActiveTab('create')}
                            className={`shrink-0 px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-all inline-flex items-center gap-2 whitespace-nowrap ${activeTab === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Link size={16} className="shrink-0" /> <span>Campaign Creator</span>
                        </button>
                    )}
                    {canManageCampaigns('WRITE') && (
                        <button 
                            onClick={() => setActiveTab('event')}
                            className={`shrink-0 px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-all inline-flex items-center gap-2 whitespace-nowrap ${activeTab === 'event' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CalendarHeart size={16} className="shrink-0" /> <span>Event Campaign</span>
                        </button>
                    )}
                    <button 
                        onClick={() => setActiveTab('analytics')}
                        className={`shrink-0 px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-all inline-flex items-center gap-2 whitespace-nowrap ${activeTab === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <BarChart3 size={16} className="shrink-0" /> <span>Smart Analytics</span>
                    </button>
                    </div>
                </div>
            </div>
        </div>

        {activeTab === 'event' && (
            <EventCampaignPanel
                products={products}
                discounts={selectableDiscounts}
            />
        )}

        {activeTab === 'create' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 min-w-0">
                {/* Creator Form */}
                <div className={`bg-white p-4 sm:p-6 rounded-xl border shadow-sm space-y-5 h-fit lg:sticky lg:top-4 transition-colors min-w-0 ${editingId ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                    <h3 className="font-bold text-slate-900 flex items-center justify-between">
                        <span className="flex items-center">
                            {editingId ? <Pencil size={18} className="mr-2 text-blue-600" /> : <Plus size={18} className="mr-2 text-blue-600" />}
                            {editingId ? 'Edit Campaign' : 'Create New Campaign'}
                        </span>
                        {editingId && (
                            <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
                        )}
                    </h3>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Campaign Name</label>
                        <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
                            placeholder="e.g. Instagram Ads Feb"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Campaign Category</label>
                        <select 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white"
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value as CampaignCategory})}
                        >
                            <option value="OTHER">Other / General</option>
                            <option value="SOCIAL_MEDIA">Social Media (IG, FB, TikTok)</option>
                            <option value="EMAIL_BLAST">Email Marketing</option>
                            <option value="OFFLINE_EVENT">Offline / Booth / Summit</option>
                            <option value="PODCAST">Podcast / Webinar</option>
                            <option value="PARTNER_REFERRAL">Partner Referral</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Source Tag {editingId && <span className="text-red-500 text-[10px] ml-1">(Read Only)</span>}
                        </label>
                        <div className="relative">
                            <Target size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none font-mono ${
                                  editingId
                                    ? 'bg-slate-100 text-slate-500 border-slate-200'
                                    : sourceCodeValidation.valid || !formData.sourceCode
                                      ? 'bg-slate-50 border-slate-300 focus:border-blue-500'
                                      : 'bg-red-50 border-red-300 focus:border-red-500'
                                }`}
                                placeholder="ig_ads_feb"
                                value={formData.sourceCode}
                                onChange={e => setFormData({
                                  ...formData,
                                  sourceCode: sanitizeCampaignSourceCodeInput(e.target.value),
                                })}
                                disabled={!!editingId}
                                aria-describedby="source-tag-help source-tag-error"
                            />
                        </div>
                        {!editingId && (
                          <>
                            <p id="source-tag-help" className="mt-1.5 text-[11px] text-slate-500">
                              {CAMPAIGN_SOURCE_CODE_RULES_HINT} Contoh:{' '}
                              <span className="font-mono text-slate-600">{CAMPAIGN_SOURCE_CODE_EXAMPLE}</span>
                            </p>
                            {sourceCodeValidation.wasAutoFixed && sourceCodeValidation.valid && (
                              <p className="mt-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                                Simbol diganti _. Hasil:{' '}
                                <span className="font-mono font-bold">{sourceCodeValidation.normalized}</span>
                              </p>
                            )}
                            {!sourceCodeValidation.valid && formData.sourceCode && (
                              <p id="source-tag-error" className="mt-1 text-[11px] text-red-600 font-medium">
                                {sourceCodeValidation.issues[0]}
                              </p>
                            )}
                          </>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Product</label>
                        <select 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white"
                            value={formData.productId}
                            onChange={e => setFormData({...formData, productId: e.target.value})}
                        >
                            <option value="">-- Redirect to Store Home --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Auto-Apply Voucher (Optional)</label>
                        <select 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white"
                            value={formData.discountCode}
                            onChange={e => setFormData({...formData, discountCode: e.target.value})}
                        >
                            <option value="">-- No Discount --</option>
                            {campaignCreatorDiscountOptions.map(d => (
                                <option key={d.id} value={d.code}>{d.code} ({d.value}{d.type === 'PERCENTAGE' ? '%' : ''} Off)</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={!editingId && (!formData.name.trim() || !sourceCodeValidation.valid)}
                        className={`w-full text-white py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed
                            ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'}
                        `}
                    >
                        {editingId ? (
                            <><Save size={16} className="mr-2" /> Update Campaign</>
                        ) : (
                            'Generate Smart Link'
                        )}
                    </button>
                </div>

                {/* Active Campaigns List */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
                    {/* Header with Search and Filter */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 min-w-0">
                        <div>
                            <h3 className="font-bold text-slate-900">Campaign Manager</h3>
                            <p className="text-xs text-slate-500">{filteredCampaigns.length} active links</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto min-w-0">
                            <div className="relative flex-1 min-w-0 sm:min-w-[12rem]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Search..." 
                                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="relative min-w-0 w-full sm:w-auto">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                <select 
                                    className="w-full sm:w-auto min-w-0 pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white cursor-pointer appearance-none"
                                    value={filterCategory}
                                    onChange={e => setFilterCategory(e.target.value)}
                                >
                                    <option value="ALL">All Categories</option>
                                    <option value="SOCIAL_MEDIA">Social Media</option>
                                    <option value="EMAIL_BLAST">Email Marketing</option>
                                    <option value="OFFLINE_EVENT">Offline Event</option>
                                    <option value="PODCAST">Podcast</option>
                                    <option value="PARTNER_REFERRAL">Partner</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Grid List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                        {filteredCampaigns.length === 0 ? (
                             <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                 <Search size={32} className="mx-auto mb-2 opacity-20"/>
                                 <p className="text-sm">No campaigns found matching filters.</p>
                             </div>
                        ) : filteredCampaigns.map(campaign => (
                            <div key={campaign.id} className={`bg-white p-4 sm:p-5 rounded-xl border shadow-sm hover:shadow-md transition-all relative group/card flex flex-col justify-between min-w-0 max-w-full ${editingId === campaign.id ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200'}`}>
                                
                                {canManageCampaigns('WRITE') && (
                                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleEditClick(campaign)}
                                            className="rounded-full p-2 text-slate-400 bg-slate-100/70 opacity-50 shadow-sm transition-all group-hover/card:opacity-100 group-hover/card:text-blue-600 group-hover/card:bg-blue-50 group-hover/card:shadow-md hover:!opacity-100 hover:!text-blue-600 hover:!bg-blue-50 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                            title="Edit Campaign"
                                        >
                                            <Pencil size={16} strokeWidth={2} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCampaignPendingDelete(campaign)}
                                            className="rounded-full p-2 text-slate-400 bg-slate-100/70 opacity-50 shadow-sm transition-all group-hover/card:opacity-100 group-hover/card:text-red-600 group-hover/card:bg-red-50 group-hover/card:shadow-md hover:!opacity-100 hover:!text-red-600 hover:!bg-red-50 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                            title="Delete Campaign"
                                        >
                                            <Trash2 size={16} strokeWidth={2} />
                                        </button>
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-start mb-3 pr-[4.5rem]">
                                        <div>
                                            <h4 className="font-bold text-slate-800 leading-tight">{campaign.name}</h4>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                <span className="text-[10px] font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                                                    src: {campaign.sourceCode}
                                                </span>
                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
                                                    {campaign.category.replace('_',' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-4 flex items-center gap-2 min-w-0 group/link">
                                        <code className="text-[10px] text-slate-500 min-w-0 flex-1 truncate block">{window.location.origin}{campaign.generatedLink}</code>
                                        <div className="flex gap-2 shrink-0">
                                            <button 
                                                onClick={() => handleCopyLink(campaign.generatedLink)}
                                                className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                                                title="Copy Link"
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button 
                                                onClick={() => setShowQrModal(campaign)} 
                                                className="text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-200 rounded"
                                                title="Show QR"
                                            >
                                                <QrCode size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-end justify-between gap-2 text-sm border-t border-slate-100 pt-3 mt-auto min-w-0">
                                    <div className="flex gap-3 sm:gap-4 min-w-0">
                                        <div className="text-center">
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Clicks</div>
                                            <div className="font-bold text-slate-700">{campaign.clicks}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Conv</div>
                                            <div className="font-bold text-green-600">{campaign.conversions}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Rate</div>
                                            <div className="font-bold text-blue-600">{getConversionRate(campaign.clicks, campaign.conversions).toFixed(1)}%</div>
                                        </div>
                                    </div>
                                    {campaign.linkedDiscountCode && (
                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold inline-flex items-center border border-green-200 shrink-0 max-w-full truncate">
                                            <Tag size={10} className="mr-1 shrink-0"/> {campaign.linkedDiscountCode}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* QR Code Modal for Campaign */}
        {campaignPendingDelete && (
            <div
                className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-campaign-title"
                onClick={() => !deleteSubmitting && setCampaignPendingDelete(null)}
            >
                <div
                    className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-scale-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 id="delete-campaign-title" className="text-lg font-bold text-slate-900">
                        Delete campaign?
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                        This removes <span className="font-semibold text-slate-800">{campaignPendingDelete.name}</span> and its tracking link. This cannot be undone.
                    </p>
                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            disabled={deleteSubmitting}
                            onClick={() => setCampaignPendingDelete(null)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={deleteSubmitting}
                            onClick={() => void handleConfirmDeleteCampaign()}
                            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
                        >
                            {deleteSubmitting ? 'Deleting…' : 'Delete campaign'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {showQrModal && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQrModal(null)}>
                <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center animate-scale-in" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold text-xl text-slate-900 mb-2">{showQrModal.name}</h3>
                    <p className="text-sm text-slate-500 mb-6">Scan to visit campaign landing page.</p>
                    
                     <QRCodeDisplay 
                        data={`${window.location.origin}${showQrModal.generatedLink}`}
                        size={200}
                        showLabel={false}
                        downloadFileName={`campaign-${showQrModal.id || showQrModal.name}`}
                     />

                    <button onClick={() => setShowQrModal(null)} className="mt-8 w-full bg-slate-900 text-white py-3 rounded-xl font-bold">
                        Close
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'analytics' && (
            <div className="space-y-6 sm:space-y-8 animate-fade-in min-w-0">
                {/* AI ADVISOR COMPONENT */}
                <AIMarketingAdvisor insights={aiInsights} analyzing={analyzing} />

                {/* OVERVIEW STATS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 min-w-0">
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><MousePointer2 size={20}/></div>
                            <span className="text-slate-500 text-sm font-medium">Total Traffic</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{campaigns.reduce((a,b) => a + b.clicks, 0)}</div>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><CheckCircle size={20}/></div>
                            <span className="text-slate-500 text-sm font-medium">Total Conversions</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{campaigns.reduce((a,b) => a + b.conversions, 0)}</div>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><DollarSign size={20}/></div>
                            <span className="text-slate-500 text-sm font-medium">Attributed Revenue</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{formatIDR(campaigns.reduce((a,b) => a + b.revenue, 0))}</div>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><PieIcon size={20}/></div>
                            <span className="text-slate-500 text-sm font-medium">Avg. Conversion</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">
                            {getConversionRate(
                                campaigns.reduce((a,b)=>a+b.clicks,0),
                                campaigns.reduce((a,b)=>a+b.conversions,0),
                            ).toFixed(2)}%
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:gap-8 min-w-0">
                    {/* CHANNEL EFFICIENCY CHART */}
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm min-w-0 overflow-hidden">
                        <h3 className="font-bold text-slate-900 mb-6">Channel Efficiency (Revenue)</h3>
                        <div className="h-72 sm:h-80 min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryStats} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                                    <YAxis tickFormatter={(val) => `Rp${val/1000000}M`} />
                                    <Tooltip formatter={(value: number) => formatIDR(value)} />
                                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                        {categoryStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {eventCampaignAnalytics ? (
                        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Users size={18} className="text-violet-600" />
                                Event Campaign Performance
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                {[
                                    ['Campaigns', eventCampaignAnalytics.totalCampaigns],
                                    ['Assignments', eventCampaignAnalytics.totalAssignments],
                                    ['Active', eventCampaignAnalytics.active],
                                    ['Pending login', eventCampaignAnalytics.pendingLogin],
                                    ['Converted', eventCampaignAnalytics.converted],
                                    ['Dismissed', eventCampaignAnalytics.dismissed],
                                    ['Skipped', eventCampaignAnalytics.skippedHasTicket],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg bg-violet-50 border border-violet-100 px-3 py-3">
                                        <div className="text-[10px] uppercase font-bold text-violet-500">{label}</div>
                                        <div className="text-xl font-bold text-slate-900">{value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        )}
    </div>
  );
};

export default Marketing;
