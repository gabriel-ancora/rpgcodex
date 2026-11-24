import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id, TableNames } from "../_generated/dataModel";

/**
 * Autorização multi-tenant.
 *
 * Regras:
 * - Toda função que toca dados de campanha exige um `sessionToken` válido.
 * - Um usuário é Mestre de uma campanha somente se `camp.dmUserId === user.id`.
 *   O campo global `users.role` NUNCA é usado para autorização.
 * - Membro = Mestre, ou presente em `campaignMembers`, ou (legado) em `campaigns.memberUserIds`.
 * - Campanha inexistente => acesso negado.
 */

type Ctx = QueryCtx | MutationCtx;

export const ERR_SESSION = "Sessão expirada. Entre novamente.";
export const ERR_NOT_FOUND = "Registro não encontrado.";
export const ERR_CAMPAIGN_NOT_FOUND = "Campanha não encontrada.";
export const ERR_NOT_MEMBER = "Você não participa desta campanha.";
export const ERR_NOT_DM = "Apenas o Mestre desta campanha pode realizar esta ação.";

export type ViewerRole = "gm" | "player";

export function normalizeCampaignId(campaignId?: string): string {
  return campaignId?.trim() || "";
}

/**
 * Busca o usuário autenticado a partir do sessionToken, validando expiração.
 */
export async function getSessionUser(ctx: Ctx, sessionToken?: string) {
  if (!sessionToken) return null;
  const session = await ctx.db
    .query("userSessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .first();

  if (!session) return null;
  if (session.expiresAt < Date.now()) return null;

  const user = await ctx.db.get(session.userId);
  if (!user) return null;

  return {
    id: user._id as string,
    name: user.name,
    email: user.email,
    // Preferência de interface legada (não autoriza nada).
    role: (user.role ?? "player") as "dm" | "player",
    avatarUrl: user.avatarUrl,
  };
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export async function requireUser(ctx: Ctx, sessionToken?: string): Promise<SessionUser> {
  const user = await getSessionUser(ctx, sessionToken);
  if (!user) throw new Error(ERR_SESSION);
  return user;
}

export async function findCampaignByAnyId(ctx: Ctx, campaignId?: string) {
  const norm = normalizeCampaignId(campaignId);
  if (!norm) return null;

  const bySlug = await ctx.db
    .query("campaigns")
    .withIndex("by_slug", (q) => q.eq("slugId", norm))
    .first();
  if (bySlug) return bySlug;

  const docId = ctx.db.normalizeId("campaigns", norm);
  if (docId) return await ctx.db.get(docId);
  return null;
}

/** Identificador canônico com que os registros da campanha são gravados. */
export function canonicalCampaignId(camp: Doc<"campaigns">): string {
  return camp.slugId || camp._id;
}

/**
 * Todas as chaves pelas quais registros desta campanha podem ter sido gravados
 * (slug canônico e, para dados antigos, o _id do documento).
 */
export function campaignKeys(camp: Doc<"campaigns">): string[] {
  return Array.from(new Set([camp.slugId, camp._id].filter(Boolean) as string[]));
}

export async function isCampaignMember(
  ctx: Ctx,
  camp: Doc<"campaigns">,
  userId: string
): Promise<boolean> {
  if (camp.dmUserId === userId) return true;
  if ((camp.memberUserIds || []).includes(userId)) return true;
  const row = await ctx.db
    .query("campaignMembers")
    .withIndex("by_campaign_user", (q) => q.eq("campaignDocId", camp._id).eq("userId", userId))
    .first();
  return Boolean(row);
}

export type MemberAccess = {
  user: SessionUser;
  camp: Doc<"campaigns">;
  isDm: boolean;
  canonicalId: string;
  keys: string[];
};

/** Exige sessão válida e participação (Mestre ou jogador) na campanha. */
export async function requireMember(
  ctx: Ctx,
  sessionToken: string | undefined,
  campaignId: string | undefined
): Promise<MemberAccess> {
  const user = await requireUser(ctx, sessionToken);
  const camp = await findCampaignByAnyId(ctx, campaignId);
  if (!camp) throw new Error(ERR_CAMPAIGN_NOT_FOUND);
  const isDm = Boolean(camp.dmUserId) && camp.dmUserId === user.id;
  if (!isDm && !(await isCampaignMember(ctx, camp, user.id))) {
    throw new Error(ERR_NOT_MEMBER);
  }
  return { user, camp, isDm, canonicalId: canonicalCampaignId(camp), keys: campaignKeys(camp) };
}

/**
 * Variante para queries reativas: retorna `null` em vez de lançar quando não há
 * sessão/participação, para que assinaturas antigas (campanha trocada ou excluída,
 * sessão expirada) recebam um resultado vazio sem derrubar a interface.
 * Nenhum dado é retornado sem participação.
 */
export async function memberOrNull(
  ctx: Ctx,
  sessionToken: string | undefined,
  campaignId: string | undefined
): Promise<MemberAccess | null> {
  try {
    return await requireMember(ctx, sessionToken, campaignId);
  } catch {
    return null;
  }
}

/** Exige sessão válida e que o usuário seja o Mestre da campanha. */
export async function requireDm(
  ctx: Ctx,
  sessionToken: string | undefined,
  campaignId: string | undefined
): Promise<MemberAccess> {
  const access = await requireMember(ctx, sessionToken, campaignId);
  if (!access.isDm) throw new Error(ERR_NOT_DM);
  return access;
}

/**
 * Papel efetivo de visualização. Mestres podem pedir `viewerRole: "player"` para
 * pré-visualizar a visão dos jogadores; jogadores nunca recebem a visão do Mestre.
 */
export function effectiveRole(access: MemberAccess, requested?: ViewerRole): ViewerRole {
  if (!access.isDm) return "player";
  return requested ?? "gm";
}

/** Retorna o registro pelo id (string) ou lança `Registro não encontrado.` */
export async function getOrThrow<T extends TableNames>(
  ctx: Ctx,
  table: T,
  id: string
): Promise<Doc<T>> {
  const docId = ctx.db.normalizeId(table, id);
  if (!docId) throw new Error(ERR_NOT_FOUND);
  const doc = await ctx.db.get(docId as Id<T>);
  if (!doc) throw new Error(ERR_NOT_FOUND);
  return doc as Doc<T>;
}

/** Tabelas com campo `campaignId` e índice `by_campaign`. */
export type CampaignScopedTable =
  | "entities"
  | "relationships"
  | "graphPositions"
  | "manualGraphNodes"
  | "campaignMaps"
  | "calendars"
  | "timelineEvents"
  | "threatFronts"
  | "mysteryScenes"
  | "combatants"
  | "combatState"
  | "diceRolls"
  | "scratchpadNotes"
  | "quests"
  | "journalEntries"
  | "personalJournalNotes"
  | "partyResources"
  | "characterSheets";

/** Coleta os registros de uma campanha via índice `by_campaign` (todas as chaves da campanha). */
export async function collectByCampaign<T extends CampaignScopedTable>(
  ctx: Ctx,
  table: T,
  keys: string[]
): Promise<Doc<T>[]> {
  const out: Doc<T>[] = [];
  for (const key of keys) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (ctx.db.query(table) as any)
      .withIndex("by_campaign", (q: any) => q.eq("campaignId", key))
      .collect();
    out.push(...(rows as Doc<T>[]));
  }
  return out;
}

/** Primeiro registro da campanha em uma tabela (calendário, recursos, estado de combate). */
export async function firstByCampaign<T extends CampaignScopedTable>(
  ctx: Ctx,
  table: T,
  keys: string[]
): Promise<Doc<T> | null> {
  for (const key of keys) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (ctx.db.query(table) as any)
      .withIndex("by_campaign", (q: any) => q.eq("campaignId", key))
      .first();
    if (row) return row as Doc<T>;
  }
  return null;
}

