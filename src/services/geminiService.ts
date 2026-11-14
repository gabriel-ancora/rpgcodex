import { Entity, EntityCategory, ThreatFront, GeneratedEmergencyItem } from '../types/campaign';
import { convexClient } from '../convexClient';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
  generateEmergencyLoot,
  generateEmergencyNPC,
  generateEmergencyRumor,
  generateEmergencyTavern,
  makeCompactHandle,
} from '../data/emergencyGenerators';

const PREFERRED_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-2.0-flash',
];

const CLIENT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: {
      type: 'STRING',
      description:
        'Nome curto e marcante do personagem, local, rumor ou relíquia (2 a 5 palavras, máximo 50 caracteres). NUNCA coloque parágrafos aqui.',
    },
    subtitle: {
      type: 'STRING',
      description: 'Papel, arquétipo ou subtítulo conciso (máximo 70 caracteres).',
    },
    rawHandle: {
      type: 'STRING',
      description:
        'Identificador curto em PascalCase sem espaços nem acentos (máximo 20 caracteres, ex: GideonVau, TabernaSete).',
    },
    details: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          value: { type: 'STRING' },
          isSecret: { type: 'BOOLEAN' },
        },
        required: ['label', 'value', 'isSecret'],
      },
    },
  },
  required: ['title', 'subtitle', 'rawHandle', 'details'],
};

export function sanitizeGeminiKey(raw?: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();
}

function extractJsonObject(rawText: string): Record<string, unknown> | null {
  const cleaned = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const tryParse = (str: string): Record<string, unknown> | null => {
    try {
      const val = JSON.parse(str);
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
        return val[0] as Record<string, unknown>;
      }
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        return val as Record<string, unknown>;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const direct = tryParse(cleaned);
  if (direct) return direct;

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return tryParse(cleaned.slice(firstBrace, lastBrace + 1));
  }

  return null;
}

