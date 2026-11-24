import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireDm, requireUser, findCampaignByAnyId } from "./lib/tenancy";

/**
 * IA (Google Gemini) via Convex Actions.
 *
 * Toda chamada exige sessão válida e que o usuário seja Mestre da campanha informada
 * (validado por uma internalMutation, já que actions não acessam ctx.db), e é
 * limitada a AI_CALLS_PER_HOUR chamadas por usuário.
 */

const AI_CALLS_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;
const MAX_PROMPT_CHARS = 20_000;
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
  "gemini-2.0-flash",
];

// Status em que tentar outro modelo não resolve: interrompe imediatamente.
const NON_RETRYABLE = new Set([400, 401, 403, 429]);

type FailReason =
  | "no_api_key"
  | "rate_limited"
  | "file_not_found"
  | "file_too_large"
  | "network_or_parse_error"
  | `http_${number}`;

type AiFailure = {
  ok: false;
  reason: FailReason;
  message: string;
  parsed?: undefined;
  modelUsed?: undefined;
};

type AiSuccess<Extra = {}> = {
  ok: true;
  parsed: Record<string, unknown>;
  modelUsed: string;
  reason?: undefined;
  message?: undefined;
} & Extra;

function failure(reason: FailReason, message: string): AiFailure {
  return { ok: false, reason, message };
}

function messageForStatus(status: number): string {
  if (status === 400) return "A API Gemini recusou a requisição (dados inválidos ou modelo incompatível).";
  if (status === 401 || status === 403) return "Chave da API Gemini inválida ou sem permissão.";
  if (status === 429) return "Limite de uso da API Gemini atingido. Tente novamente mais tarde.";
  if (status === 422) return "A IA não retornou uma resposta no formato esperado.";
  return `Falha ao comunicar com a API Gemini (HTTP ${status}).`;
}

// ============================================================================
// Autorização e limite de uso
// ============================================================================

/**
 * Valida a sessão e (quando exigido) o papel de Mestre na campanha, e consome uma
 * unidade da cota horária do usuário.
 */
export const authorizeAiCall = internalMutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.optional(v.string()),
    requireDmRole: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ allowed: boolean; isDm: boolean; userId: string }> => {
    let userId: string;
    let isDm = false;
    if (args.requireDmRole) {
      const access = await requireDm(ctx, args.sessionToken, args.campaignId);
      userId = access.user.id;
      isDm = true;
    } else {
      const user = await requireUser(ctx, args.sessionToken);
      userId = user.id;
      if (args.campaignId) {
        const camp = await findCampaignByAnyId(ctx, args.campaignId);
        isDm = Boolean(camp?.dmUserId) && camp?.dmUserId === user.id;
      }
    }

    const now = Date.now();
    const usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!usage || now - usage.windowStart >= HOUR_MS) {
      if (usage) await ctx.db.patch(usage._id, { windowStart: now, count: 1 });
      else await ctx.db.insert("aiUsage", { userId, windowStart: now, count: 1 });
      return { allowed: true, isDm, userId };
    }
    if (usage.count >= AI_CALLS_PER_HOUR) {
      return { allowed: false, isDm, userId };
    }
    await ctx.db.patch(usage._id, { count: usage.count + 1 });
    return { allowed: true, isDm, userId };
  },
});

const RATE_LIMIT_MESSAGE = `Limite de ${AI_CALLS_PER_HOUR} chamadas de IA por hora atingido. Tente novamente mais tarde.`;

// ============================================================================
// Helpers Gemini compartilhados
// ============================================================================

function sanitizeApiKey(raw?: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

function getServerKey(): string {
  const env = (
    globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env;
  return sanitizeApiKey(env?.GEMINI_API_KEY);
}

/** Chave do usuário tem prioridade; a do servidor só é usada por Mestres autorizados. */
function resolveApiKey(userKey: string | undefined, allowServerKey: boolean) {
  const user = sanitizeApiKey(userKey);
  if (user.length >= 10) return { key: user, usedServerKey: false };
  const server = allowServerKey ? getServerKey() : "";
  if (server.length >= 10) return { key: server, usedServerKey: true };
  return null;
}

function geminiHeaders(apiKey: string): Record<string, string> {
  return { "Content-Type": "application/json", "x-goog-api-key": apiKey };
}

function extractJsonObject(rawText: string): Record<string, unknown> | null {
  const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

  const tryParse = (str: string): Record<string, unknown> | null => {
    try {
      const val = JSON.parse(str);
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object" && val[0] !== null) {
        return val[0] as Record<string, unknown>;
      }
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        return val as Record<string, unknown>;
      }
    } catch {
      // ignora
    }
    return null;
  };

  const direct = tryParse(cleaned);
  if (direct) return direct;

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return tryParse(cleaned.slice(firstBrace, lastBrace + 1));
  }
  return null;
}

