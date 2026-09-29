# SST Console — Local Mode UI Specification

## Purpose

Local Mode is the active-development view of an SST stage running through `sst dev`.

It is not a separate product, stage layout, or alternate visual theme. Local and deployed stages use the same Console shell, stage overview, resource navigation, resource screens, and design tokens. Only Function activity requires substantially different composition because its telemetry model differs.

Deployed Mode is the view for inspecting and monitoring deployed infrastructure. In Local Mode, Function activity is a cross-function live stream from the local WebSocket. In Deployed Mode, a user selects a function before querying its CloudWatch log groups and streams.

## Reference

Primary visual reference: [`ChatGPT Image Sep 29, 2026, 11_53_07 AM.png`](./ChatGPT%20Image%20Sep%2029%2C%202026%2C%2011_53_07%20AM.png).

The reference establishes hierarchy, density, and navigation direction. It does not establish backend capabilities. Implement only information and actions supported by product contracts.

## Design goals

- Make active local work immediately distinguishable from deployed-stage monitoring.
- Preserve one coherent Console experience across Apps, Stages, and resources.
- Prioritise live invocation scanning, inspection, and troubleshooting over dashboard metrics.
- Make DynamoDB, S3, Cognito, APIs, queues, and Functions navigable from the same stage context.
- Support light and dark themes with semantic design tokens; Local Mode is not dark-only.
- Avoid duplicated UI and mode-specific copies of shared stage/resource screens.
- Prevent any route page from becoming a monolith by composing named, single-purpose child components.

## Information architecture

### Shared stage navigation

Local and deployed stages use the normal persistent Console sidebar. Stage context adds the contextual navigation below global navigation.

```text
SST Console
├── Apps
├── Accounts
├── Users
├── Operations
│
├── Current app selector
├── Stage selector
├── Overview
└── Resources
    ├── Functions
    ├── APIs
    ├── DynamoDB
    ├── S3
    ├── Cognito
    └── Queues
│
└── Theme preference / user controls / sign out
```

- Global navigation remains at the top of the sidebar.
- App and stage selectors establish current work context. They are navigation controls, not duplicated display-only metadata.
- **Overview** opens the stage summary/monitoring view.
- Resource entries open resource-specific workspaces. Resource categories and counts must be driven by known stage resources; do not invent categories or counts.
- Exactly one contextual item is active at a time. For example, when viewing Function activity, **Functions** is active and **Overview** is not.
- Theme preference appears only in the sidebar footer. Do not duplicate it in the local-session header.

### Breadcrumbs

Keep compact hierarchy above the workspace header:

```text
Apps / {appName} / Local
```

`Apps` and `{appName}` link to their normal Console destinations. `Local` is the current, non-link segment. Breadcrumbs communicate location; they do not replace the app/stage selectors.

## Local Function session header

The shared Function page header answers: *which app/stage/function context is open?* Local Mode adds session health beneath or beside that identity; this information does not appear on unrelated Local resource screens.

```text
[app icon] {appName}  [● Local]  Stage: {stageName}  Region: {region}

● WebSocket connected | ▮▮▮ Streaming live | {count} retained | Last event {time}
```

### Local Mode information

- App name.
- Local-mode indicator.
- Stage name.
- Region when known.
- WebSocket connection state: connecting, connected, or disconnected.
- Live-stream state: streaming or paused.
- Retained invocation count.
- Last received invocation/event timestamp when available.

### Behaviour

- Connection and streaming status use text plus semantic colour/icon; colour alone is insufficient.
- While disconnected, retain useful context and show a clear reconnecting/disconnected state. Do not imply CloudWatch data is being shown.
- Values unavailable from the local protocol remain absent. Do not fabricate Lambda runtime, memory, version, request ID, HTTP method/path, or similar metadata.
- Header status remains compact. It must not become a metric dashboard.

## Functions: mode-specific content

Functions is the only stage resource screen with radically different Local and deployed compositions. Both begin with the same Function page route, contextual sidebar selection, Function page header, and function/resource navigation.

### Local Function activity workspace

Local activity is app/stage-wide and live. The user can discover which functions are active from incoming invocations, then inspect a single invocation.

### Page heading and controls

```text
[function icon] Functions
Live invocation activity from local SST development environment.

[Pause stream] [Clear activity] [Filter functions, status, or text] [retention limit]
```

Controls affect only Local Function activity.