async function discoverClientModels(cleanKey: string): Promise<{
  ok: boolean;
  status: number;
  models: string[];
}> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
      cleanKey
    )}`
  );
  if (!res.ok) {
    return { ok: false, status: res.status, models: [] };
  }

  const data = (await res.json()) as {
    models?: { name: string; supportedGenerationMethods?: string[] }[];
  };
  const compatible = (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter(
      (name) =>
        name.toLowerCase().includes('gemini') &&
        !name.toLowerCase().includes('tts') &&
        !name.toLowerCase().includes('image') &&
        !name.toLowerCase().includes('vision')
    );

  const ordered: string[] = [];
  for (const pref of PREFERRED_GEMINI_MODELS) {
    if (compatible.includes(pref)) ordered.push(pref);
  }
  for (const m of compatible) {
    if (!ordered.includes(m) && m.toLowerCase().includes('flash')) ordered.push(m);
  }
  for (const m of compatible) {
    if (!ordered.includes(m)) ordered.push(m);
  }

  return {
    ok: true,
    status: 200,
    models: ordered.length > 0 ? ordered : PREFERRED_GEMINI_MODELS,
  };
}

export async function validateGeminiApiKeyClientFallback(apiKey: string): Promise<{
  valid: boolean;
  message: string;
}> {
  const cleanKey = sanitizeGeminiKey(apiKey);
  if (!cleanKey || cleanKey.length < 10) {
    return {
      valid: false,
      message: 'Informe uma chave válida do Google AI Studio.',
    };
  }

  try {
    const discovered = await discoverClientModels(cleanKey);
    if (!discovered.ok) {
      return {
        valid: false,
        message:
          discovered.status === 400 || discovered.status === 403
            ? 'Chave inválida ou sem permissão para a API Gemini.'
            : `Falha ao autenticar na API Google (HTTP ${discovered.status}).`,
      };
    }

    const picked = discovered.models[0] || 'gemini-2.5-flash';
    return {
      valid: true,
      message: `Chave Google Gemini conectada com sucesso (modelo ativo: ${picked}).`,
    };
  } catch {
    return {
      valid: false,
      message: 'Erro de rede ao validar a chave na API Google.',
    };
  }
}

async function callSingleModelDirect(
  cleanKey: string,
  model: string,
  systemPrompt: string,
  useSchema = true
): Promise<{ status: number; parsed: Record<string, unknown> | null }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(cleanKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: useSchema
          ? {
              temperature: 0.85,
              responseMimeType: 'application/json',
              responseSchema: CLIENT_RESPONSE_SCHEMA,
            }
          : {
              temperature: 0.85,
              responseMimeType: 'application/json',
            },
      }),
    }
  );

  if (response.status === 400 && useSchema) {
    return callSingleModelDirect(cleanKey, model, systemPrompt, false);
  }

  if (!response.ok) {
    return { status: response.status, parsed: null };
  }

  const data = (await response.json()) as {
    candidates?: {
      content?: {
        parts?: { text?: string; thought?: boolean }[];
      };
    }[];
  };

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const nonThoughtParts = parts.filter((p) => !p.thought && typeof p.text === 'string');
  const texts =
    nonThoughtParts.length > 0
      ? nonThoughtParts.map((p) => p.text || '')
      : parts.map((p) => p.text || '').filter(Boolean);

  for (let i = texts.length - 1; i >= 0; i--) {
    const parsed = extractJsonObject(texts[i]);
    if (parsed && typeof parsed.title === 'string') {
      return { status: 200, parsed };
    }
  }

  const joined = extractJsonObject(texts.join('\n'));
  if (joined && typeof joined.title === 'string') {
    return { status: 200, parsed: joined };
  }

  return { status: 422, parsed: null };
}

async function callGeminiDirectWithDiscovery(
  apiKey: string,
  systemPrompt: string
): Promise<{ parsed: Record<string, unknown> | null; errorStatus?: number }> {
  const cleanKey = sanitizeGeminiKey(apiKey);
  if (!cleanKey || cleanKey.length < 10) return { parsed: null };

  const discovered = await discoverClientModels(cleanKey);
  const modelsToTry = discovered.ok
    ? discovered.models.slice(0, 4)
    : PREFERRED_GEMINI_MODELS;

  let lastStatus = discovered.status || 500;

  for (const model of modelsToTry) {
    const attempt = await callSingleModelDirect(cleanKey, model, systemPrompt, true);
    lastStatus = attempt.status;
    if (attempt.parsed) {
      return { parsed: attempt.parsed };
    }
    if (attempt.status === 401 || attempt.status === 403) {
      break;
    }
  }

  return { parsed: null, errorStatus: lastStatus };
}

export interface CampaignContextPayload {
  campaignName: string;
  campaignTone: string;
  worldContext?: string;
  currentLocationHandle: string;
  activeFactions: string[];
  existingNpcs: string[];
  existingLocations: string[];
  activeFronts: { name: string; doom: string }[];
  customPromptHint?: string;
}

export function buildContextualSystemPrompt(
  type: 'npc' | 'tavern' | 'rumor' | 'loot',
  ctx: CampaignContextPayload
): string {
  const typeLabelMap = {
    npc: 'um NOVO Personagem (NPC) inédito com Nome Próprio curto, ocupação/papel, aparência, tique e segredo conectado à história',
    tavern: 'um NOVO Ponto de Interesse / Estabelecimento com Nome Próprio curto (ex: estalagem, santuário, marco histórico, forja), atmosfera sensorial, anfitrião e segredo oculto',
    rumor: 'um NOVO Rumor / Pista Investigativa com título curto impactante, o que o povo comenta e a verdade oculta nos bastidores',
    loot: 'uma NOVA Relíquia / Espólio com Nome Próprio curto, aparência física, efeito mecânico compatível com D&D 5.5e e história oculta',
  };

  const hasExistingHandles =
    ctx.activeFactions.length > 0 ||
    ctx.existingNpcs.length > 0 ||
    ctx.existingLocations.length > 0;

  const worldContextBlock = ctx.worldContext?.trim()
    ? `\n=== JANELA DE CONTEXTO DO MUNDO (LORE DE REFERÊNCIA DA WIKI) ===\n${ctx.worldContext.trim()}\n`
    : '';

  return `Você é um Mestre de RPG de Mesa especialista em Design Narrativo.
