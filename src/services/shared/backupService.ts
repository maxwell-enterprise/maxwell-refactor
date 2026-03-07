
import { DevDatabase } from '../../utils/devDatabase';
import { SeedService } from './seedService';

export interface BackupData {
    meta: {
        timestamp: string;
        version: string;
        source: string;
    };
    stores: Record<string, any[]>;
}

export const BackupService = {

    /**
     * Creates a full JSON snapshot of the IndexedDB and triggers a download.
     */
    createBackup: async (): Promise<void> => {
        console.log('[BACKUP] Starting full database export...');

        const storeNames = await DevDatabase.getStoreNames();
        const exportData: BackupData = {
            meta: {
                timestamp: new Date().toISOString(),
                version: '1.0',
                source: 'Maxwell Leadership Enterprise'
            },
            stores: {}
        };

        // Parallel fetch for speed
        await Promise.all(storeNames.map(async (name) => {
            try {
                const data = await DevDatabase.getAll(name);
                exportData.stores[name] = data;
            } catch (e) {
                console.warn(`[BACKUP] Skipping empty or inaccessible store: ${name}`);
                exportData.stores[name] = [];
            }
        }));

        // Trigger Download
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `maxwell_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('[BACKUP] Export complete.');
    },

    /**
     * Clears all existing data and repopulates from the provided JSON object.
     */
    restoreBackup: async (file: File): Promise<void> => {
        console.log('[RESTORE] Reading backup file...');

        const text = await file.text();
        const backup: BackupData = JSON.parse(text);

        if (!backup.stores) {
            throw new Error("Invalid backup file format. Missing 'stores' object.");
        }

        const storeNames = Object.keys(backup.stores);
        const availableStores = await DevDatabase.getStoreNames();

        // Sequential restore to avoid transaction locks
        for (const storeName of storeNames) {
            if (!availableStores.includes(storeName)) {
                console.warn(`[RESTORE] Store '${storeName}' does not exist in current schema. Skipping.`);
                continue;
            }

            const records = backup.stores[storeName];
            if (records.length > 0) {
                await DevDatabase.clear(storeName);
                await DevDatabase.bulkAdd(storeName, records);
            }
        }

        console.log('[RESTORE] Database restored successfully.');
    },

    /**
     * DANGER: Clears the entire database.
     */
    clearDatabase: async (): Promise<void> => {
        const stores = await DevDatabase.getStoreNames();
        for (const store of stores) {
            await DevDatabase.clear(store);
        }
        console.log('[RESET] Database cleared.');
    },

    /**
     * Orchestrates the "Factory Reset" flow: Backup -> Clear -> Reseed (Optional).
     */
    performFactoryReset: async (shouldReseed: boolean): Promise<void> => {
        // 1. Auto-Backup first for safety
        await BackupService.createBackup();

        // 2. Clear
        await BackupService.clearDatabase();

        // 3. Reseed if requested
        if (shouldReseed) {
            await SeedService.init();
        }
    }
};
