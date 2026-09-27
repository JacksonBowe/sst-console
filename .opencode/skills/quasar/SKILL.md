---
name: quasar
description: Work with Quasar Framework applications using the Quasar CLI and official Quasar APIs.
---

# Quasar Framework

Use this skill for work involving Quasar Framework applications, including Quasar components, configuration, CLI commands, application modes, builds, and generated files.

## Establish project context

Before making Quasar-specific assumptions:

1. Read `package.json`.
2. Read `quasar.config.*`.
3. Identify the repository's package manager from its lockfile.
4. Inspect relevant existing source files and scripts.

Run the following when version or environment details are relevant:

```sh
quasar info
```

Treat the installed Quasar packages, project configuration, and existing repository conventions as the source of truth.

Do not assume the project uses Vite, Webpack, TypeScript, Pinia, a particular icon set, or a particular Quasar application mode without checking.

## Run commands

Prefer existing `package.json` scripts when they perform the required operation.

Otherwise, use the project-local Quasar CLI through the repository's package manager. Follow the package manager already used by the repository.

Examples:

```sh
npm exec quasar -- info
pnpm exec quasar info
yarn quasar info
bunx quasar info
```

Discover available commands with:

```sh
quasar --help
```

Inspect unfamiliar commands or options before using them:

```sh
quasar <command> --help
```

Do not rely on remembered CLI flags when they can be verified locally.

## Discover component APIs

Do not guess Quasar component props, events, slots, methods, directives, plugins, or CSS helpers.

Inspect component APIs with:

```sh
quasar describe QBtn
quasar describe QInput
quasar describe QTable
```

Use the official Quasar documentation when the installed CLI output is insufficient.

Ensure guidance applies to the Quasar version installed in the repository.

## Generate files

Use `quasar new` when scaffolding a standard Quasar file is appropriate.

Examples:

```sh
quasar new page ExamplePage
quasar new layout ExampleLayout
quasar new component ExampleComponent
quasar new boot example
quasar new store example
```

Check the command before relying on particular arguments:

```sh
quasar new --help
```

Inspect the destination first and do not overwrite existing files unintentionally.

After generation, adapt the file to the repository's existing naming, typing, formatting, and component conventions.

## Work with application modes

Inspect configured and available modes before modifying them:

```sh
quasar mode
```

Use the CLI to add or remove modes when supported:

```sh
quasar mode add <mode>
quasar mode remove <mode>
```

Do not manually create or remove Quasar mode directories when the installed CLI manages them.

Mode support and generated files depend on the installed Quasar CLI version.

## Modify configuration

Treat `quasar.config.*` as the central Quasar application configuration.

Before changing it:

- inspect the existing configuration;
- preserve its module format and typing style;
- verify options against the installed Quasar version;
- preserve mode-specific and environment-specific behavior;
- avoid configuring behavior already provided by Quasar.

Use the following when investigating generated build configuration:

```sh
quasar inspect
```

Inspect command options before assuming Vite, Webpack, mode, or path flags:

```sh
quasar inspect --help
```

## Implement UI

Prefer existing Quasar components, directives, plugins, utilities, and CSS helpers over recreating equivalent functionality.

Prefer small, single-purpose UI components. Extract distinct sections, behaviours, and reusable elements into separate components rather than building monolithic UI files.

Use Quasar component names in their documented form:

```vue
<q-btn />
<q-input />
<q-card />
```

Before using plugins, directives, icon sets, animations, or extras, verify that they are installed and enabled.

Follow the Vue and Quasar conventions already present in the repository.

Do not replace established project abstractions merely because a direct Quasar implementation is possible.

## Validate changes

Use the repository's existing formatting, linting, type-checking, testing, and build scripts.

Run Quasar-specific preparation or build commands when relevant:

```sh
quasar prepare
quasar build
```

Use the appropriate application mode when required:

```sh
quasar build --mode <mode>
```

Do not start a long-running development server unless interactive verification is necessary.

Report commands that failed, were unavailable, or could not be run.
