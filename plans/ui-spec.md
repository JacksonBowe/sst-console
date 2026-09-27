# SST Console — UI/UX Design Specification

## 1. Purpose

This document defines the visual structure, information architecture, interaction patterns, and reusable UI conventions for SST Console.

It complements the MVP Functional Specification:

- The **Functional Specification** defines what the product does.
- This **Design Specification** defines how those capabilities should be presented to the user.

This document should act as the design North Star during implementation. It intentionally avoids prescribing specific frontend technologies, component libraries, CSS implementations, or exact pixel measurements.

Generated UI mockups may be used as visual references, but they are not authoritative sources of functionality. Where a mockup conflicts with the Functional Specification, the Functional Specification takes precedence.

---

# 2. Design Direction

## 2.1 Overall concept

SST Console should combine two related interface styles:

### Explorer

The application should feel natural to developers accustomed to tools such as IDEs, source-control interfaces, infrastructure explorers, and cloud consoles.

Hierarchy should be obvious.

The primary hierarchy is:

Apps → App → Stage → Resources

Users should be able to progressively navigate deeper into their infrastructure without losing their current context.

### Control Plane

SST Console is also an operational control plane.

Important entities such as Apps, Stages, AWS Accounts, and Users should have consistent identity, metadata, status, and action presentation.

Operational actions should be clearly separated from informational content and should communicate their impact before execution.

The result should feel like a modern developer tool rather than either:

- an analytics dashboard, or
- a clone of the AWS Console.

---

# 3. Design Principles

## 3.1 Information first

The Console exists primarily to expose infrastructure state and relationships.

Prefer useful information over decorative UI.

Avoid large empty areas, oversized headings, decorative hero sections, or visual elements that significantly reduce the amount of useful information visible on screen.

---

## 3.2 Dense, but not cluttered

SST Console may display significant amounts of infrastructure information.

Information density is desirable where the data naturally benefits from it.

Tables, trees, metadata grids, compact badges, and structured lists are appropriate.

Density should come from good information architecture rather than simply making everything smaller.

---

## 3.3 Hierarchy over dashboards

The most important mental model is:

    App
      └── Stage
            └── Resources

The interface should reinforce this hierarchy.

The Home screen should not become a generic dashboard full of charts and statistics.

Users primarily need to discover an App, select a Stage, and inspect its Resources.

---

## 3.4 Relationships should be navigable

When one entity references another entity that has its own screen, the relationship should normally be navigable.

Examples:

- Stage → App
- Stage → Account
- Account → Stage
- App → Stage

Users should not need to return to Home simply to navigate between related entities.

---

## 3.5 Status should be visible but restrained

Operational status is important but should not dominate the interface.

Use compact semantic indicators such as:

- Connected
- Disconnected
- Unknown
- Healthy
- In progress
- Failed

Colour should reinforce status rather than replace its textual meaning.

---

## 3.6 Actions should have predictable placement

Primary page actions should normally appear in the upper-right portion of the page header.

Secondary or infrequent actions may appear in an overflow menu.

Actions relating to a specific row or resource should appear alongside that entity.

Destructive and operational actions require confirmation where specified by the Functional Specification.

---

## 3.7 Cards are for grouping, not everything

Cards and bordered surfaces should be used to establish meaningful grouping.

Do not place every individual piece of information inside its own card.

Prefer:

    Page
      Header
      Summary
      Main content surface

over:

    Page
      Card
      Card
      Card
      Card
      Card
      Card

Nested cards should be used sparingly.

---

# 4. Application Shell

Authenticated screens use a persistent application shell.

Conceptually:

    ┌──────────────────────────────────────────────────────────────┐
    │ Sidebar │ Main Content                                      │
    │         │                                                   │
    │ Apps    │ Breadcrumbs                                       │
    │ Accounts│                                                   │
    │ Users   │ Page title                         Page actions    │
    │ Ops     │ Supporting metadata                              │
    │         │ ────────────────────────────────────────────────  │
    │         │                                                   │
    │         │ Page content                                      │
    │         │                                                   │
    │         │                                                   │
    │ Theme   │                                                   │
    │ User    │                                                   │
    └──────────────────────────────────────────────────────────────┘

The application shell should remain visually stable as the user navigates through the Console.

---

# 5. Primary Navigation

## 5.1 Sidebar

