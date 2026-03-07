# shared

App-wide shared services. These are not feature-owned and are used across the application.

| Service | Purpose |
|---------|---------|
| **SeedService** | App startup IndexedDB seeding. Used by App.tsx, BackupService, SystemMaintenance. |
| **ConfigService** | System config (payment, etc.). Used by paymentService, schemaService. |
| **BackupService** | IndexedDB backup/restore and factory reset. Admin utility. |

Compatibility re-exports remain at `services/seedService`, `services/configService`, `services/backupService`.
