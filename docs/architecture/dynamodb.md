# DynamoDB architecture

## Purpose

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
    state.dynamo.ts        # StateSnapshot, SyncRun, DiscoveredStage entities
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

GSI: accountsByStatus
  hash:  gsi1pk
  range: gsi1sk

GSI: resourcesByArn
  hash:  gsi2pk
  range: gsi2sk

GSI: stagesByAccount
  hash:  gsi3pk
  range: gsi3sk

GSI: appsByName
  hash:  gsi4pk
  range: gsi4sk

GSI: usersById
  hash:  gsi5pk
  range: gsi5sk

Table: ConsoleConnections
Primary key: pk (string), sk (string)
No secondary indexes
```

`ConsoleData` stores disposable Console projections and operational state.
`ConsoleConnections` stores durable workload account connection configuration,
written by the `SSTConsoleConnection` stack callback. Recovery is its sole read
pattern: query the fixed `CONNECTIONS` partition and restore the ConsoleData
account records. It has no GSI. SST links each table only to functions that need
it. Core resolves names through `Resource.ConsoleData.name` and
`Resource.ConsoleConnections.name`; never hardcode table names.

## Entity keys

ElectroDB derives all keys. These layouts are contract, not values callers
construct themselves.

| Entity          | PK                                | SK                                         |
| --------------- | --------------------------------- | ------------------------------------------ |
| Account         | `ACCOUNT#{accountId}`             | `account`                                  |
| App             | `APP#{appName}`                   | `APP`                                      |
| Stage           | `APP#{appName}`                   | `STAGE#{stageName}`                        |
| Resource        | `APP#{appName}#STAGE#{stageName}` | `RESOURCE#{resourceId}`                    |
| StateSnapshot   | `APP#{appName}#STAGE#{stageName}` | `SNAPSHOT#{reverseTimestamp}#{snapshotId}` |
| SyncRun         | `ACCOUNT#{accountId}`             | `SYNC#{reverseTimestamp}#{syncRunId}`      |
| DiscoveredStage | `ACCOUNT#{accountId}`             | `DISCOVERY#{appName}#STAGE#{stageName}`    |
| Connection      | `CONNECTIONS`                     | `ACCOUNT#{accountId}`                      |
| User            | `USER#{id}`                       | `USER`                                     |
| UserIdentity    | `COGNITO#{cognitoSub}`            | `USER`                                     |

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

`resourceId` is stable Console identity. `parentResourceId` models SST component
nesting. SST URN and normalized AWS ARN are separate attributes; neither is
inferred from key encoding. Component group rows have no ARN; only physical
resources populate `normalizedArn` and `resourcesByArn`. `arnIndex` is an
internal `*.dynamo.ts` field used to omit component groups from that GSI.

## Current indexes and access patterns

| Access pattern                               | Entity/API                                            | Dynamo operation                                            | Status                              |
| -------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| Get one account                              | `db.entities.account.get({ accountId })`              | primary-key get                                             | Implemented                         |
| List accounts by status                      | `db.entities.account.query.byStatus({ status })`      | `accountsByStatus` query                                    | Implemented                         |
| Register/update connector                    | `db.entities.account.upsert(...)`                     | primary-key update                                          | Implemented                         |
| Persist successful sync                      | Account patch + SyncRun create                        | `TransactWriteItems`                                        | Implemented                         |
| Mark disconnected after remote access denial | `db.entities.account.patch({ accountId })`            | primary-key update                                          | Implemented                         |
| Find resource from AWS event ARN             | `db.entities.resource.query.byArn({ normalizedArn })` | `resourcesByArn` query                                      | Model ready; no event ingestion yet |
| Home → App list                              | name ascending                                        | `appsByName` query                                          | Implemented                         |
| App detail                                   | app name                                              | App primary-key get                                         | Model ready                         |
| App → stages                                 | app name, stage order                                 | Stage primary-key query                                     | Implemented                         |
| Stage → resources                            | app and stage                                         | Resource primary-key query                                  | Implemented                         |
| Reconcile account state projections          | worker: account ID                                    | `stagesByAccount`, then per-Stage resource queries          | Implemented                         |
| Reconcile changed SST state object            | EventBridge worker: account ID + state key             | Account primary-key get; Stage/resource primary-key queries  | Implemented                         |
| Latest state snapshot                        | app and stage, descending, limit 1                    | StateSnapshot primary-key query                             | Implemented                         |
| Account sync history                         | account partition, descending sync prefix             | primary-key query                                           | Planned                             |
| Durable connection registry                  | `Connection.list()`                                   | `ConsoleConnections` primary-key query                      | Implemented                         |
| Workload app management inventory            | authenticated `GET /accounts/{id}/manage-apps`        | DiscoveredStage account primary-key query                   | Implemented                         |
| Refresh Workload discovery                   | authenticated `POST /accounts/{id}/discovery`         | S3 list, then DiscoveredStage account reconciliation        | Implemented                         |
| Save/apply Workload sync policy              | authenticated sync-policy API                         | Connection primary-key get/patch; projection reconciliation | Implemented                         |
| Recover ConsoleData accounts                 | authenticated `POST /accounts/recover`                | registry query, then account upserts                        | Implemented                         |
| Resolve Cognito subject                      | `User.exchangeCognitoSub()`                           | UserIdentity primary-key get                                | Implemented                         |
| Provision invited user                       | Cognito custom-message trigger: Cognito `sub`         | conditional User + UserIdentity transaction create          | Implemented                         |
| Confirm invited user                         | invite-confirm endpoint: native User `id`             | User primary-key patch                                      | Implemented                         |
| List users                                   | authenticated API: ID descending, cursor-paginated    | `usersById` query                                           | Implemented                         |