The primary authenticated navigation is a persistent left sidebar.

Primary navigation items:

- Apps
- Accounts
- Users
- Operations

The currently active section should be visually obvious.

The sidebar should not contain every possible route. App Detail, Stage Detail, and Account Detail are contextual routes reached through their parent sections.

---

## 5.2 Sidebar footer

The bottom of the sidebar contains controls that are useful globally but are not primary navigation.

These include:

- Theme preference
- Current user
- Sign out

The current user's email may be displayed where space permits.

---

## 5.3 Sidebar behaviour

Desktop layouts should keep the sidebar visible.

On narrower screens, the sidebar may collapse or become an overlay.

The exact responsive implementation is flexible, but navigation must remain accessible.

---

# 6. Page Structure

Most authenticated entity screens should use a common page structure.

    Breadcrumbs

    [Entity icon] Entity name                     [Primary action] [...]
                  Supporting identity/status

    Key metadata / summary

    ---------------------------------------------------------------

    Primary page content

Breadcrumbs and entity headers should establish location before the user reaches the detailed content.

---

# 7. Breadcrumbs

Breadcrumbs represent contextual hierarchy rather than duplicating the sidebar.

Examples:

    Apps / mafia

    Apps / mafia / production

    Accounts / 123456789012

Each parent segment should be selectable where appropriate.

Breadcrumbs should remain compact and visually secondary to the page title.

---

# 8. Entity Presentation

## 8.1 App

An App represents an SST application discovered from connected AWS accounts.

A compact App summary may contain:

    [icon] mafia
           4 stages · 2 accounts · 3 regions · 142 resources
           Updated 2 hours ago

           [production] [staging] [development] [preview]

The most visually important value is the App name.

Supporting metadata may include:

- number of stages
- number of AWS accounts represented
- regions
- total resource count
- last updated timestamp

Stage previews should be individually selectable.

The entire App summary should provide a clear route to App Detail without making stage selection ambiguous.

---

## 8.2 Stage

A Stage is a deployed instance of an App.

A Stage identity header should resemble:

    production                         [status]

    App          Account          Region        Resources
    mafia        123456789012     us-east-1     48

Additional metadata such as latest snapshot timestamp may appear where relevant.

The App and Account values should be selectable where they correspond to available routes.

---

## 8.3 Account

An AWS Account should normally be represented using:

- AWS account ID
- region
- connection status
- safe role identity
- last sync timestamp

If an account name or alias becomes available from supported product data, it may supplement the account ID, but the account ID remains the canonical identity.

Do not invent account aliases if they are not provided by the backend.

---

## 8.4 User

A user should primarily be identified by email.

Supporting information may include:

- Console user ID
- Cognito status
- enabled state
- created timestamp
- updated timestamp

User interfaces should not imply roles or permissions exist during the MVP when they do not.

---

# 9. Status Presentation

Statuses should use a combination of:

- concise text
- semantic colour
- optional small icon or dot

Example:

    ● Connected

Avoid using colour alone.

Suggested semantic roles:

- Green — successful / connected / available
- Amber — warning / uncertain / partial
- Red — failed / disconnected / destructive
- Blue — active operation / informational
- Neutral — unknown / inactive / unavailable

These meanings should remain consistent throughout the Console.

---

# 10. Tables

Tables are encouraged where data is naturally tabular.

Appropriate uses include:

- Stages
- Accounts
- Users

Tables should prioritise useful operational information rather than exposing every available backend property.

Rows should generally be selectable when they represent entities with detail screens.

Actions should be positioned consistently at the end of the row.

Example:

    Name          Status       Account        Region       Resources   Updated
    production    Connected    123456789012   us-east-1    48          2h ago
    staging       Connected    123456789012   us-east-1    32          1d ago

Tables may support filtering or search where specified by the Functional Specification.

---

# 11. Resource Explorer

The Stage Detail screen contains the most specialised interface in the MVP.

Resources should be displayed as an expandable hierarchical tree.

Conceptually:

    Resources

    ▼ Api
        Function
        Function
        Bucket

    ▼ Database
        Dynamo

    ▼ Web
        Bucket
        Function

The actual hierarchy must come from the safe resource projection returned by the API.

The UI must not invent infrastructure relationships.

---

## 11.1 Resource explorer layout

