import { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Normaliza o campaignId recebido com isolamento estrito Multi-Tenancy.
 */
export function normalizeCampaignId(campaignId?: string): string {
  return campaignId?.trim() || "";
}

export function matchesCampaign(
  recordCampaignId: string | undefined,
  requestedCampaignId?: string
): boolean {
  const target = normalizeCampaignId(requestedCampaignId);
  if (!target) return false;
  return recordCampaignId === target;
}

/**
 * Busca o usuário autenticado a partir do sessionToken, validando expiração.
 */
export async function getSessionUser(
  ctx: QueryCtx | MutationCtx,
  sessionToken?: string
) {
  if (!sessionToken) return null;
  const session = await ctx.db
    .query("userSessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .first();

  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    return null;
  }

  const user = await ctx.db.get(session.userId);
  if (!user) return null;

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: session.sessionRole ?? user.role,
    sessionRole: session.sessionRole ?? null,
    avatarUrl: user.avatarUrl,
  };
}

export async function requireSessionUser(
  ctx: QueryCtx | MutationCtx,
  sessionToken?: string
) {
  const user = await getSessionUser(ctx, sessionToken);
  if (!user) {
    throw new Error("Sessão expirada ou não autenticada. Faça login novamente.");
  }
  return user;
}

export async function findCampaignByAnyId(
  ctx: QueryCtx | MutationCtx,
  campaignId?: string
) {
  const norm = normalizeCampaignId(campaignId);
  if (!norm) return null;

  const bySlug = await ctx.db
    .query("campaigns")
    .withIndex("by_slug", (q) => q.eq("slugId", norm))
    .first();
  if (bySlug) return bySlug;

  const docId = ctx.db.normalizeId("campaigns", norm);
  if (docId) {
    return await ctx.db.get(docId);
  }
  return null;
}

/**
 * Determina o papel efetivo de visualização ("gm" ou "player") para aplicar
 * a Névoa de Guerra diretamente no servidor Convex.
 * Sempre valida a titularidade por campanha (mesma conta pode ser Mestre aqui e Jogador em outra mesa).
 */
export async function resolveEffectiveRole(
  ctx: QueryCtx | MutationCtx,
  opts: {
    sessionToken?: string;
    viewerRole?: "gm" | "player";
    campaignId?: string;
  }
): Promise<"gm" | "player"> {
  const user = await getSessionUser(ctx, opts.sessionToken);
  if (!user || user.role !== "dm") {
    return "player";
  }

  if (opts.campaignId) {
    const camp = await findCampaignByAnyId(ctx, opts.campaignId);
    if (!camp) {
      return "player";
    }
    if (camp.dmUserId) {
      if (camp.dmUserId === user.id) {
        return opts.viewerRole ?? "gm";
      }
      // Mesmo no Modo Mestre, em campanha de outro Mestre ele vê estritamente como jogador
      return "player";
    }
    const isMember =
      !camp.memberUserIds?.length || camp.memberUserIds.includes(user.id);
    if (isMember) {
      return opts.viewerRole ?? "gm";
    }
    return "player";
  }

  return opts.viewerRole ?? "gm";
}

/**
 * Garante que apenas um membro autenticado (Mestre ou jogador participante) da campanha execute a mutação.
 */
export async function assertCampaignMember(
  ctx: MutationCtx,
  sessionToken?: string,
  campaignId?: string
) {
  const user = await requireSessionUser(ctx, sessionToken);
  const norm = normalizeCampaignId(campaignId);
  if (!norm) {
    throw new Error("Campanha não especificada.");
  }

  const camp = await findCampaignByAnyId(ctx, norm);
  if (!camp) {
    throw new Error("Campanha não encontrada.");
  }

  const isDm =
    user.role === "dm" &&
    (camp.dmUserId
      ? camp.dmUserId === user.id
      : !camp.memberUserIds?.length || camp.memberUserIds.includes(user.id));
  const isMember =
    camp.dmUserId === user.id || Boolean(camp.memberUserIds?.includes(user.id));

  if (!isMember) {
    throw new Error("Acesso negado: você não participa desta campanha.");
  }

  return { user, camp, isDm };
}

/**
 * Garante que apenas o Mestre autenticado daquela campanha possa executar mutações exclusivas do Mestre.
 */
export async function assertDmPermission(
  ctx: MutationCtx,
  sessionToken?: string,
  campaignId?: string
) {
  const user = await requireSessionUser(ctx, sessionToken);
  if (user.role !== "dm") {
    throw new Error(
      "Acesso negado: sua sessão está no Modo Jogador e não pode alterar recursos do Mestre."
    );
  }

  if (campaignId) {
    const camp = await findCampaignByAnyId(ctx, campaignId);
    if (!camp) {
      throw new Error("Campanha não encontrada.");
    }
    if (camp.dmUserId) {
      if (camp.dmUserId === user.id) return user;
      throw new Error(
        "Acesso negado: apenas o Mestre desta campanha pode realizar esta ação."
      );
    }
    const isMember =
      !camp.memberUserIds?.length || camp.memberUserIds.includes(user.id);
    if (isMember) return user;
    throw new Error(
      "Acesso negado: apenas o Mestre desta campanha pode realizar esta ação."
    );
  }

  return user;
}
