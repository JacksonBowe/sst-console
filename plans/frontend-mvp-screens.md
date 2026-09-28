# SST Console — MVP Screen Functional Specification

## Global application behavior

### Authenticated console

- Require login for all console screens.
- Redirect unauthenticated users to Auth screen.
- Redirect authenticated users away from Auth screen to Home.
- Show current-user controls: sign out and theme preference.
- Support loading, empty, success, and error states on every data screen.
- Preserve user context when navigating backward through App, Stage, and Account paths.

### Shared operational behavior

- Display API errors in clear human-readable form.
- Require confirmation before destructive or operational actions.
- Show action status: pending, succeeded, failed.
- Never expose raw SST state, Pulumi state, secrets, IAM credentials, or sensitive connection values.
- Show timestamps in readable local format, with full timestamp available where useful.

## 1. Auth Screen

### Purpose

Let Console users access account, recover access, and complete required Cognito account flows.

### Functionalities

- Sign in with email and password.
- Show/hide password.
- Validate required fields before submit.
- Display invalid-credential and service errors.
- Keep entered email across related auth flows.

### Password recovery

- Start forgot-password flow using email.
- Submit verification code and new password.
- Validate password policy.
- Return user to sign-in after successful reset.

### New-user / invite completion

- Support invited user sign-in.
- Support required-password-change flow.
- Support sign-up confirmation where Cognito requires it.
- Display account status/error messages.

### States

- Default sign-in.
- Submitting.
- Invalid credentials.
- Password reset request.
- Password reset confirmation.
- New password required.
- Invite/sign-up confirmation.
- Auth service unavailable.

## 2. Home Screen — Apps Overview

### Purpose

Primary landing screen. Show all discovered SST applications across connected AWS accounts.

### Functionalities

- List every discovered SST app.
- Show one app card/row per app.
- Select app to open App Detail screen.
- Show app summary:
    - app name
    - number of stages
    - stages and their owning account IDs
    - regions
    - resource counts
    - last updated / latest known state timestamp
- Make stage summaries selectable, opening matching Stage Detail screen.
- Provide entry points for account connection, user management, and operational actions.

### Primary actions

- **Connect account**: Open Connect Account screen.
- **Manage users**: Open User Management screen.
- **More / Operations**: Open operational actions menu or Operations screen.

### Empty state

When no apps exist:

- Explain that apps appear after a connected account has been synced.
- Offer **Connect account**.
- Offer **View accounts** if accounts already exist.
- Do not imply an app can be manually created in Console.

### Loading and error states

- Skeleton/list loading while app summaries load.
- Retry after API failure.
- Explain partial absence carefully: “No discovered apps” is distinct from “Unable to load apps.”

## 3. App Detail Screen

### Purpose

Show one SST app and every discovered stage belonging to it, including stages in different AWS accounts.

### Inputs

- App name from URL.

### Functionalities

- Load app summary by app name.
- Display app name.
- Display app metadata: created timestamp, updated timestamp, and number of stages.
- List stages belonging to app.
- For each stage, show:
    - stage name
    - owning AWS account ID
    - region
    - resource count
    - latest snapshot / discovered-state information
    - created and updated timestamps
- Select stage to open Stage Detail screen.
- Select owning account to open Account Detail screen.
- Return to Home.

### Empty / error states

- App not found: explain app may have been removed by a later account sync; provide return-to-Home action.
- No stages: normally unexpected for existing app; show informational empty state.
- Load failure: retry or return Home.

## 4. Stage Detail Screen

### Purpose

Show one deployed SST stage, its connected AWS account, latest discovered state, and safe resource summaries.

### Inputs

- App name and stage name from URL.

### Functionalities

