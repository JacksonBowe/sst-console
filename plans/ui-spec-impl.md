# SST Console UI Specification Implementation Plan

## Verdict

Current Quasar stack can deliver full UI specification. Existing `ui/` covers core mechanics, but not Console design system yet.

### Reusable now

- Auth flows: `Auth/*`
- Shell pieces: `AppHeader`, `AppDrawer`, `AppDrawerItem`
- Tables: `BaseTable`, toolbar, search, filters
- Inputs/selects: `SInput`, `SPasswordInput`, `SSelect`
- Confirmation/form dialogs: `Dialog/*`
- Basic page/header scaffolding: `Dashboard/*`
- Expansion behavior: `SExpansionSection`
- Date formatting and notifications

### Needed

- Stable Console shell
- Breadcrumbs, entity headers, metadata grids
- Status badges
- Empty/error/loading-state patterns
- Copyable identifier control
- App summary rows
- Resource split-pane explorer
- Operation cards/results
- Typed frontend API/data layer
- Working theme state/persistence

Do not use `JsonPreview` for product UI. UI spec explicitly forbids raw state presentation.

## Existing Component Audit

| Existing component | Fit | Plan |
| --- | --- | --- |
| `Auth/CognitoAuth.vue` | Strong | Keep. Change surrounding `AuthLayout` only. Existing Cognito flows match spec. |
| `App/AppHeader.vue` | Partial | Reuse as shell header base. Add Console-specific content and token-based styling. |
| `Drawer/AppDrawer.vue` | Strong | Reuse for persistent desktop and overlay mobile sidebar. |
| `Drawer/AppDrawerItem.vue` | Strong | Reuse for Apps, Accounts, Users, Operations navigation. |
| `Dashboard/DashboardPage.vue` | Weak | Refactor or replace. Fixed `height: 100dvh` and `overflow: hidden` conflict with normal scrolling entity pages. |
| `Dashboard/DashboardPageHeader.vue` | Partial | Replace with richer entity header: breadcrumbs, icon, title, status, subtitle, actions. |
| `Table/BaseTable.vue` | Strong | Reuse for App Stages, Accounts, Account Stages, Users. Add server-pagination support and row-navigation/accessibility behavior. |
| `Table/TableToolbar.vue` | Strong | Reuse for Users filtering and Resource tree search. |
| `Table/TableSearch.vue` | Partial | Reuse visual input pattern only. Current generic local-filter behavior does not match all API contracts. |
| `Table/TableFilter.vue` | Partial | Reuse for multi-select filters where appropriate. User API filters are single-value server query fields, so use compact dedicated controls there. |
| `Dialog/DialogConfirm.vue` | Strong | Reuse/refine for sync, remove-user, recovery, backup confirmations. |
| `Dialog/DialogForm.vue` | Partial | Reuse for Invite User after visual alignment. |
| `Dialog/DialogTrigger.vue` | Partial | Usable, but pages may call Quasar Dialog directly for clearer typed dialog flows. |
| `Input/SInput.vue` | Strong | Reuse for filters, invite form, code/copy workflow. |
| `Select/SSelect.vue` | Strong | Reuse for account selection in Operations. |
| `Expansion/SExpansionSection.vue` | Poor for explorer | Do not use for Resource Explorer. Card-like expanded sections conflict with dense nested tree requirement. May remain for future generic disclosure content. |
| `PillTabs/PillTabs.vue` | Optional | Keep. Not required by MVP spec. Do not force tabs into entity pages. |
| `theme/ThemeToggle.vue` | Incomplete | Renders icon only; no theme change, persistence, or click behavior. Complete it. |
| `toast.ts`, `handleApiError()` | Partial | Keep only for transient confirmation. Add persistent inline result/error states for page mutations. |
| `format.ts` | Partial | Extend with relative timestamp, invalid/missing timestamp handling, and identifier formatting helpers. |
| `form/*` | Optional | `useForm` useful for Invite User. `useEntityForm` and unsaved-change guard are unnecessary for current read-heavy MVP. |

## Contract Gaps

Frontend can render most screens from current API. Some spec fields need API contract work before UI should claim support.

### Available now

| Screen | Current endpoint support |
| --- | --- |
| Home / Apps | `GET /apps` |
| App Detail | `GET /apps/:appName` |
| Stage Detail / Resource tree | `GET /apps/:appName/stages/:stageName` |
| Accounts list | `GET /accounts` |
| Account Detail | `GET /accounts/:accountId` |
| Account sync | `POST /accounts/:accountId/sync` |
| Users list/invite/remove | `GET`, `POST`, `DELETE /users` |
| Operations recovery | `POST /accounts/recover` |
| Operations backup | `POST /accounts/backup-connections` |

