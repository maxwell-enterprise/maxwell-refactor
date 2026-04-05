# Repository Guidelines

## Project Structure & Module Organization
`src/app/` contains the Next.js 16 App Router entrypoints, including `layout.tsx`, `page.tsx`, and route folders such as `dashboard/`. Shared business logic lives in `src/services/`, data access adapters in `src/repositories/`, and typed contracts in `src/types/` and `src/core/types/`. UI is split between feature folders like `src/features/finance/`, `src/features/crm/`, and atomic layers under `src/shared/ui/` and `src/components/{atoms,molecules,organisms}/`. Static assets live in `public/`; architecture notes and migration context live in `docs/` and `ARCHITECTURE.md`.

## Build, Test, and Development Commands
Use `npm run dev` to start the local dev server on `http://localhost:3000`. Use `npm run build` to produce the production bundle and catch App Router or type-integrity issues during compilation. Use `npm run start` to serve the built app locally. Use `npm run lint` to run the repository ESLint config (`eslint.config.mjs`) against the codebase.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation and keep files ASCII unless the file already uses Unicode. Components, layouts, and providers use PascalCase file names such as `DashboardShellLayout.tsx`; hooks and utilities use camelCase such as `useTicketLogic.ts` and `financeService.ts`. Prefer the `@/` path alias from `tsconfig.json` over long relative imports. Keep reusable UI in the atomic/shared layers; feature-specific screens stay inside their feature folder.

## Testing Guidelines
There is no dedicated automated test runner configured in `package.json` yet. For now, treat `npm run lint` and `npm run build` as the minimum validation gate for every change. Use data fixtures in `src/seeds/` to verify workflows manually, and add any new seed files with descriptive names ending in `_test.ts` or matching the feature they exercise.

## Commit & Pull Request Guidelines
Recent history uses short, imperative subjects such as `feat: upload brief for system` and `fixing lint`. Prefer concise commit messages with a clear action, ideally using a lightweight conventional prefix like `feat:`, `fix:`, or `refactor:`. Pull requests should include a short scope summary, linked issue or task ID when available, validation notes (`npm run lint`, `npm run build`), and screenshots for UI changes.

## Security & Configuration Tips
Keep secrets in `.env.local` only; do not commit Supabase or Gemini credentials. Check `src/lib/config.ts` before changing backend wiring: data domains default to Nest `API` via `NEXT_PUBLIC_API_BASE_URL`; Supabase is optional for AUTH/CMS/WA; per-domain overrides use `NEXT_PUBLIC_<DOMAIN>_BACKEND`.

## Code Implementation IMPORTANT!!

- Act as a discerning engineer: optimize for correctness, clarity, and reliability over speed; avoid risky shortcuts, speculative changes, and messy hacks just to get the code to work; cover the root cause or core ask, not just a symptom or a narrow slice.
- Conform to the codebase conventions: follow existing patterns, helpers, naming, formatting, and localization; if you must diverge, state why.
- Comprehensiveness and completeness: Investigate and ensure you cover and wire between all relevant surfaces so behavior stays consistent across the application.
- Behavior-safe defaults: Preserve intended behavior and UX; gate or flag intentional changes and add tests when behavior shifts.
- Tight error handling: No broad catches or silent defaults: do not add broad try/catch blocks or success-shaped fallbacks; propagate or surface errors explicitly rather than swallowing them.
  - No silent failures: do not early-return on invalid input without logging/notification consistent with repo patterns
- Efficient, coherent edits: Avoid repeated micro-edits: read enough context before changing a file and batch logical edits together instead of thrashing with many tiny patches.
- Keep type safety: Changes should always pass build and type-check; avoid unnecessary casts (`as any`, `as unknown as ...`); prefer proper types and guards, and reuse existing helpers (e.g., normalizing identifiers) instead of type-asserting.
- Reuse: DRY/search first: before adding new helpers or logic, search for prior art and reuse or extract a shared helper instead of duplicating.
- Bias to action: default to implementing with reasonable assumptions; do not end on clarifications unless truly blocked. Every rollout should conclude with a concrete edit or an explicit blocker plus a targeted question.
