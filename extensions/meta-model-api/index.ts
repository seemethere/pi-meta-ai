/**
 * Pi Extension: Meta Model API
 *
 * Provides Meta's Muse Spark models via api.meta.ai using API key authentication.
 * OpenAI Responses-compatible with tool calling, reasoning, structured output,
 * image input, and prompt caching. Now fetches model list dynamically.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PROVIDER_ID = "meta-ai";
const DISPLAY_NAME = "Meta Model API";
const BASE_URL = "https://api.meta.ai/v1";
const META_MODEL_CATALOG_URL = "https://api.meta.ai/v1/models";
const ENV_VAR = "MODEL_API_KEY";
const META_ENV_VAR = "META_API_KEY";

type MetaProviderModel = NonNullable<Parameters<ExtensionAPI["registerProvider"]>[1]["models"]>[number];

const PAID_COST = { input: 1.25, output: 4.25, cacheRead: 0.15, cacheWrite: 0 };
const CONTRIBUTOR_COST = { input: 0.1, output: 0.2, cacheRead: 0.002, cacheWrite: 0 };
const SPARK_THINKING = { off: null, minimal: "minimal", low: "low", medium: "medium", high: "high", xhigh: "xhigh", max: null } as any;
// SAFETY: pi-ai Model.input is text|image only; video/audio are advertised for later pi-ai.
const SPARK_INPUT = ["text", "image", "video", "audio"] as unknown as MetaProviderModel["input"];
const SPARK_COMPAT = { supportsReasoningEffort: true, supportsToolSearch: true } as any;

function sparkModel(
  id: string,
  name: string,
  cost: MetaProviderModel["cost"],
  thinkingLevelMap = SPARK_THINKING,
): MetaProviderModel {
  return {
    id,
    name,
    reasoning: true,
    input: SPARK_INPUT,
    cost,
    contextWindow: 1_048_576,
    maxTokens: 256_000,
    thinkingLevelMap,
    compat: SPARK_COMPAT,
  };
}

// Meta Model API ids only (not OpenCode Zen `*-contributor-free`).
const FALLBACK_MODELS: MetaProviderModel[] = [
  sparkModel("muse-spark-1.3", "Muse Spark 1.3", PAID_COST, { ...SPARK_THINKING, max: "max" }),
  sparkModel("muse-spark-1.3-contributor", "Muse Spark 1.3 Contributor", CONTRIBUTOR_COST),
  sparkModel("muse-spark-1.2", "Muse Spark 1.2", PAID_COST),
  sparkModel("muse-spark-1.2-contributor", "Muse Spark 1.2 Contributor", CONTRIBUTOR_COST),
  sparkModel("muse-spark-1.1", "Muse Spark 1.1", PAID_COST),
];
const DEFAULT_MODEL = FALLBACK_MODELS[0].id;

function maskKey(key: string): string {
  if (!key) return "(none)";
  if (key.length <= 12) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function getEnvKey(): string | undefined {
  return process.env[ENV_VAR] || process.env[META_ENV_VAR];
}

function getStoredCredential(ctx: any): { type?: string; key?: string } | undefined {
  try {
    return ctx.modelRegistry.authStorage?.get?.(PROVIDER_ID);
  } catch {
    return undefined;
  }
}

// --- dynamic model catalog helpers (mirrors pi-meta-oauth) ---
function finitePositive(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}
function numericCost(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
function displayName(id: string): string {
  return id.split("-").map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p)).join(" ");
}
function modalitiesToInput(modalities: string[] | undefined, fallback: MetaProviderModel["input"] | undefined): MetaProviderModel["input"] {
  if (!modalities) return fallback ?? (["text"] as unknown as MetaProviderModel["input"]);
  const input: string[] = ["text"];
  if (modalities.includes("image")) input.push("image");
  if (modalities.includes("video")) input.push("video");
  if (modalities.includes("audio")) input.push("audio");
  if (modalities.includes("document") || modalities.includes("pdf")) {
    if (!input.includes("image")) input.push("image");
  }
  return input as unknown as MetaProviderModel["input"];
}
function errorDetail(body: Record<string, unknown>): string | undefined {
  for (const key of ["error_description", "detail", "message", "error"]) {
    const v = body[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}
async function responseBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    const v = JSON.parse(text) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
function toProviderModels(catalog: { data?: any[] }): MetaProviderModel[] {
  return (catalog.data ?? []).flatMap((entry: any) => {
    if (typeof entry.id !== "string" || !entry.id) return [];
    const metadata = entry.metadata?.["muse-code"];
    if (metadata?.is_hidden) return [];
    const fallback = FALLBACK_MODELS.find((m) => m.id === entry.id);
    const catalogName = metadata?.name === entry.id ? undefined : metadata?.name;
    const variants = metadata?.variants ?? {};
    const thinkingLevelMap: any = {
      off: null,
      minimal: variants.minimal?.reasoningEffort ?? "minimal",
      low: variants.low?.reasoningEffort ?? "low",
      medium: variants.medium?.reasoningEffort ?? "medium",
      high: variants.high?.reasoningEffort ?? "high",
      xhigh: variants.xhigh?.reasoningEffort ?? "xhigh",
      max: null,
    };
    return [
      {
        id: entry.id,
        name: catalogName || fallback?.name || displayName(entry.id),
        reasoning: metadata?.reasoning ?? fallback?.reasoning ?? true,
        thinkingLevelMap,
        input: modalitiesToInput(metadata?.modalities?.input, fallback?.input),
        cost: {
          input: numericCost(metadata?.cost?.input, (fallback as any)?.cost.input ?? 0),
          output: numericCost(metadata?.cost?.output, (fallback as any)?.cost.output ?? 0),
          cacheRead: numericCost(metadata?.cost?.cached, (fallback as any)?.cost.cacheRead ?? 0),
          cacheWrite: 0,
        },
        contextWindow: finitePositive(metadata?.limit?.context, (fallback as any)?.contextWindow ?? 1_048_576),
        maxTokens: finitePositive(metadata?.limit?.output, (fallback as any)?.maxTokens ?? 256_000),
        compat: { supportsReasoningEffort: true, supportsToolSearch: true },
      } as MetaProviderModel,
    ];
  });
}
async function refreshMetaAIModels(context: any, fetchImpl: typeof fetch = fetch): Promise<MetaProviderModel[]> {
  if (!context.allowNetwork || context.signal?.aborted) return [...FALLBACK_MODELS];
  const apiKey =
    context.credential?.type === "oauth"
      ? context.credential.access
      : context.credential?.type === "api_key"
        ? context.credential.key
        : undefined;
  // also try ambient env if no stored credential (pi will resolve env via auth, but refresh context may not have it)
  if (!apiKey) return [...FALLBACK_MODELS];
  try {
    const response = await fetchImpl(META_MODEL_CATALOG_URL, {
      headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}`, "x-api-version": "1.0.0" },
      signal: context.signal,
    });
    const body = (await responseBody(response as any)) as any;
    if (!response.ok) {
      // don't throw hard — fall back to hardcoded list, but log
      console.warn(`Meta model catalog failed (HTTP ${(response as any).status})${errorDetail(body) ? `: ${errorDetail(body)}` : ""} — using fallback`);
      return [...FALLBACK_MODELS];
    }
    const models = toProviderModels(body);
    return models.length ? models : [...FALLBACK_MODELS];
  } catch (e) {
    console.warn(`Meta model catalog fetch failed: ${e} — using fallback`);
    return [...FALLBACK_MODELS];
  }
}

export default function (pi: ExtensionAPI) {
  // Allow META_API_KEY as fallback — shim to MODEL_API_KEY so pi's $MODEL_API_KEY interpolation works.
  if (!process.env[ENV_VAR] && process.env[META_ENV_VAR]) {
    process.env[ENV_VAR] = process.env[META_ENV_VAR];
  }
  // Also shim opposite direction for pi-meta-oauth compat
  if (!process.env[META_ENV_VAR] && process.env[ENV_VAR]) {
    process.env[META_ENV_VAR] = process.env[ENV_VAR];
  }

  pi.registerProvider(PROVIDER_ID, {
    name: DISPLAY_NAME,
    baseUrl: BASE_URL,
    // Pi will resolve key from: 1) auth.json (api_key), 2) $MODEL_API_KEY env var.
    apiKey: `$${ENV_VAR}`,
    api: "openai-responses",
    models: [...FALLBACK_MODELS],
    refreshModels: refreshMetaAIModels as any,
  });

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setStatus("meta-ai", undefined);

    const model = ctx.modelRegistry.find(PROVIDER_ID, DEFAULT_MODEL) || ctx.modelRegistry.find(PROVIDER_ID, FALLBACK_MODELS[0].id);
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
      ctx.ui.notify(
        `Meta Model API has legacy ${stored.type} credential. Run /logout ${PROVIDER_ID} then /login → API key → '${DISPLAY_NAME}' to migrate.`,
        "warning"
      );
      return;
    }

    if (!isAuthenticated) {
      ctx.ui.notify(
        `Meta Model API not authenticated. Run /login → API key → '${DISPLAY_NAME}' to add your key, or export ${ENV_VAR}=LLM|... before launching pi. Then /model → ${PROVIDER_ID}/${DEFAULT_MODEL}`,
        "warning"
      );
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
        const model = ctx.modelRegistry.find(PROVIDER_ID, DEFAULT_MODEL) || ctx.modelRegistry.find(PROVIDER_ID, FALLBACK_MODELS[0].id);
        const authStatus = ctx.modelRegistry.getProviderAuthStatus(PROVIDER_ID);
        const stored = getStoredCredential(ctx);
        const isActive = ctx.model?.provider === PROVIDER_ID;
        const isLegacy = stored && stored.type !== "api_key";
        const hasValidStored = stored?.type === "api_key" && !!stored.key;
        const hasAuth = !!envKey || hasValidStored;

        const storedInfo = stored
          ? stored.type === "api_key"
            ? `api_key ${maskKey(stored.key || "")} (source: ${authStatus.source || "stored"})`
            : `${stored.type} — legacy/invalid credential, run /logout ${PROVIDER_ID} then re-login via API key`
          : "(not in auth.json)";

        const lines = [
          `${DISPLAY_NAME} — Status`,
          `────────────────────────────────────────`,
          `Provider: ${PROVIDER_ID} (${DISPLAY_NAME})`,
          `Base URL: ${BASE_URL}`,
          `Models: ${FALLBACK_MODELS.map(m => m.id).join(", ")} (dynamic fetch from ${META_MODEL_CATALOG_URL})`,
          `  Context: 1M tokens, Text+Image+Video+Audio, Tools, Reasoning`,
          `  API: openai-responses`,
          ``,
          `Auth:`,
          `  Env ${ENV_VAR}: ${envKey ? maskKey(envKey) : "(not set)"} ${process.env[META_ENV_VAR] ? `(fallback ${META_ENV_VAR} detected)` : ""}`,
          `  auth.json: ${storedInfo}`,
          `  Resolved: ${hasAuth ? "yes ✓ ready" : "no — run /login or set env var"}`,
          ``,
          `State:`,
          `  Model registered: ${model ? "yes" : "no"}`,
          `  Active model: ${isActive ? `yes ✓ (${ctx.model?.id})` : `no — use /model to select ${PROVIDER_ID}/${DEFAULT_MODEL}`}`,
          ``,
          `Next steps:`,
          `  1. /login → API key → "${DISPLAY_NAME}" → paste LLM|... key`,
          `  2. /model → ${PROVIDER_ID}/${DEFAULT_MODEL}`,
          `  3. Ask anything — pi tools (read, bash, edit, write) work out of the box`,
          ``,
          `Env alternative: export ${ENV_VAR}=LLM|... then /reload (also supports ${META_ENV_VAR})`,
        ];

        ctx.ui.notify(lines.join("\n"), hasAuth ? "info" : "warning");
        return;
      }

      if (sub === "help") {
        ctx.ui.notify(
          [
            `${DISPLAY_NAME} — Pi Extension`,
            ``,
            `Commands:`,
            `  /meta status — show key status (masked), auth source, active model`,
            `  /meta help   — this help`,
            `  /login       — add your key via API key → Meta Model API`,
            `  /model       — select ${PROVIDER_ID}/${DEFAULT_MODEL}`,
            ``,
            `Setup:`,
            `  1. Get key: https://dev.meta.ai → API keys → Create (LLM|...)`,
            `  2. Export or login:`,
            `     export MODEL_API_KEY=LLM|...   (before launching pi)`,
            `     or inside pi: /login → API key → Meta Model API`,
            `  3. /model → ${PROVIDER_ID}/${DEFAULT_MODEL}`,
            ``,
            `Docs: https://dev.meta.ai/docs`,
          ].join("\n"),
          "info"
        );
        return;
      }

      ctx.ui.notify(`Unknown subcommand "${sub}". Try /meta status or /meta help`, "warning");
    },
  });
}
