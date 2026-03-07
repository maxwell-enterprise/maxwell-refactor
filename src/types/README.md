# types

Shared and domain type definitions.

## Ownership

| Location | Ownership |
|----------|-----------|
| **index.ts** | Core shared types (Member, Event, Product, Transaction, ViewState, UserRole, etc.) used across features |
| **gamification.ts, payment.ts, ops.ts, etc.** | Domain-specific; candidates for feature migration |

No moves in this batch. Domain type files will be migrated with their features.
