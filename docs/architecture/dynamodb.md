# DynamoDB architecture

## Purpose

### State ingestion reset

State discovery reconciles DiscoveredStage inventory after a complete S3 listing.
Account orchestration syncs selected Stages sequentially, then removes stale
account-owned projections only when discovery and required Stage syncs succeed.
Successful Stage syncs may already have changed their own Resources if a later
Stage fails. Live sync maintains inventory and reconciles monitoring. Concurrent
sync and policy changes remain uncoordinated. Cleanup and monitoring failure
outcome ordering remains a TODO.

Before the next release, resolve event spoofing and unchecked internal event
publication failures and verify the two-consumer flow. Existing workload event
forwarding rules pick up changes on account sync. Historical Update artifacts are
not replayed.

Account `lastSyncedAt` and the write-only SyncRun entity are removed. Existing
attributes and SyncRun items remain unused; no purge or resync is required solely
for their removal. Only the user may perform optional database cleanup. Account
`lastSyncConflicts` records the most recent completed account-wide reconciliation.

`ConsoleData` is one DynamoDB table for SST Console operational data. It is an
index of Console-safe SST state, not a replica of full SST state. Raw SST state
remains in S3. Console navigation is App-first: one global SST app groups its
Stages across connected AWS accounts.

This document is required reading before changing DynamoDB infrastructure,
ElectroDB models, persistence use cases, access patterns, or data migrations.

## Non-negotiable conventions

- Use one physical table: `ConsoleData`.
- Use ElectroDB with AWS SDK v3 `DynamoDBDocumentClient`.
- Create one `*.dynamo.ts` file per domain. Do not create persistence-grouped
  domain folders such as `catalog/`.
- `db/service.ts` only composes domain entities and configures the client/table.
  It contains no domain behavior.
- Zod `schema.ts` files contain pure public contracts. They must not import SST,
  AWS SDK, or ElectroDB.
- Domain use cases live in domain `index.ts` and validate public input/output.
- Only `*.dynamo.ts` files define or reason about `pk`, `sk`, GSI fields, and
  ElectroDB metadata. Application code must not write those fields directly.
- Every new UI screen, API route, worker, or scheduled task must document its
  exact DynamoDB read/write before an entity, GSI, or query is added.
- Never use `ScanCommand` in product code. No local secondary indexes.
- Do not add speculative GSIs. DynamoDB supports only 20 GSIs per table.
- User performs all database and cloud actions.
- Do not implement old-shape aliases, dual reads, dual writes, or other
  backwards-compatibility paths.

## Layout

```text
packages/core/src/
  account/
    account.dynamo.ts      # Account entity
  app/
    app.dynamo.ts          # App, Stage, Resource entities
	state/
		state.dynamo.ts        # State, StateUpdate, DiscoveredStage entities
		state.ts               # Current State contract and CRUD
		state.update.ts        # State Update contract and CRUD
  db/
    client.ts              # DynamoDBDocumentClient
    service.ts             # ElectroDB Service composition
    index.ts               # db export
```

`App`, `Stage`, and `Resource` are one product domain. A resource is always
meaningful in an App/Stage hierarchy, with its Stage retaining account
provenance, so do not make a top-level `resource/` or `stage/` persistence
domain without an accepted product reason.

## Table definition

Defined in `infra/storage.ts`:

```text
Table: ConsoleData
Primary key: pk (string), sk (string)

GSI: entitiesByType
  hash:  entityType
  range: entitySort

GSI: entitiesByAwsAccount
  hash:  accountPk
  range: accountSk

GSI: lookup
  hash:  lookupPk
  range: lookupSk

Table: ConsoleConnections
Primary key: pk (string), sk (string)
No secondary indexes
```

`ConsoleData` stores disposable Console projections and operational state.
`ConsoleConnections` stores durable workload account connection configuration,
written by the installation-scoped `SSTConsoleConnection-<control-account-id>-<stage-hash>` stack callback. Its description identifies the control account and Console stage. Recovery is its sole read
pattern: query the fixed `CONNECTIONS` partition and restore the ConsoleData
account records. It has no GSI. SST links each table only to functions that need
it. Core resolves names through `Resource.ConsoleData.name` and
`Resource.ConsoleConnections.name`; never hardcode table names.

Every `ConsoleData` entity writes `entityType` and `entitySort` through its
ElectroDB definition. `entitiesByAwsAccount` is sparse and contains entities
with an AWS `accountId`. `lookup` is sparse and reserved for alternate-key
lookups such as a CloudWatch Logs source.

