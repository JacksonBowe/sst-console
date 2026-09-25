# Initial cross-account resource-read plan

## Goal

Deploy SST Console into a dedicated AWS control account, connect one separate
workload account, and show an SST v4 resource from that workload account in the
Console UI.

The first acceptance test is:

> A bucket deployed by SST v4 in Account B appears in the Console deployed in
> Account A, including its SST app, stage, resource type, name/URN, and
> non-secret outputs.

Autodeploy, AWS Organizations StackSets, CloudWatch logs, and a custom domain
are not needed to prove this first vertical slice.

## Product direction

- Self-hosted, open-source SST v4 Console for AWS Organizations.
- One Console installation represents one organization tenant.
- The Console control account owns the web UI, API, Cognito, DynamoDB, queues,
  S3 archive storage, GitHub integration, and audit records.
- Workload accounts retain their SST apps, state buckets, CloudWatch logs, and
  later their account-local CodeBuild deployment runners.
- Use DynamoDB as an operational index, not a complete SST state replica.
- Use Cognito for authentication. Self-registration is disabled. The deployer
  creates the first user in the generated Cognito User Pool; the first successful
  Console login is atomically assigned the admin role.
- Do not require SES for first-run authentication. Use Cognito's default mail
  delivery. Use SNS email subscriptions as the default future alert channel;
  SES is optional for branded/higher-volume delivery.

## Repository structure

```text
packages/
  core/        Shared domain types, SST state parsing, IAM policy builders
  functions/   Control-plane Lambda handlers
  sdk/         Public deployment/connector helpers and future install surface
  web/         Dashboard SPA
infra/         SST infrastructure modules loaded by sst.config.ts
examples/
  fixture-sst-app/  Small SST v4 workload for real AWS integration testing
plans/        Maintained design and execution plans
```

For the initial milestone, users can clone the repository, set minimal
configuration, and run `sst deploy`. Package/component installation can follow
once the cross-account path is proven.

## Implementation phases

### Phase 0: Control account foundation

1. Pin and test against a current SST v4 release.
2. Deploy the minimal Console SST app in the control account:
    - Cognito User Pool;
    - static web application;
    - API Lambda;
    - DynamoDB tables;
    - S3 archive bucket for oversized state payloads.
3. Disable public Cognito self-registration.
4. Print direct deployment outputs for the Console URL and Cognito User Pool.
5. Start without a custom domain or SES configuration.

### Phase 1: Workload-account connector

Create a deployable connector stack for a workload account. It creates:

- `SSTConsoleReadRole`, trusted only by the control-account collector role;
- a unique per-installation `sts:ExternalId` condition;
- read-only SST state access required for the selected workload;
- account registration metadata/callback.

The connector must not use `AdministratorAccess` and must not create, update, or
delete workload application resources. For this milestone, use explicit state
bucket/prefix configuration or narrowly scoped SST bootstrap discovery. Broad
account scanning is deferred.

### Phase 2: SST v4 state ingestion

1. Deploy a fixture SST v4 app in the workload account with an
   `sst.aws.Bucket("ProbeBucket")`.
2. Assume the workload `SSTConsoleReadRole` from the control-account API.
3. Fetch and parse SST v4 state for the configured app/stage.
4. Persist a compact Console index in DynamoDB:
    - workload account;
    - app and stage;
    - resource identity and type;
    - safe summary fields;
    - SST state version/timestamp;
    - source S3 pointer.
5. Put oversized raw resource payloads in the Console S3 archive bucket.
6. Redact secrets by default and do not attempt to decrypt SST secrets.

### Phase 3: First dashboard

Implement the smallest useful navigation path:

```text
Accounts
  Workload account
    SST app
      Stage
        Resource
          Resource details
```

Resource details must show account ID/name, region, SST app and stage, resource
type and URN, timestamps, safe inputs/outputs, and a direct AWS Console link
where applicable.

### Phase 4: Low-friction onboarding

1. Replace manual connector deployment with an `sst-console connect` command or
   generated CloudFormation launch link.
2. Support account registration from the dashboard.
3. Add AWS Organizations discovery and StackSet rollout.
4. Add state-update event ingestion and targeted reconciliation.
5. Add CloudWatch Lambda log search/tailing.
6. Add GitHub App Autodeploy with account-local CodeBuild runners.

## Future Autodeploy model

The control account receives GitHub events and records execution state. It starts
a restricted CodeBuild runner in the selected workload account. The runner uses
account-local deployment permissions and can optionally run inside that account's
VPC. This keeps deploy credentials and private-network access in the target
account while preserving a single Console dashboard.

## Development and test plan

### Real AWS environments

Use two real sandbox accounts from the start:

| Account  | Purpose                                        |
| -------- | ---------------------------------------------- |
| Control  | Console SST deployment, Cognito, API, DynamoDB |
| Workload | Fixture SST v4 app and connector stack         |

Use separate AWS profiles or IAM Identity Center profiles. Never put AWS keys in
repository configuration or `.env` files. Run the control plane with `sst dev`
and have it assume the real workload connector role.

### Automated tests

Unit tests:

- SST v4 state fixture parsing;
- resource normalization and secret redaction;
- DynamoDB keys/indexes;
- connector trust and permissions policy generation;
- assertions that generated policies contain no write actions;
- API/resource serialization.

Contract tests:

- captured anonymized SST v4 state artifacts;
- empty, single-resource, multi-region, updated, deleted, and oversized-output
  fixtures;
- pinned expected state-schema behavior.

UI tests:

- Playwright navigation from account to resource details;
- mocked Cognito/API for routine UI coverage;
- one deployed smoke test using a manually-created Cognito test user.

AWS integration tests:

1. Deploy the fixture SST app in the workload account.
2. Deploy the connector trusting the control account.
3. Register the connector and trigger a sync.
4. Assert that the fixture bucket is returned by the API and visible in the UI.
5. Update the fixture and confirm Console metadata refreshes.
6. Verify assume-role attempts with a wrong external ID, wrong principal, and a
   write operation fail.
7. Destroy fixture and connector resources.

LocalStack is not sufficient for this path; cross-account STS trust, SST state,
S3 access, and eventual CloudWatch support require real AWS integration tests.

### CI

- Every PR: format, lint, typecheck, unit, contract, and mocked UI tests.
- Manual/merge integration workflow: GitHub OIDC into dedicated disposable test
  accounts.
- Tag all integration-test resources and run scheduled cleanup.
- Never use personal development or production accounts for CI integration tests.

## Milestone definition of done

- Console deploys in a clean control account without SES setup.
- First admin is created in Cognito and can sign in.
- A workload account connects through a narrowly scoped, external-ID-protected
  role.
- An SST v4 fixture resource is visible in Console and refreshes after update.
- The connector cannot mutate workload resources.
- Setup is documented and reproducible in under fifteen minutes.