Com base na lore e no estado da campanha abaixo, crie ${typeLabelMap[type]}.
${worldContextBlock}
=== ESTADO VIVO DO CÓDICE ===
• Campanha: ${ctx.campaignName || 'Campanha Atual'} (Tom: ${ctx.campaignTone})
• Local Atual da Cena: ${ctx.currentLocationHandle || 'Contexto geral da campanha'}
• Facções Ativas: ${ctx.activeFactions.join(', ') || 'Nenhuma registrada ainda'}
• NPCs Conhecidos: ${ctx.existingNpcs.join(', ') || 'Nenhum registrado ainda'}
• Locais Registrados: ${ctx.existingLocations.join(', ') || 'Nenhum registrado ainda'}
• Frentes de Ameaça Ativas: ${
    ctx.activeFronts.map((f) => `${f.name} (Destino: ${f.doom})`).join(' | ') ||
    'Nenhuma frente ativa no momento'
  }
${ctx.customPromptHint ? `• Pedido Específico do Mestre: ${ctx.customPromptHint}` : ''}

REGRAS OBRIGATÓRIAS DE FORMATO:
1. "title" DEVE ser apenas o Nome Próprio curto da criação (2 a 5 palavras, máximo 50 caracteres). NUNCA copie frases da Janela de Contexto para o "title".
2. "rawHandle" DEVE ser curto em PascalCase sem espaços (máximo 20 caracteres, ex: "GideonDoVau", "EstalagemDosSete").
3. ${
    hasExistingHandles
      ? 'Conecte organicamente os detalhes a pelo menos um @NPC/@Facção ou #Local existente listado acima e aos eventos da Janela de Contexto.'
      : 'Conecte organicamente os detalhes aos eventos, lugares e temas descritos na Janela de Contexto do Mundo.'
  }
4. Responda APENAS em JSON válido seguindo este schema:
{
  "title": "Nome Curto da Criação",
  "subtitle": "Papel, Arquétipo ou Subtítulo Curto",
  "rawHandle": "HandleCurto",
  "details": [
    { "label": "Aparência / Atmosfera", "value": "Descrição rica e específica...", "isSecret": false },
    { "label": "História & Vínculo com o Mundo", "value": "Conexão direta com a campanha...", "isSecret": false },
    { "label": "Segredo do Mestre", "value": "Verdade oculta ou gancho de aventura...", "isSecret": true }
  ]
}`;
}

/**
 * Sanitiza qualquer item (seja retornado pela IA ou já existente) garantindo
 * título conciso e handle compacto de até 20 caracteres.
 */
export function sanitizeGeneratedItemFields(
  item: GeneratedEmergencyItem
): GeneratedEmergencyItem {
  let cleanTitle = (item.title || 'Criação Contextual').trim();
  const extraDetails = [...(item.details || [])];

  // Se por qualquer motivo o título vier com um parágrafo longo, extrai um título curto e preserva o texto nos detalhes
  if (cleanTitle.length > 65) {
    const firstClause = cleanTitle.split(/[.:;!?—–\n]/)[0].trim();
    if (firstClause.length >= 4 && firstClause.length <= 55) {
      cleanTitle = firstClause;
    } else {
      const words = cleanTitle.split(/\s+/).slice(0, 5).join(' ');
      cleanTitle = `${words}...`;
    }
    if (!extraDetails.some((d) => d.value.includes(item.title.slice(0, 30)))) {
      extraDetails.unshift({
        label: 'Contexto de Origem',
        value: item.title,
        isSecret: false,
      });
    }
  }

  const cleanSubtitle =
    (item.subtitle || 'Registro Contextual').trim().slice(0, 90);

  const compactHandle = makeCompactHandle(
    item.rawHandle && item.rawHandle.length <= 24 ? item.rawHandle : cleanTitle,
    item.type === 'npc' ? 'Npc' : item.type === 'tavern' ? 'Local' : 'Item'
  );

  return {
    ...item,
    title: cleanTitle,
    subtitle: cleanSubtitle,
    rawHandle: compactHandle,
    details: extraDetails,
  };
}

function buildItemFromParsedJson(
  parsed: Record<string, unknown>,
  type: 'npc' | 'tavern' | 'rumor' | 'loot',
  currentLocationHandle: string,
  activeFactions: string[]
): GeneratedEmergencyItem {
  const titleStr = typeof parsed.title === 'string' ? parsed.title.trim() : 'Criação Contextual';
  const subtitleStr =
    typeof parsed.subtitle === 'string' ? parsed.subtitle.trim() : 'Gerado via Gemini';
  const rawHandleSource =
    typeof parsed.rawHandle === 'string' && parsed.rawHandle.trim().length <= 24
      ? parsed.rawHandle.trim()
      : titleStr;

  const rawDetails = Array.isArray(parsed.details)
    ? parsed.details
        .filter(
          (d): d is { label?: unknown; value?: unknown; isSecret?: unknown } =>
            typeof d === 'object' && d !== null
        )
        .map((d) => ({
          label: typeof d.label === 'string' ? d.label : 'Detalhe',
          value: typeof d.value === 'string' ? d.value : '',
          isSecret: Boolean(d.isSecret),
        }))
        .filter((d) => d.value.trim().length > 0)
    : [];

  return sanitizeGeneratedItemFields({
    id: `gen-ai-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    type,
    title: titleStr,
    subtitle: subtitleStr,
    rawHandle: makeCompactHandle(rawHandleSource, 'Item'),
    details: rawDetails,
    timestamp: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    aiGenerated: true,
    contextUsed: `Local: ${currentLocationHandle || 'Geral'} | Facções: ${
      activeFactions.join(', ') || 'Nenhuma'
    }`,
  });
}

