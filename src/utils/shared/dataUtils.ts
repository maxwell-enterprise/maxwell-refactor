/**
 * DATA UTILITIES
 * Standardizes ID generation and Date formatting for Postgres/Supabase compatibility.
 */

export const DataUtils = {
    /**
     * Generates a UUID v4 string.
     * Compatible with Postgres 'uuid' column type.
     */
    generateID: (): string => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for older environments
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Returns current time in ISO 8601 format (UTC).
     * Compatible with Postgres 'timestamptz'.
     */
    nowISO: (): string => {
        return new Date().toISOString();
    },

    /**
     * Ensures a date string is fully ISO 8601 compatible.
     * Useful for migrating 'YYYY-MM-DD' to 'YYYY-MM-DDTHH:mm:ss.sssZ'
     */
    toISO: (dateInput: string | Date): string => {
        if (!dateInput) return new Date().toISOString();
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return new Date().toISOString(); // Fallback to now if invalid
        return d.toISOString();
    },

    /**
     * Extracts YYYY-MM for the legacy 'joinMonth' field from an ISO date.
     */
    toMonthStr: (isoDate: string): string => {
        return isoDate.slice(0, 7); // "2025-01"
    }
};
