# Database Design Standards

## Principles
1. **Primary Keys:** Always use `UUID` type. Do not use auto-increment integers.
2. **Naming Convention:**
   - Tables: `snake_case`, plural (e.g., `member_wallets`, `event_logs`).
   - Columns: `snake_case` (e.g., `user_id`, `created_at`).
   - No camelCase in SQL.
3. **Relationships:**
   - Use Junction Tables (Many-to-Many) for flexible relationships (e.g., Events <-> Tags).
   - Avoid storing JSON arrays for foreign keys (e.g., avoid `tags: ["ID_1", "ID_2"]`).
4. **Audit:**
   - Critical transactional tables must have `created_at` and `updated_at`.
   - Financial/Credit movements must use an append-only Ledger table (`wallet_transactions`), never just update the balance column directly.