export async function generateContextualEmergencyWithAI(
  type: 'npc' | 'tavern' | 'rumor' | 'loot',
  entities: Entity[],
  fronts: ThreatFront[],
  campaignName: string,
  apiKey: string,
  customPromptHint?: string,
  sceneLocationHandle?: string,
  campaignTone?: string,
  worldContext?: string
): Promise<{
  item: GeneratedEmergencyItem;
  promptUsed: string;
  usedLiveGemini: boolean;
  fallbackReason?: string;
}> {
  const activeFactions = entities
    .filter((e) => e.category === 'faction')
    .map((e) => `${e.mentionPrefix}${e.handle}`);
  const existingNpcs = entities
    .filter((e) => e.category === 'npc')
    .map((e) => `${e.mentionPrefix}${e.handle}`);
  const existingLocations = entities
    .filter((e) => e.category === 'location')
    .map((e) => `${e.mentionPrefix}${e.handle}`);

  const currentLocationHandle =
    sceneLocationHandle?.trim() || existingLocations[0] || '';

  const contextPayload: CampaignContextPayload = {
    campaignName: campaignName || 'Campanha Atual',
    campaignTone: campaignTone || 'Fantasia & Investigação',
    worldContext,
    currentLocationHandle,
    activeFactions,
    existingNpcs,
    existingLocations,
    activeFronts: fronts
      .filter((f) => f.status === 'active')
      .map((f) => ({ name: f.name, doom: f.impendingDoom })),
    customPromptHint,
  };

  const systemPrompt = buildContextualSystemPrompt(type, contextPayload);
  const cleanKey = sanitizeGeminiKey(apiKey);
  let fallbackReason: string | undefined;

  // 1. Tenta via Convex Serverless Action
  try {
    const cloudRes = await convexClient.action(api.ai.generateEmergency, {
      systemPrompt,
      userApiKey: cleanKey || undefined,
    });

    if (cloudRes.ok && cloudRes.parsed) {
      const item = buildItemFromParsedJson(
        cloudRes.parsed as Record<string, unknown>,
        type,
        currentLocationHandle,
        activeFactions
      );
      return { item, promptUsed: systemPrompt, usedLiveGemini: true };
    }
    if (!cloudRes.ok && cloudRes.reason !== 'no_api_key') {
      fallbackReason = cloudRes.reason;
    }
  } catch {
    // Segue para chamada direta com descoberta dinâmica de modelo
  }

  // 2. Chamada direta na API Gemini com auto-descoberta e suporte a modelos 2.5 thinking
  if (cleanKey.length > 10) {
    try {
      const directRes = await callGeminiDirectWithDiscovery(cleanKey, systemPrompt);
      if (directRes.parsed) {
        const item = buildItemFromParsedJson(
          directRes.parsed,
          type,
          currentLocationHandle,
          activeFactions
        );
        return { item, promptUsed: systemPrompt, usedLiveGemini: true };
      }
      if (directRes.errorStatus) {
        fallbackReason = `http_${directRes.errorStatus}`;
      }
    } catch (err) {
      console.warn('Motor procedural ativado (erro na chamada Gemini API):', err);
      fallbackReason = 'network_error';
    }
  }

  // 3. Motor Procedural Contextual Inteligente (separa customHint de worldContext!)
  const procCtx = {
    entities,
    fronts,
    locationHandle: currentLocationHandle,
    customHint: customPromptHint,
    worldContext,
  };

  const proceduralItem =
    type === 'npc'
      ? generateEmergencyNPC(procCtx)
      : type === 'tavern'
      ? generateEmergencyTavern(procCtx)
      : type === 'rumor'
      ? generateEmergencyRumor(procCtx)
      : generateEmergencyLoot(procCtx);

  return {
    item: sanitizeGeneratedItemFields({
      ...proceduralItem,
      contextUsed: `Procedural Contextual | Local: ${currentLocationHandle || 'Geral'}`,
    }),
    promptUsed: systemPrompt,
    usedLiveGemini: false,
    fallbackReason,
  };
}