### Required contract fixes

#### Typed SDK methods

`@sst-console/sdk` exposes auth methods only. Console pages would otherwise call untyped `api.request()` manually.

Add typed SDK methods and response types for:

- Apps: list, inspect, inspect stage
- Accounts: list, inspect, sync, recover, backup connections
- Users: list, invite, remove

Build Vue Query composables from typed SDK methods.

#### Accounts list fields

`GET /accounts` returns account ID, region, role ARN, connection status. It does not return `lastSyncedAt`, `createdAt`, or `updatedAt`.

Either extend account-list response with safe timestamp fields, recommended, or omit those columns until API supplies them. Do not fake freshness from unrelated timestamps.

#### Account Detail stage rows

`GET /accounts/:accountId` returns app/stage grouping and resource trees. Stage rows do not explicitly include region, account ID, or resource count.

Add:

- `region`
- `accountId`
- `resourceCount`
- existing latest snapshot and timestamps

Recommended: backend returns display-ready stage summaries rather than frontend recursively counting resource-tree children.

#### Connector onboarding values

Connect Account needs real installation data. Infra already produces connector Quick Create URL, template URL, collector role ARN, registration role ARN, and external ID. Web currently receives only API endpoint and password policy.

Before Connect Account screen:

- expose only safe intended client values through StaticSite environment;
- add corresponding `ImportMetaEnv` types;
- use Quick Create URL as primary CTA;
- include copyable connector/template values only where product wants users to see them.

Do not render nonfunctional setup instructions or placeholder URLs.

#### User email filtering

`GET /users?email=` accepts exact valid email. It is not a partial text-search API.

Initial Users screen should label this control accurately as exact-match **Email**. Do not present generic substring search.

## Target Frontend Structure

```text
packages/web/src/
  layouts/
    AuthLayout.vue
    ConsoleLayout.vue

  pages/
    AuthPage.vue
    AppsPage.vue
    AppDetailPage.vue
    StageDetailPage.vue
    AccountsPage.vue
    ConnectAccountPage.vue
    AccountDetailPage.vue
    UsersPage.vue
    OperationsPage.vue
    ErrorNotFound.vue

  composables/
    apps.ts
    accounts.ts
    users.ts
    operations.ts
    theme.ts
    copy.ts

  router/
    routes.ts

  components/ui/
    App/
      AppHeader.vue
      ConsoleSidebar.vue
      ConsoleUserMenu.vue

    Page/
      ConsolePage.vue
      PageBreadcrumbs.vue
      EntityPageHeader.vue
      EntityMetadata.vue
      ContentSurface.vue

    State/
      StatusBadge.vue
      EmptyState.vue
      ErrorState.vue
      PageSkeleton.vue
      ActionResult.vue

    Identifier/
      CopyValue.vue
      TimestampValue.vue

    Apps/
      AppSummaryRow.vue
      StagePreview.vue

    ResourceExplorer/
      ResourceExplorer.vue
      ResourceTree.vue
      ResourceTreeItem.vue
      ResourceDetails.vue
      types.ts

    Operations/
      OperationCard.vue
```

Component folder names can vary, but new components must stay domain-neutral unless truly App- or Resource-specific.

# Shared Design Foundation Plan

## Phase 0 — API and data foundation

Complete before page work.

1. Extend SDK with typed non-auth API methods.
2. Export endpoint response types from SDK.
3. Create Vue Query composables:
   - `useApps()`
   - `useApp(appName)`
   - `useStage(appName, stageName)`
   - `useAccounts()`
   - `useAccount(accountId)`
   - `useSyncAccount()`
   - `useRecoverAccounts()`
   - `useBackupConnections()`
   - `useUsers(filters)`
   - `useInviteUser()`
   - `useRemoveUser()`
4. Define stable query keys:
   - `['apps']`
   - `['apps', appName]`
   - `['stages', appName, stageName]`
   - `['accounts']`
   - `['accounts', accountId]`
   - `['users', filters]`
5. Define mutation invalidation:
   - sync invalidates accounts, target account, apps, target app/stage paths;
   - recovery invalidates accounts and apps;
   - invite/remove invalidates users.
6. Preserve API errors in query/mutation state. Do not rely only on `Notify`.

