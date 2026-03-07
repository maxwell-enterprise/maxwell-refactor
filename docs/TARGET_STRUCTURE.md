# Target src/ structure

Reference for incremental, behavior-preserving migration. Not a rewrite.

---

## Target layout

```
src/
├── app/                                  # Next.js App Router entry only
│   ├── (public)/                         # public routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── (dashboard)/                       # authenticated / app shell routes
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── crm/
│   │   │   └── page.tsx
│   │   ├── finance/
│   │   │   └── page.tsx
│   │   ├── store/
│   │   │   └── page.tsx
│   │   ├── wallet/
│   │   │   └── page.tsx
│   │   ├── operations/
│   │   │   └── page.tsx
│   │   ├── attendance/
│   │   │   └── page.tsx
│   │   ├── communication/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   ├── robots.ts
│   └── sitemap.ts
│
├── features/
│   ├── dashboard/   (page, layout, ui, hooks, logic, providers, services, ...)
│   ├── crm/
│   ├── finance/
│   ├── store/
│   ├── wallet/
│   ├── operations/
│   ├── attendance/
│   ├── communication/
│   ├── auth/
│   ├── member/
│   ├── marketing/
│   ├── tribe/
│   ├── security/
│   ├── support/
│   ├── academy/
│   └── admin/
│
├── shared/           # cross-feature reusable (ui, hooks, utils, constants, types, lib)
├── providers/        # app-level providers only
├── services/         # shared business/integration services
├── repositories/     # persistence adapters (mock, supabase, indexeddb, contracts)
├── constants/
├── hooks/
├── types/
├── utils/
├── seeds/
├── lib/
└── styles/
```

---

## Current vs target (as of last cleanup)

| Area             | Current                                                                                                                        | Target                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| **app**          | `page.tsx`, `dashboard/page.tsx`, `dashboard/layout.tsx`                                                                       | Route groups `(public)`, `(dashboard)` with per-feature pages                |
| **features**     | dashboard, auth, crm, store, wallet, operations, attendance, communication, member, marketing, tribe, security, academy, admin | Same; target adds standard subfolders per feature                            |
| **shared**       | shared/ui/\* re-exports                                                                                                        | Full shared/ui (atoms, molecules, organisms, overlays, nav, feedback, forms) |
| **providers**    | context/\*, providers re-exports                                                                                               | providers/ with AuthProvider, DialogProvider, etc.                           |
| **services**     | services/_, services/shared/_                                                                                                  | Trimmed to truly shared only                                                 |
| **repositories** | src/repositories/\* (mock, supabase, contracts, indexeddb)                                                                     | Same                                                                         |
| **components**   | Legacy; features re-export from components                                                                                     | Transitional; eventually components → re-exports from features               |

---

## Migration guardrails

- Smaller safer steps preferred
- Behavior preservation > architectural purity
- Stop and report if a change risks altering behavior
- No redesign, rewrite, backend/state/visual migration