Desktop Stage Detail should use an explorer-style split layout.

    ┌─────────────────────┬───────────────────────────────────────┐
    │ Resource tree       │ Selected resource                    │
    │                     │                                       │
    │ ▼ Api               │ Api                                   │
    │   Function          │ SST Api                               │
    │   Function          │                                       │
    │                     │ Name       Api                        │
    │ ▼ Database          │ Type       ...                        │
    │   Dynamo            │ ARN        ...                        │
    │                     │                                       │
    └─────────────────────┴───────────────────────────────────────┘

The resource tree should occupy only as much horizontal space as necessary while remaining comfortably readable.

The selected resource pane receives the remaining space.

---

## 11.2 Resource selection

Selecting a resource should update the detail pane without requiring navigation to a new route during the MVP.

The selected resource should be visually obvious in the tree.

Expanding or collapsing a group should not implicitly select it unless that interaction is intentionally designed to do both.

---

## 11.3 Resource detail

Only safe projected information should be displayed.

Possible values include:

- resource name
- resource ID
- resource type
- normalized ARN
- safe physical metadata
- supported SST resource summary
- parent/child relationships

Copy controls may appear beside safe identifiers such as ARNs and resource IDs.

Do not display:

- raw SST state
- Pulumi state
- secrets
- credentials
- sensitive connection values

---

# 12. Search and Filtering

Search and filtering controls should appear near the content they affect.

Examples:

    Stages (4)                 [Search stages...] [Region ▾] [Account ▾]

or:

    Resources (48)
    [Search resources...]

Avoid placing unrelated search controls in a global toolbar unless global search is actually supported.

Global resource search is explicitly outside the MVP.

---

# 13. Loading States

Every data screen must support loading states.

Prefer skeletons that approximate the final page structure.

For example, an App list should show skeleton App rows rather than a generic full-page spinner.

A small spinner may still be appropriate for:

- buttons
- local actions
- refresh operations

Loading states should not cause major layout shifts once data appears.

---

# 14. Empty States

Empty states should explain:

1. what is absent
2. why that might be expected
3. what the user can do next

Empty states should not imply unsupported functionality exists.

For example, the Apps empty state must not offer "Create App", because Apps are discovered from connected AWS accounts.

---

# 15. Error States

Errors should be expressed in human-readable language.

Where recovery is possible, provide an obvious recovery action such as:

- Retry
- Return to Apps
- View Account
- Connection troubleshooting

Differentiate between:

    No apps discovered

and:

    Unable to load apps

These represent different system states and should not share the same empty-state UI.

---

# 16. Confirmation Dialogs

Operational or destructive actions requiring confirmation should use a focused confirmation dialog.

The dialog should communicate:

- the action
- the affected entity
- relevant impact
- whether the action is destructive
- Cancel
- Confirm

For account sync, the AWS account ID should be explicitly visible before confirmation.

For user removal, the user's email should be explicitly visible.

Avoid generic confirmations such as:

    Are you sure?

Prefer:

    Sync AWS account 123456789012?

or:

    Remove user person@example.com?

---

# 17. Action Feedback

Actions should visibly transition through:

    Idle → Pending → Success / Failure

While pending:

- prevent duplicate submissions
- indicate that work is occurring
- retain enough context for the user to understand what is running

Success and failure should not rely exclusively on temporary toast notifications.

Where the resulting state affects the current page, refresh the relevant information.

---

# 18. Screen Specifications

# 18.1 Auth Screen

## Purpose

Provide access to SST Console and support required Cognito authentication flows.

The Auth screen does not use the authenticated application sidebar.

---

## Layout

Use a focused authentication layout.

A split-screen presentation is acceptable:

    ┌─────────────────────────┬─────────────────────────┐
    │                         │                         │
    │ SST Console             │ Welcome back            │
    │                         │                         │
    │ Short product context   │ Email                   │
    │                         │ [___________________]   │
    │                         │                         │
    │                         │ Password                │
    │                         │ [___________________]   │
    │                         │                         │
    │                         │ [ Sign in ]             │
    │                         │                         │
    └─────────────────────────┴─────────────────────────┘

The left side may provide branding and restrained product context.

The authentication form remains the primary focus.

Do not overcrowd the branding panel with unsupported product claims.

---

## Sign-in form

Display:

- Email
- Password
- Show/hide password
- Sign in
- Forgot password

Preserve the entered email when moving between related authentication flows.

