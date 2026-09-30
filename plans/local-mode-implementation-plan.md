# Local/Deployed Functions Implementation Plan

## Goal

Implement SST Console Function experiences in small, reviewable increments.

Local and deployed stages retain one Console shell, stage navigation, resource taxonomy, and non-Function resource screens. Only Function content differs:

- **Local Functions:** live, cross-function WebSocket invocation activity.
- **Deployed Functions:** user selects a Function, then queries its CloudWatch logs.

Design source: [`local-mode-ui-spec.md`](./local-mode-ui-spec.md).

## Delivery rules

- Complete one phase, run its verification, and wait for product review before starting the next phase.
- Do not combine later phases into an earlier “cleanup” or rewrite.
- Do not show enabled controls, metadata, resource counts, or CloudWatch UI without a real supported contract.
- Keep pages thin. New independently interactive, stateful, or scrollable regions are child components.
- Keep test files and fixtures under `packages/web/tests/`.
- Run `bun run check` from repository root after every phase.

## Existing starting point

- `StageDetailPage.vue` currently conditionally shows a Local workspace.
- `useLocalSession()` owns local WebSocket lifecycle and normalises local invocations.
- `LocalStageWorkspace`, `LocalInvocationFeed`, and `LocalInvocationDetail` provide the first local-only implementation.
- Current local protocol supplies connection/session identity, invocations, input/output, logs, errors, duration, and clear activity. It does not supply pause, retention configuration, log levels, HTTP metadata, replay, or Lambda runtime metadata.

---

## Phase 1 — Stage sidebar context and navigation

### Outcome

Normal Console sidebar gains stage-context navigation matching reference direction: current app, stage, Overview, and real resource categories. This is shared by Local and deployed stages.

### Agent work

1. Extract/build a dedicated stage-context sidebar section under existing global Console navigation.
2. Add app/stage context selectors or equivalent contextual navigation using real available stage data.
3. Add Overview entry and resource category entries driven by known stage resources.
4. Ensure exactly one contextual entry has active styling.
5. Keep theme/user/sign-out controls only in existing sidebar footer.
6. Do not change resource content pages beyond routes/selection required for navigation.

### Do not do

- Do not build Local-specific sidebar copy.
- Do not add fake resource categories or placeholder counts.
- Do not add a second theme toggle.

### User verification

1. Open a deployed stage and a matching Local stage.
2. Confirm both use same sidebar structure.
3. Select Overview, then Functions. Confirm only selected contextual item is highlighted.
4. Change app or stage context. Confirm navigation updates predictably.
5. Confirm sidebar theme control still works and no header theme control exists.

### Agent verification

- Component test active-state exclusivity and route targets.
- `bun run check` passes.

### Review gate

Approve sidebar information architecture and active-state treatment before Function-page work.

---

## Phase 2 — Function route, page shell, and mode boundary

### Outcome

Functions becomes a dedicated stage resource page. It has shared breadcrumbs/page identity/navigation, then selects Local or deployed Function content without duplicating the stage layout.

### Agent work

1. Add a named Functions route within stage context.
2. Create a thin `StageFunctionPage` coordinator.
3. Extract shared `FunctionPageHeader` and `FunctionNavigator` scaffolding as appropriate for real available function resources.
4. Move Local-vs-deployed decision into Function content composition, not `StageDetailPage` layout switching.
5. Preserve existing stage Overview/resource explorer behaviour for non-Function content.
6. Use existing Console breadcrumbs; show Local indicator only when local identity matches current app/stage.

### Do not do

- Do not introduce a `LocalStagePage`, Local layout, or duplicate stage routes.
- Do not build CloudWatch UI yet.
- Do not claim a local session is active when identity does not match current stage.

### User verification

1. Navigate from stage sidebar Functions entry to Function page.
2. Confirm breadcrumb/sidebar/stage identity remain recognisably same Console experience as Overview.
3. Confirm opening a non-matching or disconnected stage does not show Local session state.
4. Return to Overview and inspect another resource; confirm those screens are unchanged in composition.

### Agent verification

- Route/component test Functions navigation and mode selection.
- `bun run check` passes.

### Review gate

Approve page hierarchy and Local/deployed boundary before changing live activity UI.

---

## Phase 3 — Local session status header

### Outcome

Local Function page clearly reports active `sst dev` session health without changing shared stage pages.

### Agent work

