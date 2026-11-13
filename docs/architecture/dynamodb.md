# DynamoDB access patterns

Read this reference before changing DynamoDB infrastructure, ElectroDB models,
persistence use cases, access patterns, or data migrations. Entity definitions in
`packages/core/src/*/*.dynamo.ts` are the source of truth for keys and indexes.
For sync and recovery behavior, see [State ingestion](../state-ingestion.md).

## Tables and indexes

`infra/storage.ts` defines both tables. Resolve names through SST `Resource`,
never hardcode them.

| Table                | Primary key | Purpose                                                                          |
| -------------------- | ----------- | -------------------------------------------------------------------------------- |
| `ConsoleData`        | `pk`, `sk`  | Disposable Console projections and operational state. TTL uses `ttl`.            |
| `ConsoleConnections` | `pk`, `sk`  | Durable Workload connection configuration, separate from disposable projections. |

`ConsoleConnections` has no secondary indexes. `ConsoleData` has these GSIs:

| Index                  | Partition key | Sort key     | Purpose                                                |
| ---------------------- | ------------- | ------------ | ------------------------------------------------------ |
| `entitiesByType`       | `entityType`  | `entitySort` | Entity-type lists.                                     |
| `entitiesByAwsAccount` | `accountPk`   | `accountSk`  | Sparse account-scoped projections.                     |
| `lookup`               | `lookupPk`    | `lookupSk`   | Sparse alternate-key lookups and State Update history. |

Every ConsoleData entity is indexed by `entitiesByType`. ConsoleConnections has
no GSI and does not require `entityType`. GSI reads are eventually consistent.

## Entity keys

ElectroDB derives these keys; callers must not construct them. `Connection` is
stored in `ConsoleConnections`; all other entities use `ConsoleData`.

| Entity                  | Partition key                           | Sort key                                         |
| ----------------------- | --------------------------------------- | ------------------------------------------------ |
| Account                 | `ACCOUNT#{accountId}`                   | `account`                                        |
| App                     | `APP#{appName}`                         | `APP`                                            |
| Stage                   | `APP#{appName}`                         | `STAGE#{stageName}`                              |
| Resource                | `APP#{appName}#STAGE#{stageName}`       | `RESOURCE#{resourceId}`                          |
| State                   | `APP#{appName}#STAGE#{stageName}`       | `STATE`                                          |
| StateUpdate             | `APP#{appName}#STAGE#{stageName}`       | `STATE_UPDATE#{updateId}`                        |
| StateSnapshot           | `APP#{appName}#STAGE#{stageName}`       | `STATE_SNAPSHOT#{updateId}`                      |
| StateEventLog           | `APP#{appName}#STAGE#{stageName}`       | `STATE_EVENT_LOG#{updateId}`                     |
| StateEvent              | `APP#{appName}#STAGE#{stageName}`       | `STATE_EVENT#{updateId}#{resourceHash}#{action}` |
| DiscoveredStage         | `ACCOUNT#{accountId}`                   | `DISCOVERY#{appName}#STAGE#{stageName}`          |
| Connection              | `CONNECTIONS`                           | `ACCOUNT#{accountId}`                            |
| User                    | `USER#{id}`                             | `user`                                           |
| UserIdentity            | `COGNITO#{cognitoSub}`                  | `user`                                           |
| IssueSubscription       | `APP#{appName}#STAGE#{stageName}`       | `ISSUE_SUBSCRIPTION#{region}#{logGroup}`         |
| Issue                   | `APP#{appName}#STAGE#{stageName}`       | `ISSUE#{fingerprint}`                            |
| IssueIngressEvent       | `APP#{appName}#STAGE#{stageName}`       | `ISSUE_INGRESS_EVENT#{sourceKey}#{eventId}`      |
| IssueSubscriber         | `ISSUE_SUBSCRIBER#{accountId}#{region}` | `SUBSCRIBER`                                     |
| AlertRule               | `ALERT_RULE#{id}`                       | `alert_rule`                                     |
| NotificationDestination | `NOTIFICATION_DESTINATION#{id}`         | `notification_destination`                       |