**Done when:** blank page can request every supported API with typed calls and consistent loading/error state.

## Phase 1 — Theme tokens and application shell

### Theme

1. Add global design tokens in `packages/web/src/css/app.scss`.
2. Define semantic CSS variables for both light/dark:
   - page background
   - content surface
   - navigation surface
   - border
   - primary/secondary text
   - muted text
   - focus ring
   - status colors
3. Keep Quasar semantic colors aligned with design spec:
   - positive = connected/success
   - warning = caution
   - negative = disconnected/destructive
   - info = active/informational
4. Make `ThemeToggle` functional:
   - switch Quasar `Dark` state;
   - persist preference locally;
   - restore preference during app startup;
   - provide correct accessible label/state.

### Console shell

1. Replace Quasar starter `MainLayout` with `ConsoleLayout`.
2. Remove starter content:
   - Quasar version display
   - Essential Links
   - starter `EssentialLink.vue` if no longer referenced
3. Build persistent sidebar using `AppDrawer` and `AppDrawerItem`.
4. Sidebar routes:
   - Apps → `/`
   - Accounts → `/accounts`
   - Users → `/users`
   - Operations → `/operations`
5. Sidebar footer:
   - theme toggle
   - current user email when session exposes it
   - sign-out action
6. Add compact top app bar only where needed:
   - mobile menu trigger
   - mobile product identity
   - optional global user controls
7. Desktop: sidebar remains visible.
8. Mobile: drawer becomes overlay; route selection closes it.
9. Ensure page container scrolls normally.

### Router

1. Replace starter `/second` route.
2. Add routes:
   - `/`
   - `/apps/:appName`
   - `/apps/:appName/stages/:stageName`
   - `/accounts`
   - `/accounts/connect`
   - `/accounts/:accountId`
   - `/users`
   - `/operations`
3. Add route names for all navigation and typed route helpers where practical.
4. Keep App, Stage, Account Detail routes contextual; no sidebar entries.
5. Place authenticated 404 beneath Console shell.
6. Keep unauthenticated/login 404 behavior intentional.

**Done when:** authenticated navigation, theme, route active state, mobile navigation, and logout work before any data screen exists.

## Phase 2 — Shared page and state primitives

Build before screen-specific components.

### `ConsolePage`

Replace fixed-height `DashboardPage` behavior.

Requirements:

- normal vertical scroll
- responsive content padding
- page width suitable for dense tables
- no forced viewport height except optional empty-state centering
- no clipped page content

### `PageBreadcrumbs`

Requirements:

- compact secondary hierarchy
- accepts typed segments with label and optional route target
- current segment non-clickable
- long names truncate safely
- hide/reduce gracefully on narrow viewports

Examples:

- `Apps`
- `Apps / mafia`
- `Apps / mafia / production`
- `Accounts / 123456789012`

### `EntityPageHeader`

Requirements:

- optional entity icon
- title
- optional status badge
- supporting subtitle/identity
- upper-right action slot
- responsive action wrapping/overflow
- no huge heading/hero treatment

### `EntityMetadata`

Requirements:

- compact key/value grid
- values support link, text, timestamp, status, copyable identifier
- responsive grid collapse
- field labels visually secondary
- account IDs, ARNs, resource IDs use monospace selectively

### `ContentSurface`

Requirements:

- one restrained bordered content container
- optional header, count, toolbar, action slots
- avoids page-wide card nesting
- default table/tree host

### `StatusBadge`

Requirements:

- text always visible
- optional icon/dot
- supported variants:
  - `connected`
  - `disconnected`
  - `unknown`
  - `info`
  - `pending`
  - `success`
  - `warning`
  - `failure`
- semantic colors only
- no color-only meaning

### `EmptyState`, `ErrorState`, `PageSkeleton`

Requirements:

- reusable title, explanatory text, icon, action slots
- distinction between empty and failed request
- skeleton layouts match screen structure, not full-page spinner
- error state supports Retry

### `CopyValue`

Requirements:

- render copyable safe text value
- preserve accessibility
- show immediate copied feedback
- support long monospace values with truncation and full value access
- use only for allowed identifiers

### `TimestampValue`

Requirements:

- localized date/time
- optional relative time
- tooltip/full timestamp
- safe fallback for missing/invalid dates

### Dialog alignment

Refine `DialogConfirm`:

