# pi-meta-ai

Pi extension for [Meta Model API](https://dev.meta.ai) — adds **Muse Spark 1.1, 1.2 and 1.2-contributor** to [pi coding agent](https://github.com/badlogic/pi-mono) via API key.

Meta Model API is OpenAI-compatible with Responses API at `https://api.meta.ai/v1`. This extension registers provider `meta-ai` using `openai-responses` for full agentic support: tool calling, parallel tools, streaming, reasoning effort, structured output, image input, prompt caching, 1M context.

## Prerequisites

- Node.js >=18
- Pi coding agent installed:

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
# or with pnpm / yarn / bun
```

Verify: `pi --version` should be >=0.80

## Install

**From source (dev):**

```bash
git clone https://github.com/seemethere/pi-meta-ai
cd pi-meta-ai
pi -e ./extensions/meta-model-api
```

**As pi package (once published):**

```bash
pi install git:github.com/seemethere/pi-meta-ai
# or
pi install npm:pi-meta-ai
```

## Quick start

1. **Get API key:** https://dev.meta.ai → API keys → Create. Key format `LLM|...`

2. **Authenticate (pick one):**

   **Option A — Inside pi (recommended):**
   ```
   /login → API key → Meta Model API → paste LLM|... key
   ```

   **Option B — Env var (before launching pi):**
   ```bash
   export MODEL_API_KEY="LLM|..."
   # Also supports META_API_KEY as fallback
   
   # If installed as pi package:
   pi
   
   # If running from source checkout:
   MODEL_API_KEY="LLM|..." pi -e ./extensions/meta-model-api
   ```

   > Env vars must be set before launching pi. If you set them after pi is running, run `/reload` or restart pi from the shell where var is exported.

3. **Select model:**
   ```
   /model → meta-ai/muse-spark-1.2-contributor
   # also available:
   # meta-ai/muse-spark-1.2 (standard)
   # meta-ai/muse-spark-1.1 (standard, backward compat)
   ```

4. **Verify:**
   ```
   /meta status
   ```

5. Chat normally. Pi tools (read, bash, edit, write) work out of the box.

## Commands

- `/meta status` — show provider, masked key status, auth source, registered models (1.1, 1.2, 1.2-contributor)
- `/meta help` — usage help (lists all 3 models)
- `/login` — manage API keys
- `/model` — switch models

## Models

| Model ID | Tier | Pricing (per 1M tokens) | Notes |
|----------|------|-------------------------|-------|
| `muse-spark-1.1` | standard | $1.25 in / $4.25 out / $0.15 cached in | Backward compat, 1M context |
| `muse-spark-1.2` | standard | $1.25 in / $4.25 out / $0.15 cached in | Latest standard, 1M context |
| `muse-spark-1.2-contributor` | contributor | $0.10 in / $0.20 out / $0.002 cached in | ~12× cheaper, requires contributor program (Meta may use data to improve products) |

All models use `openai-responses` at `https://api.meta.ai/v1`, share the same `thinkingLevelMap` and 1M context. Pricing from [Meta launch email via Layer3Labs](https://www.layer3labs.io/guides/muse-spark-1-2-pricing) and [dev.meta.ai pricing](https://dev.meta.ai/docs/pricing-rate-limits/) — Standard $1.25/$0.15/$4.25, Contributor $0.10/$0.002/$0.20.

## Features

- **API:** `openai-responses` (primary), chat completions compatible via Meta
- **Tool calling:** parallel tools
- **Reasoning:** via pi thinking levels `minimal`, `low`, `medium`, `high`, `xhigh` → mapped to Meta `minimal`/`low`/`medium`/`high` (`xhigh` clamps to `high`, `off` uses default)
- **Structured output:** JSON schema
- **Input:** text, image (PNG, JPEG, WebP, GIF)
- **Caching:** prompt caching automatic
- **Context:** 1M tokens, 64K max output

> **Cost note:** `cost` reflects published Meta pricing (see Models table). Standard $1.25/$4.25/$0.15, Contributor $0.10/$0.20/$0.002 per 1M tokens. Pi's cost UI will now show estimated spend.

## Config reference (without extension)

If you prefer static config, create `~/.pi/agent/models.json` — see [`models.json.example`](./models.json.example):

```json
{
  "providers": {
    "meta-ai": {
      "baseUrl": "https://api.meta.ai/v1",
      "apiKey": "$MODEL_API_KEY",
      "api": "openai-responses",
      "models": [
        {
          "id": "muse-spark-1.1",
          "name": "Muse Spark 1.1 (standard)",
          "reasoning": true,
          "input": ["text", "image"],
          "contextWindow": 1048576,
          "maxTokens": 64000,
          "cost": { "input": 1.25, "output": 4.25, "cacheRead": 0.15, "cacheWrite": 0 },
          "thinkingLevelMap": {
            "minimal": "minimal",
            "low": "low",
            "medium": "medium",
            "high": "high",
            "xhigh": "high"
          },
          "compat": {
            "supportsReasoningEffort": true,
            "supportsDeveloperRole": true,
            "supportsUsageInStreaming": true
          }
        },
        {
          "id": "muse-spark-1.2",
          "name": "Muse Spark 1.2 (standard)",
          "reasoning": true,
          "input": ["text", "image"],
          "contextWindow": 1048576,
          "maxTokens": 64000,
          "cost": { "input": 1.25, "output": 4.25, "cacheRead": 0.15, "cacheWrite": 0 },
          "thinkingLevelMap": {
            "minimal": "minimal",
            "low": "low",
            "medium": "medium",
            "high": "high",
            "xhigh": "high"
          },
          "compat": {
            "supportsReasoningEffort": true,
            "supportsDeveloperRole": true,
            "supportsUsageInStreaming": true
          }
        },
        {
          "id": "muse-spark-1.2-contributor",
          "name": "Muse Spark 1.2 Contributor",
          "reasoning": true,
          "input": ["text", "image"],
          "contextWindow": 1048576,
          "maxTokens": 64000,
          "cost": { "input": 0.1, "output": 0.2, "cacheRead": 0.002, "cacheWrite": 0 },
          "thinkingLevelMap": {
            "minimal": "minimal",
            "low": "low",
            "medium": "medium",
            "high": "high",
            "xhigh": "high"
          },
          "compat": {
            "supportsReasoningEffort": true,
            "supportsDeveloperRole": true,
            "supportsUsageInStreaming": true
          }
        }
      ]
    }
  }
}
```

Extension install is recommended for better login UX and future updates.

## Troubleshooting

**Model not visible in `/model`:**
- Ensure extension is loaded: `pi -e ./extensions/meta-model-api` or `pi install ...`
- Run `/reload` then `/model`
- Check `/meta status` shows "✓ registered" for all 3 models

**`Meta Model API not authenticated`:**
- Run `/login → API key → Meta Model API` and paste `LLM|...` key
- Or `export MODEL_API_KEY=LLM|...` **before** launching pi, then `/reload`
- Verify with `/meta status` — should show `Resolved: yes ✓ ready`

**Invalid key error:**
- Key must start with `LLM|` from https://dev.meta.ai
- Re-create key at dev.meta.ai → API keys → Create
- Try `/logout meta-ai` then `/login` again

**Env var not picked up:**
- Export before launch: `export MODEL_API_KEY=... && pi`
- Inside running pi, `/reload` after export won't pick up new env if parent shell didn't have it — restart pi from shell where var is exported

## Security

- Never commit real API keys, `.env`, or `~/.pi/agent/auth.json`
- Use `/login` (stored in OS-protected `auth.json`) or env vars for keys
- Keys are displayed masked (e.g., `LLM|...abcd`) in `/meta status`
- See [SECURITY.md](./SECURITY.md)

## Development

```bash
npm install
npm run typecheck
pi -e ./extensions/meta-model-api/index.ts
# inside pi:
# /meta status
# /model → meta-ai/muse-spark-1.2-contributor
```

Structure:

```
pi-meta-ai/
  extensions/
    meta-model-api/
      index.ts      extension entry
  models.json.example
  package.json
  README.md
  LICENSE
```

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT — see [LICENSE](./LICENSE)