## Example items

This example shows the current model for workload account `111111111111`.
Sync policy includes `shop/prod` and excludes `shop/dev`.
Attributes are abbreviated; IDs and hashes are illustrative, not actual values.

**ConsoleData**

| PK                                        | SK                                                  | Entity                  | Example attributes                   |
| ----------------------------------------- | --------------------------------------------------- | ----------------------- | ------------------------------------ |
| `ACCOUNT#111111111111`                    | `account`                                           | Account                 | region: `us-east-1`                  |
| `ACCOUNT#111111111111`                    | `DISCOVERY#shop#STAGE#prod`                         | DiscoveredStage         | state key: `app/shop/prod.json`      |
| `ACCOUNT#111111111111`                    | `DISCOVERY#shop#STAGE#dev`                          | DiscoveredStage         | state key: `app/shop/dev.json`       |
| `APP#shop`                                | `APP`                                               | App                     | app: `shop`                          |
| `APP#shop`                                | `STAGE#prod`                                        | Stage                   | account: `111111111111`              |
| `APP#shop#STAGE#prod`                     | `STATE`                                             | State                   | source key: `app/shop/prod.json`     |
| `APP#shop#STAGE#prod`                     | `RESOURCE#bucket-id`                                | Resource                | type: `sst.aws.Bucket`               |
| `APP#shop#STAGE#prod`                     | `STATE_UPDATE#update-123`                           | StateUpdate             | command: `deploy`                    |
| `APP#shop#STAGE#prod`                     | `ISSUE_SUBSCRIPTION#us-east-1#/aws/lambda/shop-api` | IssueSubscription       | status: `attached`                   |
| `APP#shop#STAGE#prod`                     | `ISSUE#error-hash`                                  | Issue                   | status: `open`, count: `1`           |
| `APP#shop#STAGE#prod`                     | `ISSUE_INGRESS_EVENT#source-hash#event-123`         | IssueIngressEvent       | TTL for deduplication                |
| `ISSUE_SUBSCRIBER#111111111111#us-east-1` | `SUBSCRIBER`                                        | IssueSubscriber         | status: `ready`                      |
| `USER#01USER`                             | `user`                                              | User                    | email: `alex@example.com`            |
| `COGNITO#sub-123`                         | `user`                                              | UserIdentity            | userId: `01USER`                     |
| `ALERT_RULE#01RULE`                       | `alert_rule`                                        | AlertRule               | type: `issue`, destination: `01DEST` |
| `NOTIFICATION_DESTINATION#01DEST`         | `notification_destination`                          | NotificationDestination | channel: `discord`                   |

After cleanup completes, the excluded `shop/dev` object remains in discovery
inventory, but has no App Stage, State, Resource, or StateUpdate projection.
An App can contain Stages from multiple accounts.

**ConsoleConnections**

| PK            | SK                     | Entity     | Example attributes  |
| ------------- | ---------------------- | ---------- | ------------------- |
| `CONNECTIONS` | `ACCOUNT#111111111111` | Connection | region: `us-east-1` |

## Access patterns

Primary-key queries below use the entity's partition and sort key. Unless noted,
the table lists implemented callers; model-ready patterns are identified explicitly.

