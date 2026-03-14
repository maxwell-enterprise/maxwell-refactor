# Event Management Service Progress

Last updated: 2026-03-10
Scope: repository study for event management, with emphasis on CRUD flow in `src/components/ops/*`

## Current understanding

Primary event admin UI lives in `src/components/EventsOps.tsx`.

This screen owns:
- Event list and hierarchy views
- Create and edit modal state
- Delete and series delete behavior
- Gate configuration modal launch
- Projector QR mode launch
- Master tier management tab

The CRUD-heavy subcomponents under `src/components/ops/events/` are:
- `EventForm.tsx`
- `EventListItem.tsx`
- `TierManager.tsx`
- `SessionLogisticsManager.tsx`
- `MasterTierConfig.tsx`

## Core data flow

UI path:
`EventsOps` -> `EventForm` / `EventListItem` / `GateConfigModal` / `MasterTierConfig`

Service path:
`EventsOps` -> `DataService`
`MasterTierConfig` -> `ReferenceService`
`GateConfigModal` -> `DataService` + `ReferenceService` + `UserService`

Persistence path:
`DataService` -> `RepositoryFactory.getEventRepository()`
`ReferenceService` -> `DevDatabase` in mock mode, `supabase` in real mode

Repositories:
- Mock events: `src/repositories/mock/mockEventRepository.ts`
- Supabase events: `src/repositories/supabase/supabaseEventRepository.ts`

## Event domain model

Main event type is defined in `src/types/index.ts` and duplicated in `src/core/types/index.ts`.

Important fields for CRUD:
- `type`: `SOLO | CONTAINER | SESSION`
- `parentEventId`
- `admissionPolicy`
- `creditTags`
- `tiers`
- `selectionConfig`
- `gates`
- `sessions`
- `locationMode`
- `isVisibleInCatalog`
- `doneTag`

Supporting embedded types:
- `EventTierDefinition`
- `EventGateConfig`
- `OperationalSession`
- `EventSelectionConfig`

## CRUD flow in ops components

### Create

Create starts in `EventsOps.handleOpenCreate()`.

Default payload includes:
- `type: 'SOLO'`
- `admissionPolicy: 'PRE_BOOKED'`
- one default tier
- `locationMode: 'OFFLINE'`
- recurring defaults
- `isVisibleInCatalog: true`

Save path:
1. `EventForm` collects data in local `formData`
2. `EventForm.handleSave()` performs minimal guard checks
3. `EventsOps.handleSaveEvent()` performs higher-level validation
4. tags from `creditTags` and tier `grantTagIds` are merged
5. new ID is generated as `EVT-${Date.now()}`
6. `DataService.upsertEvent(eventToSave)`

### Read

`EventsOps.loadEvents()` calls `DataService.getEvents()`.

Derived views:
- flat list
- hierarchy view grouped into series containers, recurring items, and independent events
- child session lookup via `parentEventId`
- orphan candidates for linking into a container

Reference reads:
- `ReferenceService.getMasterTiers()`
- `CertificationService.getMasterTags()`
- `CreditTagService.getTagOptions()`

### Update

Edit starts in `EventsOps.handleOpenEdit(event)`.

Behavior:
- event is deep-cloned with `JSON.parse(JSON.stringify(event))`
- passed into `EventForm`
- save reuses `handleSaveEvent()`
- existing event is merged with partial edits before `upsert`

Update also exists in side flows:
- `GateConfigModal.handleSave()` writes updated `event.gates`
- `TagManagement` updates `event.creditTags` and `event.tiers`
- `EventsOps.handleManageChild()` links or unlinks child events by mutating `parentEventId` and `type`

### Delete

Single delete:
- `EventsOps.handleClickDelete()`
- confirmation via `useDialog()`
- `processDelete()` -> `DataService.deleteEvent(id)`

Container delete:
- if container has children, UI only offers unlink strategy in this flow
- `handleSeriesDelete(seriesId, 'ORPHAN')`
- `DataService.deleteSeries()`:
  - `CASCADE`: delete children first, then parent
  - `ORPHAN`: convert children to `SOLO`, clear `parentEventId`, then delete parent

## Subcomponent responsibilities

### `EventForm.tsx`

Tabbed editor with:
- `GENERAL`
- `LOCATION`
- `ACCESS`
- `TIERS`
- `LOGISTICS`
- `HIERARCHY`

Important rules:
- `SESSION` requires `parentEventId`
- `isVisibleInCatalog` defaults to true if undefined
- tier tags are auto-synced into `creditTags`
- container-specific `selectionConfig` supports `BUNDLE` vs `OPTION`

Note:
- `orphanEvents`, `linkedChildren`, and `onManageChild` are passed in, but current `EventForm` implementation does not render child-link management UI. The prop contract exists, but the UI surface appears incomplete or removed.

