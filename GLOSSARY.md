# SST Console

SST Console provides a safe operational view of SST deployments across connected AWS accounts.

## Topology

**Workload Account**:
An AWS account connected to SST Console for discovery and operational visibility.
_Avoid_: Account, customer account, tenant

**Connection**:
Durable configuration that enables SST Console to access one Workload Account.
_Avoid_: Connector, account connection

**App**:
A workspace-global SST application, identified by its SST app name.
_Avoid_: Application, project, service

**Stage**:
One named deployment context of an App, owned by one Workload Account.
_Avoid_: Environment, deployment, stack

**Resource**:
A Console-visible SST component within a Stage. A Resource is either a physical AWS resource or a component grouping.
_Avoid_: Infrastructure, asset

**SST State**:
Source-of-truth deployment state produced by SST for an App Stage.
_Avoid_: Console state, deployment metadata

**State Snapshot**:
A recorded reference to one observed version of SST State for an App Stage.
_Avoid_: State, backup

**Discovery**:
Inventory of App Stages found in a Workload Account before sync policy selects what SST Console projects.
_Avoid_: Sync, import

**Sync Policy**:
Rules selecting which discovered App Stages from a Workload Account SST Console projects.
_Avoid_: Filter, inclusion policy

**Sync Run**:
One attempt to reconcile a Workload Account's selected SST State with Console projections.
_Avoid_: Refresh, scan

## Operations

**Issue**:
A grouped, recurring Lambda error occurrence within one App Stage.
_Avoid_: Error, exception, incident

**Issue Monitoring**:
Stage-level Console configuration that observes eligible Lambda log groups and produces Issues.
_Avoid_: Logging, alerting

**Alert**:
Routing configuration that selects Issue events by App or Stage and sends them to Alert Targets.
_Avoid_: Notification, rule

**Alert Target**:
Reusable configured destination for Alert delivery.
_Avoid_: Webhook, channel, integration

**Console User**:
A person authorized to use SST Console, represented separately from their Cognito identity.
_Avoid_: Account, Cognito user

## Relationships

- A **Connection** enables access to one **Workload Account**.
- A **Workload Account** has **Discovery** inventory and a **Sync Policy**.
- An **App** contains **Stages**; a **Stage** belongs to one **App** and one **Workload Account**.
- A **Stage** contains **Resources** and has **State Snapshots**.
- A **Sync Run** reconciles selected **SST State** into App, Stage, Resource, and State Snapshot projections.
- **Issue Monitoring** on a **Stage** produces **Issues**.
- An **Alert** matches **Issues** and routes them to one or more **Alert Targets**.
- A **Console User** is authenticated through one Cognito identity.