| Caller / pattern                             | Inputs                                                  | DynamoDB operation                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Get, register, update, or disconnect Account | account ID                                              | Account primary-key get or write                                                                                                        |
| List Accounts                                | none                                                    | Account `entitiesByType` query                                                                                                          |
| List Apps                                    | none; name ascending                                    | App `entitiesByType` query                                                                                                              |
| Get App                                      | app name                                                | App primary-key get (model ready)                                                                                                       |
| List Stages in App                           | app name                                                | Stage primary-key query                                                                                                                 |
| List Resources in Stage                      | app and stage                                           | Resource primary-key query                                                                                                              |
| Reconcile account projections                | account ID                                              | `entitiesByAwsAccount` queries, then per-Stage Resource queries                                                                         |
| Sync changed State object                    | account ID and state key                                | Account get; Stage and Resource primary-key reads                                                                                       |
| Read or upsert current State                 | app and stage                                           | State primary-key get (strongly consistent) or upsert                                                                                   |
| Read or upsert State Update                  | app, stage, update ID                                   | StateUpdate primary-key get (strongly consistent) or upsert                                                                             |
| List State Updates                           | app and stage; newest first, cursor-paginated           | StateUpdate `lookup` query (model ready)                                                                                                |
| List Stage Updates via App API               | app, stage, limit and cursor; SST key order             | Strongly consistent StateUpdate Stage-partition prefix query; Stage checked first; cursor-paginated                                     |
| List Stage history artifacts via Account API | account, app and stage; all results, SST key descending | Strongly consistent StateUpdate, StateSnapshot, or StateEventLog Stage-partition prefix query; ownership checked first; no GSI required |
| Delete State history with Stage              | app and stage                                           | State get/delete; consistent Stage-partition StateUpdate query and primary-key deletes                                                  |
| Read/delete Snapshot and Event Log locators  | app and stage; optional update ID                       | StateSnapshot and StateEventLog primary-key get/query and deletes; Stage cleanup queries consistently                                   |
| Read and reconcile State Events              | app, stage and Update ID                                | Strongly consistent Stage-partition StateEvent prefix query; Snapshot and Event Log ingestion maintain separate fields                  |
| List Snapshots or Event Logs by entity type  | type; cursor-paginated                                  | StateSnapshot or StateEventLog `entitiesByType` query; eventual consistency, Stage/Update sort; ingestion maintains index               |
| List or reconcile discovered Stages          | account ID                                              | DiscoveredStage primary-key query and writes                                                                                            |
| Read, save, or recover Workload connections  | account ID; recovery lists all                          | Connection primary-key get/write or fixed `CONNECTIONS` partition query; recovery also upserts Accounts                                 |
| Resolve Cognito subject                      | Cognito subject                                         | UserIdentity primary-key get                                                                                                            |
| Provision invited User                       | user ID and Cognito subject                             | Conditional User and UserIdentity transaction create                                                                                    |
| Confirm invited User                         | user ID                                                 | User primary-key patch                                                                                                                  |
| List Users                                   | ID descending; cursor-paginated                         | User `entitiesByType` query                                                                                                             |
| Enable or disable Stage monitoring           | app and stage                                           | Stage primary-key get/patch                                                                                                             |
| Reconcile Stage monitoring                   | app and stage                                           | Stage, Resource, and IssueSubscription primary-key reads                                                                                |
| Remove excluded Stage Issue data             | app and stage                                           | IssueSubscription and Issue primary-key queries and deletes                                                                             |
| Verify Issue ingress source                  | account, region, log group                              | IssueSubscription `lookup` query                                                                                                        |
| Find Issue for occurrence                    | app, stage, fingerprint                                 | Issue primary-key get                                                                                                                   |
| Deduplicate Issue ingress                    | app, stage, source hash, event ID                       | Conditional IssueIngressEvent create in transaction with Issue mutation                                                                 |
| List Issues                                  | global, App, or App/Stage                               | Issue `entitiesByType` query; status filtering and global bounded-result sorting in process                                             |
| List Stage Issue subscriptions               | app and stage                                           | IssueSubscription primary-key query                                                                                                     |
| Delete persisted Issues                      | none                                                    | `entitiesByType`, then Stage / Issue primary-key queries and deletes                                                                    |
| List alert rules                             | none                                                    | AlertRule `entitiesByType` query                                                                                                        |
| Create, update, or delete alert rule         | rule ID                                                 | AlertRule primary-key write                                                                                                             |
| Get notification destination                 | destination ID                                          | NotificationDestination primary-key get                                                                                                 |
| List notification destinations               | none                                                    | NotificationDestination `entitiesByType` query                                                                                          |
| Create or update notification destination    | destination ID                                          | NotificationDestination primary-key write                                                                                               |
| Delete notification destination              | destination ID                                          | AlertRule type query, then NotificationDestination primary-key delete                                                                   |

