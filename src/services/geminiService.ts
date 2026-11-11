import { Entity, ThreatFront, GeneratedEmergencyItem } from '../types/campaign';
import { convexClient } from '../convexClient';
import { api } from '../../convex/_generated/api';
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
