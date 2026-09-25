# ElectroDB single-table implementation plan

## Goal

Replace hash-only `Accounts` table and raw DynamoDB attribute-map calls with one
`ConsoleData` DynamoDB table and ElectroDB models. This establishes a typed,
access-pattern-first persistence layer for first-release read-only SST catalog:

- connected accounts and connector metadata;
- SST apps, stages, and compact resource summaries;
- state snapshot references and sync-run history.

Future users, integrations, issues, audit records, notifications, and deployments
will use the same table only when their concrete reads are defined. No future
entities or speculative indexes in this change.

## Decisions

- One physical DynamoDB table: `ConsoleData`.
- ElectroDB is the DynamoDB modeling/query layer; AWS SDK v3 supplies its
  `DynamoDBDocumentClient`.
- Zod remains API/input validation layer. ElectroDB schemas model persisted items
  and named DynamoDB access patterns.
- SST state remains source of truth. DynamoDB stores current compact projections;
  large or raw payloads remain S3 pointers.
- Store a `schemaVersion` on every entity. Read/write code owns explicit current
  version transforms when an item shape changes.
- Do not use LSIs or `ScanCommand` in product code. Add GSIs only for an accepted
  screen or worker read.
- Remove `Accounts`; no compatibility table, exports, aliases, or dual writes.

## Initial access patterns

| Operation                                   | Dynamo operation               | Key / index                                                                                                                             |
| ------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Get connected account                       | `get`                          | account entity primary key                                                                                                              |
| List connected accounts                     | `query`                        | `accountsByStatus` GSI; perform one query for each displayed status or add a singleton directory item if an all-status page is required |
| Load account navigation                     | `query`                        | account partition                                                                                                                       |
| List apps in account                        | `query` with sort-key prefix   | account partition                                                                                                                       |
| List stages for app                         | `query` with sort-key prefix   | account partition                                                                                                                       |
| List resources for stage                    | `query` with sort-key prefix   | account partition                                                                                                                       |
| Get resource from hierarchy route           | `get`                          | account/app/stage/resource composite primary key                                                                                        |
| Find catalog resource from future AWS event | `query`                        | `resourceByArn` GSI                                                                                                                     |
| Get latest state snapshot                   | `query`, descending, limit one | app-stage partition                                                                                                                     |
| List sync history for account               | `query`, descending            | account partition                                                                                                                       |

No cross-account arbitrary text/type search in first release. Add a search
projection/index only after product requirements specify matching and ordering.

## Physical table and key contract

Define `ConsoleData` in `infra/storage.ts` with string `pk` and `sk` primary keys.
Define only two global secondary indexes:

```text
accountsByStatus
  GSI1PK = ACCOUNT_STATUS#{status}
  GSI1SK = ACCOUNT#{accountId}

resourceByArn
  GSI2PK = RESOURCE_ARN#{normalizedArn}
  GSI2SK = ACCOUNT#{accountId}#APP#{app}#STAGE#{stage}#RESOURCE#{resourceId}
```

ElectroDB derives primary/index fields; application code must not hand-build or
write them. Items absent from a GSI intentionally omit its GSI fields.

Entity primary-key layout:

```text
Account
  PK ACCOUNT#{accountId}
  SK account

App
  PK ACCOUNT#{accountId}
  SK APP#{appName}

Stage
  PK ACCOUNT#{accountId}
  SK APP#{appName}#STAGE#{stageName}

Resource
  PK ACCOUNT#{accountId}
  SK APP#{appName}#STAGE#{stageName}#RESOURCE#{resourceId}

StateSnapshot
  PK ACCOUNT#{accountId}#APP#{appName}#STAGE#{stageName}
  SK SNAPSHOT#{reverseTimestamp}#{snapshotId}

SyncRun
  PK ACCOUNT#{accountId}
  SK SYNC#{reverseTimestamp}#{syncRunId}
```

`resourceId` is stable Console-owned identity. Store SST URN and normalized AWS
ARN as distinct attributes; neither becomes implicit identity from key encoding.

## Implementation steps

1. **Add dependencies**
    - Add `electrodb` and `@aws-sdk/lib-dynamodb` to `packages/core/package.json`.
    - Keep current AWS SDK v3 clients for S3, SSM, and STS.

