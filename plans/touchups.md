Update SST Console to reflect the approved mockups. Use the existing design system and components, and determine implementation details from the codebase.

Preserve current functionality. Treat mockup data as illustrative, and only display information supported by the application.

## Overall direction

Keep the existing dark console aesthetic, with clearer hierarchy and more consistent spacing.

Prioritise useful operational information, readable status indicators, and compact controls. Keep technical workspaces dense enough for investigation.

Adapt layouts to available space. Avoid unnecessary decorative elements, repeated headings, and oversized empty table containers.

## Navigation

Combine issue investigation and notification configuration under one global “Issues” navigation item.

Remove the separate “Alerts” navigation item.

Within Issues, provide three tabs:

- Issues
- Alert rules
- Notification channels

Keep the open-issue count visible in navigation.

Preserve contextual App and Stage selection, resource navigation, and access to Local Workspace.

## Apps

Make application cards easier to scan and more useful for identifying what needs attention.

Each card should prioritise:

- Application name.
- Stage links.
- Open issues, when present.
- Monitoring coverage.
- Secondary account/resource counts and update information.

Replace the prominent repeated metric grid with a more compact arrangement.

Represent monitoring accurately at stage level. An application with mixed coverage should communicate that clearly.

Add application search and an account filter where supported.

Keep “Connect account” as the main page action.

## Connect AWS account dialog

Turn the dialog into a concise setup flow.

Explain the process in three steps:

1. Sign in to the workload AWS account.
2. Open the CloudFormation setup.
3. Review permissions and create the stack.

Briefly explain what the connection stack creates, using wording consistent with its actual permissions.

Replace the large wrapped URL with a compact, truncated link field and a copy action. Copying must preserve the complete URL.

Keep the signed-in-account acknowledgment and existing action-enabling behaviour.

Use “Open CloudFormation” as the primary action and “Cancel” as the secondary action.

Explain that the connection appears after setup completes.

## Issues: Issues tab

Keep investigation as the primary focus.

Move global maintenance and destructive actions into a secondary menu. Keep developer test actions out of the normal production interface.

Retain search and App, Stage, and Status filters.

Where supported, provide a compact summary of open issues, occurrences, and monitored stages. Make the scope of those figures clear.

The issue list should show:

- Error title/type and message preview.
- App and stage.
- Function/workload.
- Occurrence count.
- Last seen.
- Status.
- Relevant actions.

Use readable resource names where available. Make full messages and exact timestamps accessible without crowding the list.

Keep Resolve readily available. Put less common actions in an overflow menu.

Selecting an issue should open a detail panel while retaining the list and filters. Clearly highlight the selected issue.

The detail panel should present available information:

- Title, type, and status.
- Resolve and other existing actions.
- First and last seen.
- Occurrence count.
- App, stage, and workload links.
- Full error message.
- Stack trace.
- Recent occurrences.

Provide useful copy controls. Adapt the detail view appropriately on smaller screens.

## Issues: Alert rules tab

Move existing alert-routing configuration here.

Explain that rules determine which issues trigger notifications and where those notifications are sent.

Use “Create rule” as the main action.

Present existing rule information clearly:

- Name, where supported.
- App/stage scope.
- Trigger, where applicable.
- Notification channels.
- Enabled state, where supported.
- Edit and other actions.

Use readable scope descriptions and recognisable channel labels.

Preserve existing configuration capabilities and validation. Do not add backend features solely to reproduce illustrative mockup fields.

## Issues: Notification channels tab

Rename the user-facing “Alert targets” concept to “Notification channels”.

Explain that these are reusable destinations for issue notifications.

Use “Add channel” as the main action.

Present each destination as a compact row or card containing:

- Destination name.
- Provider.
- Safe destination details.
- Rule usage, where available.
- Test result, where available.
- Test, edit, and additional actions.

Keep information and action placement consistent across destinations.

Do not expose credentials or sensitive webhook URLs.

Distinguish a successful test from ongoing delivery health. Preserve the currently supported providers.

## Accounts

Make account identity and connection state easier to scan.

Show connected and disconnected counts clearly in the page subtitle.

Provide “Connect account” and “Sync all” in the header.

For each account, prioritise:

- Account name or alias, where available.
- Account ID with copy action.
- Region.
- Connection status.
- Last successful sync, where available.
- Relevant actions.

Keep role ARNs accessible in details rather than as a dominant table column.

Offer Sync for connected accounts and Reconnect where an existing reconnect flow supports it.

Remove redundant headings inside the table.

## Stage Overview

Make this a stage summary that also provides resource inspection.

Preserve breadcrumbs and clearly identify the application and stage.

Show account, region, and latest snapshot information compactly.

Communicate monitoring status and provide a secondary “Manage monitoring” action instead of a prominent disable button.

Surface:

- Open issues, linking to the appropriately filtered Issues view.
- Resource count.
- Monitoring state.

Avoid repeating the same status in multiple prominent places.

Include recent issues where supported, with a link to view all issues for the stage.

Retain the searchable resource tree and detail pane below the summary. Preserve hierarchy, selection, copy actions, and applicable resource/log links.

Balance summary content with sufficient space for useful resource inspection.

## Local Workspace

Preserve the existing invocation-list and detail-panel structure.

Add compact session context near the heading:

- Connection state.
- Streaming or paused state.
- Retained invocation count.
- Time since the last received event, where available.

Keep search, status filtering, pause/resume, and clear activity controls. Preserve their existing semantics.

Maintain a dense, readable invocation list with clear selection.

The selected invocation should clearly show function/route context, timestamp, duration, and status.

Retain Overview, Input, Output, and Logs tabs.

In Overview, show Input and Output alongside one another with Logs below when space allows. Adapt the arrangement at narrower widths.

Preserve syntax highlighting, copying, visibility controls, and sensitive-data handling.

## Quality expectations

Keep wording, action placement, status treatment, and spacing consistent across screens.

Preserve loading, empty, error, and success states.

Maintain accessible labels, keyboard interaction, focus handling, and readable contrast.

Validate the changed navigation and workflows, and report any desired elements that could not be implemented using existing capabilities.