## Entity keys

ElectroDB derives all keys. These layouts are contract, not values callers
construct themselves.

| Entity                  | PK                                                        | SK                                          |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------- |
| Account                 | `ACCOUNT#{accountId}`                                     | `account`                                   |
| App                     | `APP#{appName}`                                           | `APP`                                       |
| Stage                   | `APP#{appName}`                                           | `STAGE#{stageName}`                         |
| Resource                | `APP#{appName}#STAGE#{stageName}`                         | `RESOURCE#{resourceId}`                     |
| State                   | `APP#{appName}#STAGE#{stageName}`                         | `STATE`                                     |
| StateUpdate             | `APP#{appName}#STAGE#{stageName}`                         | `STATE_UPDATE#{updateId}`                   |
| StateSnapshot (planned) | `APP#{appName}#STAGE#{stageName}`                         | `STATE_SNAPSHOT#{updateId}`                 |
| StateEvent (planned)    | `APP#{appName}#STAGE#{stageName}#STATE_UPDATE#{updateId}` | `STATE_EVENT#{resourceId}`                  |
| DiscoveredStage         | `ACCOUNT#{accountId}`                                     | `DISCOVERY#{appName}#STAGE#{stageName}`     |
| Connection              | `CONNECTIONS`                                             | `ACCOUNT#{accountId}`                       |
| User                    | `USER#{id}`                                               | `USER`                                      |
| UserIdentity            | `COGNITO#{cognitoSub}`                                    | `USER`                                      |
| IssueSubscription       | `APP#{appName}#STAGE#{stageName}`                         | `ISSUE_SUBSCRIPTION#{region}#{logGroup}`    |
| Issue                   | `APP#{appName}#STAGE#{stageName}`                         | `ISSUE#{fingerprint}`                       |
| IssueIngressEvent       | `APP#{appName}#STAGE#{stageName}`                         | `ISSUE_INGRESS_EVENT#{sourceKey}#{eventId}` |
| IssueSubscriber         | `ISSUE_SUBSCRIBER#{accountId}#{region}`                   | `SUBSCRIBER`                                |
| AlertRule               | `ALERT_RULE#{id}`                                         | `ALERT_RULE`                                |
| NotificationDestination | `NOTIFICATION_DESTINATION#{id}`                           | `NOTIFICATION_DESTINATION`                  |

`id` is a native Console ULID. `cognitoSub` remains external identity data;
the UserIdentity record maps it to the native user ID and enforces one Cognito
subject per User through a transactional create.

`appName` is a workspace-global Console App identity. SST provides no stronger
cross-account identity, so unrelated apps must not share an SST app name. A
Stage is globally identified by `appName + stageName` and has one owning
`accountId`; a sync that finds it in another account fails with
`stage_account_conflict`. `region` on Stage identifies connector/bootstrap
access only, not deployment placement. Resources may span regions within one
Stage.

`Stage.issueMonitoringEnabled` is Console configuration for whether its current
Lambda log groups receive Issue monitoring. It defaults to `false`.

`resourceId` is stable Console identity. `parentResourceId` models SST component
nesting. SST URN and normalized AWS ARN are separate attributes; neither is
inferred from key encoding. Component group rows have no ARN; only physical resources populate
`normalizedArn`.

## Current indexes and access patterns