- left/clear hierarchy rather than purely centered marketing-dialog styling
- target entity explicit
- action impact can use content slot
- pending prevents duplicate submit
- inline failure remains visible
- destructive style reserved for user removal
- sync/recovery use warning or primary, not destructive

**Done when:** later pages can share one entity-page and one state pattern.

# Screen-by-Screen Implementation Plan

## Phase 3 — Apps Home

**Route:** `/`  
**Page:** `AppsPage.vue`

### Reuse

- `ConsolePage`
- `EntityPageHeader`
- `ContentSurface`
- `AppSummaryRow`
- `StagePreview`
- loading/error/empty primitives
- `useApps()`

### Build

1. Create Apps header:
   - title: `Apps`
   - subtitle: `{n} applications across {n} AWS accounts`
   - primary action: `Connect account`
2. Derive app count and unique account count across stages.
3. Render vertical App summary list, not KPI dashboard.
4. Each App summary contains:
   - app icon
   - app name
   - stage count
   - unique account count
   - unique regions count
   - resource total
   - updated timestamp
   - selectable Stage preview items
5. Interaction rules:
   - app title/main area → App Detail
   - stage preview → Stage Detail
   - stage click must not bubble and open App Detail
6. Empty state:
   - explain discovery requires connected and synced account
   - primary Connect account action
   - optional View accounts action only when account query proves accounts exist
7. Error state:
   - “Unable to load Apps”
   - Retry
   - do not render same UI as no Apps
8. Loading: App summary row skeletons.

### API dependency

None beyond typed `GET /apps`.

**Done when:** user can enter console, locate App or Stage, and navigate without losing hierarchy.

## Phase 4 — App Detail

**Route:** `/apps/:appName`  
**Page:** `AppDetailPage.vue`

### Reuse

- entity-page foundation
- `BaseTable`
- `TableToolbar` only if filtering is later needed
- status/timestamp/copy primitives
- `useApp(appName)`

### Build

1. Breadcrumbs: `Apps / {appName}`.
2. Entity header:
   - app icon
   - app name
   - stage count
   - created/updated metadata
   - no App-level sync/settings actions
3. Main content:
   - Stage table inside one `ContentSurface`
   - columns: Stage, Account, Region, Resources, Latest state/snapshot, Updated
4. Navigation:
   - stage name → Stage Detail
   - account ID → Account Detail
   - row click → Stage Detail, excluding inner links/buttons
5. Empty state:
   - App exists but no discovered Stages
   - explain state may have changed after sync
6. Error/not-found:
   - map backend `app_not_found` to stale/discovered-state explanation
   - return to Apps
   - generic errors retain Retry.

### API dependency

None beyond typed `GET /apps/:appName`.

**Done when:** App-to-Stage and App-to-Account relationships are direct and obvious.

## Phase 5 — Stage Detail and Resource Explorer

**Route:** `/apps/:appName/stages/:stageName`  
**Page:** `StageDetailPage.vue`

This is specialized MVP screen. Build only after shared foundation exists.

### Reuse

- entity page/header/metadata
- `StatusBadge`
- `CopyValue`
- `ContentSurface`
- `useStage()`

### Build new resource components

#### `ResourceExplorer.vue`

Responsibilities:

- owns selected resource state
- desktop split-pane layout
- responsive switch to single-pane interaction
- optional local resource search
- preserves selected resource when tree expands/collapses

#### `ResourceTree.vue`

Responsibilities:

- accepts API resource tree only
- does not infer parent/child relations
- supports keyboard navigation
- supports tree semantics:
  - `role="tree"`
  - `role="treeitem"`
  - expanded/collapsed state
  - selected state
- exposes selected resource event

#### `ResourceTreeItem.vue`

Responsibilities:

- group/resource icon from safe resource type/kind
- expand control separate from selection control
- selected state
- indentation by tree depth
- truncation for long resource names/IDs
- nested children rendering

#### `ResourceDetails.vue`

Responsibilities:

- selected resource safe fields:
  - name
  - resource ID
  - resource type
  - kind
  - normalized ARN when present
  - URN when safe/required
  - summary fields explicitly allowlisted by resource type
  - parent context
- copy controls for safe IDs
- no raw JSON/state output
- empty selection state: “Select a resource to inspect details.”

### Screen build

1. Breadcrumbs: `Apps / {appName} / {stageName}`.
2. Header:
   - title: stage name
   - App link
   - Account link
   - Region
   - Resource count
   - latest snapshot metadata
