# State Update history plan

## Goal

Record future SST State Update artifacts for each Stage, derive safe historical
resource diffs, and expose them through a custom Console UI.

This plan mirrors SST's State Update data flow without copying raw Pulumi state,
inputs, outputs, or event-log content into `ConsoleData`.

## Scope

SST writes these artifacts to a Workload Account state bucket:

```text
app/{app}/{stage}.json
update/{app}/{stage}/{updateId}.json
snapshot/{app}/{stage}/{updateId}.json
eventlog/{app}/{stage}/{updateId}.json
```

Initial delivery processes new artifacts after deployment. It does not list or
replay historical `update/`, `snapshot/`, or `eventlog/` objects during normal
account sync. Historical replay is explicit follow-up work.

## Domain model

### State

One mutable Console record for a Stage's current
`app/{app}/{stage}.json` object. It stores source bucket, key, optional object
version, and observation time. It has no TTL and is removed with its Stage.

### State Update

One record for one `update/{app}/{stage}/{updateId}.json` object. It stores:

- `updateId`, App, Stage, and owning Workload Account;
- source bucket, key, optional object version, and observation time;
- SST version and original bounded command string;
- `timeStarted` and optional `timeCompleted`; force-unlocked updates may omit
  `timeStarted` when `timeCompleted` is present;
- embedded deployment errors, capped at 64 KiB total, with source/stored count
  and truncation metadata;
- aggregate resource counts: created, updated, deleted, and unchanged.

SST outcome is inferred at read time:

- no completion time: running;
- completion time with no errors: succeeded;
- completion time with errors: failed.

Console does not persist a separate reconciliation-status state machine.

### State Snapshot

One immutable source reference for one
`snapshot/{app}/{stage}/{updateId}.json` object. It shares the State Update's
`appName`, `stageName`, and `updateId`; no pointer or S3 existence check is
needed to link them. A State Update may have no resulting State Snapshot.

### State Event

One safe historical resource diff within a State Update. It stores:

- stable resource identity, kind, type, name, and action;
- action: `created`, `updated`, or `deleted`;
- bounded before/after diffs from allowlisted Resource summaries only.

All Console-visible normalized Resources participate, including component
groupings and physical Resources. Raw Pulumi children never participate.

### State Event Log

`eventlog/...` is an SST source artifact, not a ConsoleData entity in v1. Its
raw entries are not persisted. Safe derived enrichment may be designed later
after its payload contract is verified.

## Data boundary

`ConsoleData` remains a Console-safe index. It never stores raw SST State,
Pulumi inputs or outputs, or raw event-log entries.

Deployment errors are operational diagnostics rather than SST State. They stay
inside their source State Update record because an update normally has only a
small number of errors. Error content is bounded to 64 KiB total so one
pathological SST diagnostic cannot exceed DynamoDB item limits. The record
retains truncation metadata when its source errors exceed that bound.

Historical State Event detail comes only from existing allowlisted normalized
Resource summaries. An update occurs when any Console-safe normalized Resource
field changes, including safe structure or summary values.

## DynamoDB model and access patterns

All records use `ConsoleData`, ElectroDB, and existing indexes. No new DynamoDB
GSI is required.

| Entity        | Primary key                                                                    | Purpose                                             |
| ------------- | ------------------------------------------------------------------------------ | --------------------------------------------------- |
| State         | `APP#{app}#STAGE#{stage}` / `STATE`                                            | Read current State source reference for one Stage.  |
| StateUpdate   | `APP#{app}#STAGE#{stage}` / `STATE_UPDATE#{updateId}`                          | Read one State Update by Stage and ID.              |
| StateSnapshot | `APP#{app}#STAGE#{stage}` / `STATE_SNAPSHOT#{updateId}`                        | Read one update-linked State Snapshot by shared ID. |
| StateEvent    | `APP#{app}#STAGE#{stage}#STATE_UPDATE#{updateId}` / `STATE_EVENT#{resourceId}` | List all resource events for one State Update.      |

`StateUpdate` uses the existing sparse `lookup` GSI for Stage-scoped,
newest-first history. Its sort order is `timeCompleted`, falling back to
`timeStarted` while an update remains incomplete. Ingestion reads the current
S3 object and conditionally accepts only newer S3 sequencers for the same source
bucket and key. Duplicate and out-of-order deliveries cannot overwrite a newer
observation. Force-unlock preserves any previously observed start time.

