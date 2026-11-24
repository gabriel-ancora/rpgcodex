import { Entity, EntityCategory, ThreatFront, GeneratedEmergencyItem } from '../types/campaign';
import { convexClient } from '../convexClient';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useCampaignStore } from '../store/useCampaignStore';
import { convexErrorMessage } from '../utils/sheetPayload';
import {
  generateEmergencyLoot,
  generateEmergencyNPC,
  generateEmergencyRumor,
  generateEmergencyTavern,
  makeCompactHandle,
} from '../data/emergencyGenerators';

/**
 * IA (Google Gemini) — somente pelo servidor.
 *
 * Toda chamada passa pelas actions `api.ai.*` do Convex com `sessionToken` + `campaignId`.
 * O navegador nunca fala com a API do Google e a chave do usuário nunca vai em URL:
 * ela trafega apenas no corpo da action. Cada pedido é feito uma única vez (sem laço de tentativas).
 */

export function sanitizeGeminiKey(raw?: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Disponibilidade de chave e mensagens
// ---------------------------------------------------------------------------

/** campanha → o servidor tem chave própria? (descoberto por validateKey ou por respostas anteriores) */
const serverKeyKnown = new Map<string, boolean>();

const REASON_MESSAGES: Record<string, string> = {
  no_api_key: 'Nenhuma chave da API Gemini configurada. Informe a sua em Configurações.',
  rate_limited: 'Limite de chamadas de IA por hora atingido. Tente novamente mais tarde.',
  file_not_found: 'Arquivo não encontrado no servidor. Envie o PDF novamente.',
  file_too_large: 'O PDF excede o limite de 15 MB.',
  network_or_parse_error: 'Erro de rede ao conectar à API Gemini.',
  http_400: 'A API Gemini recusou a requisição (dados inválidos ou modelo incompatível).',
  http_401: 'Chave da API Gemini inválida ou sem permissão.',
  http_403: 'Chave da API Gemini inválida ou sem permissão.',
  http_429: 'Limite de uso da API Gemini atingido. Tente novamente mais tarde.',
  http_422: 'A IA não retornou uma resposta no formato esperado.',
};

/** Mensagem em PT-BR para um `reason` do servidor (usa a mensagem do servidor quando existe). */
export function aiFailureMessage(reason: string, serverMessage?: string): string {
  return serverMessage || REASON_MESSAGES[reason] || 'Não foi possível usar a IA agora.';
}

function currentAuth() {
  const s = useCampaignStore.getState();
  return { sessionToken: s.sessionToken ?? '', campaignId: s.activeCampaignId };
}

/** Há chave utilizável sem gastar uma chamada? `unknown` quando só o servidor poderia ter uma. */
function keyAvailability(userKey: string, campaignId: string): 'yes' | 'no' | 'unknown' {
  if (userKey.length >= 10) return 'yes';
  const known = serverKeyKnown.get(campaignId);
  if (known === undefined) return 'unknown';
  return known ? 'yes' : 'no';
}

export async function validateGeminiKey(
  apiKey?: string
): Promise<{ valid: boolean; message: string; hasServerKey?: boolean }> {
  const { sessionToken, campaignId } = currentAuth();
  const cleaned = sanitizeGeminiKey(apiKey);
  try {
    const res = await convexClient.action(api.ai.validateKey, {
      sessionToken,
      campaignId: campaignId || undefined,
      apiKey: cleaned || undefined,
    });
    if (campaignId && res.hasServerKey !== undefined) serverKeyKnown.set(campaignId, res.hasServerKey);
    return res;
  } catch (err) {
    return { valid: false, message: convexErrorMessage(err) };
  }
}

/** Antes de gastar upload/cota: existe chave do usuário ou do servidor? */
export async function checkAiKeyAvailable(
  userKey: string
): Promise<{ ok: true } | { ok: false; reason: string; message: string }> {
  const { campaignId } = currentAuth();
  const state = keyAvailability(userKey, campaignId);
  if (state === 'yes') return { ok: true };
  if (state === 'unknown') {
    const res = await validateGeminiKey(undefined);
    if (res.hasServerKey) return { ok: true };
  }
  return { ok: false, reason: 'no_api_key', message: REASON_MESSAGES.no_api_key };
}

// ---------------------------------------------------------------------------
// Prompts e itens gerados
// ---------------------------------------------------------------------------

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
    tavern:
      'um NOVO Ponto de Interesse / Estabelecimento com Nome Próprio curto (ex: estalagem, santuário, marco histórico, forja), atmosfera sensorial, anfitrião e segredo oculto',
    rumor:
      'um NOVO Rumor / Pista Investigativa com título curto impactante, o que o povo comenta e a verdade oculta nos bastidores',
    loot: 'uma NOVA Relíquia / Espólio com Nome Próprio curto, aparência física, efeito mecânico compatível com D&D 5.5e e história oculta',
  };

  const hasExistingHandles =
    ctx.activeFactions.length > 0 || ctx.existingNpcs.length > 0 || ctx.existingLocations.length > 0;

  const worldContextBlock = ctx.worldContext?.trim()
    ? `\n=== JANELA DE CONTEXTO DO MUNDO (LORE DE REFERÊNCIA DO CÓDICE) ===\n${ctx.worldContext.trim()}\n`
    : '';

  return `Você é um Mestre de RPG de Mesa especialista em Design Narrativo.
Com base na lore e no estado da campanha abaixo, crie ${typeLabelMap[type]}.
${worldContextBlock}
=== ESTADO ATUAL DO CÓDICE ===
• Campanha: ${ctx.campaignName || 'Campanha Atual'} (Tom: ${ctx.campaignTone})
• Local Atual da Cena: ${ctx.currentLocationHandle || 'Contexto geral da campanha'}
• Facções Ativas: ${ctx.activeFactions.join(', ') || 'Nenhuma registrada ainda'}
• NPCs Conhecidos: ${ctx.existingNpcs.join(', ') || 'Nenhum registrado ainda'}
• Locais Registrados: ${ctx.existingLocations.join(', ') || 'Nenhum registrado ainda'}
• Frentes de Ameaça Ativas: ${
    ctx.activeFronts.map((f) => `${f.name} (Destino: ${f.doom})`).join(' | ') || 'Nenhuma frente ativa no momento'
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
export function sanitizeGeneratedItemFields(item: GeneratedEmergencyItem): GeneratedEmergencyItem {
  let cleanTitle = (item.title || 'Criação Contextual').trim();
  const extraDetails = [...(item.details || [])];

  // Título com parágrafo longo: extrai um título curto e preserva o texto nos detalhes.
  if (cleanTitle.length > 65) {
    const firstClause = cleanTitle.split(/[.:;!?—–\n]/)[0].trim();
    if (firstClause.length >= 4 && firstClause.length <= 55) {
      cleanTitle = firstClause;
    } else {
      const words = cleanTitle.split(/\s+/).slice(0, 5).join(' ');
      cleanTitle = `${words}...`;
    }
    if (!extraDetails.some((d) => d.value.includes(item.title.slice(0, 30)))) {
      extraDetails.unshift({ label: 'Contexto de origem', value: item.title, isSecret: false });
    }
  }

  const cleanSubtitle = (item.subtitle || 'Registro contextual').trim().slice(0, 90);
  const compactHandle = makeCompactHandle(
    item.rawHandle && item.rawHandle.length <= 24 ? item.rawHandle : cleanTitle,
    item.type === 'npc' ? 'Npc' : item.type === 'tavern' ? 'Local' : 'Item'
  );

  return { ...item, title: cleanTitle, subtitle: cleanSubtitle, rawHandle: compactHandle, details: extraDetails };
}

function buildItemFromParsedJson(
  parsed: Record<string, unknown>,
  type: 'npc' | 'tavern' | 'rumor' | 'loot',
  currentLocationHandle: string,
  activeFactions: string[]
): GeneratedEmergencyItem {
  const titleStr = typeof parsed.title === 'string' ? parsed.title.trim() : 'Criação Contextual';
  const subtitleStr = typeof parsed.subtitle === 'string' ? parsed.subtitle.trim() : 'Gerado por IA';
  const rawHandleSource =
    typeof parsed.rawHandle === 'string' && parsed.rawHandle.trim().length <= 24 ? parsed.rawHandle.trim() : titleStr;

  const rawDetails = Array.isArray(parsed.details)
    ? parsed.details
        .filter(
          (d): d is { label?: unknown; value?: unknown; isSecret?: unknown } => typeof d === 'object' && d !== null
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
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    aiGenerated: true,
    contextUsed: `Local: ${currentLocationHandle || 'Geral'} | Facções: ${activeFactions.join(', ') || 'Nenhuma'}`,
  });
}

// ---------------------------------------------------------------------------
// Gerador de emergência
// ---------------------------------------------------------------------------

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
  /** Motivo (`reason` do servidor) pelo qual o motor local foi usado; ausente se simplesmente não há chave. */
  fallbackReason?: string;
  /** Mensagem em PT-BR para exibir ao Mestre quando a IA falhou. */
  errorMessage?: string;
}> {
  const activeFactions = entities.filter((e) => e.category === 'faction').map((e) => `${e.mentionPrefix}${e.handle}`);
  const existingNpcs = entities.filter((e) => e.category === 'npc').map((e) => `${e.mentionPrefix}${e.handle}`);
  const existingLocations = entities.filter((e) => e.category === 'location').map((e) => `${e.mentionPrefix}${e.handle}`);
  const currentLocationHandle = sceneLocationHandle?.trim() || existingLocations[0] || '';

  const systemPrompt = buildContextualSystemPrompt(type, {
    campaignName: campaignName || 'Campanha Atual',
    campaignTone: campaignTone || 'Fantasia & Investigação',
    worldContext,
    currentLocationHandle,
    activeFactions,
    existingNpcs,
    existingLocations,
    activeFronts: fronts.filter((f) => f.status === 'active').map((f) => ({ name: f.name, doom: f.impendingDoom })),
    customPromptHint,
  });

  const cleanKey = sanitizeGeminiKey(apiKey);
  const { sessionToken, campaignId } = currentAuth();
  let fallbackReason: string | undefined;
  let errorMessage: string | undefined;

  // Uma única chamada ao servidor; sem chave conhecida não há chamada (e nada é cobrado da cota).
  if (keyAvailability(cleanKey, campaignId) !== 'no') {
    try {
      const res = await convexClient.action(api.ai.generateEmergency, {
        sessionToken,
        campaignId,
        systemPrompt,
        userApiKey: cleanKey || undefined,
      });
      if (res.ok && res.parsed) {
        if (res.usedServerKey) serverKeyKnown.set(campaignId, true);
        return {
          item: buildItemFromParsedJson(res.parsed, type, currentLocationHandle, activeFactions),
          promptUsed: systemPrompt,
          usedLiveGemini: true,
        };
      }
      if (!res.ok) {
        if (res.reason === 'no_api_key') {
          serverKeyKnown.set(campaignId, false);
          // Sem chave em lugar nenhum: o motor local é o comportamento esperado, não um erro.
          if (cleanKey) {
            fallbackReason = res.reason;
            errorMessage = aiFailureMessage(res.reason, res.message);
          }
        } else {
          fallbackReason = res.reason;
          errorMessage = aiFailureMessage(res.reason, res.message);
        }
      }
    } catch (err) {
      fallbackReason = 'network_or_parse_error';
      errorMessage = convexErrorMessage(err);
    }
  }

  // Motor procedural local (não usa IA).
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
      contextUsed: `Motor local | Local: ${currentLocationHandle || 'Geral'}`,
    }),
    promptUsed: systemPrompt,
    usedLiveGemini: false,
    fallbackReason,
    errorMessage,
  };
}

// ---------------------------------------------------------------------------
// Importação de PDF para o códice
// ---------------------------------------------------------------------------

export interface ExtractedWikiEntity {
  tempId: string;
  name: string;
  subtitle: string;
  category: EntityCategory;
  tags: string[];
  summary: string;
  publicContent: string;
  /** Sempre false: nada extraído por IA é publicado para jogadores automaticamente. */
  isPublicToPlayers: boolean;
  secrets: { title: string; content: string }[];
  attributes: { label: string; value: string }[];
}

export interface PdfWikiExtractionResult {
  ok: boolean;
  summaryNotes: string;
  entities: ExtractedWikiEntity[];
  modelUsed?: string;
  /** `reason` do servidor (no_api_key, rate_limited, file_too_large, http_xxx...). */
  errorReason?: string;
  /** Mensagem em PT-BR pronta para exibir. */
  errorMessage?: string;
}

const VALID_CATEGORIES: EntityCategory[] = ['npc', 'faction', 'location', 'item', 'monster', 'lore'];

function normalizeExtractedWikiPayload(raw: Record<string, unknown>): {
  summaryNotes: string;
  entities: ExtractedWikiEntity[];
} {
  const summaryNotes =
    typeof raw.summaryNotes === 'string' && raw.summaryNotes.trim()
      ? raw.summaryNotes.trim()
      : 'Documento PDF processado.';

  const rawEntities = Array.isArray(raw.entities) ? raw.entities : [];
  const entities: ExtractedWikiEntity[] = [];

  rawEntities.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const obj = item as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    if (!name) return;

    const rawCat = typeof obj.category === 'string' ? obj.category.toLowerCase().trim() : 'lore';
    const category: EntityCategory = VALID_CATEGORIES.includes(rawCat as EntityCategory)
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
      typeof obj.summary === 'string' && obj.summary.trim() ? obj.summary.trim() : `Informações sobre ${name}.`;
    const publicContent =
      typeof obj.publicContent === 'string' && obj.publicContent.trim() ? obj.publicContent.trim() : summary;

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
      isPublicToPlayers: false,
      secrets,
      attributes,
    });
  });

  return { summaryNotes, entities };
}

function pdfFailure(reason: string, message?: string): PdfWikiExtractionResult {
  return {
    ok: false,
    summaryNotes: '',
    entities: [],
    errorReason: reason,
    errorMessage: aiFailureMessage(reason, message),
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

  if (file.size > 15 * 1024 * 1024) return pdfFailure('file_too_large');

  const cleanKey = sanitizeGeminiKey(apiKey);

  // Sem chave (do usuário ou do servidor) não adianta enviar o arquivo.
  onProgress?.('Verificando a chave de API…');
  const availability = await checkAiKeyAvailable(cleanKey);
  if (!availability.ok) return pdfFailure(availability.reason, availability.message);

  const { sessionToken, campaignId } = currentAuth();
  try {
    onProgress?.('Enviando o PDF…');
    const uploadUrl = await convexClient.mutation(api.files.generateUploadUrl, {
      sessionToken,
      campaignId,
      purpose: 'pdf',
    });
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/pdf' },
      body: file,
    });
    if (!uploadRes.ok) return pdfFailure('network_or_parse_error', `Falha ao enviar o PDF (HTTP ${uploadRes.status}).`);
    const { storageId } = (await uploadRes.json()) as { storageId: Id<'_storage'> };

    onProgress?.('Lendo o PDF e extraindo entradas com Gemini…');
    const res = await convexClient.action(api.ai.extractWikiFromPdf, {
      sessionToken,
      campaignId,
      storageId,
      userApiKey: cleanKey || undefined,
      campaignName: params.campaignName,
      campaignSystem: params.campaignSystem,
      worldContext: params.worldContext,
      customInstructions: params.customInstructions,
      existingEntityNames: params.existingEntityNames,
    });

    if (res.ok && res.parsed) {
      const normalized = normalizeExtractedWikiPayload(res.parsed);
      return { ok: true, summaryNotes: normalized.summaryNotes, entities: normalized.entities, modelUsed: res.modelUsed };
    }
    if (!res.ok) return pdfFailure(res.reason, res.message);
    return pdfFailure('network_or_parse_error');
  } catch (err) {
    return pdfFailure('network_or_parse_error', convexErrorMessage(err));
  }
}