---

## Related flows

The same overall Auth layout should accommodate:

- password reset request
- verification code + new password
- required password change
- invitation confirmation
- sign-up confirmation where required

Avoid sending users to visually unrelated screens for each Cognito challenge.

---

# 18.2 Home — Apps Overview

## Purpose

Primary landing page after authentication.

Show every discovered SST App across connected AWS accounts.

---

## Header

    Apps
    {count} applications across {count} AWS accounts

Primary action:

    Connect account

Secondary entry points should provide access to:

- User Management
- Operations

These may primarily remain available through the sidebar rather than requiring duplicate large buttons in the page content.

---

## Main content

Use a vertical list of App summaries.

Example:

    ┌──────────────────────────────────────────────────────────────┐
    │ [icon] mafia                                                │
    │        4 stages · 2 accounts · 3 regions · 142 resources   │
    │        Updated 2 hours ago                                  │
    │                                                             │
    │        [production] [staging] [development] [preview]       │
    └──────────────────────────────────────────────────────────────┘

Each App should remain visually distinct without creating an oversized dashboard card.

---

## Stage previews

Each stage preview should contain enough information to distinguish it.

Recommended:

- status indicator where meaningful
- stage name
- AWS account ID where useful
- region
- resource count

Stage preview → Stage Detail.

App identity / main App area → App Detail.

---

## Empty state

Explain that Apps are discovered after a connected AWS account is synced.

Primary action:

    Connect account

If accounts already exist:

    View accounts

Never provide a manual "Create App" action.

---

# 18.3 App Detail

## Purpose

Display one SST App and all discovered Stages belonging to it.

---

## Breadcrumb

    Apps / {appName}

---

## Header

Display:

    [icon] {appName}

Supporting metadata:

- stage count
- created timestamp
- updated timestamp

Do not add App-level operational functionality unless supported by the Functional Specification.

In particular, generated mockups showing "Sync App", "App Settings", or similar functionality should not be treated as MVP requirements.

---

## Main content

The primary content is the Stage list.

Prefer a table when there are multiple stages.

Columns may include:

- Stage name
- Account
- Region
- Resource count
- Latest snapshot / updated state
- Created
- Updated

Stage name → Stage Detail.

Account → Account Detail.

---

## Empty state

An App with no Stages is unexpected but possible due to changing discovery state.

Explain this without presenting unsupported creation actions.

---

# 18.4 Stage Detail

## Purpose

Display one deployed SST Stage and its safe projected resources.

This is the primary infrastructure exploration screen.

---

## Breadcrumb

    Apps / {appName} / {stageName}

---

## Header

Display:

    {stageName}

Supporting identity:

    App          Account          Region       Resources
    {app}        {accountId}      {region}     {count}

Also display latest snapshot information.

App → App Detail.

Account → Account Detail.

---

## Main content

Use the Resource Explorer pattern.

    ┌──────────────────────┬──────────────────────────────────────┐
    │ Resources            │ Selected Resource                    │
    │                      │                                      │
    │ ▼ Component          │ Resource identity                    │
    │   Resource           │                                      │
    │   Resource           │ Safe metadata                        │
    │                      │                                      │
    │ ▼ Component          │ Safe identifiers                     │
    │   Resource           │                                      │
    └──────────────────────┴──────────────────────────────────────┘

The resource hierarchy is the dominant element of the screen.

---

## Resource detail behaviour

Selecting a resource updates the detail pane.

Display only supported safe resource projections.

Copy controls should be available for useful safe identifiers.

Do not introduce unsupported actions such as:

- editing resources
- deleting resources
- invoking functions
- opening logs
- modifying configuration

External AWS links should only exist where supported by product requirements and available safe identifiers.

---

# 18.5 Accounts

## Purpose

Display AWS accounts connected to SST Console and their connection/sync state.

---

## Header

    Accounts
    {count} connected AWS accounts

Primary action:

    Connect account

---

## Main content

Prefer a table.

Columns:

- Account ID
- Region
- Connection status
- Safe role identity
- Last sync
- Created / Updated where useful
- Actions

Account row → Account Detail.

---

## Status

Clearly distinguish:

- Connected
- Disconnected
- Unknown / unavailable

Status should be visible without requiring the user to open the account.

---

## Quick sync

An optional Sync action may be available on an Account row.