3. Resource content:
   - title: `Resources ({count})`
   - optional local Resource search
   - split pane desktop: tree minimum/maximum width; detail pane fills remainder
   - narrow viewport: tree first; selected detail below tree or view toggle
4. Select first root resource by default only if that behavior improves first-use experience; otherwise show explicit empty detail pane.
5. Empty state: no safe resources discovered.
6. Error state: stale stage route; failed load; no raw HTTP/router errors.

### API dependency

`GET /apps/:appName/stages/:stageName` already returns tree and safe fields.

### Important implementation rule

Do not use generic `SExpansionSection`. It adds card borders/padding per node and fails dense explorer design.

**Done when:** developer can inspect actual discovered hierarchy without raw state, fake actions, or unrelated navigation.

## Phase 6 — Accounts List

**Route:** `/accounts`  
**Page:** `AccountsPage.vue`

### Reuse

- entity-page foundation
- `BaseTable`
- status/timestamp primitives
- `useAccounts()`

### Build

1. Header:
   - title: `Accounts`
   - subtitle: `{n} connected AWS accounts`
   - primary action: Connect account
2. Account table:
   - Account ID
   - Region
   - Connection status
   - Safe role identity
   - Last sync
   - Created/Updated where useful
   - row actions
3. Account ID:
   - monospace
   - selectable/copyable
   - link to Account Detail
4. Quick sync:
   - optional row action
   - opens sync confirmation
   - disabled while target account is syncing
5. Empty:
   - no accounts connected
   - connect CTA
   - explanation that Sync discovers Apps
6. Error: retryable failed list distinct from no accounts.

### API dependency

Requires account-list timestamp fields for full spec table. Implement minimal table first if contract addition is delayed.

**Done when:** user can evaluate connection health and open/sync a specific account.

## Phase 7 — Account Detail and Sync Flow

**Route:** `/accounts/:accountId`  
**Page:** `AccountDetailPage.vue`

### Reuse

- entity-page foundation
- `BaseTable`
- `DialogConfirm`
- inline `ActionResult`
- account queries/mutations

### Build

1. Breadcrumb: `Accounts / {accountId}`.
2. Header:
   - account ID
   - Connected/Disconnected status
   - primary action: Sync account
3. Metadata:
   - region
   - safe role identity
   - last successful sync
   - created/updated timestamps
4. Inline status/result area:
   - pending sync state
   - success result summary
   - failure details from safe API error
   - remains visible after notification disappears
5. Sync dialog:
   - exact target account ID
   - explanation that sync updates projection and can remove stale entities
   - Cancel / Sync account
   - duplicate-submit prevention
6. On success:
   - invalidate/refetch account, accounts list, apps, stage paths
   - retain visible result
7. Discovered Stages table:
   - App
   - Stage
   - Region
   - Resources
   - latest state
   - updated
   - App link and Stage link
8. Empty stages:
   - explain no SST state has been discovered yet
   - Sync account CTA when status allows.

### API dependency

Full Stage table requires Account Detail summary contract addition.

**Done when:** sync target, impact, progress, result, and refreshed discovery state are obvious.

## Phase 8 — Connect Account

**Route:** `/accounts/connect`  
**Page:** `ConnectAccountPage.vue`

### Reuse

- `ConsolePage`
- header/breadcrumbs
- `ContentSurface`
- `CopyValue`
- link/action controls

### Build

1. Breadcrumb: `Accounts / Connect account`.
2. Header:
   - title: Connect AWS account
   - short explanation this is connector installation, not manual registration
3. Step-oriented content:
   - Understand requirements
   - Deploy connector
   - Verify connection
   - Sync account
4. Dedicated code/value surfaces:
   - CloudFormation Quick Create link/button
   - connector template URL
   - required supplied configuration values, only if safe
   - copy controls
5. Expected outcome:
   - callback registers account
   - account appears in Accounts
   - user syncs to discover Apps/Stages
6. Troubleshooting section:
   - account missing
   - disconnected
   - role assumption failure
   - sync failure
7. Link to Accounts.

### API/infra dependency

Requires real deployment values injected as Vite environment values. No placeholder commands.

**Done when:** user has real copyable/launchable connector-install path and knows what to do afterward.

## Phase 9 — User Management

**Route:** `/users`  
**Page:** `UsersPage.vue`

### Reuse

- `BaseTable`
- `TableToolbar`
- `SInput`
- `SSelect`
- `DialogForm`
- `DialogConfirm`
- query/mutation composables
- status/timestamp primitives

