# Maxwell v3 – Architecture & Clean Code

## Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS 4
- **Data (dev):** IndexedDB via `src/utils/devDatabase.ts` (single source for mock; no change to stores or logic)
- **Data (prod):** Supabase; repositories in `src/services/repositories/`

## Atomic Design (UI)

UI primitives follow Atomic Design. **Do not change UI or behaviour** when moving components; only change where they live and how they are imported.

| Layer      | Path                    | Role |
|-----------|--------------------------|------|
| **Atoms** | `src/components/atoms/` | Single-purpose primitives (badges, icons, labels). No composition of other components. |
| **Molecules** | `src/components/molecules/` | Small composites of atoms (e.g. StatCard: icon + title + value + optional change). |
| **Organisms** | `src/components/organisms/` | Complex sections: modals, sidebars, form blocks. |
| **Features** | `src/components/{admin, auth, crm, store, ...}/` | Feature-specific screens and flows; may use atoms/molecules/organisms. |
| **Common** | `src/components/common/` | Legacy shared pieces; re-exports from atoms/molecules/organisms where applicable. |

### Conventions

- **New reusable primitives** → add to `atoms/`, `molecules/`, or `organisms/` and export via the layer’s `index.ts`.
- **Feature-only UI** → keep under the relevant feature folder (e.g. `components/store/`, `components/admin/`).
- **Backward compatibility:** `components/common/StatusBadge.tsx`, `StatCard.tsx`, `GlobalDialog.tsx` re-export from the atomic layers so old imports still work.

## Folder Structure (high level)

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout + providers
│   ├── page.tsx            # Landing (/) – redirects to /dashboard when authenticated
│   └── dashboard/          # Dashboard route group
│       ├── layout.tsx      # Dashboard shell (optional wrapper)
│       └── page.tsx        # Main app shell (App.tsx)
├── components/
│   ├── atoms/              # Atomic Design – atoms
│   ├── molecules/          # Atomic Design – molecules
│   ├── organisms/          # Atomic Design – organisms
│   ├── common/             # Shared / re-exports
│   ├── admin/              # Admin feature components
│   ├── auth/               # Auth UI
│   ├── store/              # Store/catalog
│   ├── crm/                # CRM
│   ├── finance/            # Finance
│   └── ...
├── context/                # React context (Auth, Security, Toast, Dialog)
├── layouts/                # Page-level layouts (e.g. DashboardLayout)
├── lib/                    # Config, Supabase client
├── scopes/                 # Scope-based entry (e.g. dashboard)
├── services/               # Business logic, repositories, API
├── types/                  # Shared TypeScript types
└── utils/                  # Helpers (incl. devDatabase for IndexedDB)
```

## Clean Code Conventions

1. **Naming**
   - Components: PascalCase.
   - Files for a single component: same name as component (e.g. `StatusBadge.tsx`).
   - Utils/hooks: camelCase.

2. **Imports**
   - Prefer canonical atomic paths for design-system usage:
     - `from '@/components/atoms/StatusBadge'` or `from '@/components/atoms'`
     - `from '@/components/molecules/StatCard'` or `from '@/components/molecules'`
     - `from '@/components/organisms/GlobalDialog'` or `from '@/components/organisms'`
   - Types from `@/types` or `@/types/index`.

3. **IndexedDB / data**
   - Do not change `DevDatabase` store names, schema, or usage.
   - Repositories in `services/repositories/` stay the single abstraction over mock vs Supabase.

4. **No breaking changes**
   - Refactors are structure-only: move/re-export and update imports.
   - UI, logic, and IndexedDB behaviour remain unchanged.
