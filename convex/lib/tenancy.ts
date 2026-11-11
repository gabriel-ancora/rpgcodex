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
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

async function findCampaignByAnyId(
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
  if (!user) {
    return "player";
  }

  if (opts.campaignId) {
    const camp = await findCampaignByAnyId(ctx, opts.campaignId);
    if (camp && camp.dmUserId) {
      if (camp.dmUserId === user.id) {
        return opts.viewerRole ?? "gm";
      }
      // Mesmo se user.role === "dm", em campanha de outro Mestre ele vê estritamente como jogador
      return "player";
    }
  }

  return user.role === "dm" ? (opts.viewerRole ?? "gm") : "player";
}

/**
 * Garante que apenas o Mestre autenticado daquela campanha possa executar mutações exclusivas do Mestre.
 */
export async function assertDmPermission(
  ctx: MutationCtx,
  sessionToken?: string,
  campaignId?: string
) {
  const user = await getSessionUser(ctx, sessionToken);
  if (!user) {
    throw new Error("Sessão expirada ou não autenticada. Faça login novamente.");
  }

  if (campaignId) {
    const camp = await findCampaignByAnyId(ctx, campaignId);
    if (camp && camp.dmUserId) {
      if (camp.dmUserId === user.id) return user;
      throw new Error(
        "Acesso negado: apenas o Mestre desta campanha pode realizar esta ação."
      );
    }
  }

  if (user.role === "dm") return user;

  throw new Error(
    "Acesso negado: apenas o Mestre desta campanha pode realizar esta ação."
  );
}