export interface ExtractedWikiEntity {
  tempId: string;
  name: string;
  subtitle: string;
  category: EntityCategory;
  tags: string[];
  summary: string;
  publicContent: string;
  isPublicToPlayers: boolean;
  secrets: { title: string; content: string }[];
  attributes: { label: string; value: string }[];
}

export interface PdfWikiExtractionResult {
  ok: boolean;
  summaryNotes: string;
  entities: ExtractedWikiEntity[];
  modelUsed?: string;
  errorReason?: string;
}

const VALID_CATEGORIES: EntityCategory[] = [
  'npc',
  'faction',
  'location',
  'item',
  'monster',
  'lore',
];

function normalizeExtractedWikiPayload(
  raw: Record<string, unknown>
): { summaryNotes: string; entities: ExtractedWikiEntity[] } {
  const summaryNotes =
    typeof raw.summaryNotes === 'string' && raw.summaryNotes.trim()
      ? raw.summaryNotes.trim()
      : 'Documento PDF processado com sucesso.';

  const rawEntities = Array.isArray(raw.entities) ? raw.entities : [];
  const entities: ExtractedWikiEntity[] = [];

  rawEntities.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const obj = item as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    if (!name) return;

    const rawCat =
      typeof obj.category === 'string' ? obj.category.toLowerCase().trim() : 'lore';
    const category: EntityCategory = VALID_CATEGORIES.includes(
      rawCat as EntityCategory
    )
      ? (rawCat as EntityCategory)
      : 'lore';

    const subtitle =
      typeof obj.subtitle === 'string' && obj.subtitle.trim()
        ? obj.subtitle.trim().slice(0, 80)
        : 'Registro importado do PDF';

    const tags = Array.isArray(obj.tags)
      ? obj.tags
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          .map((t) => t.trim())
          .slice(0, 5)
      : ['PDF'];

    const summary =
      typeof obj.summary === 'string' && obj.summary.trim()
        ? obj.summary.trim()
        : `Informações sobre ${name}.`;

    const publicContent =
      typeof obj.publicContent === 'string' && obj.publicContent.trim()
        ? obj.publicContent.trim()
        : summary;

    const isPublicToPlayers =
      typeof obj.isPublicToPlayers === 'boolean' ? obj.isPublicToPlayers : true;

    const secrets = Array.isArray(obj.secrets)
      ? obj.secrets
          .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
          .map((s) => ({
            title: typeof s.title === 'string' && s.title.trim() ? s.title.trim() : 'Segredo do Mestre',
            content: typeof s.content === 'string' ? s.content.trim() : '',
          }))
          .filter((s) => s.content.length > 0)
      : [];

    const attributes = Array.isArray(obj.attributes)
      ? obj.attributes
          .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === 'object'))
          .map((a) => ({
            label: typeof a.label === 'string' ? a.label.trim() : '',
            value: typeof a.value === 'string' || typeof a.value === 'number' ? String(a.value).trim() : '',
          }))
          .filter((a) => a.label.length > 0 && a.value.length > 0)
      : [];

    entities.push({
      tempId: `pdf-ent-${Date.now()}-${idx}`,
      name,
      subtitle,
      category,
      tags: tags.length > 0 ? tags : ['PDF'],
      summary,
      publicContent,
      isPublicToPlayers,
      secrets,
      attributes,
    });
  });

  return { summaryNotes, entities };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo PDF local.'));
    reader.readAsDataURL(file);
  });
}