| Access pattern                                | Entity/API                                                           | Dynamo operation                                                              | Status      |
| --------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------- |
| Get one account                               | `db.entities.account.get({ accountId })`                             | primary-key get                                                               | Implemented |
| List accounts                                 | `db.entities.account.query.byType({})`                               | `entitiesByType` query                                                        | Implemented |
| Register/update connector                     | `db.entities.account.upsert(...)`                                    | primary-key update                                                            | Implemented |
| Persist account sync conflicts                | Account patch                                                        | primary-key update                                                            | Implemented |
| Mark disconnected after remote access denial  | `db.entities.account.patch({ accountId })`                           | primary-key update                                                            | Implemented |
| Home → App list                               | name ascending                                                       | `entitiesByType` query                                                        | Implemented |
| App detail                                    | app name                                                             | App primary-key get                                                           | Model ready |
| App → stages                                  | app name, stage order                                                | Stage primary-key query                                                       | Implemented |
| Stage → resources                             | app and stage                                                        | Resource primary-key query                                                    | Implemented |
| Reconcile account state projections           | worker: account ID                                                   | `entitiesByAwsAccount`, then per-Stage resource queries                       | Implemented |
| Reconcile changed SST state object            | EventBridge worker: account ID + state key                           | Account primary-key get; Stage/resource primary-key queries                   | Implemented |
| Read current State                            | app and stage                                                        | State primary-key get, strongly consistent                                    | Implemented |
| Upsert current State                          | account sync/event worker: current app state                         | State primary-key upsert                                                      | Implemented |
| Read one State Update                         | app, stage, update ID                                                | StateUpdate primary-key get, strongly consistent                              | Implemented |
| Upsert State Update                           | state artifact worker: validated update object                       | StateUpdate primary-key upsert; preserves aggregate counts                    | Implemented |
| List State Updates                            | future update-history API: app/stage, newest first, cursor-paginated | `lookup` query on StateUpdate history partition                               | Model ready |
| Read State Snapshot for update                | future reconciliation/API: app, stage, update ID                     | StateSnapshot primary-key get                                                 | Planned     |
| Find State Snapshot neighbors                 | future reconciliation: app, stage, observed time                     | `lookup` range query on StateSnapshot chronology partition                    | Planned     |
| List State Events                             | future update-detail API: app, stage, update ID                      | StateEvent primary-key query                                                  | Planned     |
| Delete State history with Stage               | stage removal/account purge: app, stage                              | State get/delete; StateUpdate history query then batched primary-key deletes  | Implemented |
| Durable connection registry                   | `Connection.list()`                                                  | `ConsoleConnections` primary-key query                                        | Implemented |
| Workload app management inventory             | authenticated `GET /accounts/{id}/manage-apps`                       | DiscoveredStage account primary-key query                                     | Implemented |
| Refresh Workload discovery                    | authenticated `POST /accounts/{id}/discovery`                        | S3 list, then DiscoveredStage account reconciliation                          | Implemented |
| Save/apply Workload sync policy               | authenticated sync-policy API                                        | Connection primary-key get/patch; projection reconciliation                   | Implemented |
| Recover ConsoleData accounts                  | authenticated `POST /accounts/recover`                               | registry query, then account upserts                                          | Implemented |
| Resolve Cognito subject                       | `User.exchangeCognitoSub()`                                          | UserIdentity primary-key get                                                  | Implemented |
| Provision invited user                        | Cognito custom-message trigger: Cognito `sub`                        | conditional User + UserIdentity transaction create                            | Implemented |
| Confirm invited user                          | invite-confirm endpoint: native User `id`                            | User primary-key patch                                                        | Implemented |
| List users                                    | authenticated API: ID descending, cursor-paginated                   | `entitiesByType` query                                                        | Implemented |
| Enable/disable stage monitoring               | authenticated issue API: app + stage                                 | Stage primary-key get/patch                                                   | Implemented |
| Reconcile an enabled stage                    | worker: app + stage                                                  | Stage, Resource, IssueSubscription primary-key queries                        | Implemented |
| Remove excluded stage Issue data              | sync worker: app + stage                                             | IssueSubscription and Issue primary-key queries                               | Implemented |
| Verify issue ingress source                   | issue processor: account + region + log group                        | `lookup` query                                                                | Implemented |
| Find Issue for new occurrence                 | issue worker: app + stage + fingerprint                              | Issue primary-key get                                                         | Implemented |
| Deduplicate Issue ingress event               | issue worker: app + stage + source hash + event ID                   | conditional primary-key create, transactionally with Issue mutation           | Implemented |
| List Issues                                   | dashboard/API: global, App, or App/Stage scope                       | `entitiesByType` query; status filters in process                             | Implemented |
| List stage issue subscriptions                | stage detail: app + stage                                            | IssueSubscription primary-key query                                           | Implemented |
| Delete all persisted Issues                   | authenticated `DELETE /issues`                                       | `entitiesByType`, then Stage / Issue primary-key queries                      | Implemented |
| List alert rules                              | authenticated API / alert event worker                               | `entitiesByType` query for fixed `ALERT_RULE` partition                       | Implemented |
| Get notification destination for delivery     | alert event worker: destination ID                                   | NotificationDestination primary-key get                                       | Implemented |
| List notification destinations                | authenticated API                                                    | `entitiesByType` query for fixed `NOTIFICATION_DESTINATION` partition         | Implemented |
| Create/update/delete alert rule               | authenticated `/alert-rules` API                                     | AlertRule primary-key write                                                   | Implemented |
| Create/update/delete notification destination | authenticated `/notification-destinations` API                       | NotificationDestination primary-key write; AlertRule type query before delete | Implemented |

