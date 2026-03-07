# repositories

Data-access layer for Maxwell. Contains repository implementations and contracts.

## Structure

```
repositories/
├── contracts/     # Repository interfaces (IMemberRepository, etc.) and TransactionQueryParams
├── mock/          # Mock implementations backed by DevDatabase (IndexedDB)
├── supabase/      # Supabase backend implementations
├── indexeddb/     # Placeholder for future dedicated IndexedDB adapters
└── index.ts       # RepositoryFactory and re-exports
```

## Runtime Selection

`RepositoryFactory` selects mock vs Supabase per domain based on `APP_CONFIG`:
- `USE_MOCK_GLOBAL` → all domains use mock
- `DOMAINS.<domain> === 'SUPABASE'` → use Supabase for that domain

Mock implementations use `DevDatabase` (IndexedDB via `utils/devDatabase`). No persistence semantics or runtime selection logic were changed in the migration.

## Compatibility

Existing imports from `services/repositories` continue to work via re-exports. New code should import from `@/repositories` or `repositories`.
