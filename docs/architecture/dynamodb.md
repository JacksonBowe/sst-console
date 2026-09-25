# DynamoDB architecture

## Purpose

`ConsoleData` is one DynamoDB table for SST Console operational data. It is an
index of Console-safe SST state, not a replica of full SST state. Raw or
oversized SST state remains in S3.

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
    state.dynamo.ts        # StateSnapshot, SyncRun entities
  db/
    client.ts              # DynamoDBDocumentClient
    service.ts             # ElectroDB Service composition
    index.ts               # db export
```

`App`, `Stage`, and `Resource` are one product domain. A resource is always
meaningful in an account/app/stage hierarchy, so do not make a top-level
`resource/` or `stage/` persistence domain without an accepted product reason.

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
```

SST links `ConsoleData` to functions. Core resolves table name through
`Resource.ConsoleData.name`; never hardcode an AWS table name.

## Entity keys

ElectroDB derives all keys. These layouts are contract, not values callers
construct themselves.

| Entity | PK | SK |
| --- | --- | --- |
| Account | `ACCOUNT#{accountId}` | `account` |
| App | `ACCOUNT#{accountId}` | `APP#{appName}` |
| Stage | `ACCOUNT#{accountId}` | `APP#{appName}#STAGE#{stageName}` |
| Resource | `ACCOUNT#{accountId}` | `APP#{appName}#STAGE#{stageName}#RESOURCE#{resourceId}` |
| StateSnapshot | `ACCOUNT#{accountId}#APP#{appName}#STAGE#{stageName}` | `SNAPSHOT#{reverseTimestamp}#{snapshotId}` |
| SyncRun | `ACCOUNT#{accountId}` | `SYNC#{reverseTimestamp}#{syncRunId}` |

`resourceId` is stable Console identity. SST URN and normalized AWS ARN are
separate attributes; neither is inferred from key encoding.

## Current indexes and access patterns

| Access pattern | Entity/API | Dynamo operation | Status |
| --- | --- | --- | --- |
| Get one account | `db.entities.account.get({ accountId })` | primary-key get | Implemented |
| List accounts by status | `db.entities.account.query.byStatus({ status })` | `accountsByStatus` query | Implemented |
| Register/update connector | `db.entities.account.upsert(...)` | primary-key update | Implemented |
| Persist successful sync | Account patch + SyncRun create | `TransactWriteItems` | Implemented |
| Find resource from AWS event ARN | `db.entities.resource.query.byArn({ normalizedArn })` | `resourcesByArn` query | Model ready; no event ingestion yet |
| Account → apps navigation | account partition query | primary-key query | Planned; add named ElectroDB accessor before UI use |
| App → stages navigation | account partition + app sort prefix | primary-key query | Planned; add named ElectroDB accessor before UI use |
| Stage → resources | account partition + stage/resource sort prefix | primary-key query | Planned; add named ElectroDB accessor before UI use |
| Reconcile account state projections | worker: account ID; bounded by resources in account | entity primary-key queries for App, Stage, Resource | Implemented |
| Latest state snapshot | app-stage partition, descending, limit 1 | primary-key query | Planned |
| Account sync history | account partition, descending sync prefix | primary-key query | Planned |

No first-release arbitrary cross-account resource search, type search, log search,
or issue search exists. Do not approximate them with a scan.

## SST state projection sync

`Account.sync()` lists every current `app/` object in the SST state bucket,
downloads each object, and parses SST v4's Pulumi versioned checkpoint. State
objects with `Content-Encoding: gzip` are decompressed before parsing.

Only Console-safe projections are stored in DynamoDB:

- `StateSnapshot` records source bucket, key, and S3 version locator. It never
  stores state JSON.
- `App` and `Stage` describe current `app/{app}/{stage}.json` objects.
- `Resource` records supported SST component summaries. First supported type is
  `sst:aws:Bucket`; its owned S3 resource only enriches bucket ARN/name and is
  not a separate Console resource.

Secrets are redacted before normalization. Persisted summaries are allowlisted;
raw Pulumi inputs and outputs are never written to `ConsoleData`.

Reconciliation begins only after every listed object was fetched and parsed.
It upserts desired projections, then deletes resource, stage, and app
projections absent from complete discovery output. Snapshots are retained. This
order means incomplete discovery cannot delete existing data.

Projection writes are ordered and split into transactions of at most 90 actions
and 3 MiB of estimated payload, below DynamoDB's 100-action/4-MB limits. A
partial write is repaired by next successful sync; `Account.lastSyncedAt` and
successful `SyncRun` are written only after all projection chunks succeed.

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

| Contract | Owner | Rule |
| --- | --- | --- |
| Zod schema | domain API | Validate public inputs and outputs |
| ElectroDB `model.version` | ElectroDB entity identity | Keep at `"1"` for normal evolution |
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
- User/integration: Cognito subject lookup, global role, integration settings,
  notification preferences. Store secret references only; secret values live in
  Secrets Manager.
- Audit: actor/target/time reads and retention/export policy.
- Deployment: runner/source/cancellation/artifact/event requirements.
- Logs: CloudWatch remains source. DynamoDB stores bookmarks or saved sessions,
  not copied log events.