It must require confirmation before execution.

---

## Empty state

Explain that no AWS accounts are currently connected.

Primary action:

    Connect account

Explain that Apps will become visible after account connection and sync.

---

# 18.6 Connect Account

## Purpose

Guide the user through installing the SST Console connector into another AWS account.

This is an instructional workflow, not a manual account-creation form.

---

## Layout

Use a focused content page within the normal authenticated shell.

The page may use a step-oriented layout:

    Connect AWS Account

    1. Understand requirements
    2. Deploy connector
    3. Verify connection
    4. Sync account

The exact number of visual steps may change as the connector workflow evolves.

---

## Content

Explain:

- what connecting an account enables
- required AWS permissions
- connector/bootstrap prerequisites
- how to deploy/install the connector
- what should happen after deployment
- how the account appears in Console
- that Sync discovers SST Apps and Stages

Commands and configuration values should be displayed in dedicated copyable code surfaces.

---

## Troubleshooting

Provide clear troubleshooting guidance for:

- account not appearing
- disconnected account
- connector role assumption failure
- sync failure

Do not provide:

- manual account ID entry
- manual role ARN registration
- automatic connector deployment

unless those capabilities are added to the product later.

---

# 18.7 Account Detail

## Purpose

Provide the operational view of a connected AWS account.

---

## Breadcrumb

    Accounts / {accountId}

---

## Header

Display:

    {accountId}                      [Sync account]

Status should be visible beside or near the identity.

Supporting metadata:

- region
- safe role identity
- last successful sync
- created timestamp
- updated timestamp

---

## Main content

Two major areas:

### Account information

Display connection and sync information in a compact metadata layout.

### Discovered Stages

Display all Stages owned by the account.

Recommended columns:

- App
- Stage
- Region
- Resource count
- Latest state
- Updated

Stage → Stage Detail.

App → App Detail.

---

## Sync action

Sync account is the primary operational action.

Before execution, require confirmation containing the AWS account ID.

While syncing:

- disable duplicate execution
- show pending state

After success:

- refresh Account information
- refresh discovered Stages

On authorization failure:

- show disconnected status
- provide connection troubleshooting guidance

Explain that sync updates Console's projection of current SST state and may remove stale discovered entities.

---

# 18.8 User Management

## Purpose

Manage people who can access SST Console.

---

## Header

    Users

Primary action:

    Invite user

---

## Controls

Provide filtering for:

- email
- Cognito status
- enabled / disabled state

Filtering controls should remain compact and sit immediately above the User list.

---

## Main content

Use a table.

Columns may include:

- Email
- Cognito status
- Enabled state
- Created
- Updated
- Actions

Console user ID may be available but should not displace email as the primary identity.

Support pagination or load-more behaviour.

---

## Invite user

Open a focused dialog.

Required input:

    Email

Explain that the invited user completes account setup through the Cognito/email flow.

After success:

- show success
- refresh User list

---

## Remove user

Expose removal through the row actions.

Require confirmation.

The dialog must clearly identify the user's email and explain that removal deletes Console/Cognito access.

Removal is destructive and should use appropriate semantic styling.

---

## Do not display

The MVP does not have:

- roles
- permission assignment
- profile editing
- disable-user controls
- resend invitation

Do not include UI suggesting these capabilities already exist.

---

# 18.9 Operations

## Purpose

Centralise infrequent operational, diagnostic, migration, and recovery actions.

This screen should feel intentionally different from normal entity browsing.

Operational actions should not appear to be routine configuration.

---

## Header

    Operations

Supporting text should explain that these actions affect Console discovery, recovery, or connection state.

---

## Layout

Each operation should have a distinct section.

Example:

    ┌─────────────────────────────────────────────────────────────┐
    │ Recover accounts                                            │
    │                                                             │
    │ Restore Console account projections from the durable       │
    │ connection registry. This does not sync SST state.          │
    │                                                             │
    │                                         [Recover accounts]  │
    └─────────────────────────────────────────────────────────────┘

Operations should communicate:

- action name
- purpose
- impact
- prerequisites
- confirmation requirement
- execution status
- result/error output

---

## Recover accounts

Explain:

- account projections are restored from durable connection information
- SST state is not synced

After completion:

- show recovered accounts
- show per-account failures
- link to Accounts for subsequent syncing

---

## Backup connections