No first-release arbitrary cross-account resource search, type search, log search,
or issue search exists. Do not approximate them with a scan.

### Stage ownership conflicts

When an SST state bucket contains an `appName + stageName` already owned by a
different Workload account, sync skips that state projection. It never overwrites
or deletes owning Workload's Stage, Resources, or State history. Other projections
from Workload continue syncing.

`Account.lastSyncConflicts` records skipped app, stage, and owning account ID
after account-wide reconciliation. Live Stage sync does not overwrite this list.

### Workload sync policy and discovery

`Connection.syncPolicy` is durable Workload configuration with `allowList` and
`ignoreList` `StageSelector` values. A selector has `app` and optional `stage`;
both support exact values or single-star globs. Empty allow lists include every
discovered entry. Ignore selectors always win.

`DiscoveredStage` stores only account ID, app/stage names, state bucket/key,
object metadata, and discovery time. Discovery reconciles this account partition
after a complete S3 key listing. Sync persists discovery before policy evaluation,
then downloads and parses only allowed state objects. As a result, ignored state
is never read into Console processing or projections. Filtered reconciliation
removes ignored account projections, their Issue records, and their Console-owned
CloudWatch log filters while retaining inventory for management UI.

### User administration list

Authenticated `GET /users` lists Console users by descending ULID. It accepts a
page limit of 1–100, an opaque cursor, and optional `email`, `cognitoStatus`,
and `cognitoEnabled` filters. `User.list()` queries `entitiesByType` using fixed
partition `USER` and returns DynamoDB's eventual-consistency result with
next-page cursor. User creation writes this projection automatically through
the User type index; a user delete removes it with its User item. `User` owns
this access pattern.

### Connection recovery

Connector Create/Update callback upserts account ID, region, and role ARN into
`ConsoleConnections`, then writes the Console-facing Account projection to
`ConsoleData`. Workload-stack Delete removes that account's Stage, Resource,
State history, and discovery projections, then removes Apps left without stages;
durable connection record remains. Recovery is an explicit API action, never
automatic on startup: query the registry and upsert each Account projection.
Recovery does not sync; users
invoke the existing per-account sync action after confirming restored accounts.
Per-account failures are reported without stopping recovery of other accounts.
Before first use after deploying this change, existing Account records must be
copied into the new registry with authenticated
`POST /accounts/backup-connections` while
`ConsoleData` still exists. After wiping `ConsoleData`, call
authenticated `POST /accounts/recover` to restore it.

## SST state projection sync

Account sync discovers current `app/` objects in the SST state bucket, then
syncs selected Stages sequentially and parses SST v4's Pulumi versioned checkpoint. State
objects with `Content-Encoding: gzip` are decompressed before parsing.

Only Console-safe projections are stored in DynamoDB:

- `State` records source bucket, key, S3 version locator, and observation time. It never
  stores state JSON.
- `App` and `Stage` describe current `app/{app}/{stage}.json` objects.
- `Resource` records supported SST component summaries. Supported types are
  `sst:aws:Bucket`, `sst:aws:Function`, and `sst:aws:Dynamo`; owned AWS
  children only enrich physical fields and are not separate Console resources.

Secrets are redacted before normalization. Persisted summaries are allowlisted;
raw Pulumi inputs and outputs are never written to `ConsoleData`.

Each successful Stage sync updates its own Resources. Account-wide stale cleanup
starts only after complete discovery and every required Stage sync succeeds; it
removes excluded or absent account-owned Stages, Resources, and State history.
An App is removed only when no Stages remain in any account.

Projection writes are ordered and split into transactions of at most 90 actions
and 3 MiB of estimated payload, below DynamoDB's 100-action/4-MB limits. A
partial write can be repaired by the next successful sync.

When a sync receives an AWS authorization failure while assuming the connector
role or reading SSM/S3 state, it patches the existing Account to `disconnected`
and rethrows the original error. Transient service and network failures do not
change account status. Existing projections remain untouched until a complete
state read succeeds.

### Event-driven incremental sync

During account sync Console discovers the state bucket, preserves its existing S3
notification configuration while enabling EventBridge, and uses the Workload
role to reconcile an installation-scoped EventBridge rule and target. The rule
matches the exact discovered bucket; the consumers filter supported event/key
pairs. Sync resolves the Connection stack's publisher role and targets
the Console bus using that role. Repeat syncs reconcile the same rule, including
bucket changes; API failures fail sync and can be retried. The central State
event worker independently validates the source account and exact configured
state bucket against the Account primary-key record. For current State objects, it then reads the S3
object. Snapshot-triggered refresh ignores missing current State. Direct app/
deletion verifies that the object is absent before removing the account-owned
Stage, Resources, and State history. Full account sync remains the repair path.