1. Extract Local session display from visual activity components into `LocalFunctionSessionStatus` or equivalent child component.
2. Render real app, stage, optional region, WebSocket connection status, retained invocation count, and last event time.
3. Represent connecting, connected, and disconnected states with text plus semantic status styling.
4. Keep session display compact within Function page header/secondary header area.
5. Keep current reconnect behaviour intact.

### Do not do

- Do not display invented Lambda metadata or request details.
- Do not add Pause stream, retention select, or log-level controls.
- Do not place WebSocket health in Overview, DynamoDB, S3, Cognito, or other shared resource screens.

### User verification

1. Start `sst dev` for a known app/stage and open its Functions page.
2. Confirm app/stage/region, Connected status, retained count, and last event appear.
3. Stop local CLI or block the socket. Confirm status changes to disconnected/reconnecting without losing existing activity.
4. Open a different stage. Confirm Local session status is absent.

### Agent verification

- Unit test session-status text for connecting, connected, and disconnected states.
- `bun run check` passes.

### Review gate

Approve density, placement, and wording of session health before invocation workspace changes.

---

## Phase 4 — Local live invocation list

### Outcome

Local Functions presents a dense, live, cross-function invocation list. It replaces the current generic Local feed, but does not yet redesign invocation details.

### Agent work

1. Replace/extract current feed as `InvocationList` and `InvocationListItem`.
2. Show real columns only: time, function/source, status, duration.
3. Keep new/upserted invocations reverse chronological and bounded by existing retention behaviour.
4. Preserve selected invocation while subsequent events arrive.
5. Add distinct connected-empty and disconnected states.
6. Give list its own scroll region; avoid page scroll fighting the list.

### Do not do

- Do not add filters, pause, retention controls, HTTP method/path, runtime, memory, request ID, or fake rows.
- Do not make a successful/error colour the sole selected-row indicator.

### User verification

1. Trigger several local Functions, including one error.
2. Confirm newest invocation appears first with function name, time, status, and duration.
3. Select an older invocation, then trigger another. Confirm selection stays on older invocation.
4. Confirm error and success rows are both readable and selectable.
5. Clear existing local activity; confirm connected-empty message differs from disconnected message.

### Agent verification

- Component tests ordering, selection retention, status text, and empty/disconnected states.
- `bun run check` passes.

### Review gate

Approve list density, column choices, and selection behavior before detail redesign.

---

## Phase 5 — Local invocation detail panels

### Outcome

Selected local invocation becomes a structured inspection surface with small child components, replacing monolithic detail markup.

### Agent work

1. Build `InvocationDetail` as a composition boundary.
2. Extract `InvocationSummary`, `InvocationPayloadPanel`, `InvocationLogPanel`, and `InvocationErrorPanel`.
3. Render summary from actual source, start time, status, and duration only.
4. Render received input/output in separate copyable structured-data surfaces.
5. Render chronological logs with preserved whitespace and controlled internal scroll.
6. Render error name/message/stack only when supplied.
7. Add no-selection state.

### Do not do

- Do not render raw SST/Pulumi state or secrets.
- Do not invent empty data as JSON, fake request IDs, function configuration, HTTP data, or log levels.
- Do not make one massive `LocalInvocationDetail.vue` file containing all subpanels.

### User verification

1. Select a completed invocation with input, output, and logs. Confirm each section is readable and independently scrollable where needed.
2. Select an invocation without input/output/logs. Confirm clear, truthful empty messages.
3. Select an error invocation. Confirm message and received stack are prominent and copyable/selectable.
4. Select no invocation or clear activity. Confirm guidance state appears.
5. Inspect browser narrow layout. Confirm detail remains usable without crushed side-by-side payloads.

### Agent verification

- Component tests each panel with present, missing, and error data.
- Keyboard/copy accessibility smoke tests.
- `bun run check` passes.

### Review gate

Approve detail hierarchy, payload/log treatment, and component boundaries before adding controls.

---

## Phase 6 — Supported Local controls and polish

### Outcome

Local Functions gains only controls backed by current client/protocol capability, plus production-quality loading, empty, error, responsive, and keyboard behaviour.

### Agent work

1. Add clear activity control to a dedicated `LocalActivityToolbar`.
2. Add local client-side Function/status/text filtering only if exact supported fields and UX are agreed; otherwise omit it.
3. Add accessible selection/focus behaviour for invocation rows and toolbar actions.
4. Confirm scroll ownership across sidebar, invocation list, detail, payload, and logs.
5. Tune light/dark tokens, empty states, and narrow layout.
6. Remove replaced Local workspace/feed/detail code after migration; do not retain deprecated wrappers.

### Deferred by contract