- Load selected stage.
- Display stage identity: app name, stage name, owning AWS account ID, and region.
- Link back to App Detail.
- Link to Account Detail.
- Display latest snapshot metadata: snapshot timestamp and safe source/state discovery metadata.
- Display resource hierarchy as expandable tree.
- Show safe resource details:
    - resource name / ID
    - resource type
    - parent/child relationship
    - supported SST resource summary
    - normalized AWS ARN where available
    - safe physical metadata
- Expand/collapse component/resource groups.
- Copy safe identifiers such as ARN or resource ID.

### Resource types in MVP

- SST Bucket resources.
- SST Function resources.
- SST Dynamo resources.
- SST component groups.
- Other supported safe resource projections returned by API.

### Explicit non-functionalities

- No raw state viewer.
- No secret viewer.
- No resource mutation.
- No global resource search.
- No logs viewer.
- No arbitrary cross-account resource queries.

### Empty / error states

- Stage not found.
- No resources discovered.
- Latest state snapshot unavailable.
- Resource projection incomplete or unavailable.

## 5. Accounts Screen

### Purpose

Show all AWS accounts connected to SST Console and their connection/sync health.

### Functionalities

- List connected accounts.
- Show account summary:
    - AWS account ID
    - region
    - connection status
    - role ARN or safe role identity summary
    - last sync timestamp
    - created/updated timestamps
- Select account to open Account Detail.
- Start account-connection flow.
- Show account status clearly: connected, disconnected, unknown/unavailable.
- Sort or group accounts by health/status when useful.

### Primary actions

- **Connect account**.
- **Open account**.
- Optional quick action: **Sync account**, with confirmation.

### Empty state

- Explain no AWS accounts are connected.
- Offer **Connect account**.
- Explain app discovery requires a later sync.

## 6. Connect Account Screen

### Purpose

Guide user through connecting an AWS account to Console using SST connector/bootstrap workflow.

### Important product rule

Current system registers accounts through SST connector infrastructure. Console must not falsely present unsupported manual account creation.

### Functionalities

- Explain what connection enables: app/stage/resource discovery, account sync, and safe state projection.
- Explain prerequisites: deploy/install required SST Console connector in target AWS account; required AWS permissions/role setup.
- Provide setup instructions and command/configuration snippets where product defines them.
- Explain expected result after connector deployment: account appears in Accounts screen; user runs Sync to discover current SST apps.
- Link to Accounts screen.
- Copy setup commands/values.
- Provide troubleshooting for account missing, disconnected account, sync failure, and connector-role assumption failure.

### Future functionality, not MVP

- Manual AWS account ID + role ARN entry.
- Automated connector deployment from Console.
- OAuth/SSO account linking.
- Multi-account bulk connection.

## 7. Account Detail Screen

### Purpose

Provide operational view of one connected AWS account.

### Inputs

- AWS account ID from URL.

### Functionalities

- Load account connection/inspection data.
- Display account ID, region, role identity summary, connection status, last successful sync timestamp, and account metadata timestamps.
- Show discovered stages owned by this account.
- Link each stage to Stage Detail screen.
- Clearly show app name and stage name for every stage.
- Run sync for account.
- Show sync result: started/in progress, success, failure, disconnected/authorization failure.
- Explain that successful sync updates Console’s safe projection of current SST state.
- Explain sync may remove stale discovered app/stage/resource projections absent from source state.

### Sync action behavior

- Require confirmation before starting.
- Confirm target AWS account ID.
- Disable duplicate submit while sync runs.
- Display success/failure result.
- Refresh account and related stage information after success.
- On authorization failure, surface disconnected status and direct user to connection troubleshooting.

### Not MVP

- Historical sync-run list; backend marks this as planned.
- Automatic scheduled-sync controls.
- Edit account role/region from Console.
- Disconnect/delete account from Console.

## 8. User Management Screen

### Purpose

Manage people allowed to access SST Console.

### Functionalities

