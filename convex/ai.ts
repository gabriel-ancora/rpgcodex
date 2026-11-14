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

const WIKI_EXTRACTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    summaryNotes: {
      type: "STRING",
      description:
        "Resumo curto (1 a 2 frases) do documento analisado e do que foi extraído.",
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
          isPublicToPlayers: {
            type: "BOOLEAN",
            description:
              "true se for informação geral/pública; false se for algo oculto ou exclusivo do mestre.",
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
          "isPublicToPlayers",
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
    const slice = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode(...slice));
  }
  return btoa(chunks.join(""));
}

type PdfPart =
  | { inlineData: { mimeType: "application/pdf"; data: string } }
  | { fileData: { mimeType: "application/pdf"; fileUri: string } };

async function uploadPdfToGeminiFilesApi(
  apiKey: string,
  fileBlob: Blob,
  displayName: string
): Promise<{ fileUri: string; fileName: string } | null> {
  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(
      apiKey
    )}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(fileBlob.size),
        "X-Goog-Upload-Header-Content-Type": "application/pdf",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    }
  );

  if (!startRes.ok) return null;
  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) return null;

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(fileBlob.size),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: fileBlob,
  });

  if (!uploadRes.ok) return null;
  const info = (await uploadRes.json()) as {
    file?: { uri?: string; name?: string; state?: string };
  };
  let fileUri = info?.file?.uri;
  const fileName = info?.file?.name;
  let state = info?.file?.state;

  if (!fileUri || !fileName) return null;

  // Aguarda processamento se necessário
  for (let i = 0; i < 10 && state === "PROCESSING"; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const checkRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${encodeURIComponent(
        apiKey
      )}`
    );
    if (!checkRes.ok) break;
    const checkData = (await checkRes.json()) as {
      uri?: string;
      state?: string;
    };
    state = checkData.state;
    if (checkData.uri) fileUri = checkData.uri;
  }

  if (state === "FAILED") return null;
  return { fileUri, fileName };
}

async function deleteGeminiFile(apiKey: string, fileName: string) {
  await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${encodeURIComponent(
      apiKey
    )}`,
    { method: "DELETE" }
  ).catch(() => {});
}

async function callGeminiWithPdf(
  apiKey: string,
  model: string,
  prompt: string,
  pdfPart: PdfPart,
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
        contents: [
          {
            parts: [pdfPart, { text: prompt }],
          },
        ],
        generationConfig: useSchema
          ? {
              temperature: 0.4,
              responseMimeType: "application/json",
              responseSchema: WIKI_EXTRACTION_SCHEMA,
            }
          : {
              temperature: 0.4,
              responseMimeType: "application/json",
            },
      }),
    }
  );

  if (res.status === 400 && useSchema) {
    return callGeminiWithPdf(apiKey, model, prompt, pdfPart, false);
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
  const nonThoughtParts = parts.filter(
    (p) => !p.thought && typeof p.text === "string"
  );
  const candidateTexts =
    nonThoughtParts.length > 0
      ? nonThoughtParts.map((p) => p.text || "")
      : parts.map((p) => p.text || "").filter(Boolean);

  for (let i = candidateTexts.length - 1; i >= 0; i--) {
    const parsed = extractJsonObject(candidateTexts[i]);
    if (parsed && Array.isArray(parsed.entities)) {
      return { status: 200, parsed };
    }
  }

  const joined = extractJsonObject(candidateTexts.join("\n"));
  if (joined && Array.isArray(joined.entities)) {
    return { status: 200, parsed: joined };
  }

  return { status: 422, parsed: null };
}

/**
 * Lê um PDF armazenado na Convex Storage usando a IA Gemini cadastrada
 * e extrai entidades estruturadas para a Wiki (NPCs, locais, itens, lore, facções, criaturas).
 */
