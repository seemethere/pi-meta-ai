# Changelog

All notable changes to this project will be documented in this file.

## 0.1.2 - 2026-08-23

### Added
- Muse Spark 1.2 (standard) and 1.2-contributor models — all at https://api.meta.ai/v1, 1M context, openai-responses, same thinkingLevelMap
- `baseModel` + `standardCost`/`contributorCost` pattern to share config across 1.1, 1.2, 1.2-contributor (keeps 1.1 backward compat)
- `/meta status` and `/meta help` now list all 3 models with registration checks
- `models.json.example` includes all 3 models
- Real pricing: Standard $1.25/$0.15/$4.25, Contributor $0.10/$0.002/$0.20 per 1M (was $0 free-preview placeholder) — from Meta via https://www.layer3labs.io/guides/muse-spark-1-2-pricing and https://dev.meta.ai/docs/pricing-rate-limits/

## 0.1.1 - 2026-07-09

### Fixed
- Auth check now correctly rejects legacy `oauth` credentials unless env var present, prevents false `✓ ready` status (codex blocker fix)
- README env-var quickstart clarifies `pi -e ./extensions/meta-model-api` must stay loaded for source installs
- `getProviderAuthStatus` + `hasValidStored` used instead of `find()` for auth detection

### Added
- `LICENSE` file (MIT)
- `CONTRIBUTING.md`, `SECURITY.md`, `.env.example`, `tsconfig.json`
- `package.json` metadata: `author`, `homepage`, `bugs`, `engines`, `files`, `typecheck` script
- `.gitignore` expanded (env files, tsbuildinfo, coverage logs)

### Changed
- README rewritten for exec-ready first-time UX: prerequisites, install, quickstart, troubleshooting, security, cost note
- `models.json.example` now includes `compat` flags to match extension

## 0.1.0 - 2026-07-09

- Initial release: Pi extension for Meta Model API Muse Spark 1.1
- Provider `meta-ai` with `openai-responses` API, 1M context, tool calling, reasoning, image input
- Commands `/meta status`, `/meta help`, API key login via `/login`
- Env var support `MODEL_API_KEY` and `META_API_KEY` fallback
