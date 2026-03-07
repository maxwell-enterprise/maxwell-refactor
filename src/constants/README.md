# constants

App constants and reference data.

## Ownership

| Location | Ownership |
|----------|-----------|
| **../constants.ts** | Root constants (MEMBER_DATA, EVENTS_DATA, STORE_PRODUCTS, etc.) – mock seed data |
| **database.ts** | VIRTUAL_DB, TABLE_METADATA – schema/mock structure |
| **securityDefs, tagRegistry, opsCatalog, etc.** | Domain-specific; candidates for feature migration |
| **schema/** | Schema definitions by domain |

No moves in this batch. Structure preserved for later feature migration.
