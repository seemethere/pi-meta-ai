/**
 * Pi Extension: Meta Model API
 * Supports Muse Spark 1.1, 1.2 and 1.2-contributor tier
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PROVIDER_ID = "meta-ai";
const DISPLAY_NAME = "Meta Model API";
const BASE_URL = "https://api.meta.ai/v1";
const MODEL_ID_11 = "muse-spark-1.1";
const MODEL_ID_12 = "muse-spark-1.2";
const MODEL_ID_12_CONTRIB = "muse-spark-1.2-contributor";
const ENV_VAR = "MODEL_API_KEY";
const META_ENV_VAR = "META_API_KEY";

function maskKey(key: string): string {
  if (!key) return "(none)";
  if (key.length <= 12) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
function getEnvKey(): string | undefined {
  return process.env[ENV_VAR] || process.env[META_ENV_VAR];
}
function getStoredCredential(ctx: any): { type?: string; key?: string } | undefined {
  try { return ctx.modelRegistry.authStorage?.get?.(PROVIDER_ID); } catch { return undefined; }
}

const standardCost = { input: 1.25, output: 4.25, cacheRead: 0.15, cacheWrite: 0 };
const contributorCost = { input: 0.10, output: 0.20, cacheRead: 0.002, cacheWrite: 0 };

const baseModel = {
  reasoning: true,
  input: ["text", "image"] as ("text" | "image")[],
  contextWindow: 1_048_576,
  maxTokens: 64_000,
  thinkingLevelMap: {
    minimal: "minimal",
    low: "low",
    medium: "medium",
    high: "high",
    xhigh: "high",
  },
  compat: {
    supportsReasoningEffort: true,
    supportsDeveloperRole: true,
    supportsUsageInStreaming: true,
  },
};

export default function (pi: ExtensionAPI) {
  if (!process.env[ENV_VAR] && process.env[META_ENV_VAR]) {
    process.env[ENV_VAR] = process.env[META_ENV_VAR];
  }

  pi.registerProvider(PROVIDER_ID, {
    name: DISPLAY_NAME,
    baseUrl: BASE_URL,
    apiKey: `$${ENV_VAR}`,
    api: "openai-responses",
    models: [
      { id: MODEL_ID_11, name: "Muse Spark 1.1 (standard)", cost: standardCost, ...baseModel },
      { id: MODEL_ID_12, name: "Muse Spark 1.2 (standard)", cost: standardCost, ...baseModel },
      { id: MODEL_ID_12_CONTRIB, name: "Muse Spark 1.2 Contributor", cost: contributorCost, ...baseModel },
    ],
  });

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setStatus("meta-ai", undefined);
    const model = ctx.modelRegistry.find(PROVIDER_ID, MODEL_ID_11)
      || ctx.modelRegistry.find(PROVIDER_ID, MODEL_ID_12)
      || ctx.modelRegistry.find(PROVIDER_ID, MODEL_ID_12_CONTRIB);
    if (!model) {
      ctx.ui.notify(`Meta provider not registered correctly. Try /reload or reinstall extension.`, "error");
      return;
    }
    const stored = getStoredCredential(ctx);
    const hasEnv = !!getEnvKey();
    const isLegacy = stored && stored.type !== "api_key";
    const hasValidStored = stored?.type === "api_key" && !!stored.key;
    const isAuthenticated = hasEnv || hasValidStored;
    if (isLegacy && !hasEnv) {
      ctx.ui.notify(`Meta Model API has legacy ${stored.type} credential. Run /logout ${PROVIDER_ID} then /login → API key → '${DISPLAY_NAME}' to migrate.`, "warning");
      return;
    }
    if (!isAuthenticated) {
      ctx.ui.notify(`Meta Model API not authenticated. Run /login → API key → '${DISPLAY_NAME}' or export ${ENV_VAR}=LLM|... Then /model → ${PROVIDER_ID}/${MODEL_ID_12_CONTRIB}`, "warning");
    }
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    ctx.ui.setStatus("meta-ai", undefined);
  });

  pi.registerCommand("meta", {
    description: "Meta Model API status and help",
    handler: async (args, ctx) => {
      const sub = (args || "").trim().split(/\s+/)[0] || "status";
      if (sub === "status") {
        const envKey = getEnvKey();
        const m11 = ctx.modelRegistry.find(PROVIDER_ID, MODEL_ID_11);
        const m12 = ctx.modelRegistry.find(PROVIDER_ID, MODEL_ID_12);
        const m12c = ctx.modelRegistry.find(PROVIDER_ID, MODEL_ID_12_CONTRIB);
        const authStatus = ctx.modelRegistry.getProviderAuthStatus(PROVIDER_ID);
        const stored = getStoredCredential(ctx);
        const isActive = ctx.model?.provider === PROVIDER_ID;
        const hasValidStored = stored?.type === "api_key" && !!stored.key;
        const hasAuth = !!envKey || hasValidStored;
        const storedInfo = stored
          ? stored.type === "api_key"
            ? `api_key ${maskKey(stored.key || "")} (source: ${authStatus.source || "stored"})`
            : `${stored.type} — legacy/invalid, run /logout ${PROVIDER_ID} then re-login`
          : "(not in auth.json)";

        const lines = [
          `${DISPLAY_NAME} — Status`,
          `────────────────────────────────────────`,
          `Provider: ${PROVIDER_ID} (${DISPLAY_NAME})`,
          `Base URL: ${BASE_URL}`,
          `Models:`,
          `  - ${MODEL_ID_11} ${m11 ? "✓ registered" : ""} (standard)`,
          `  - ${MODEL_ID_12} ${m12 ? "✓ registered" : ""} (standard)`,
          `  - ${MODEL_ID_12_CONTRIB} ${m12c ? "✓ registered" : ""} (contributor tier)`,
          `  Context: 1M, Text+Image, Tools, Reasoning, API: openai-responses`,
          ``,
          `Auth:`,
          `  Env ${ENV_VAR}: ${envKey ? maskKey(envKey) : "(not set)"} ${process.env[META_ENV_VAR] ? `(fallback ${META_ENV_VAR})` : ""}`,
          `  auth.json: ${storedInfo}`,
          `  Resolved: ${hasAuth ? "yes ✓ ready" : "no — run /login or set env var"}`,
          ``,
          `State:`,
          `  Active: ${isActive ? `${ctx.model?.id} ✓` : `no — /model → ${PROVIDER_ID}/${MODEL_ID_12_CONTRIB}`}`,
          ``,
          `Next steps:`,
          `  1. /login → API key → "${DISPLAY_NAME}" → paste LLM|...`,
          `  2. /model → ${PROVIDER_ID}/${MODEL_ID_12_CONTRIB} (or ${MODEL_ID_12})`,
          `  3. Ask anything — pi tools work out of the box`,
        ];
        ctx.ui.notify(lines.join("\n"), hasAuth ? "info" : "warning");
        return;
      }
      if (sub === "help") {
        ctx.ui.notify([
          `${DISPLAY_NAME} — Pi Extension`,
          ``,
          `Commands:`,
          `  /meta status — masked key, auth source, registered models`,
          `  /meta help   — this help`,
          `  /login       — add key via API key → Meta Model API`,
          `  /model       — select:`,
          `    - ${MODEL_ID_11} (standard)`,
          `    - ${MODEL_ID_12} (standard)`,
          `    - ${MODEL_ID_12_CONTRIB} (contributor — cheaper, needs contributor program)`,
          ``,
          `Setup:`,
          `  1. Get key: https://dev.meta.ai → API keys → Create (LLM|...)`,
          `  2. export MODEL_API_KEY=LLM|... or /login`,
          `  3. /model → meta-ai/${MODEL_ID_12_CONTRIB}`,
          ``,
          `Docs: https://dev.meta.ai/docs — overview shows standard vs contributor tiers`,
        ].join("\n"), "info");
        return;
      }
      ctx.ui.notify(`Unknown "${sub}". Try /meta status or /meta help`, "warning");
    },
  });
}