2. **Replace infrastructure table** — `infra/storage.ts`
    - Replace `Accounts` with `ConsoleData`, PK/SK fields, and two GSIs above.
    - Rename exported SST resource to `console`; do not preserve `accounts` alias.
    - Update links in `infra/api.ts` and `infra/connector.ts` to `console`.

3. **Create persistence module** — `packages/core/src/db/`
    - `client.ts`: create one `DynamoDBDocumentClient` from `DynamoDBClient`.
    - `table.ts`: create ElectroDB `Service`/table configuration using
      `Resource.ConsoleData.name`; isolate SST binding use here.
    - `service.ts`: compose domain entities into one ElectroDB `Service` using the
      Dynamo client and SST table binding.
    - `account/account.dynamo.ts`: declare `Account` entity.
    - `app/app.dynamo.ts`: declare `App`, `Stage`, and `Resource` entities.
    - `state/state.dynamo.ts`: declare `StateSnapshot` and `SyncRun` entities.
    - `index.ts`: export only domain persistence interfaces/entities required by
      account and future catalog modules.

4. **Replace account persistence** — `packages/core/src/account/connector.ts`
    - Replace raw `UpdateItemCommand`, `GetItemCommand`, and `ScanCommand`.
    - `register()` atomically creates/updates Account connector metadata using an
      ElectroDB conditional update; preserve original `createdAt` and update
      `updatedAt`.
    - `list()` becomes named `accountsByStatus` queries, maps only valid connected
      account records, and uses Dynamo pagination.
    - Keep STS role validation behavior unchanged.

5. **Replace sync persistence** — `packages/core/src/account/sync.ts`
    - Read Account through ElectroDB.
    - After successful source discovery, update Account sync/status fields and write
      a `SyncRun` record transactionally.
    - Return discovered state list as current API behavior does; do not yet persist
      App/Stage/Resource/Snapshot records until state parsing/normalization is
      implemented.

6. **Prepare state writer boundary** — `packages/core/src/state/` (new)
    - Add pure normalization contracts for app, stage, resource summary, snapshot,
      and sync result; no SST-state parser change in this plan.
    - Add one transactional `replaceStageCatalog()` interface for future ingestion:
      write current resource projections, snapshot pointer, and sync result with
      conditional versioning. Design batch/chunk behavior before implementing it;
      Dynamo transactions limit writes to 100 items and 4 MB.
    - Do not implement deletion reconciliation until state artifact parsing supplies
      authoritative resource-set semantics.

7. **Update functions**
    - `packages/functions/src/api/index.ts`: keep current debug endpoint behavior;
      it now reaches ElectroDB-backed `Account.list()`.
    - `packages/functions/src/events/connector.ts`: no public payload change;
      it reaches ElectroDB-backed account registration.

8. **Tests**
    - Add unit tests for ElectroDB generated keys and access-pattern query params:
      account hierarchy, resource ARN lookup, status lookup, timestamp ordering.
    - Test registration preserves `createdAt`, changes connector fields, and rejects
      invalid input before database writes.
    - Test sync writes account metadata plus `SyncRun` on success; failure does not
      falsely mark success.
    - Test pagination for account listing.
    - Add a static test/CI rule forbidding `ScanCommand` imports outside any
      explicitly approved maintenance tool.

9. **Verification and rollout**
    - Run `bun run check` at repository root.
    - Deploy only after table replacement review. Existing account registrations in
      development must be reconnected because `Accounts` is removed; production
      migration is intentionally out of scope because project has no established
      production data contract yet.
    - Manually verify connector registration, account listing, and sync against real
      AWS accounts. User performs all database/cloud actions.

## Deferred design triggers

Add new entities/indexes only with their read lists:

- **Issues**: error fingerprint lookup, open-by-resource, open-by-status, ordered
  occurrence timeline, resolve/suppress lifecycle, notification delivery state.
- **Users/integrations**: Cognito subject lookup, global role lookup, integration
  settings, notification preferences. Secrets are Secrets Manager references, never
  Dynamo values.
- **Audit**: actor/target/time-range reads and retention/export policy.
- **Deployments**: model only after runner, source-control, cancellation, artifact,
  and event requirements are chosen.

Split physical tables only if measured event retention/write volume, IAM isolation,
stream ownership, GSI limits, or hot partitions require it.
