# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- This repo is a GitHub fork of `seemethere/pi-meta-ai`, so `gh pr create` defaults to the parent and fails with "No commits between main and <branch>". Always pass `--repo RooseveltAdvisors/pi-meta-ai`.
- Build/test: npm only (`package-lock.json`); `npm ci && npm test` (see `scripts` in `package.json`). CI is `.github/workflows/ci.yml`.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