- List Console users with pagination.
- Filter users by email, Cognito status, and enabled/disabled state.
- Show user summary: email, Console user ID if useful, Cognito status, enabled state, created timestamp, and updated timestamp.
- Invite user.
- Open individual user detail if needed.
- Remove user.
- Handle pagination cursor/load-more behavior.

### Invite user behavior

- Open invite form/dialog.
- Collect and validate email.
- Submit user invitation.
- Show invitation success/failure.
- Explain invited user completes account setup through email/Cognito flow.
- Refresh user list after success.

### Remove user behavior

- Require destructive-action confirmation.
- Clearly identify target email.
- Explain removal deletes Console/Cognito access.
- Submit deletion.
- Remove user from list after success.
- Display failure without pretending deletion succeeded.

### Empty state

- Explain no Console users exist or no users match filters.
- Offer **Invite user**.

### Not MVP

- Role assignment.
- Fine-grained permissions.
- Re-send invitation.
- Disable user without deletion.
- Edit user email/profile.
- Self-service profile management.

## 9. User Detail Screen — Optional MVP

### Purpose

Provide stable URL and focused view for an individual Console user.

### Functionalities

- Load user by native Console user ID.
- Display user identity and Cognito state.
- Show user timestamps.
- Remove user.
- Return to User Management.

### Recommendation

Can defer. User list plus invite/delete dialog covers current backend capabilities.

## 10. Operations Screen

### Purpose

Centralize infrequent, potentially disruptive, diagnostic, and recovery actions.

### Access

- All authenticated users under current product behavior.
- Future role/permission enforcement should protect this screen before wider rollout.

### Functionalities

Present each action as separate operational card/section with:

- action name
- plain-language purpose
- impact/warnings
- prerequisites
- confirmation control
- execution status
- result/error output
- link to relevant account/detail screen

### MVP operations

#### Recover accounts

- Trigger account recovery from durable connection registry.
- Explain recovery restores Console account projections.
- Explain recovery does **not** sync SST state.
- Show returned recovery result: recovered accounts and per-account failures.
- Link users to Accounts screen to sync restored accounts.

#### Backup connections

- Trigger backup of existing connection information.
- Mark as migration/recovery operation.
- Explain when it is needed.
- Require explicit confirmation.
- Show success/failure.

#### Resync an account

- Choose one existing connected account.
- Trigger same behavior as Account Detail Sync.
- Link to account afterwards.
- Prefer Account Detail as normal entry point; Operations supports diagnostic use.

### Not MVP

- Resync all accounts in one action.
- Delete all projections.
- Database repair tools.
- Raw state access.
- Arbitrary API request runner.
- Cloud shell/terminal.
- Production infrastructure mutation.

## 11. Not Found Screen

### Purpose

Recover from invalid, stale, or deleted routes.

### Functionalities

- Explain requested page does not exist.
- Provide route-aware recovery: Home, Apps, Accounts.
- For stale App/Stage routes, explain later sync may have removed prior discovered state.
- Preserve authenticated console shell when user is logged in.

## 12. Future Screens — Not MVP

### Resource Detail Screen

Route concept: `/apps/:appName/stages/:stageName/resources/:resourceId`

Future functionalities:

- Dedicated deep link for resource.
- Safe resource metadata.
- Parent/child component context.
- Copy ARN and identifiers.
- Related operational insights.

Requires direct resource API/read design before implementation.

### Sync History Screen

Route concept: `/accounts/:accountId/sync-history`

Future functionalities:

- List sync runs.
- Show duration, status, timestamps, failure reason.
- Link affected discoveries.
- Filter by outcome.

Requires planned sync-history backend query.

### Settings Screen

Future functionalities:

- Theme preference.
- Personal preferences.
- Notification settings.
- Console/environment information.

### Access Control Screen

Future functionalities:

- Roles.
- User permissions.
- Operations-only access.
- Audit trail.

### System Health Screen

Future functionalities:

- Connected account health.
- Failed sync summary.
- Discovery freshness.
- API/system status.
