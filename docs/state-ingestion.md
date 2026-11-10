# State ingestion and reconciliation

`ConsoleData` indexes Console-safe SST state; raw state remains in S3. State owns
artifact references and queryable metadata. App owns App, Stage, and Resource
projections. State ingestion lives in `packages/core/src/state/`; `update.ts`,
`snapshot.ts`, and `event-log.ts` own their respective contracts, persistence,
and artifact handling. See
[DynamoDB access patterns](architecture/dynamodb.md) for persistence keys and
[State Update history](state-update-history.md) for the history plan.

## Account sync

Discovery reconciles DiscoveredStage inventory only after a complete S3 listing.
Account sync persists discovery, applies the durable Connection sync policy, and
syncs selected Stages sequentially. Ignore selectors take precedence over allow
selectors. Ignored state objects are not downloaded for processing.

Account-wide stale projection cleanup is scheduled only after discovery and all
required Stage syncs succeed. Earlier successful Stage syncs may already have
changed Resources if a later sync fails. Cleanup is asynchronous: account sync
returns after removal requests are published, not after cleanup completes.
Concurrent sync and policy changes are not coordinated; cleanup and monitoring
failure outcome ordering remains a TODO.

App names are global across connected accounts. A Stage is identified by App
and Stage name and has one owning account. A conflict skips that projection
without overwriting or deleting the owning account's data. Account-wide
reconciliation records conflicts in `Account.lastSyncConflicts`; live sync does
not overwrite them.

State objects are parsed from SST v4 Pulumi checkpoints, decompressing gzip when
needed. Secrets are redacted before normalization and persisted summaries are
allowlisted. App projection writes are split into transactions of at most 90
actions and 3 MiB estimated payload. State locators are written separately; a
subsequent successful sync can repair partial writes.

## Live ingestion

Account sync configures EventBridge forwarding from the discovered state bucket.
The State worker validates the source account and configured bucket before
processing supported events. Update ingestion also checks connection status,
sync policy, Stage ownership, and the source object's S3 sequencer. Only newer
sequencers for the same bucket and key can replace an observation. Historical
Update artifacts are not listed or replayed during normal account sync. Live
snapshot events persist a source locator and reconcile Resource counts and events
from S3; event-log events persist a locator and safe operation timing. Manual
Stage backfill lists S3 artifacts and records locators without reading artifact
contents through `POST /accounts/{accountId}/state/{appName}/{stageName}/backfill`.
Selected historical processing publishes the same internal events as live
ingestion. A first-time backfill experience remains to be designed. Legacy zero-valued
Update count attributes must not be interpreted as measured counts.

Stage removal deletes State history before the Stage so failed cleanup can be
retried. Concurrent ingestion or recreation can race cleanup and require manual
repair. Full account sync is a repair path, but lost events or orphaned data can
also require manual repair.

Before the next release, resolve event spoofing and unchecked internal event
publication failures and verify the two-consumer flow. Existing workload event
forwarding rules pick up changes on account sync. API-managed forwarding rules
are not automatically removed on disconnect or stack deletion (tracked in #74).
Previously deployed CloudFormation-managed rules require separate manual cleanup;
shared S3 EventBridge notifications are not disabled.

## Connection recovery

`ConsoleConnections` holds durable connection configuration separately from
disposable `ConsoleData` projections. Recovery is explicit: query the registry
and restore Account projections, then sync accounts separately. Per-account
failures do not stop recovery of other accounts.

For installations predating the registry, before wiping `ConsoleData`, the user
must call authenticated `POST /accounts/backup-connections` while existing
Account records remain available. After the wipe, call authenticated
`POST /accounts/recover`. The user performs all database and cloud actions.

Account `lastSyncedAt` and the write-only SyncRun entity are no longer used.
Existing attributes and SyncRun items need no purge or resync solely for their
removal; optional database cleanup is user-performed.
