import { Campaign } from '../types/index';
import { APP_CONFIG } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';

const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: 'CMP-001',
    name: 'Instagram Launch',
    sourceCode: 'ig_launch_25',
    category: 'SOCIAL_MEDIA',
    targetProductId: 'PKG-2025-FULL',
    linkedDiscountCode: 'WELCOME20',
    generatedLink: '?product=PKG-2025-FULL&source=ig_launch_25&discount=WELCOME20',
    createdAt: '2025-01-01',
    clicks: 1250,
    conversions: 45,
    revenue: 1080000000
  },
  {
    id: 'CMP-002',
    name: 'Seminar Jakarta Booth',
    sourceCode: 'booth_jkt_01',
    category: 'OFFLINE_EVENT',
    targetProductId: 'PROD-SINGLE-A6',
    generatedLink: '?product=PROD-SINGLE-A6&source=booth_jkt_01',
    createdAt: '2025-02-15',
    clicks: 300,
    conversions: 2, 
    revenue: 5000000
  }
];

export const CampaignService = {
  getCampaigns: async (): Promise<Campaign[]> => {
    if (APP_CONFIG.USE_MOCK) {
        try {
            const isEmpty = await DevDatabase.isEmpty('campaigns');
            if(isEmpty) {
                await DevDatabase.bulkAdd('campaigns', SEED_CAMPAIGNS);
                return SEED_CAMPAIGNS;
            }
            return await DevDatabase.getAll<Campaign>('campaigns');
        } catch(e) { return SEED_CAMPAIGNS; }
    }
    if (!supabase) return [];
    const { data } = await supabase.from('campaigns').select('*');
    return data || [];
  },

  createCampaign: async (data: Partial<Campaign>): Promise<Campaign> => {
    const newCampaign: Campaign = {
        id: `CMP-${Date.now()}`,
        name: data.name || 'Untitled Campaign',
        sourceCode: data.sourceCode || `src_${Date.now()}`,
        category: data.category || 'OTHER',
        targetProductId: data.targetProductId,
        linkedDiscountCode: data.linkedDiscountCode,
        generatedLink: `?product=${data.targetProductId || ''}&source=${data.sourceCode || ''}${data.linkedDiscountCode ? `&discount=${data.linkedDiscountCode}` : ''}`,
        createdAt: new Date().toISOString(),
        clicks: 0,
        conversions: 0,
        revenue: 0
    };

    if (APP_CONFIG.USE_MOCK) {
        await DevDatabase.add('campaigns', newCampaign);
        return newCampaign;
    }

    if (!supabase) throw new Error("Supabase not configured");
    const { data: created, error } = await supabase.from('campaigns').insert(newCampaign).select().single();
    if (error) throw error;
    return created as Campaign;
  },

  updateCampaign: async (id: string, data: Partial<Campaign>): Promise<Campaign | null> => {
    if (APP_CONFIG.USE_MOCK) {
        const campaigns = await CampaignService.getCampaigns();
        const existing = campaigns.find(c => c.id === id);
        if (existing) {
            const updated = { ...existing, ...data };
            await DevDatabase.add('campaigns', updated);
            return updated;
        }
        return null;
    }

    if (!supabase) return null;
    const { data: updated, error } = await supabase.from('campaigns').update(data).eq('id', id).select().single();
    if (error) throw error;
    return updated as Campaign;
  },

  trackClick: async (source: string) => {
      if (APP_CONFIG.USE_MOCK) {
          const campaigns = await CampaignService.getCampaigns();
          const campaign = campaigns.find(c => c.sourceCode === source);
          if (campaign) {
              campaign.clicks++;
              await DevDatabase.add('campaigns', campaign);
          }
          return;
      }
      if (supabase) {
          supabase.rpc('increment_campaign_click', { source_code: source });
      }
  },

  trackConversion: async (source: string, amount: number) => {
      if (APP_CONFIG.USE_MOCK) {
          const campaigns = await CampaignService.getCampaigns();
          const campaign = campaigns.find(c => c.sourceCode === source);
          if (campaign) {
              campaign.conversions++;
              campaign.revenue += amount;
              await DevDatabase.add('campaigns', campaign);
          }
          return;
      }
      if (supabase) {
          supabase.rpc('increment_campaign_conversion', { source_code: source, amount });
      }
  }
};