async function discoverModels(
  apiKey: string
): Promise<{ ok: boolean; status: number; models: string[] }> {
  const res = await fetch(`${GEMINI_BASE}/models`, { headers: geminiHeaders(apiKey) });
  if (!res.ok) return { ok: false, status: res.status, models: [] };

  const data = (await res.json()) as {
    models?: { name: string; supportedGenerationMethods?: string[] }[];
  };
  const compatible = (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((name) => {
      const n = name.toLowerCase();
      return n.includes("gemini") && !n.includes("tts") && !n.includes("image") && !n.includes("vision");
    });

  const ordered: string[] = CANDIDATE_MODELS.filter((m) => compatible.includes(m));
  for (const m of compatible) {
    if (!ordered.includes(m) && m.toLowerCase().includes("flash")) ordered.push(m);
  }
  for (const m of compatible) {
    if (!ordered.includes(m)) ordered.push(m);
  }
  return { ok: true, status: 200, models: ordered.length > 0 ? ordered : CANDIDATE_MODELS };
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

async function callGeminiOnce(opts: {
  apiKey: string;
  model: string;
  parts: GeminiPart[];
  schema: Record<string, unknown>;
  temperature: number;
  maxOutputTokens: number;
  accept: (obj: Record<string, unknown>) => boolean;
}): Promise<{ status: number; parsed: Record<string, unknown> | null }> {
  const res = await fetch(
    `${GEMINI_BASE}/models/${encodeURIComponent(opts.model)}:generateContent`,
    {
      method: "POST",
      headers: geminiHeaders(opts.apiKey),
      body: JSON.stringify({
        contents: [{ parts: opts.parts }],
        generationConfig: {
          temperature: opts.temperature,
          maxOutputTokens: opts.maxOutputTokens,
          responseMimeType: "application/json",
          responseSchema: opts.schema,
        },
      }),
    }
  );
  if (!res.ok) return { status: res.status, parsed: null };

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const nonThought = parts.filter((p) => !p.thought && typeof p.text === "string");
  const texts =
    nonThought.length > 0
      ? nonThought.map((p) => p.text || "")
      : parts.map((p) => p.text || "").filter(Boolean);

  // Em modelos "thinking" o JSON final costuma estar no último bloco.
  for (let i = texts.length - 1; i >= 0; i--) {
    const parsed = extractJsonObject(texts[i]);
    if (parsed && opts.accept(parsed)) return { status: 200, parsed };
  }
  const joined = extractJsonObject(texts.join("\n"));
  if (joined && opts.accept(joined)) return { status: 200, parsed: joined };
  return { status: 422, parsed: null };
}

/** Tenta os modelos disponíveis em ordem; interrompe em erros não recuperáveis. */
async function generateWithFallback(opts: {
  apiKey: string;
  parts: GeminiPart[];
  schema: Record<string, unknown>;
  temperature: number;
  maxOutputTokens: number;
  accept: (obj: Record<string, unknown>) => boolean;
}): Promise<AiSuccess | AiFailure> {
  try {
    const discovered = await discoverModels(opts.apiKey);
    if (!discovered.ok && NON_RETRYABLE.has(discovered.status)) {
      return failure(`http_${discovered.status}`, messageForStatus(discovered.status));
    }
    const models = discovered.ok ? discovered.models.slice(0, 4) : CANDIDATE_MODELS;

    let lastStatus = discovered.ok ? 500 : discovered.status;
    for (const model of models) {
      const attempt = await callGeminiOnce({ ...opts, model });
      if (attempt.parsed) return { ok: true, parsed: attempt.parsed, modelUsed: model };
      lastStatus = attempt.status;
      if (NON_RETRYABLE.has(attempt.status)) break;
    }
    return failure(`http_${lastStatus}`, messageForStatus(lastStatus));
  } catch {
    return failure("network_or_parse_error", "Erro de rede ao conectar à API Gemini.");
  }
}

// ============================================================================
// Gerador de emergência (NPC, taverna, rumor, tesouro)
// ============================================================================

const EMERGENCY_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: {
      type: "STRING",
      description:
        "Nome curto e marcante do personagem, local, rumor ou relíquia (2 a 5 palavras, máximo 50 caracteres). NUNCA coloque um parágrafo inteiro aqui.",
    },
    subtitle: {
      type: "STRING",
      description: "Papel, arquétipo ou subtítulo conciso (máximo 70 caracteres).",
    },
    rawHandle: {
      type: "STRING",
      description:
        "Identificador curto em PascalCase sem espaços nem símbolos (máximo 20 caracteres, ex: GideonVau, TabernaEscudo).",
    },
    details: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          value: { type: "STRING" },
          isSecret: { type: "BOOLEAN" },
        },
        required: ["label", "value", "isSecret"],
      },
    },
  },
  required: ["title", "subtitle", "rawHandle", "details"],
};