State Update history uses `lookupPk = STATE_UPDATE#{appName}#{stageName}` and
`lookupSk = STATE_UPDATE#{updateId}`, ordered by SST key in descending order.
Partial Updates discovered by S3 listing have no command, timestamps, errors,
or `processedAt` until their artifact is processed. The index is maintained when
the StateUpdate is written. The future snapshot and
event access patterns are described in [State Update history](../state-update-history.md).

## Persistence rules

- Use ElectroDB with AWS SDK v3 `DynamoDBDocumentClient`. Domain `*.dynamo.ts`
  files own entity definitions and key fields; `db/service.ts` composes entities.
- Use named entity access patterns; do not write key or ElectroDB metadata fields
  directly. Use `.params()` tests for generated keys, indexes, and transactions.
- Every ConsoleData entity has an `entityType` attribute and populates
  `entitiesByType`; ConsoleConnections has no secondary index.
- Never use product-code scans or local secondary indexes. Add a GSI only for a
  documented access pattern that existing keys cannot satisfy.
- Keep raw SST State, Pulumi inputs and outputs, and event-log contents out of
  `ConsoleData`; persist only Console-safe projections and source references.
- Use `upsert` for partial create/update, `patch` when an item must exist, and
  `create` when duplicates must fail. `put` replaces the entire item.
- Resource reconciliation uses `put` for complete projections so removed parent,
  ARN, and summary fields do not linger; it preserves the previously read creation time.
- Keep ElectroDB `model.version` at `"1"` for normal evolution. Change persisted
  `schemaVersion` only for incompatible item-shape migrations. Document required
  user-run migrations; do not add old-shape aliases or dual reads/writes.
- The user performs database and cloud actions.

### Resource classification migration

Resource schema version `3` classifies SST Function, Bucket, and Dynamo rows as
`component`, and uses `resource` instead of `physical` for Pulumi resources.
After deploying this change, the user must run **Sync all** on the Accounts page
to reproject each included Stage from its current SST State. No table or index
changes are required. Until a Stage is synced, its counts and Function monitoring
may be incorrect. Excluded Stages are not projected; sync them if included later.
Non-SST checkpoint entries without Pulumi's `custom` flag are classified as
resources because their component status is unknown.

### State history and entity type cutover

State Snapshot schema version `3` and State Event Log schema version `1` replace
the previous `stateArtifact` records. They use `entityType = STATE_SNAPSHOT`
and `STATE_EVENT_LOG` respectively. Legacy `stateSnapshot` items pointing to
`app/` State are also a different shape. The user removes those obsolete records
and runs Stage backfill after deployment; verify S3 objects still exist first.
Stop old ingestion while cleaning up to avoid recreating obsolete records.
The previous Snapshot `summary` field is no longer read. Stage backfill discovers
locators without processing artifacts; selected historical processing builds
State Events and Update counts. The user performs any desired cleanup of obsolete
records. Existing Update history need not be deleted.

Existing State and State Update items written before this change may lack
`entityType` and `entitySort` and remain invisible to `entitiesByType` until
rewritten. Account sync rewrites current State. Backfill preserves existing State
Updates, so it does not repair their type or history index. To index an
existing State Update without discarding history, the user can set
`entityType = STATE_UPDATE` and
`entitySort = APP#{appName}#STAGE#{stageName}#STATE_UPDATE#{updateId}` on that
item. Do not delete Updates unless their source artifacts are available to replay.
Existing Update history index keys use the old timestamp ordering; reprocess
Updates to rebuild their history keys for SST key ordering.

## Adding an access pattern

### State artifact history

Snapshot and event-log locators are separate Stage-partitioned entities, keyed by
Update ID, and removed during Stage cleanup. Comparisons read snapshots from S3
transiently. State Events store safe per-resource facts in the Stage partition;
Update counts and source-specific event fields are maintained during ingestion.

Before implementation, document the caller, inputs, sort order, expected
cardinality and pagination, consistency, key/index, entity owner, and write path
maintaining the index. Add or amend the owning entity, add an index only if
needed, and test generated request parameters. Update the table above with the
final pattern and implementation status.