The Console subscription uses the same prefix filter. The handler ignores every other
event/key combination before Account sync code runs. For an update event, it
strictly parses `update/{app}/{stage}/{updateId}.json`, then requires a connected
Account, exact configured state bucket, an included sync-policy Stage, and no
conflicting Stage owner before assuming its Workload role.
It reads the one update object, selects safe SST Update metadata, records object
bucket/key/version plus observation time, and idempotently upserts `StateUpdate`.
Malformed keys or payloads, missing/deleted objects, disconnected Accounts, wrong
buckets, excluded Stages, and ownership conflicts are ignored without changing
Stage, Resource, current State, or State Update data. An accepted update can
create its App and Stage before the current State arrives. Update delete
events, listing, and replay are not processed.

State Update ingestion reads the current S3 object and verifies Stage ownership
and the source object's S3 sequencer in its write transaction. Only newer
sequencers for the same bucket and key can overwrite an observation; missing or
invalid sequencers are ignored. Sequencers are normalized to 256 uppercase hex
digits for DynamoDB lexical comparison. Stage
removal deletes history before the Stage so a failure can be retried; concurrent
ingestion or recreation can race cleanup and may require manual repair. History
cleanup reads the Stage partition consistently, not the eventual lookup index.
Force-unlocked updates can lack a start time; their completion time is used for
history ordering. API-managed rules are not automatically removed on disconnect
or stack deletion; cleanup lifecycle is tracked in #74. Shared S3 EventBridge
notifications are not disabled. Previously deployed CloudFormation-managed
forwarding rules require separate manual cleanup; they can otherwise continue
forwarding broad events alongside the API-managed rule.

### App-first projection cutover

This is an incompatible key-layout change from account-first projections. Deploy
the current indexes, then sync every connected account to populate App-first
records. Old account-first projection records are not read or maintained.

### State Update history

`State` is one mutable source reference for a Stage's current `app/` object.
`StateUpdate` is one safe projection of an SST `update/` object. It stores source
location, SST version, bounded command, lifecycle times, bounded deployment
errors, and aggregate resource-change counts. Its outcome is derived: incomplete
is running; completed with no errors is succeeded; otherwise failed.

State Update history uses sparse `lookup` keys:

```text
lookupPk: STATE_UPDATE#{appName}#{stageName}
lookupSk: STATE_UPDATE#{reverse(timeCompleted ?? timeStarted)}#{updateId}
```

This supports newest-first Stage history and cursor pagination without a scan.
An update completion rewrites its lookup sort key. Deployment errors are limited
to 64 KiB of UTF-8 JSON, with source/stored counts and truncation metadata.
Commands are limited to 8 KiB. Raw update JSON, Pulumi inputs/outputs, State,
and event-log entries never enter `ConsoleData`.

Future `StateSnapshot` records will use shared update ID and sparse lookup
chronology index. Future `StateEvent` records will store only diffs of existing
allowlisted normalized Resource fields. Event-log objects remain source-only.

State, State Update, State Snapshot, and State Event records have no TTL. Reassess
item size, write capacity, and retained volume after production use before adding
an explicit retention policy.

This is an incompatible cutover from legacy `StateSnapshot` rows that observed
mutable `app/` objects. Deploy State-only code, re-sync each Workload Account,
then have user purge legacy StateSnapshot projection rows. Do not read or retain
old-shape aliases.

## ElectroDB usage

`db` is the composed ElectroDB `Service`:

```ts
import { db } from "../db";

const result = await db.entities.account
	.get({ accountId })
	.go({ consistent: true });

const account = result.data;
```

Use named entity access patterns. Do not construct expression strings or document
client parameter objects by hand.

```ts
const result = await db.entities.account.query.byType({}).go({ pages: "all" });
```

Use `.params()` in unit tests to assert generated table name, key, index name, and
transaction shape without contacting AWS.

### Writes

Use `upsert()` when a record may be created or updated without overwriting fields
outside the mutation. Use `patch()` when record must already exist. Use `create()`
when duplicate creation must fail.

```ts
await db.entities.account
	.upsert({ accountId, region, roleArn, status, updatedAt: now })
	.ifNotExists({ createdAt: now })
	.go({ response: "none" });
```

`put()` overwrites an entire item. Do not use it for connector registration or
other partial updates.