type ClientPdfPart =
  | { inlineData: { mimeType: 'application/pdf'; data: string } }
  | { fileData: { mimeType: 'application/pdf'; fileUri: string } };

async function uploadPdfClientToGeminiFiles(
  apiKey: string,
  file: File
): Promise<{ fileUri: string; fileName: string } | null> {
  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(
      apiKey
    )}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(file.size),
        'X-Goog-Upload-Header-Content-Type': 'application/pdf',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: file.name } }),
    }
  );
  if (!startRes.ok) return null;
  const uploadUrl = startRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) return null;

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(file.size),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: file,
  });
  if (!uploadRes.ok) return null;
  const info = (await uploadRes.json()) as {
    file?: { uri?: string; name?: string; state?: string };
  };
  let fileUri = info?.file?.uri;
  const fileName = info?.file?.name;
  let state = info?.file?.state;
  if (!fileUri || !fileName) return null;

  for (let i = 0; i < 10 && state === 'PROCESSING'; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const checkRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${encodeURIComponent(
        apiKey
      )}`
    );
    if (!checkRes.ok) break;
    const checkData = (await checkRes.json()) as { uri?: string; state?: string };
    state = checkData.state;
    if (checkData.uri) fileUri = checkData.uri;
  }

  if (state === 'FAILED') return null;
  return { fileUri, fileName };
}

async function extractPdfClientFallback(params: {
  file: File;
  apiKey: string;
  campaignName?: string;
  campaignSystem?: string;
  worldContext?: string;
  customInstructions?: string;
  existingEntityNames?: string[];
}): Promise<PdfWikiExtractionResult> {
  const cleanKey = sanitizeGeminiKey(params.apiKey);
  if (!cleanKey || cleanKey.length < 10) {
    return {
      ok: false,
      summaryNotes: '',
      entities: [],
      errorReason: 'no_api_key',
    };
  }

  let pdfPart: ClientPdfPart;
  let uploadedFileName: string | null = null;

  if (params.file.size <= 12 * 1024 * 1024) {
    const pdfBase64 = await fileToBase64(params.file);
    pdfPart = { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } };
  } else {
    const uploaded = await uploadPdfClientToGeminiFiles(cleanKey, params.file);
    if (!uploaded) {
      return {
        ok: false,
        summaryNotes: '',
        entities: [],
        errorReason: 'network_or_parse_error',
      };
    }
    uploadedFileName = uploaded.fileName;
    pdfPart = { fileData: { mimeType: 'application/pdf', fileUri: uploaded.fileUri } };
  }
  const existingList = (params.existingEntityNames || []).slice(0, 80);
  const prompt = [
    'Você é um assistente especialista em RPG de mesa e construção de Wiki de campanha (Obsidian Codex).',
    'Analise o PDF anexado e extraia personagens (npc), locais (location), itens (item), informações/história (lore), facções (faction) e monstros (monster).',
    params.campaignName ? `Campanha: ${params.campaignName}` : '',
    params.campaignSystem ? `Sistema: ${params.campaignSystem}` : '',
    params.worldContext ? `Contexto atual do mundo:\n${params.worldContext.slice(0, 1500)}` : '',
    existingList.length > 0 ? `Entidades já existentes na Wiki: ${existingList.join(', ')}` : '',
    params.customInstructions ? `Instrução específica do Mestre: ${params.customInstructions}` : '',
    'Retorne JSON com { "summaryNotes": "...", "entities": [{ "name", "subtitle", "category": "npc|faction|location|item|monster|lore", "tags": [], "summary", "publicContent", "isPublicToPlayers": boolean, "secrets": [{"title", "content"}], "attributes": [{"label", "value"}] }] }.',
    'Responda em Português do Brasil. Extraia no máximo 30 entidades.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const discovered = await discoverClientModels(cleanKey);
  const modelsToTry = discovered.ok
    ? discovered.models.slice(0, 4)
    : PREFERRED_GEMINI_MODELS;

  let lastStatus = 500;
  try {
    for (const model of modelsToTry) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(cleanKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [pdfPart, { text: prompt }],
              },
            ],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    lastStatus = res.status;
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) break;
      continue;
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
    };
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const nonThought = parts.filter((p) => !p.thought && typeof p.text === 'string');
    const texts =
      nonThought.length > 0
        ? nonThought.map((p) => p.text || '')
        : parts.map((p) => p.text || '').filter(Boolean);

        for (let i = texts.length - 1; i >= 0; i--) {
          const parsed = extractJsonObject(texts[i]);
          if (parsed && Array.isArray(parsed.entities)) {
            const normalized = normalizeExtractedWikiPayload(parsed);
            return {
              ok: true,
              summaryNotes: normalized.summaryNotes,
              entities: normalized.entities,
              modelUsed: model,
            };
          }
        }
    }
  } finally {
    if (uploadedFileName) {
      await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${uploadedFileName}?key=${encodeURIComponent(
          cleanKey
        )}`,
        { method: 'DELETE' }
      ).catch(() => {});
    }
  }

  return {
    ok: false,
    summaryNotes: '',
    entities: [],
    errorReason: `http_${lastStatus}`,
  };
}

