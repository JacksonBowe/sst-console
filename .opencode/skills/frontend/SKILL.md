---
name: frontend
description: Apply SST Console frontend conventions for Vue, Quasar, Vue Query, Pinia, routes, components, and tests in packages/web.
---

# SST Console frontend

Use this skill for every change in `packages/web`. Load `quasar` too for Quasar API or configuration work.

## Workflow

1. Inspect closest completed sibling feature before editing. Existing project code is primary convention source.
2. Reuse its patterns and smallest fitting surface. Ask user before adding a dependency, global state, architectural pattern, or abstraction without a local precedent.
3. Keep new conventions out of this skill during normal feature work. User explicitly requests skill changes.

## Map

- `src/pages/`: route-level composition.
- `src/components/<Feature>/`: feature UI and behavior.
- `src/components/ui/`: shared UI primitives.
- `src/composables/`: server-state hooks and local reusable behavior.
- `src/stores/`: durable shared, session, and external-connection state.
- `src/router/routes.ts`: route definitions.
- `tests/`: web test files and fixtures.

## Server state

`src/composables/` owns all backend access through `@tanstack/vue-query`:

- Reads use `useQuery` with feature-owned query keys.
- Writes use `useMutation`; mutation success invalidates affected query keys.
- Put cache and shared data side effects in mutation lifecycle callbacks; use caller callbacks or `mutateAsync` for component-specific UI side effects.
- Components and pages consume composable hooks, including `mutateAsync` for UI-owned workflows.
- `api` imports belong in composables. Boot/auth client setup is the only exception.

Canonical references: `src/composables/apps.ts`, `src/composables/accounts.ts`, and `src/components/Accounts/SyncAllAccountsDialog.vue`.

## State

- Vue Query owns server state.
- `ref`, `reactive`, and `computed` own component interaction and form state.
- Pinia owns durable state shared across components, sessions, or external connections.

Canonical reference: `src/stores/local-session.ts`.

## UI and forms

1. Reuse fitting feature components and `src/components/ui/` primitives first.
2. Use Quasar components and utility classes when no project primitive fits.
3. Add custom CSS only for behavior or layout not supplied by existing primitives or Quasar utilities.
4. Add a `src/components/ui/` primitive only when reuse is clear in current task or user requests it. Keep one-off UI in feature directory.
5. Build forms with existing input/select, form, and dialog primitives where applicable. Bind submit behavior to composable mutations and keep form interaction state local.

Canonical references: `src/components/ui/Input/SInput.vue`, `src/components/ui/form/useForm.ts`, and `src/components/Accounts/ConnectAccountDialog.vue`.

## References

- Route/page composition: `src/pages/AccountsPage.vue`.
- Feature public surface: `src/components/Accounts/index.ts`.
- Component tests: `tests/pages/StageFunctionPage.spec.ts`.

When these references do not resolve a decision, ask user rather than introducing a new convention.