/** Exige que o Mestre da campanha à qual o registro pertence esteja autenticado. */
export async function requireDmOfRecord(
  ctx: Ctx,
  sessionToken: string | undefined,
  recordCampaignId: string | undefined
): Promise<MemberAccess> {
  if (!normalizeCampaignId(recordCampaignId)) throw new Error(ERR_CAMPAIGN_NOT_FOUND);
  return await requireDm(ctx, sessionToken, recordCampaignId);
}

/**
 * Garante que um arquivo do storage foi enviado pelo próprio usuário
 * (registrado em `pendingUploads` por files.generateUploadUrl + files.resolveStorageUrl).
 */
export async function assertUploadOwnedBy(
  ctx: Ctx,
  storageId: Id<"_storage">,
  userId: string
) {
  const row = await ctx.db
    .query("pendingUploads")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .first();
  if (!row || row.userId !== userId) {
    throw new Error("Arquivo não encontrado ou não pertence a este usuário.");
  }
  return row;
}

/** Exige que o usuário participe da campanha à qual o registro pertence. */
export async function requireMemberOfRecord(
  ctx: Ctx,
  sessionToken: string | undefined,
  recordCampaignId: string | undefined
): Promise<MemberAccess> {
  if (!normalizeCampaignId(recordCampaignId)) throw new Error(ERR_CAMPAIGN_NOT_FOUND);
  return await requireMember(ctx, sessionToken, recordCampaignId);
}