export async function extractWikiEntitiesFromPdf(params: {
  file: File;
  apiKey?: string;
  campaignName?: string;
  campaignSystem?: string;
  worldContext?: string;
  customInstructions?: string;
  existingEntityNames?: string[];
  onProgress?: (stage: string) => void;
}): Promise<PdfWikiExtractionResult> {
  const { file, apiKey, onProgress } = params;

  if (file.size > 50 * 1024 * 1024) {
    return {
      ok: false,
      summaryNotes: '',
      entities: [],
      errorReason: 'file_too_large',
    };
  }

  const cleanKey = sanitizeGeminiKey(apiKey);

  // 1. Tenta via Convex Storage + Action (protege chave do servidor se houver)
  try {
    onProgress?.('Enviando PDF para processamento seguro...');
    const uploadUrl = await convexClient.mutation(api.files.generateUploadUrl, {});
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/pdf' },
      body: file,
    });

    if (uploadRes.ok) {
      const { storageId } = (await uploadRes.json()) as { storageId: Id<'_storage'> };
      onProgress?.('Lendo PDF e extraindo entidades com Gemini...');
      const actionRes = await convexClient.action(api.ai.extractWikiFromPdf, {
        storageId,
        userApiKey: cleanKey || undefined,
        campaignName: params.campaignName,
        campaignSystem: params.campaignSystem,
        worldContext: params.worldContext,
        customInstructions: params.customInstructions,
        existingEntityNames: params.existingEntityNames,
      });

      if (actionRes.ok && actionRes.parsed) {
        const normalized = normalizeExtractedWikiPayload(
          actionRes.parsed as Record<string, unknown>
        );
        return {
          ok: true,
          summaryNotes: normalized.summaryNotes,
          entities: normalized.entities,
          modelUsed: actionRes.modelUsed,
        };
      }

      if (actionRes.reason === 'no_api_key' || actionRes.reason === 'file_too_large') {
        return {
          ok: false,
          summaryNotes: '',
          entities: [],
          errorReason: actionRes.reason,
        };
      }
    }
  } catch (err) {
    console.warn('Falha ao processar PDF via Convex Action, tentando fallback direto:', err);
  }

  // 2. Fallback direto do navegador se o usuário tiver chave Gemini cadastrada
  if (cleanKey && cleanKey.length >= 10) {
    try {
      onProgress?.('Analisando PDF diretamente com sua chave Gemini...');
      return await extractPdfClientFallback({
        file,
        apiKey: cleanKey,
        campaignName: params.campaignName,
        campaignSystem: params.campaignSystem,
        worldContext: params.worldContext,
        customInstructions: params.customInstructions,
        existingEntityNames: params.existingEntityNames,
      });
    } catch {
      return {
        ok: false,
        summaryNotes: '',
        entities: [],
        errorReason: 'network_or_parse_error',
      };
    }
  }

  return {
    ok: false,
    summaryNotes: '',
    entities: [],
    errorReason: cleanKey ? 'network_or_parse_error' : 'no_api_key',
  };
}