- **Pause stream** stops visual ingestion/following without losing already retained activity. It is available only when client/session behaviour supports it.
- **Clear activity** clears retained local invocations and sends the supported local clear command. It requires no destructive-data confirmation because it clears an in-memory development activity view, not cloud data.
- Filtering is local to retained activity and must operate only on fields actually received.
- Retention selector appears only when configurable. Otherwise show the current retained count without a nonfunctional selector.

Disabled or unsupported controls must not appear enabled.

#### Invocation list

Desktop uses a fixed, scrollable left pane. The selected invocation's detail fills the right pane.

Recommended columns:

| Column | Content |
| --- | --- |
| Time | Localised start time |
| Function | Invocation source/function name |
| Status | Running, Success, or Error; text plus semantic icon/dot |
| Duration | Duration when complete and available |

Requirements:

- New invocations appear in reverse chronological order.
- Selection is obvious through a restrained active row treatment, not status colour.
- Rows remain compact and readable under sustained activity.
- Pending invocations visibly remain running until updated.
- Error rows remain inspectable after later successful invocations arrive.
- Empty state: explain that Local Mode is connected and waiting for local invocations.
- Disconnected state: explain that local SST CLI activity is unavailable, distinct from an empty invocation list.

#### Invocation detail

Selected invocation detail is a structured work surface, not a raw state viewer.

```text
[status icon] {function name}                         {duration} [status]
Invocation at {local timestamp}

[Overview] [Input] [Output] [Logs]
```

#### Overview

Display only available, normalised values:

- Start time.
- Function/source name.
- Status.
- Duration when available.

If later protocol contracts add safe execution metadata, add it deliberately. Do not reserve empty fields for guessed data.

#### Input and output

- Render received invocation input and output in readable, copyable structured-data surfaces.
- Use monospace only inside payload/code surfaces.
- Show `No input captured` or `No output captured` when applicable; do not show fake JSON.
- Long content scrolls within its panel without expanding the full workspace uncontrollably.

#### Logs

- Show log timestamp and message in chronological order.
- Preserve message whitespace and use monospace for log content.
- Support auto-scroll only when live log behaviour exists.
- Log-level filtering is available only if local events provide reliable levels. Do not infer levels from arbitrary message text.
- Show `No log lines yet` when an invocation has none.

#### Errors

- Errors are always visible through an Error status and an accessible detail path.
- Show error name, message, and stack frames only when received.
- Error presentation uses semantic negative styling but preserves readable neutral text and copy/select capability for troubleshooting.

#### Responsive behaviour

- Desktop: invocation list and detail pane remain visible side by side.
- Narrow screens: retain invocation list first; selecting an invocation opens/reveals detail without forcing both panes into unusable widths.
- Do not remove logs, payloads, or errors to make the layout fit.

### Deployed Function inspector

Deployed activity is function-first, not a global recent-invocation feed. Do not imply the Console knows which deployed functions have recent logs before the user selects one.

```text
Functions

{function list}  →  Select {function}
                    Function identity and safe metadata
                    Log groups / streams
                    [Time range] [Refresh/query] [supported filters]
                    Queried CloudWatch log events
```

- Selecting a function opens its safe summary and available CloudWatch log groups.
- Selecting a log group/stream or submitting a time-range query loads only that function's CloudWatch activity.
- Deployed controls are query-driven: time range, refresh, log group/stream selection, and only supported filters.
- Do not show Local controls such as **Clear activity**, **Pause stream**, retained count, or WebSocket health.
- No cross-function “recent invocation” table exists until a backend contract provides real aggregation.
- Reuse log/event presentation components where normalised CloudWatch data overlaps with local invocation logs. Do not force CloudWatch into Local invocation concepts when data does not support them.

## Resource workspaces

Local Mode extends stage resource navigation; it must not introduce a parallel resource product.

### Shared resource experience

- Resource identity, hierarchy, list/tree patterns, safe metadata, and resource-specific UI are shared by Local and deployed stages where data/capabilities overlap.
- DynamoDB, S3, Cognito, API, and queue screens share the same composition in both modes. Function resource identity/navigation remains shared; its activity content differs by telemetry source.
- Mode changes data source and available controls, not visual language or route taxonomy.
- Resource-specific actions appear only when supported for current mode and target resource.

## Component architecture

### Page composition

Pages compose components. They load route/context data, select mode/capabilities, and coordinate child events. They do not render complex invocation rows, payloads, logs, errors, or sidebar sections inline.

