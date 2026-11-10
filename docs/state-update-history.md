# State Update history

State history is scoped to a Stage. Updates, snapshots, and event logs share an
Update ID. `StateSnapshot` and `StateEventLog` entities retain S3 source locators.
Their `entityType` values are `STATE_SNAPSHOT` and `STATE_EVENT_LOG` respectively.

## Live ingestion

After a Stage is connected, S3 notifications publish internal State events.
Their handlers process Update, Snapshot, and Event Log artifacts independently.
Live Update events carry an S3 sequencer; only newer observations for the same
bucket and key can replace an existing sequenced observation.

Like the official Console, Snapshot processing returns without comparing when
its Update record does not exist. It does not automatically retry when the Update
arrives. Event Logs can be processed independently of Update arrival.

## Resource events

Snapshot ingestion reads its predecessor from S3 using the official Console's
lexicographical key ordering (including its legacy `history/` fallback). It
compares all Pulumi Resources by URN and creation/modification timestamps. Counts
are stored on the Update and changes as State Events; replacement produces a
creation and deletion. The first snapshot uses an empty baseline. An unreadable
predecessor marks the comparison unavailable instead of assuming it was empty.

Event Logs are parsed into safe operation timing and outcomes. Snapshot and
operation facts merge by Update, URN, and action. They can disagree: counts
describe Snapshot changes, whereas operations may have failed. Inputs, outputs,
diagnostic messages, and raw Event Log entries are not persisted. Late snapshots
recalculate their immediate successor. Concurrent ingestion and cleanup are best
effort; selected historical processing can repair races or partial writes.

## Historical discovery and processing

Historical discovery lists Update, Snapshot, and Event Log objects for one
tracked Stage in its connected account's state bucket. It saves source locators
and listing metadata without downloading artifact contents or calculating diffs.
The Stage must belong to the account and be included by its sync policy.

An Update discovered from its S3 key can initially be partial: command, start
and completion times, errors, and other artifact-derived metadata are unavailable
until processing. History uses the official Console's S3 key ordering, including
for unprocessed Updates. A Snapshot or Event Log without a matching Update object
is saved as a locator without inventing an Update record. Repeated discovery
preserves existing processing markers and derived results.

Artifacts have a `processedAt` marker after successful processing. This
distinguishes an unprocessed artifact from one that was processed successfully
but produced no Resource events. Discovery alone does not set the marker.

Selected historical processing publishes the same internal State events used by
live ingestion; the same handlers read artifacts and persist their results.
Processing is independent for each artifact, so a Snapshot failure does not
block Event Log processing. Historical listings have no S3 sequencer: historical
processing must not invent one, while live Update events retain sequencer-based
ordering protection. Reprocessing available artifacts is permitted for repair.
Normal account sync does not discover or process historical artifacts.

Stage-scoped API routes list persisted Updates, Snapshots, and Event Log locators
using primary-key queries, including Updates absent from the entity-type index.
These routes return all results; large histories may require pagination later.
History detail and UI remain outside this scope. Discovery may also require
pagination or batching for large histories.

## Security and gaps

Raw SST State, Pulumi inputs/outputs, and raw event logs are never persisted in
ConsoleData. Existing Update diagnostics remain subject to their separate size
limit. Snapshot comparisons need workload S3 read access, and missing source
objects prevent comparisons. No raw log access, history detail API, or history UI is
provided here. Legacy Update count attributes may remain in DynamoDB but are not
read; they were initialized to zero without reconciliation.
