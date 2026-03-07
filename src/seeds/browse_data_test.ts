
import { SecurityAuditLog } from '../types/security';

// Seed data specifically designed to test the "Browse Data" grid layout and Excel Export
export const BROWSE_DATA_TEST_SEED: SecurityAuditLog[] = [
    { 
        id: 'LOG-TEST-001', 
        timestamp: new Date().toISOString(), 
        actor: 'Super Admin', 
        action: 'SCHEMA_VIEW', 
        details: 'Accessed Schema Browser' 
    },
    { 
        id: 'LOG-TEST-002', 
        timestamp: new Date(Date.now() - 3600000).toISOString(), 
        actor: 'System', 
        action: 'AUTO_BACKUP', 
        details: 'Hourly backup completed successfully.' 
    },
    { 
        id: 'LOG-TEST-003', 
        timestamp: new Date(Date.now() - 7200000).toISOString(), 
        actor: 'Finance User', 
        action: 'EXPORT_REPORT', 
        details: 'Exported P&L Statement to Excel.' 
    },
    { 
        id: 'LOG-TEST-004', 
        timestamp: new Date(Date.now() - 86400000).toISOString(), 
        actor: 'API_BOT', 
        action: 'SYNC_FAIL', 
        details: 'Connection timeout on Payment Gateway sync.' 
    },
    { 
        id: 'LOG-TEST-005', 
        timestamp: new Date(Date.now() - 172800000).toISOString(), 
        actor: 'Super Admin', 
        action: 'ROLE_UPDATE', 
        details: 'Modified permissions for Sales Role.' 
    }
];