```text
StageFunctionPage
├── StageContextHeader
├── StageResourceSidebar
│   ├── StageContextSelector
│   ├── StageOverviewNavItem
│   └── StageResourceNavigation
│       └── StageResourceNavItem
├── FunctionPageHeader
├── FunctionNavigator
│   └── FunctionNavigatorItem
└── FunctionContent
    ├── LocalFunctionActivityWorkspace
    │   ├── LocalActivityToolbar
    │   ├── InvocationList
    │   │   └── InvocationListItem
    │   └── InvocationDetail
    │       ├── InvocationDetailHeader
    │       ├── InvocationSummary
    │       ├── InvocationPayloadPanel
    │       ├── InvocationLogPanel
    │       └── InvocationErrorPanel
    └── DeployedFunctionInspector
        ├── FunctionSummary
        ├── CloudWatchLogGroupNavigator
        ├── CloudWatchQueryToolbar
        └── CloudWatchLogViewer
```

### Component inventory

| Component | Scope | Responsibility | User interaction | Visual guidance |
| --- | --- | --- | --- | --- |
| `StageContextHeader` | Shared | App, stage, region, and compact current-mode context. | Parent links navigate; no telemetry action ownership. | One compact identity row. No metrics/cards. |
| `StageResourceSidebar` | Shared | Combines global shell with stage app/stage context and resource navigation. | Select app/stage, Overview, or one resource category. | Persistent left rail; only one contextual item active. |
| `FunctionPageHeader` | Shared structure, mode slots | Names Functions and provides source-appropriate status/actions. | Local status is informational; deployed actions query logs. | Dense heading/toolbar line. Local session indicators occupy secondary header space only. |
| `FunctionNavigator` | Shared | Lists Functions discovered in selected stage; owns current function selection. | Select Function to scope deployed inspection; Local selection may filter/highlight activity when supported. | Narrow navigation/list surface. Selected Function uses same active treatment as resource navigation. |
| `LocalFunctionActivityWorkspace` | Local only | Arranges live invocation list and selected invocation detail. | Receives invocation selection, toolbar actions, and live updates. | Full-height split pane; list fixed width, detail fills remaining space. |
| `LocalActivityToolbar` | Local only | Presents capabilities: pause/follow, clear, local filter, retention display/control. | Emits only supported controls. Disabled/absent when unsupported. | Compact right-aligned toolbar; no primary marketing-style button. |
| `InvocationList` | Shared presentation primitive | Scroll container and keyboard/list semantics for normalised invocation rows. | Select row; preserve selection during incoming updates when possible. | Dense table/list with one scroll owner. |
| `InvocationListItem` | Shared presentation primitive | Renders timestamp, function, status, duration. | Click/keyboard selects invocation. | Compact separator row; active state independent from success/error colour. |
| `InvocationDetail` | Local only initially | Composes selected invocation's summary, payloads, logs, and errors. | Tab or section selection; copy individual supported values. | Detail pane scroll owner; structured sections, not a large raw JSON block. |
| `InvocationSummary` | Reusable | Renders available normalised execution facts. | None beyond copyable values when applicable. | Compact key/value grid; omit unavailable facts. |
| `InvocationPayloadPanel` | Reusable | Displays input or output safely. | Copy payload; scroll long content. | Bordered code surface, monospace content only. |
| `InvocationLogPanel` | Reusable | Displays ordered normalised log lines. | Auto-follow and filters only when source supports them. | Dense chronological log surface with internal scroll. |
| `InvocationErrorPanel` | Reusable | Displays error message and received stack frames. | Copy/select error text. | Negative semantic accent, readable neutral body text. |
| `DeployedFunctionInspector` | Deployed only | Composes selected function summary and CloudWatch log discovery/query flow. | Select function, log group/stream, time range, then query/refresh. | Function-first content pane; no live global invocation list. |
| `CloudWatchLogGroupNavigator` | Deployed only | Lists log groups/streams supplied for selected Function. | Select target before query. | Compact hierarchy/list adjacent to or above results. |
| `CloudWatchQueryToolbar` | Deployed only | Owns query inputs and refresh action. | Change time range/filter; explicitly run or refresh query. | Compact controls near results; query state visible. |
| `CloudWatchLogViewer` | Deployed only | Renders returned CloudWatch events. | Select/copy events; paginate/load more only when contract supports it. | Reuse log typography and status patterns; show query/loading/empty/error states. |

### Composition rules

- `StageFunctionPage` may coordinate state but must stay thin. Extract a child component when a section has independent data, state, scroll behaviour, or interaction.
- A component receives typed props and emits intent. It must not reach into unrelated route, WebSocket, or CloudWatch implementation state.
- Local WebSocket lifecycle belongs in a local telemetry composable/source, not in a visual component.
- CloudWatch querying belongs in a deployed telemetry composable/source, not in a visual component.
- Shared components render normalised display data. Source adapters own protocol/provider differences.