Present as a migration/recovery operation.

Explain when it is needed.

Require explicit confirmation.

Show success or failure.

---

## Resync account

Allow selection of one existing connected account.

This performs the same sync behaviour available from Account Detail.

Account Detail remains the preferred normal entry point.

Operations provides this capability primarily for diagnostic use.

---

## Avoid

Do not turn Operations into a generic administration dashboard.

Do not include unsupported actions such as:

- resync all accounts
- delete all projections
- database repair
- arbitrary API calls
- raw state access
- cloud shell
- infrastructure mutation

---

# 18.10 Not Found

## Purpose

Recover gracefully from invalid, stale, or removed routes.

---

## Layout

Retain the authenticated application shell when the user is authenticated.

Display a focused message in the content area.

Example:

    Page not found

    The page you're looking for doesn't exist or may have
    been removed during a later account sync.

    [Return to Apps]

Secondary navigation may include:

- Apps
- Accounts

---

## Context-aware messaging

For stale App or Stage routes, explain that later account syncs may remove previously discovered state.

Avoid technical router errors or raw HTTP error messages.

---

# 19. Optional User Detail Screen

User Detail is optional for the MVP.

The User Management table plus Invite and Remove dialogs are sufficient for current functionality.

If implemented, User Detail should follow the standard entity-page structure:

    Users / {user}

    {email}

    Cognito status
    Enabled state
    Created
    Updated

                                      [Remove user]

Do not create additional functionality merely to justify this screen.

---

# 20. Responsive Behaviour

SST Console is primarily a desktop developer tool.

Desktop should therefore receive the strongest optimisation.

The UI should still remain usable at narrower widths.

Responsive priorities:

1. Preserve access to navigation.
2. Preserve entity identity and actions.
3. Preserve access to all information.
4. Allow horizontal or structural adaptation of dense tables where necessary.
5. Allow the Stage Resource Explorer to adapt without making the tree unusable.

On narrow layouts, the Resource Explorer may transition from permanent split-pane presentation to:

    Resource tree → select resource → resource detail

rather than attempting to display both panes simultaneously.

---

# 21. Visual Language

## 21.1 Overall appearance

The interface should feel:

- modern
- technical
- restrained
- precise
- calm
- developer-oriented

It should not feel:

- playful
- heavily corporate
- consumer-oriented
- overly futuristic
- decorative
- like an AWS Console clone

---

## 21.2 Colour

Use a restrained primary accent, currently represented by blue in the design concepts.

Semantic colours should be reserved primarily for state:

- green — success / connected
- amber — warning
- red — failure / destructive
- blue — informational / active
- neutral — unknown / inactive

Avoid large areas of highly saturated colour.

---

## 21.3 Theme

The Console supports theme preference.

The current design direction uses a dark application/navigation surface combined with high-contrast content surfaces.

Equivalent hierarchy should remain clear in both light and dark themes.

Do not rely on colour values that only work in one theme.

---

## 21.4 Borders and elevation

Use subtle borders and restrained elevation to establish hierarchy.

Avoid excessive shadows.

Major content areas may use bordered surfaces.

Rows within those surfaces should generally use separators rather than individually floating cards.

---

## 21.5 Radius

Use moderate corner radii.

Avoid excessive pill-shaped containers.

Pills are appropriate for:

- statuses
- compact filters
- small metadata indicators

They should not become the default shape for every control and container.

---

## 21.6 Icons

Icons may reinforce:

- navigation
- entity type
- resource type
- actions
- status

Do not require unique decorative icons for every App or Stage.

Infrastructure/resource icons should improve scanning rather than add decoration.

---

# 22. Typography

Use clear typographic hierarchy.

Typical hierarchy:

    Page title
    Entity title
    Section title
    Primary content
    Supporting metadata
    Secondary metadata

Infrastructure identifiers such as:

- ARNs
- IDs
- account IDs
- resource IDs

may use monospace typography where it improves readability.

Do not use monospace typography for the entire interface simply because the audience is developers.

---

# 23. Timestamps

Default timestamps should be human-readable in the user's local time.

Where useful, show relative context:

    Oct 26, 2026, 14:32
    2 hours ago

Full timestamp information may be exposed through secondary text or hover/detail interactions.

Consistency matters more than a specific timestamp format.

---

# 24. Copyable Values

Safe identifiers should provide convenient copy actions.