### Build

1. Header:
   - title: Users
   - primary Invite user action
2. Compact controls above table:
   - exact Email filter
   - Cognito status select
   - Enabled-state select
   - clear filters action
3. Server-driven list:
   - send query parameters
   - reset cursor when filters change
   - use API `meta.nextCursor`
4. Table:
   - Email
   - Cognito status
   - Enabled state
   - Created
   - Updated
   - Actions
5. Pagination:
   - Prefer explicit **Load more** for opaque cursor API.
   - Avoid fake page numbers when API provides no total/page index.
6. Invite dialog:
   - email field
   - validation
   - explain Cognito email/invitation process
   - pending state
   - refetch list after success
7. Remove dialog:
   - exact user email in title/body
   - destructive semantic styling
   - clear statement that Console/Cognito access is deleted
   - refetch list after success
8. Empty states:
   - no users
   - no users match current filters
9. Do not add roles, disabling, profile editing, resend invites, or User Detail route.

### API dependency

No required new endpoint. Use exact email semantics honestly.

**Done when:** users can be invited, filtered, paged, and removed with clear destructive confirmation.

## Phase 10 — Operations

**Route:** `/operations`  
**Page:** `OperationsPage.vue`

### Reuse

- `OperationCard`
- `DialogConfirm`
- `SSelect`
- `ActionResult`
- account list query
- recovery/backup/sync mutations

### Build

1. Header:
   - title: Operations
   - short restrained warning: affects Console discovery/recovery state
2. `OperationCard` contract:
   - action name
   - purpose
   - impact
   - prerequisites
   - action slot
   - inline pending/success/error output
3. Recover accounts card:
   - explain durable registry restore
   - explicitly say no SST state sync occurs
   - confirmation dialog
   - result table/list: account ID, recovered/failed status, safe error message
   - Accounts link
4. Backup connections card:
   - mark migration/recovery only
   - explain purpose
   - confirmation
   - show backed-up count/result
5. Resync account card:
   - `SSelect` from Accounts query
   - account ID + region option labels
   - same sync confirmation semantics as Account Detail
   - after success, link target Account
6. Do not add generic admin tools, global resync, raw API runner, repair tools, terminal, raw state, or mutation controls.

**Done when:** uncommon operations are clear, scoped, confirmed, and retain their result.

## Phase 11 — Auth Visual Pass and Not Found

### Auth

1. Keep Cognito logic intact.
2. Refine `AuthLayout`:
   - desktop split branding/form layout
   - single-column mobile layout
   - restrained product context
   - auth card/form stays primary focus
3. Use existing Auth component status banner/error handling.
4. Do not add unsupported self-registration if product disables it.

### Not Found

1. Authenticated 404 renders inside `ConsoleLayout`.
2. Message: page missing or removed after later sync.
3. Primary action: Return to Apps.
4. Secondary navigation: Apps and Accounts.
5. Avoid raw router/HTTP output.

**Done when:** no screen falls back to Quasar starter visuals.

# Quality, Accessibility, and Responsive Plan

## Accessibility

For every phase:

- semantic headings in page hierarchy
- accessible labels for icon-only actions
- visible keyboard focus
- buttons remain identifiable while loading
- tables retain useful responsive semantics
- dialogs describe exact target/action
- Resource Explorer implements keyboard tree behavior
- status never communicates through color only
- copy actions announce success

## Responsive behavior

### Desktop

- sidebar visible
- tables fully structured
- Stage Explorer split pane

### Narrow width

- sidebar overlay
- entity header actions wrap or overflow
- table columns hide progressively or use horizontal scroll intentionally
- preserve entity identity/action columns
- Resource Explorer switches to tree then selected detail, not unusably narrow two panes

## Error behavior

Each query screen must distinguish:

- loading
- no data
- filtered no-data
- not found / stale route
- failed request
- mutation failure
- mutation result persisted on screen

## Tests

Keep test-only files under `packages/web/tests/`.

Add:

- router/auth guard tests
- composable query/mutation tests with mocked SDK
- screen tests for:
  - Home navigation
  - App → Stage → Account relationship links
  - Stage resource selection
  - account sync confirmation/invalidation
  - User invite/remove dialogs
  - Operations recover/backup/result display
- keyboard tests for Resource Tree
- responsive smoke tests for shell and Explorer
- one Playwright path: login → App → Stage → select Resource → Account → Sync confirmation

Run `bun run check` from repository root after every completed phase.