export const generateEmergency = action({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    systemPrompt: v.string(),
    userApiKey: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    AiSuccess<{ usedServerKey: boolean }> | AiFailure
  > => {
    const auth = await ctx.runMutation(internal.ai.authorizeAiCall, {
      sessionToken: args.sessionToken,
      campaignId: args.campaignId,
      requireDmRole: true,
    });
    if (!auth.allowed) return failure("rate_limited", RATE_LIMIT_MESSAGE);

    const resolved = resolveApiKey(args.userApiKey, true);
    if (!resolved) return failure("no_api_key", "Nenhuma chave da API Gemini configurada.");

    const result = await generateWithFallback({
      apiKey: resolved.key,
      parts: [{ text: args.systemPrompt.slice(0, MAX_PROMPT_CHARS) }],
      schema: EMERGENCY_RESPONSE_SCHEMA,
      temperature: 0.85,
      maxOutputTokens: 4096,
      accept: (obj) => typeof obj.title === "string",
    });
    if (!result.ok) return result;
    return { ...result, usedServerKey: resolved.usedServerKey };
  },
});

/**
 * Testa uma chave Gemini. Com `apiKey` informada basta estar autenticado; para testar a
 * chave do servidor (sem `apiKey`) é preciso ser Mestre da campanha informada.
 * `hasServerKey` só é revelado ao Mestre da campanha.
 */
export const validateKey = action({
  args: {
    sessionToken: v.string(),
    campaignId: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ valid: boolean; message: string; hasServerKey?: boolean }> => {
    const ownKey = sanitizeApiKey(args.apiKey);
    const auth = await ctx.runMutation(internal.ai.authorizeAiCall, {
      sessionToken: args.sessionToken,
      campaignId: args.campaignId,
      requireDmRole: ownKey.length < 10,
    });
    const serverInfo = auth.isDm ? { hasServerKey: getServerKey().length >= 10 } : {};
    if (!auth.allowed) return { valid: false, message: RATE_LIMIT_MESSAGE, ...serverInfo };

    const resolved = resolveApiKey(args.apiKey, auth.isDm);
    if (!resolved) {
      return { valid: false, message: "Informe uma chave válida do Google AI Studio.", ...serverInfo };
    }

    try {
      const discovery = await discoverModels(resolved.key);
      if (!discovery.ok) {
        return { valid: false, message: messageForStatus(discovery.status), ...serverInfo };
      }
      const modelName = discovery.models[0] || "gemini-2.5-flash";
      return {
        valid: true,
        message: `Chave Google Gemini conectada (modelo ativo: ${modelName}).`,
        ...serverInfo,
      };
    } catch {
      return { valid: false, message: "Erro de rede ao conectar à API Gemini.", ...serverInfo };
    }
  },
});

// ============================================================================
// Importação de PDF para a Wiki
// ============================================================================

const WIKI_EXTRACTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    summaryNotes: {
      type: "STRING",
      description: "Resumo curto (1 a 2 frases) do documento analisado e do que foi extraído.",
    },
    entities: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: {
            type: "STRING",
            description: "Nome do personagem, local, item, facção, criatura ou lore.",
          },
          subtitle: {
            type: "STRING",
            description: "Subtítulo curto ou papel/tipo (máximo 70 caracteres).",
          },
          category: {
            type: "STRING",
            enum: ["npc", "faction", "location", "item", "monster", "lore"],
            description:
              "Categoria: npc (personagens), location (lugares), item (itens/relíquias), lore (informações/história/regras do mundo), faction (facções/organizações), monster (criaturas/chefes).",
          },
          tags: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "2 a 4 tags curtas relevantes.",
          },
          summary: {
            type: "STRING",
            description: "Resumo de 1 a 2 frases para listagem rápida.",
          },
          publicContent: {
            type: "STRING",
            description:
              "Descrição detalhada para a Wiki (aparência, história, função, propriedades ou lore público).",
          },
          secrets: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                content: { type: "STRING" },
              },
              required: ["title", "content"],
            },
            description:
              "Segredos do mestre, motivações ocultas, armadilhas, maldições ou reviravoltas ligadas a esta entidade.",
          },
          attributes: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                label: { type: "STRING" },
                value: { type: "STRING" },
              },
              required: ["label", "value"],
            },
            description:
              "Atributos curtos (ex: Raça, Classe, Raridade, ND, População, Preço, Dano).",
          },
        },
        required: [
          "name",
          "subtitle",
          "category",
          "tags",
          "summary",
          "publicContent",
          "secrets",
          "attributes",
        ],
      },
    },
  },
  required: ["summaryNotes", "entities"],
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  return btoa(chunks.join(""));
}