Examples:

- ARN
- Resource ID
- AWS Account ID
- connector commands
- configuration values

Copy actions should provide immediate success feedback without obscuring the underlying value.

---

# 25. Action Hierarchy

Use visual hierarchy consistently.

## Primary action

One primary action should normally dominate a page.

Examples:

    Connect account
    Sync account
    Invite user

## Secondary action

Less prominent actions may use neutral buttons.

## Overflow actions

Infrequent actions should use an overflow menu.

## Destructive action

Destructive actions should use semantic destructive styling and confirmation.

Avoid presenting multiple equally dominant primary actions on the same screen.

---

# 26. Things to Avoid

The following patterns should generally be avoided.

## Dashboardification

Do not transform every page into collections of KPI tiles.

Small summary metrics are acceptable when they materially improve understanding.

Charts should not be introduced unless the underlying functionality eventually requires time-series or analytical visualisation.

---

## Excessive cards

Do not wrap every field, row, or metadata value in a separate card.

---

## Fake functionality

Never introduce UI merely because it appeared in a generated concept.

Examples from generated concepts that are not automatically part of the MVP include:

- Sync App
- App Settings
- View Logs
- Events
- resource configuration
- resource mutation
- resource health monitoring
- arbitrary AWS actions

Only functionality supported by the Functional Specification and backend should appear.

---

## AWS Console imitation

SST Console interacts with AWS but should not reproduce the AWS Console's information architecture.

The SST hierarchy should remain primary.

---

## Hidden hierarchy

Do not flatten:

    App → Stage → Resource

into unrelated lists.

The relationship between these entities is central to the product.

---

## Excessive navigation

Do not create sidebar entries for every entity type.

Resources, Stages, and individual Accounts are contextual entities, not global navigation sections.

---

## Oversized presentation

Avoid:

- giant page headings
- large hero sections
- excessive whitespace
- enormous metric cards
- marketing-style layouts

This is an operational developer tool.

---

# 27. Design Consistency Rules

When implementing a new screen or component, prefer an existing pattern before introducing a new one.

Specifically:

- Entity pages should use the standard entity header.
- Related entities should use navigable relationships.
- Status should use the shared status pattern.
- Lists of structured entities should use the shared table/list patterns.
- Operational actions should use the shared confirmation and execution-state patterns.
- Empty states should explain the next valid action.
- Errors should distinguish missing data from failed loading.
- Infrastructure hierarchy should use explorer-style presentation where appropriate.

A new visual pattern should exist because the information or interaction requires it, not merely to make a screen look different.

---

# 28. MVP Information Architecture

The final MVP navigation model is:

    Authentication

    SST Console
    │
    ├── Apps
    │   │
    │   └── App
    │       │
    │       └── Stage
    │           │
    │           └── Resource Explorer
    │
    ├── Accounts
    │   │
    │   ├── Connect Account
    │   │
    │   └── Account
    │
    ├── Users
    │
    └── Operations

Resources remain part of Stage Detail during the MVP.

User Detail is optional.

Future features should extend this hierarchy rather than bypassing it.

---

# 29. Future Design Considerations

The design should leave room for future capabilities already identified in the Functional Specification without prematurely exposing them.

Potential future screens include:

- Resource Detail
- Sync History
- Settings
- Access Control
- System Health

The application shell and entity hierarchy should be capable of accommodating these later.

For example:

    Apps
      └── App
          └── Stage
              └── Resource

and:

    Accounts
      └── Account
          └── Sync History

However, future navigation should not be exposed until the corresponding functionality exists.

---

# 30. Design North Star

SST Console should make a multi-account SST environment feel understandable.

A user should be able to open the Console and quickly answer:

- What SST Apps exist?
- What Stages does this App have?
- Which AWS account owns this Stage?
- Which region is it deployed in?
- What resources belong to this Stage?
- What is this resource?
- Which Apps and Stages were discovered from this AWS account?
- Is this account connected?
- When was it last synced?
- Who has access to this Console?

The interface should make these answers obvious through hierarchy and direct navigation rather than requiring users to understand the underlying SST state representation.

When choosing between visual novelty and clarity, choose clarity.

When choosing between additional abstraction and exposing the SST hierarchy, expose the hierarchy.

When choosing between a generic SaaS dashboard and a focused developer tool, build the developer tool.
