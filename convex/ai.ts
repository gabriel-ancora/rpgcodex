import { action } from "./_generated/server";
import { v } from "convex/values";

const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
  "gemini-2.0-flash",
];

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

function sanitizeApiKey(raw?: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

function extractJsonObject(rawText: string): Record<string, unknown> | null {
  const cleaned = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

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
      // ignore
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

async function discoverAvailableGeminiModels(apiKey: string): Promise<{
  ok: boolean;
  status: number;
  models: string[];
  errorMessage?: string;
}> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
      apiKey
    )}`
  );

  if (!res.ok) {
    let errText = "";
    try {
      const errJson = (await res.json()) as { error?: { message?: string } };
      errText = errJson?.error?.message || "";
    } catch {
      // ignore
    }
    return { ok: false, status: res.status, models: [], errorMessage: errText };
  }

  const data = (await res.json()) as {
    models?: {
      name: string;
      supportedGenerationMethods?: string[];
    }[];
  };

  const compatible = (data.models || [])
    .filter((m) =>
      (m.supportedGenerationMethods || []).includes("generateContent")
    )
    .map((m) => m.name.replace(/^models\//, ""))
    // Avoid image/tts/embedding-only endpoints
    .filter(
      (name) =>
        name.toLowerCase().includes("gemini") &&
        !name.toLowerCase().includes("tts") &&
        !name.toLowerCase().includes("image") &&
        !name.toLowerCase().includes("vision")
    );

  const ordered: string[] = [];
  for (const pref of CANDIDATE_MODELS) {
    if (compatible.includes(pref)) ordered.push(pref);
  }
  for (const m of compatible) {
    if (!ordered.includes(m) && m.toLowerCase().includes("flash")) {
      ordered.push(m);
    }
  }
  for (const m of compatible) {
    if (!ordered.includes(m)) {
      ordered.push(m);
    }
  }

  return {
    ok: true,
    status: 200,
    models: ordered.length > 0 ? ordered : CANDIDATE_MODELS,
  };
}

async function callGeminiStructured(
  apiKey: string,
  model: string,
  prompt: string,
  useSchema = true
): Promise<{ status: number; parsed: Record<string, unknown> | null }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: useSchema
          ? {
              temperature: 0.85,
              responseMimeType: "application/json",
              responseSchema: EMERGENCY_RESPONSE_SCHEMA,
            }
          : {
              temperature: 0.85,
              responseMimeType: "application/json",
            },
      }),
    }
  );

  // Se o modelo não aceitar responseSchema (HTTP 400), tenta sem responseSchema
  if (res.status === 400 && useSchema) {
    return callGeminiStructured(apiKey, model, prompt, false);
  }

  if (!res.ok) {
    return { status: res.status, parsed: null };
  }

  const data = (await res.json()) as {
    candidates?: {
      content?: {
        parts?: { text?: string; thought?: boolean }[];
      };
    }[];
  };

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const nonThoughtParts = parts.filter((p) => !p.thought && typeof p.text === "string");
  const candidateTexts =
    nonThoughtParts.length > 0
      ? nonThoughtParts.map((p) => p.text || "")
      : parts.map((p) => p.text || "").filter(Boolean);

  // Tenta do último bloco para o primeiro (em modelos thinking o JSON final fica na última part)
  for (let i = candidateTexts.length - 1; i >= 0; i--) {
    const parsed = extractJsonObject(candidateTexts[i]);
    if (parsed && typeof parsed.title === "string") {
      return { status: 200, parsed };
    }
  }

  const joined = extractJsonObject(candidateTexts.join("\n"));
  if (joined && typeof joined.title === "string") {
    return { status: 200, parsed: joined };
  }

  return { status: 422, parsed: null };
}

/**
 * Convex Serverless Action para IA Google Gemini (com descoberta dinâmica de modelos, suporte a modelos thinking 2.5 e schema estrito)
 */
export const generateEmergency = action({
  args: {
    systemPrompt: v.string(),
    userApiKey: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const serverKey = sanitizeApiKey(
      (
        globalThis as unknown as {
          process?: { env?: Record<string, string | undefined> };
        }
      ).process?.env?.GEMINI_API_KEY
    );
    const effectiveKey = sanitizeApiKey(args.userApiKey) || serverKey;

    if (!effectiveKey || effectiveKey.length < 10) {
      return { ok: false as const, reason: "no_api_key" };
    }

    try {
      const discovered = await discoverAvailableGeminiModels(effectiveKey);
      const modelsToTry = discovered.ok
        ? discovered.models.slice(0, 4)
        : CANDIDATE_MODELS;

      let lastStatus = discovered.status || 500;

      for (const model of modelsToTry) {
        const attempt = await callGeminiStructured(
          effectiveKey,
          model,
          args.systemPrompt,
          true
        );
        lastStatus = attempt.status;

        if (attempt.parsed) {
          return {
            ok: true as const,
            parsed: attempt.parsed,
            modelUsed: model,
            usedServerKey: !sanitizeApiKey(args.userApiKey) && Boolean(serverKey),
          };
        }

        // Chave inválida/revogada não precisa tentar outros modelos
        if (attempt.status === 401 || attempt.status === 403) {
          break;
        }
      }

      return {
        ok: false as const,
        reason: `http_${lastStatus}`,
      };
    } catch {
      return { ok: false as const, reason: "network_or_parse_error" };
    }
  },
});

export const validateKey = action({
  args: {
    apiKey: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const serverKey = sanitizeApiKey(
      (
        globalThis as unknown as {
          process?: { env?: Record<string, string | undefined> };
        }
      ).process?.env?.GEMINI_API_KEY
    );
    const keyToTest = sanitizeApiKey(args.apiKey) || serverKey;

    if (!keyToTest || keyToTest.length < 10) {
      return {
        valid: false,
        hasServerKey: Boolean(serverKey),
        message: "Informe uma chave válida do Google AI Studio.",
      };
    }

    try {
      const discovery = await discoverAvailableGeminiModels(keyToTest);

      if (!discovery.ok) {
        const detail =
          discovery.status === 400 || discovery.status === 403
            ? "Chave inválida ou sem permissão para a API Gemini."
            : `Falha ao autenticar na API Google (HTTP ${discovery.status}).`;
        return {
          valid: false,
          hasServerKey: Boolean(serverKey),
          message: detail,
        };
      }

      const modelName = discovery.models[0] || "gemini-2.5-flash";
      return {
        valid: true,
        hasServerKey: Boolean(serverKey),
        message: `Chave Google Gemini conectada com sucesso (modelo ativo: ${modelName}).`,
      };
    } catch {
      return {
        valid: false,
        hasServerKey: Boolean(serverKey),
        message: "Erro de rede ao conectar à API Google Gemini.",
      };
    }
  },
});
