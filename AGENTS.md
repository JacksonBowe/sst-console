# Agent Notes

## Guiding principles

- Follow a "make it work" > "make it better" approach when implementing new features, instead of attempting to implement a perfect solution first try.
- This is a small community project - not an enterprise product. Don't overengineer.

## Work instructions

- Keep replies concise. Load the `caveman` skill before responding.
- Strongly prefer simple, explicit, readable, and maintainable code. Avoid cleverness, unnecessary abstraction, and complexity unless they provide a clear practical benefit.
- Use Quasar components and built-in utility classes whenever they provide equivalent behavior; add custom CSS only for gaps.
- Directory-local `.agent_context.md` files are concise directory maps that help agents orient without scanning every file.
- When changing a directory, update its `.agent_context.md` when the map becomes inaccurate or omits important entries.
- Create a new `.agent_context.md` only where it materially improves discoverability.
- Context files may describe relevant subdirectories and should link to their context files where useful.
- Keep test files and test-only fixtures in each workspace's `tests/` directory. Never put them in `src/`.
- The user will perform all DB actions themselves.
- Do not implement any backwards compatibility safeguards. NEVER export old names as wrappers or attempt to use aliases
- If ever code is being deprecated but not deleted it must be marked with `DEPR: <reason>` where `reason` can be in the vein of 'Superseeded by newFunc()'
- `sst-env.d.ts` files are quto-generated, never give them any thought
- Commit messages must use Conventional Commits. Scope is optional; when used, it must be lowercase `package/domain`, for example `feat(core/job): add job helper function` or `docs: update guide`.
- Before changing DynamoDB, ElectroDB, `ConsoleData`, persistence models, or data migrations, read `docs/architecture/dynamodb.md`.
- All code should be human readable - with comments where relevant.

## Tooling

- Use Bun from the repo root; `bun.lock` is the source of truth. Do not add pnpm/yarn/npm workspace files.
- Repo-wide verification is `bun run check` from the root. It runs `oxfmt --check`, `oxlint`, then the web app typecheck.
- Before creating a PR, inspect CI workflows and run their formatting, linting, typechecking, and test commands locally. Fix failures first; if a check cannot run, report the blocker and ask before creating the PR.
- Formatting is Oxlint/Oxfmt only: `bun run format` fixes formatting, `bun run lint` runs `oxlint --fix`.
- Formatter settings are intentionally tabs with width 4; keep `.editorconfig` and `oxfmt.config.ts` aligned.
- Root `oxlint.config.ts` ignores `sst.config.ts` because fresh checkouts may not have generated `.sst/platform/config.d.ts` yet.

## Workspaces

- Workspaces are `packages/*`.
- `packages/web` is the Quasar/Vue foundation app. Run focused commands with `bun run --cwd packages/web <script>`.

## Web App

- Main web app routes live in `packages/web/src/router/routes.ts`; current baseline is home, second page, and 404.
- Quasar generated files live under `packages/web/.quasar/` and are ignored by formatter/linter.
- Keep `packages/web/postcss.config.js` unless Quasar/PostCSS support for TS config is verified.

## Infra

- SST commands are root scripts: `bun run dev`, `bun run deploy`, `bun run remove:local`, `bun run remove:prod`.
- AWS SSO helper is `bun run auth` for profile `sandbox`.
- `sst.config.ts` currently loads files from `./infra`, but `infra/` may be empty in a fresh baseline.

## Skills

Load the relevant skill before work in these areas:

- `github-issue`: creating, filing, checking-out, or refining GitHub issues.
- `sst-infra`: AWS resources, SST bindings, IAM, queues, schedules, or deployment configuration.
- `frontend` and `quasar`: every change in `packages/web`.