`StateSnapshot` also uses the existing `lookup` GSI for chronological snapshot
lookup. This finds predecessor and successor snapshots without scans when
building or correcting diffs.

Required reads and writes must be added to
`docs/architecture/dynamodb.md` before entity implementation:

1. read current State for Stage;
2. list State Updates for Stage, newest first, with cursor pagination;
3. read one State Update;
4. read State Snapshot for one State Update;
5. find chronological predecessor and successor State Snapshots;
6. list State Events for one State Update;
7. write/update State, StateUpdate, StateSnapshot, and StateEvent;
8. delete all State history when Stage is removed.

## Event flow

1. Existing `app/` sync/event processing updates current Stage Resource
   projection and the single current State record.
2. An S3 event for `update/...` is validated against connected Workload Account,
   state bucket, App, Stage, and ownership. It reads and upserts State Update.
3. An S3 event for `snapshot/...` stores State Snapshot under the shared update
   ID. If the matching State Update exists, reconciliation can run immediately.
   Otherwise it runs when the State Update arrives.
4. Reconciliation compares a snapshot with its chronological predecessor and
   writes aggregate counts plus State Events.
5. S3 duplicate delivery upserts the same State Update.
6. If an older snapshot arrives after a newer one, reconciliation recomputes the
   arriving snapshot and its immediate successor. Derived State Events and
   aggregate counts are replaced so history converges.
7. First tracked snapshot for a Stage has no predecessor and emits `created`
   State Events for every Console-visible normalized Resource.

State domain events are:

```text
StateUpdateCreated
StateSnapshotCreated
StateEventLogCreated
StateUpdateReconciled
```

`StateEventLogCreated` has no ConsoleData persistence behavior in v1. It keeps
the event flow explicit for later safe enrichment work.

## Retention

State Update, State Snapshot, and State Event records have no automatic expiry.
Current State also remains until its Stage is removed or replaced.

S3 remains authoritative for raw artifact detail and replay. DynamoDB retains
the indexed, Console-safe history needed to discover, order, and summarize those
artifacts without per-read S3 access. Delete history only when its Stage is
removed or its Workload Account is disconnected and purged.

Add a TODO to reassess State history item size, write capacity, and retained
volume after production usage. Introduce explicit retention only if those
measurements justify a product-policy change; do not silently expire history.

## Stage removal

When SST removal deletes a Stage's current projection, delete its current State,
State Updates, State Snapshots, and State Events. Do not retain unreachable
archived history in v1.

Cleanup runs before deleting the Stage so a failed cleanup can be retried.
Concurrent ingestion or Stage recreation can race cleanup; manual repair may
be needed. This initial implementation does not serialize those operations.

## Existing StateSnapshot cutover

Current `StateSnapshot` records are historical observations of mutable
`app/...json` objects. They become the new `State` concept.

This is an incompatible projection cutover:

1. Deploy the new State model without old-shape reads or aliases.
2. User re-syncs every Workload Account to populate one current State record per
   Stage.
3. User purges legacy `StateSnapshot` projection records.

Resources and Stages are not rebuilt by this targeted cutover.

## Delivery order

1. [#65](https://github.com/JacksonBowe/sst-console/issues/65): define and
   document the DynamoDB model and access patterns in this plan and
   `docs/architecture/dynamodb.md`.
2. [#69](https://github.com/JacksonBowe/sst-console/issues/69): add safe State
   Update persistence and contracts.
3. [#68](https://github.com/JacksonBowe/sst-console/issues/68): forward and
   ingest live state-bucket artifacts.
4. [#64](https://github.com/JacksonBowe/sst-console/issues/64): reconcile
   snapshots into safe State Events and aggregate counts.
5. [#66](https://github.com/JacksonBowe/sst-console/issues/66): expose
   paginated State Update history through API, SDK, and Vue Query.
6. [#63](https://github.com/JacksonBowe/sst-console/issues/63): build custom
   State Update history and detail UI.
7. [#67](https://github.com/JacksonBowe/sst-console/issues/67): add explicit,
   bounded historical artifact replay.

Issue/error correlation remains out of scope.

## Verification

- ElectroDB `.params()` tests cover all new entity/index queries and deletes.
- State tests cover source parsing, error truncation, first snapshot, no-change,
  create/update/delete, and out-of-order snapshot convergence.
- Event tests cover duplicate and out-of-order S3 events, invalid keys, account
  ownership, and absent counterpart artifacts.
- API tests cover pagination, missing updates, and detail reads without scans.
- Run `bun run check` before merge.