### `EventListItem.tsx`

Read-only row renderer with actions:
- edit
- delete
- gate config
- projector mode

Also shows derived state badges:
- past event
- hidden from catalogue
- container option-selection config
- admission policy
- recurring state
- done tag
- online mode

### `TierManager.tsx`

Handles event tier CRUD inside the form.

Capabilities:
- add/remove tier
- update name and quota
- load preset from master tiers
- manage `grantTagIds`
- for `CONTAINER`, optionally bundle child event tiers

Notable implementation detail:
- `bundleEventId` and `bundleTierId` are global local state, not per-tier row

### `SessionLogisticsManager.tsx`

Handles CRUD for `sessions`.

Capabilities:
- add operational session
- update name/start/end
- remove session

Used only when event type is not `CONTAINER`.

### `MasterTierConfig.tsx`

Separate CRUD screen for `ref_master_tiers`.

Save path:
- `ReferenceService.upsertMasterTier()`

Delete path:
- `ReferenceService.deleteMasterTier()`

## Related downstream features

These consume event admin data and matter when changing CRUD behavior:

- `src/components/attendance/GateConfigModal.tsx`
  - persists `event.gates`
- `src/components/attendance/GateScannerView.tsx`
  - reads `DataService.getEvents()`
  - gatekeeper visibility depends on assigned gate user IDs
- `src/services/attendanceService.ts`
  - validates entry using `event.creditTags`, `event.parentEventId`, `event.gates`, and admission policy
- `src/components/EventMarketplace.tsx`
  - reads `DataService.getEvents()`
  - respects `isVisibleInCatalog !== false`
  - uses container/session hierarchy
- `src/components/admin/TagManagement.tsx`
  - edits `creditTags` and tier `grantTagIds`
  - reuses `EventForm`

## Important architectural gaps

### 1. Mixed source of truth for events

Admin CRUD writes through repositories and `DataService`, but some consumers still read static seed data from `EVENTS_DATA`.

Confirmed examples:
- `src/components/events/EventsCatalog.tsx`
- `src/components/attendance/MemberAttendanceScanner.tsx`
- `src/services/qrService.ts`

Impact:
- changes made in Event Ops may not appear in every event-related feature
- attendance or catalog behavior can drift from admin-edited data

### 2. Event types are duplicated

`src/types/index.ts` and `src/core/types/index.ts` both define event types/interfaces.

Impact:
- drift risk when fields change
- future refactors should consolidate or enforce a single canonical export

### 3. Props for child management exist but UI is missing

`EventsOps` computes:
- `availableOrphans`
- `currentLinkedChildren`
- `handleManageChild`

These are passed into `EventForm`, but current `EventForm` does not render a control for linking/unlinking child events.

Impact:
- container-child management is only partially implemented
- hierarchy CRUD is incomplete from the modal even though controller logic exists

### 4. Gate tier matching is heuristic

`attendanceService.validateGateEntry()` compares gate tiers and ticket tier with loose string matching.

Impact:
- mismatch risk when tier IDs are UUID-like but gate rules use human labels such as `GENERAL` or `VIP`

### 5. Mock repository no longer reseeds automatically

`MockEventRepository.getAll()` intentionally returns actual IndexedDB state and does not fallback to `EVENTS_DATA` when empty.

Impact:
- empty event DB is now a valid state
- useful to know before debugging "missing events" in mock mode

## Files most important for future work

- `src/components/EventsOps.tsx`
- `src/components/ops/events/EventForm.tsx`
- `src/components/ops/events/TierManager.tsx`
- `src/components/ops/events/SessionLogisticsManager.tsx`
- `src/components/ops/events/EventListItem.tsx`
- `src/components/ops/events/MasterTierConfig.tsx`
- `src/components/attendance/GateConfigModal.tsx`
- `src/services/dataService.ts`
- `src/services/referenceService.ts`
- `src/services/attendanceService.ts`
- `src/services/qrService.ts`
- `src/repositories/mock/mockEventRepository.ts`
- `src/repositories/supabase/supabaseEventRepository.ts`
- `src/types/index.ts`
- `src/constants/schema/ops_events.ts`

## Recommended next steps

1. Restore or implement UI for child linking/unlinking inside `EventForm` hierarchy tab, because controller support already exists.
2. Remove remaining `EVENTS_DATA` direct reads from event-facing features and standardize on `DataService.getEvents()`.
3. Normalize gate tier matching to one canonical identifier, ideally tier IDs or stable tier codes.
4. Consolidate duplicated event type definitions between `src/types/index.ts` and `src/core/types/index.ts`.
5. If deeper CRUD changes are planned, inspect invitation and entitlement flows next because container selection and tier grants affect wallet issuance.

## Session note

This file was created as a restart checkpoint so the next Codex session can continue without re-mapping the event management area from zero.
