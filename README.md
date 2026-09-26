# SST Console

> **Very early work in progress. Not fit for personal, community, or production use.**

SST Console is an experimental, self-hosted control plane for viewing SST v4 resources across AWS accounts in one organization. One installation is intended to run in a dedicated AWS control account and connect workload accounts through explicit cross-account roles.

Development is moving quickly. Features, APIs, infrastructure, data models, and security boundaries may change without notice. Do not deploy this against AWS accounts or data you cannot afford to lose or expose.

## Status

This repository contains only the early foundations: SST infrastructure, a basic web application, Cognito setup, DynamoDB storage, and experimental account connection and state-ingestion work. It does not yet provide a usable Console.

## How this differs from SST's official Console

This is an independent project exploring a different approach:

- **Self-hosted and single-tenant:** each installation is designed to run in its owner's AWS control account for one AWS organization.
- **Cross-account visibility first:** early work focuses on connecting workload accounts and indexing SST state metadata rather than reproducing every Console capability.
- **AWS-owned control plane:** the UI, API, authentication, operational index, and future integrations are intended to run within infrastructure owned by the installation operator.
- **Independent architecture:** the project is being designed around its self-hosted use case rather than compatibility with the official SST Console's APIs, workflows, or deployment model.

## Why a separate implementation?

The goal of this project is to explore a fully self-hosted Console that can run within an organization's own AWS infrastructure.

Building a separate implementation provides the freedom to design around that model from the beginning. In particular, the official Console's architecture includes external services such as PlanetScale, while this project aims to keep its control plane within the operator's AWS environment.

Starting independently also allows the project to evolve without requiring compatibility with the official Console's internal APIs, data model, or deployment architecture.

## Affiliation

SST Console is an independent community project. It is not affiliated with, endorsed by, sponsored by, or officially connected to Anomaly Innovations, Inc., the SST project, or any official SST product.

“SST” is used to describe the project's intended compatibility with SST v4.

## License

Licensed under [Apache-2.0](LICENSE).