/**
 * Lê um PDF enviado pelo Mestre (files.generateUploadUrl com purpose "pdf" e o mesmo
 * campaignId) e extrai entidades para a Wiki. Todas as entidades retornam com
 * `isPublicToPlayers: false`, independentemente da resposta do modelo.
 * O arquivo é excluído ao final (somente se veio deste fluxo).
 */
export const extractWikiFromPdf = action({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    storageId: v.id("_storage"),
    userApiKey: v.optional(v.string()),
    campaignName: v.optional(v.string()),
    campaignSystem: v.optional(v.string()),
    worldContext: v.optional(v.string()),
    customInstructions: v.optional(v.string()),
    existingEntityNames: v.optional(v.array(v.string())),
  },
  handler: async (
    ctx,
    args
  ): Promise<AiSuccess | AiFailure> => {
    // Lança se a sessão/papel forem inválidos ou se o arquivo não pertencer a este Mestre.
    const { userId } = await ctx.runMutation(internal.files.claimPdfUpload, {
      sessionToken: args.sessionToken,
      campaignId: args.campaignId,
      storageId: args.storageId,
    });
    const release = () =>
      ctx
        .runMutation(internal.files.releasePdfUpload, { storageId: args.storageId, userId })
        .catch(() => {});

    try {
      const auth = await ctx.runMutation(internal.ai.authorizeAiCall, {
        sessionToken: args.sessionToken,
        campaignId: args.campaignId,
        requireDmRole: true,
      });
      if (!auth.allowed) return failure("rate_limited", RATE_LIMIT_MESSAGE);

      const resolved = resolveApiKey(args.userApiKey, true);
      if (!resolved) return failure("no_api_key", "Nenhuma chave da API Gemini configurada.");

      const fileBlob = await ctx.storage.get(args.storageId);
      if (!fileBlob) return failure("file_not_found", "Arquivo não encontrado.");
      if (fileBlob.size > MAX_PDF_BYTES) {
        return failure("file_too_large", "O PDF excede o limite de 15 MB.");
      }
      const pdfBase64 = arrayBufferToBase64(await fileBlob.arrayBuffer());

      const existingList = (args.existingEntityNames || []).slice(0, 80);
      const prompt = [
        "Você é um assistente especialista em RPG de mesa e construção de Wiki de campanha (Codex).",
        "Analise o PDF anexado e extraia as informações mais relevantes para preencher a Wiki da campanha.",
        args.campaignName ? `Campanha: ${args.campaignName.slice(0, 200)}` : "",
        args.campaignSystem ? `Sistema: ${args.campaignSystem.slice(0, 100)}` : "",
        args.worldContext ? `Contexto atual do mundo:\n${args.worldContext.slice(0, 1500)}` : "",
        existingList.length > 0
          ? `Entidades já existentes na Wiki (evite duplicar se forem idênticas, ou complemente apenas se houver info nova relevante): ${existingList.join(", ")}`
          : "",
        args.customInstructions
          ? `Instrução específica do Mestre: ${args.customInstructions.slice(0, 2000)}`
          : "",
        "Regras de extração:",
        "- Responda sempre em Português do Brasil (traduzindo termos narrativos se o PDF estiver em outro idioma, mantendo nomes próprios quando fizer sentido).",
        "- Classifique cada entrada em uma das categorias exatas: npc (personagens), location (lugares), item (itens/relíquias/equipamentos), lore (informações históricas, mitos, eventos, pistas), faction (facções/organizações), monster (monstros/criaturas/chefes).",
        "- Separe informações secretas, armadilhas, motivações ocultas ou plot twists no campo `secrets` (para Névoa de Guerra do Mestre), e deixe em `publicContent` a descrição principal.",
        "- Extraia no máximo 30 entidades mais relevantes para manter a resposta objetiva e bem estruturada.",
        "- Retorne APENAS JSON válido seguindo o schema solicitado.",
      ]
        .filter(Boolean)
        .join("\n\n");

      const result = await generateWithFallback({
        apiKey: resolved.key,
        parts: [{ inlineData: { mimeType: "application/pdf", data: pdfBase64 } }, { text: prompt }],
        schema: WIKI_EXTRACTION_SCHEMA,
        temperature: 0.4,
        maxOutputTokens: 32768,
        accept: (obj) => Array.isArray(obj.entities),
      });
      if (!result.ok) return result;

      // Conteúdo extraído por IA nunca é publicado automaticamente para jogadores.
      const entities = (result.parsed.entities as unknown[]).map((e) =>
        typeof e === "object" && e !== null
          ? { ...(e as Record<string, unknown>), isPublicToPlayers: false }
          : e
      );
      return { ...result, parsed: { ...result.parsed, entities } };
    } finally {
      await release();
    }
  },
});
