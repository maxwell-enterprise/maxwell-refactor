# components

Transitional compatibility layer. Implementations live here; features re-export from components.

## Shim structure

| Layer | Role |
|-------|------|
| **atoms/, molecules/, organisms/** | Design-system source (StatusBadge, StatCard, GlobalDialog, etc.) |
| **common/** | Thin re-exports for atoms/molecules/organisms (compatibility) |
| **auth/, admin/, store/, crm/, attendance/, etc.** | Domain components – canonical implementations |
| **features/*/ui, features/*/page** | Re-export from components; use features as preferred import for new code |

## Ownership

- **components** = source of truth during transition
- **features** = re-export shims that point to components
- No conversions to feature-based re-exports until implementations are migrated