## Interaction specification

### Local Function activity

| User/system event | Required result |
| --- | --- |
| Local session connects | Header changes to Connected; live activity empty state remains until first invocation. |
| WebSocket receives new invocation | Normalise/upsert, sort reverse chronologically, update retained count and last-event time. Do not steal selection from an invocation user is inspecting. |
| User selects invocation | Active row changes; detail pane renders its available summary, payload, logs, output, and errors. |
| Selected invocation receives update | Detail updates in place; pending may transition to Success or Error. |
| User filters activity | List changes locally using only supported fields; selection clears or remains only if selected invocation still matches. |
| User clears activity | Clear local retained view and send supported local clear message. Selected detail becomes empty state. |
| User pauses/follows stream | Apply only if capability exists; label/state changes immediately and visible activity behaviour matches it. |
| WebSocket disconnects | Preserve retained activity, show disconnected/reconnecting header state, and distinguish it from no invocations. |

### Deployed Function logs

| User/system event | Required result |
| --- | --- |
| User selects Function | Show function summary and its available log group/stream choices. Do not query unrelated functions. |
| User selects log target/time range | Update query controls; query only on explicit action if contract/cost warrants it. |
| User queries or refreshes | Show scoped loading state in log results; retain query context. |
| Query succeeds with events | Render chronological CloudWatch events in `CloudWatchLogViewer`. |
| Query succeeds with no events | Explain no events matched selected function, target, and time range. |
| Query fails | Preserve selected Function/query context; show retryable error distinct from no logs. |

### Keyboard and accessibility

- Invocation and Function navigator rows are keyboard selectable with visible focus.
- Icon-only controls have accessible labels.
- Status always includes text, not colour alone.
- Payload, log, and error copy controls announce successful copy.
- Split panes retain independent, predictable scroll regions.

### Local-only concerns

- WebSocket lifecycle, identity, reconnect state, retained activity, and clear command remain Local Mode concerns.
- Local identity determines whether an open stage matches the active `sst dev` session.
- Local activity is bounded in memory. Display the retained count; do not imply historical persistence.

### Current protocol limits

Current local data supports:

- Session identity: app, stage, optional region.
- Connection state.
- Invocation ID, source, input, output, start/end, duration, status.
- Logs, errors, and error stack frames.
- Clear all retained activity.

Current local data does **not** establish support for:

- Pause/resume command semantics.
- Server-side filtering.
- Configurable retention.
- Log levels.
- HTTP request metadata.
- Lambda runtime, memory, version, request IDs, replay, or invocation mutation.

Do not render controls or fields as functional until a contract supports them.

## Theme and visual language

- Use existing Console semantic tokens for page, navigation, surface, border, primary text, secondary text, focus, and status colours.
- Both light and dark themes must preserve contrast, pane separation, selected-row clarity, and payload/log readability.
- Use subtle borders and row separators. Avoid oversized cards, gradients, fake terminal chrome, and KPI-heavy dashboards.
- Blue is reserved for navigation/selection/informational state; green, amber, and red communicate semantic execution state.
- Use icons to accelerate scanning, never as the only indicator.
- Normal interface text uses product typography. Payloads, identifiers, and logs may use monospace where it improves scanning.

## Acceptance criteria

1. Local Mode retains Console sidebar, breadcrumbs, theme behaviour, stage overview, and resource taxonomy.
2. Sidebar has stage-level Overview plus contextual resource entries; exactly one contextual entry is active.
3. Only Local Function content shows session identity and real connection/stream health; it has no duplicate theme toggle or “Back to deployed stage” control.
4. Local Functions supports dense live cross-function invocation inspection with list/detail panes on desktop.
5. Deployed Functions requires Function selection before CloudWatch log group/stream and query controls appear; it does not claim global recent invocation awareness.
6. Invocation detail and log presentation render only fields supplied by their selected telemetry source.
7. Local and deployed Functions share navigation and reusable display primitives, while their content workspaces and source adapters remain separate.
8. Shared Overview and non-Function resource screens are not copied for Local Mode.
9. Every Local Mode surface works in light and dark themes.
10. Empty, disconnected, loading, and error states are distinct and explain next valid action.
11. Unsupported generated-mockup controls and metadata are absent or visibly unavailable.
12. `StageFunctionPage` remains a coordinator; independently interactive or scrollable sections use documented child components.
