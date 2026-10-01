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
