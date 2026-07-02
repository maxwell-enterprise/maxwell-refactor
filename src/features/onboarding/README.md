# Onboarding Guide (My Zone)

Product tours for new **Member** users in **My Zone** only.

## Journey order

1. **Profile Settings** — while profile is incomplete (skip does not persist until saved)
2. **Sidebar / navbar** — right after profile is saved
3. **Dashboard** — when user opens Dashboard (sidebar tour must be done first)
4. **Wallet** — when user opens Wallet (sidebar tour must be done first)

## Add a tour to a new menu

1. Add `data-tour` attributes to target elements.
2. Create `src/features/onboarding/steps/<menu>.steps.ts`.
3. Register in `onboardingTourRegistry` and `onboardingViewMap` if view-specific.
4. Call `markViewReady()` after async content loads.
5. Update `resolveAutoStartTourId` if the tour has prerequisites.

## Storage keys

`localStorage`: `onboarding:<tour-id>:completed:<userId>`
