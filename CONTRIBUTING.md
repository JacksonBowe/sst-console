# Contributing

## Commits and pull requests

Commits on feature branches may use any message format. WIP commits may contain incomplete or broken code.

Pull request titles must follow [Conventional Commits](https://www.conventionalcommits.org/). Valid types are `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, and `test`. Scopes are optional and lowercase when used.

```text
feat(web): add account settings
fix(auth): reject expired sessions
docs: explain release process
```

Pull requests merge into `main` with squash merge. The pull request title becomes the commit message on `main`.

## Releases

`main` is release-ready, but self-hosters deploy immutable GitHub Release tags rather than `main`. Maintainers decide when a reviewed `main` commit is ready to release; releases are not created for every merge.

Before a stable release, deploy the candidate to an isolated maintainer AWS account when its changes affect infrastructure, authentication, or persisted data.

Create an annotated tag from the reviewed `main` commit, then push it:

```bash
git switch main
git pull --ff-only
bun run check
bun run test
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

The release workflow verifies that tag is annotated, uses a supported version format, points to a commit reachable from `main`, and passes repository checks before it publishes a GitHub Release.

Use Conventional Commit titles to prepare release notes and choose the version:

- `feat:` indicates a minor release.
- `fix:` and `perf:` indicate a patch release.
- `build:`, `chore:`, `ci:`, `docs:`, `refactor:`, `style:`, and `test:` do not require a release by themselves.
- `!` marks a breaking change. Before `v1.0.0`, document its effect in release notes and select the next appropriate minor version.

Release candidate tags use `vX.Y.Z-rc.N`. Test them in the isolated account; stable installs should use only tags without an `-rc` suffix.