- Pause/resume stream.
- Configurable retention.
- Log-level filters.
- Replay.
- Invocation mutation.

### User verification

1. Clear activity and confirm list/detail reset while local CLI remains connected.
2. If filtering is delivered, filter then clear filter; confirm no hidden state or stale selection.
3. Use keyboard to select invocations and activate clear control.
4. Toggle theme; confirm selected, success, error, payload, and log states remain readable.
5. Resize browser; confirm no nested scroll trap or unreadable panes.

### Agent verification

- Tests clear action, optional local filtering, focus behaviour, and state transitions.
- `bun run check` passes.

### Review gate

Approve Local Functions MVP. Do not begin CloudWatch work until product/API contract review.

---

## Phase 7 — Deployed Function selection and CloudWatch contract

### Outcome

Define and implement only the data contract needed for deployed Function inspection. No simulated CloudWatch UI.

### Agent work

1. Document/implement typed SDK and Vue Query contracts for:
    - stage Functions;
    - selected Function safe identity/metadata;
    - available CloudWatch log groups/streams;
    - scoped log-event query with time range/filter/cursor where supported.
2. Define loading, empty, permission, not-found, and query-failure API semantics.
3. Verify returned fields are safe for Console display.
4. Build source/composable boundaries so visual components do not call AWS/CloudWatch directly.

### Do not do

- Do not query every Function in a stage for “recent logs.”
- Do not add AWS credentials to browser or raw CloudWatch access.
- Do not build mock log groups or placeholder query results.

### User verification

1. Review exact request/response shapes and supported filters/time ranges.
2. Confirm selected Function scopes every deployed-log query.
3. Confirm contract can distinguish no logs from permission/query failure.

### Agent verification

- SDK/composable tests with contract fixtures.
- API tests if backend scope is included.
- `bun run check` passes.

### Review gate

Approve CloudWatch contract and safe data shape before deployed UI implementation.

---

## Phase 8 — Deployed Function inspector

### Outcome

Deployed Functions becomes a function-first CloudWatch inspection flow using shared Function navigation and log display primitives where appropriate.

### Agent work

1. Implement `DeployedFunctionInspector` as a mode-specific child of `StageFunctionPage`.
2. Build selected Function summary from safe contract fields.
3. Build `CloudWatchLogGroupNavigator` for log group/stream selection.
4. Build `CloudWatchQueryToolbar` with only contract-supported time range/filter/refresh controls.
5. Build `CloudWatchLogViewer` using shared log visual primitives where data overlaps.
6. Show explicit initial state: select a Function; then select/query logs.
7. Handle scoped loading, no matching events, permission failures, query failures, and retry.

### Do not do

- Do not reuse Local invocation list as a fabricated deployed global activity feed.
- Do not show WebSocket/local session controls or retained count.
- Do not conflate an empty query result with unavailable CloudWatch access.

### User verification

1. Open deployed Functions. Confirm initial state asks for a Function selection.
2. Select a Function. Confirm only its log groups/streams appear.
3. Select a target/time range and query. Confirm events belong to selected Function context.
4. Test empty and denied/failing query cases. Confirm messages differ and retry works for failures.
5. Return to Local Functions. Confirm its live invocation workspace is unchanged.

### Agent verification

- Screen tests Function selection → log target → query result/error states.
- `bun run check` passes.

### Review gate

Approve deployed inspection flow before optional cross-mode visual refinement.

---

## Phase 9 — Cross-mode consistency and regression pass

### Outcome

Local and deployed Function views feel part of one Console while retaining truthful, mode-specific workflows.

### Agent work

1. Review shared tokens, status treatment, sidebar active states, Function navigation, log/payload typography, focus styles, and responsive behaviour across modes.
2. Remove duplicate styling/components discovered during phases 1–8.
3. Add end-to-end smoke paths for Local and deployed Function workflows.
4. Update relevant `.agent_context.md` files if component maps changed.

### User verification

1. Compare Local and deployed Function screens side by side in light and dark themes.
2. Confirm shared navigation/visual language is recognisable.
3. Confirm Local still feels live and cross-function; deployed still feels intentional and Function-first.
4. Confirm no control appears where its data source/capability is unavailable.

### Agent verification

- Full `bun run check`.
- Focused component/screen tests.
- End-to-end smoke tests where local WebSocket and CloudWatch fixtures/environment are available.

### Completion criteria

- Each approved phase remains independently understandable and testable.
- No massive page component contains sidebar, list, details, payload, logs, and source lifecycle together.
- Local and deployed Function paths use real supported data only.