### Transactions

Use the service transaction API for atomic write sets:

```ts
const result = await db.transaction
	.write(({ account }) => [
		account.patch({ accountId }).set(changes).commit()
	])
	.go();

if (result.canceled) throw new Error("Dynamo transaction canceled");
```

`commit()` adds an operation to transaction; `go()` sends it. Dynamo transactions
allow at most 100 actions and 4 MB. Dynamo does not provide PostgreSQL-style
transactional joins or arbitrary read-then-write transactions.

## Validation and versions

Three contracts exist:

| Contract                  | Owner                        | Rule                                               |
| ------------------------- | ---------------------------- | -------------------------------------------------- |
| Zod schema                | domain API                   | Validate public inputs and outputs                 |
| ElectroDB `model.version` | ElectroDB entity identity    | Keep at `"1"` for normal evolution                 |
| `schemaVersion` attribute | Console persisted-item shape | Change only for incompatible item-shape migrations |

ElectroDB writes `__edb_e__` and `__edb_v__` for entity ownership filtering.
`model.service` is always `sstConsole` and groups entities in the shared service;
it is not a Dynamo table name or stored domain field.

### Additive change

Adding an optional attribute, a new entity type, or new GSI projection fields does
not require a `schemaVersion` change. Write new fields on future writes and make
public DTO fields optional only when product semantics permit it.

### Incompatible change

For renamed/removed fields, incompatible shape changes, or key changes:

1. Define new persisted-item shape and `schemaVersion`.
2. Document required user-run migration/backfill.
3. Verify migrated items.
4. Deploy code that reads/writes only new shape.
5. Remove obsolete fields or indexes after cutover when appropriate.

Do not bump ElectroDB `model.version` for an ordinary data migration. Do not add
permanent old-shape fallbacks.

Changing table PK/SK is not an in-place operation. Add a new projection/index or
perform an explicit table migration.

## Adding an access pattern

Before implementation, add a row to this document containing:

1. caller: screen, API, worker, or job;
2. input dimensions and sort order;
3. expected cardinality/pagination;
4. consistency requirement;
5. PK/GSI query used;
6. entity/domain owner;
7. write path that maintains projection/index keys.

Then:

1. Add or amend entity definition in owning `*.dynamo.ts` file.
2. Add SST GSI only if existing primary/GSI key cannot satisfy it.
3. Add domain-level use case and Zod contract.
4. Add `.params()` tests for generated request parameters.
5. Update this document with final access pattern and implementation status.

### Issue lifecycle and filtering

`Issue` records use their primary key for strongly consistent occurrence reads
during ingress. Their `entitiesByType` projection has fixed `ISSUE`
partition and sorts by App, Stage, then `lastSeenAt`. `GET /issues` queries all
Issues, one App, or one App/Stage directly from this index. Status filters run
in process. The global Issues page sorts its bounded result by `lastSeenAt` in
memory. Resolved records will be archived after 30 days in a future separate
change. No Issue-specific GSI exists.

The Issue worker maintains this projection whenever it creates an Issue or
updates `lastSeenAt`. Lifecycle transitions (`open`, `resolved`, `suppressed`)
patch the primary record only. A reoccurrence reopens a resolved Issue but leaves
a suppressed Issue suppressed while continuing to update its occurrence count.
This Issue shape is deployed only after the required ConsoleData purge for the
GSI-overhaul cutover; no prior Issue shape is read or maintained.

`IssueIngressEvent` records retain processed CloudWatch log event IDs for seven
days. Their `ttl` attribute configures DynamoDB TTL; physical deletion is
asynchronous after expiry. Ingress processing conditionally creates this marker
in the same transaction as an Issue create or occurrence increment. A marker
conflict is a duplicate delivery and makes no Issue mutation or Issue event.
Issue-event publication is at-most-once: a failure after this transaction can
lose the corresponding EventBridge event rather than replaying it. Distinct
event IDs retain separate markers, including when they resolve to the same Issue
fingerprint.

## Deferred domains

Model these only after their access patterns are accepted:

- Issue: resolved Issue archival, occurrence timeline, notification deliveries.
- User/integration: global role, integration settings, notification preferences.
  User identity is persisted by Cognito subject. Store secret references only;
  secret values live in Secrets Manager.
- Audit: actor/target/time reads and retention/export policy.
- Deployment: runner/source/cancellation/artifact/event requirements.
- Logs: CloudWatch remains source. DynamoDB stores bookmarks or saved sessions,
  not copied log events.