No first-release arbitrary cross-account resource search, type search, log search,
or issue search exists. Do not approximate them with a scan.

### Stage ownership conflicts

When an SST state bucket contains an `appName + stageName` already owned by a
different Workload account, sync skips that state projection. It never overwrites
or deletes owning Workload's Stage, Resources, or snapshots. Other projections
from Workload continue syncing.

`Account.lastSyncConflicts` and matching SyncRun `conflicts` record skipped app,
stage, and owning account ID. SyncRun status is `completed_with_conflicts`.

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
removes ignored account projections while retaining inventory for management UI.

### User administration list

Authenticated `GET /users` lists Console users by descending ULID. It accepts a
page limit of 1–100, an opaque cursor, and optional `email`, `cognitoStatus`,
and `cognitoEnabled` filters. `User.list()` queries `usersById` using fixed
partition `USERS` and returns DynamoDB's eventual-consistency result with
next-page cursor. User creation writes this projection automatically through
`userEntity.byId`; a user delete removes it with its User item. `User` owns this
access pattern.

### Connection recovery

Connector Create/Update callback upserts account ID, region, and role ARN into
`ConsoleConnections`, then writes the Console-facing Account projection to
`ConsoleData`. Workload-stack Delete does not remove the durable connection
record. Recovery is an explicit API action, never automatic on startup: query
the registry and upsert each Account projection. Recovery does not sync; users
invoke the existing per-account sync action after confirming restored accounts.
Per-account failures are reported without stopping recovery of other accounts.
Before first use after deploying this change, existing Account records must be
copied into the new registry with authenticated
`POST /accounts/backup-connections` while
`ConsoleData` still exists. After wiping `ConsoleData`, call
authenticated `POST /accounts/recover` to restore it.

## SST state projection sync

`Account.sync()` lists every current `app/` object in the SST state bucket,
downloads each object, and parses SST v4's Pulumi versioned checkpoint. State
objects with `Content-Encoding: gzip` are decompressed before parsing.

Only Console-safe projections are stored in DynamoDB:

- `StateSnapshot` records source bucket, key, and S3 version locator. It never
  stores state JSON.
- `App` and `Stage` describe current `app/{app}/{stage}.json` objects.
- `Resource` records supported SST component summaries. Supported types are
  `sst:aws:Bucket`, `sst:aws:Function`, and `sst:aws:Dynamo`; owned AWS
  children only enrich physical fields and are not separate Console resources.

Secrets are redacted before normalization. Persisted summaries are allowlisted;
raw Pulumi inputs and outputs are never written to `ConsoleData`.

Reconciliation begins only after every listed object was fetched and parsed.
It upserts desired projections, then deletes resource and Stage projections
absent from complete discovery output for that account. After all Stage deletes
commit, it deletes an App only when no Stages remain in any account. Snapshots
are retained. This order means incomplete discovery cannot delete existing data.

Projection writes are ordered and split into transactions of at most 90 actions
and 3 MiB of estimated payload, below DynamoDB's 100-action/4-MB limits. A
partial write is repaired by next successful sync; `Account.lastSyncedAt` and
successful `SyncRun` are written only after all projection chunks succeed.

When a sync receives an AWS authorization failure while assuming the connector
role or reading SSM/S3 state, it patches the existing Account to `disconnected`
and rethrows the original error. Transient service and network failures do not
change account status. Existing projections remain untouched until a complete
state read succeeds.

### Event-driven incremental sync

Each connected Workload account forwards S3 `Object Created` and `Object Deleted`
events for `app/` state keys from its SST state bucket to the Console EventBridge
bus. The event worker validates the source account and bucket against the Account
primary-key record, then reads the current S3 object. It never trusts event order:
an object that exists is reconciled as one App/Stage projection; an absent object
removes only that Account-owned Stage and its Resources. Duplicate and stale events
therefore converge on current S3 state. Full account sync remains the connection and
manual repair path.

### App-first projection cutover

This is an incompatible key-layout change from account-first projections. Deploy
the `stagesByAccount` and `appsByName` indexes, then sync every connected account
to populate App-first records. Old account-first projection records are not read
or maintained.

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
const result = await db.entities.account.query
	.byStatus({ status: "connected" })
	.go({ pages: "all" });
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
	.write(({ account, syncRun }) => [
		account.patch({ accountId }).set(changes).commit(),
		syncRun.create(syncRun).commit()
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

## Deferred domains

Model these only after their access patterns are accepted:

- Issue: fingerprint lookup, open-by-resource/status, occurrence timeline,
  resolve/suppress state, notification deliveries.
- User/integration: global role, integration settings, notification preferences.
  User identity is persisted by Cognito subject. Store secret references only;
  secret values live in Secrets Manager.
- Audit: actor/target/time reads and retention/export policy.
- Deployment: runner/source/cancellation/artifact/event requirements.
- Logs: CloudWatch remains source. DynamoDB stores bookmarks or saved sessions,
  not copied log events.