export const extractWikiFromPdf = action({
  args: {
    storageId: v.id("_storage"),
    userApiKey: v.optional(v.string()),
    campaignName: v.optional(v.string()),
    campaignSystem: v.optional(v.string()),
    worldContext: v.optional(v.string()),
    customInstructions: v.optional(v.string()),
    existingEntityNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const serverKey = sanitizeApiKey(
      (
        globalThis as unknown as {
          process?: { env?: Record<string, string | undefined> };
        }
      ).process?.env?.GEMINI_API_KEY
    );
    const effectiveKey = sanitizeApiKey(args.userApiKey) || serverKey;

    if (!effectiveKey || effectiveKey.length < 10) {
      await ctx.storage.delete(args.storageId).catch(() => {});
      return { ok: false as const, reason: "no_api_key" };
    }

    try {
      const fileBlob = await ctx.storage.get(args.storageId);
      if (!fileBlob) {
        return { ok: false as const, reason: "file_not_found" };
      }

      // Limite máximo suportado pela API Gemini para PDF (50 MB)
      if (fileBlob.size > 50 * 1024 * 1024) {
        await ctx.storage.delete(args.storageId).catch(() => {});
        return { ok: false as const, reason: "file_too_large" };
      }

      let pdfPart: PdfPart;
      let uploadedGeminiFileName: string | null = null;

      if (fileBlob.size <= 12 * 1024 * 1024) {
        const buffer = await fileBlob.arrayBuffer();
        const pdfBase64 = arrayBufferToBase64(buffer);
        pdfPart = {
          inlineData: {
            mimeType: "application/pdf",
            data: pdfBase64,
          },
        };
      } else {
        const uploaded = await uploadPdfToGeminiFilesApi(
          effectiveKey,
          fileBlob,
          args.campaignName ? `${args.campaignName}.pdf` : "campanha.pdf"
        );
        if (!uploaded) {
          await ctx.storage.delete(args.storageId).catch(() => {});
          return { ok: false as const, reason: "upload_to_gemini_failed" };
        }
        uploadedGeminiFileName = uploaded.fileName;
        pdfPart = {
          fileData: {
            mimeType: "application/pdf",
            fileUri: uploaded.fileUri,
          },
        };
      }

      // Remove arquivo temporário do storage após carregar/enviar
      await ctx.storage.delete(args.storageId).catch(() => {});

      const existingList = (args.existingEntityNames || []).slice(0, 80);
      const prompt = [
        "Você é um assistente especialista em RPG de mesa e construção de Wiki de campanha (Obsidian Codex).",
        "Analise o PDF anexado e extraia as informações mais relevantes para preencher a Wiki da campanha.",
        args.campaignName ? `Campanha: ${args.campaignName}` : "",
        args.campaignSystem ? `Sistema: ${args.campaignSystem}` : "",
        args.worldContext
          ? `Contexto atual do mundo:\n${args.worldContext.slice(0, 1500)}`
          : "",
        existingList.length > 0
          ? `Entidades já existentes na Wiki (evite duplicar se forem idênticas, ou complemente apenas se houver info nova relevante): ${existingList.join(", ")}`
          : "",
        args.customInstructions
          ? `Instrução específica do Mestre: ${args.customInstructions}`
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

      const discovered = await discoverAvailableGeminiModels(effectiveKey);
      const modelsToTry = discovered.ok
        ? discovered.models.slice(0, 4)
        : CANDIDATE_MODELS;

      let lastStatus = discovered.status || 500;

      try {
        for (const model of modelsToTry) {
          const attempt = await callGeminiWithPdf(
            effectiveKey,
            model,
            prompt,
            pdfPart,
            true
          );
          lastStatus = attempt.status;

          if (attempt.parsed) {
            return {
              ok: true as const,
              parsed: attempt.parsed,
              modelUsed: model,
            };
          }

          if (attempt.status === 401 || attempt.status === 403) {
            break;
          }
        }
      } finally {
        if (uploadedGeminiFileName) {
          await deleteGeminiFile(effectiveKey, uploadedGeminiFileName);
        }
      }

      return {
        ok: false as const,
        reason: `http_${lastStatus}`,
      };
    } catch {
      await ctx.storage.delete(args.storageId).catch(() => {});
      return { ok: false as const, reason: "network_or_parse_error" };
    }
  },
});
