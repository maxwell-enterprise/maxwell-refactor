import { SystemConfig } from '../../types/index';
import { APP_CONFIG } from '../../lib/config';
import { DevDatabase } from '../../utils/devDatabase';
import { supabase } from '../../lib/supabaseClient';

const DEFAULT_CONFIG: SystemConfig = {
  payment: {
    bankName: 'BCA',
    accountNumber: '8735089123',
    accountHolder: 'PT Maxwell Leadership Indonesia'
  }
};

export const ConfigService = {
  getConfig: async (): Promise<SystemConfig> => {
    if (APP_CONFIG.USE_MOCK) {
        try {
            const data = await DevDatabase.getAll<any>('system_settings');
            const found = data.find(s => s.id === 'GLOBAL');
            return found ? found.config : DEFAULT_CONFIG;
        } catch (e) { return DEFAULT_CONFIG; }
    }

    // For Supabase, simplified logic (async issue in sync UI components addressed in paymentService)
    return DEFAULT_CONFIG;
  },

  getPaymentConfig: (): SystemConfig['payment'] => {
    // Legacy sync method for UI compatibility, assumes default or cached.
    // Real fetching happens in async methods.
    return DEFAULT_CONFIG.payment;
  },

  updatePaymentConfig: async (newConfig: Partial<SystemConfig['payment']>) => {
    const current = await ConfigService.getConfig();
    const updated = {
      ...current,
      payment: {
        ...current.payment,
        ...newConfig
      }
    };

    if (APP_CONFIG.USE_MOCK) {
        await DevDatabase.add('system_settings', { id: 'GLOBAL', config: updated });
    } else if (supabase) {
        await supabase.from('system_settings').upsert({ id: 'GLOBAL', config: updated });
    }

    return updated.payment;
  }
};
