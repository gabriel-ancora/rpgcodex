import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import {
  getSessionUser,
  findCampaignByAnyId,
  requireUser,
  isCampaignMember,
  SessionUser,
} from "./lib/tenancy";
import { sheetContentFields } from "./lib/characterValidators";

/** Torna todos os validadores de um objeto opcionais (para updates parciais). */
function optionalize<T extends Record<string, any>>(fields: T) {
  const out: Record<string, any> = {};
  for (const [key, validator] of Object.entries(fields)) {
    out[key] = validator.isOptional === "optional" ? validator : v.optional(validator);
  }
  return out as { [K in keyof T]: any };
}

/**
 * Resolve o identificador canônico (slugId) da campanha e valida que o usuário
 * participa dela. Fichas sempre são gravadas com o slug canônico, evitando que
 * a mesma campanha seja referenciada por _id em um lugar e slug em outro.
 */
async function resolveCampaignForUser(
  ctx: QueryCtx | MutationCtx,
  campaignId: string | undefined,
  user: SessionUser
) {
  const raw = campaignId?.trim() || "";
  if (!raw) return { canonicalId: "", camp: null as Doc<"campaigns"> | null };
  const camp = await findCampaignByAnyId(ctx, raw);
  if (!camp) {
    throw new Error("Campanha não encontrada. Verifique o vínculo da ficha.");
  }
  if (!(await isCampaignMember(ctx, camp, user.id))) {
    throw new Error("Você não participa desta campanha.");
  }
  return { canonicalId: camp.slugId || camp._id, camp };
}

async function canEditSheet(
  ctx: MutationCtx,
  sheet: Doc<"characterSheets">,
  user: SessionUser
) {
  if (sheet.playerId === user.id) return true;
  if (!sheet.campaignId) return false;
  const camp = await findCampaignByAnyId(ctx, sheet.campaignId);
  return camp?.dmUserId === user.id;
}

/**
 * Lista as fichas visíveis para o usuário:
 * - todas as fichas próprias (independente de campanha);
 * - todas as fichas da campanha informada, se o usuário for Mestre ou membro dela.
 */
export const list = query({
  args: {
    sessionToken: v.optional(v.string()),
    campaignId: v.optional(v.string()),
    // Mantidos por compatibilidade com clientes antigos; ignorados.
    playerId: v.optional(v.string()),
    includeAllPlayerSheets: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.sessionToken);
    if (!user) return [];

    const byId = new Map<string, Doc<"characterSheets">>();

    const own = await ctx.db
      .query("characterSheets")
      .withIndex("by_player", (q) => q.eq("playerId", user.id))
      .collect();
    for (const s of own) byId.set(s._id, s);

    if (args.campaignId?.trim()) {
      const camp = await findCampaignByAnyId(ctx, args.campaignId);
      if (camp && (await isCampaignMember(ctx, camp, user.id))) {
        // Fichas podem ter sido gravadas com o slug ou com o _id da campanha.
        const keys = Array.from(new Set([camp.slugId, camp._id].filter(Boolean) as string[]));
        for (const key of keys) {
          const rows = await ctx.db
            .query("characterSheets")
            .withIndex("by_campaign", (q) => q.eq("campaignId", key))
            .collect();
          for (const s of rows) byId.set(s._id, s);
        }
      }
    }

    return Array.from(byId.values())
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
      .map((s) => ({ ...s, id: s._id }));
  },
});

export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    campaignId: v.string(),
    campaignTitle: v.string(),
    // Ignorados: o dono é sempre o usuário autenticado.
    playerId: v.optional(v.string()),
    playerName: v.optional(v.string()),
    ...sheetContentFields,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    const { canonicalId, camp } = await resolveCampaignForUser(ctx, args.campaignId, user);
    if (!camp) {
      throw new Error("Selecione uma campanha em que você participa como jogador para criar uma ficha.");
    }
    if (camp.dmUserId === user.id) {
      throw new Error("Apenas jogadores da campanha podem criar fichas. O Mestre pode visualizar e editar as fichas criadas pelos jogadores.");
    }
    const { sessionToken: _t, playerId: _p, playerName: _n, ...data } = args;

    return await ctx.db.insert("characterSheets", {
      ...data,
      campaignId: canonicalId,
      campaignTitle: camp?.name || "",
      playerId: user.id,
      playerName: user.name || "Jogador",
      updatedAt: new Date().toISOString(),
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.string(),
    campaignId: v.optional(v.string()),
    campaignTitle: v.optional(v.string()),
    ...optionalize(sheetContentFields),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    const sheetId = ctx.db.normalizeId("characterSheets", args.id);
    if (!sheetId) throw new Error("Ficha inválida.");
    const existing = await ctx.db.get(sheetId);
    if (!existing) throw new Error("Ficha não encontrada.");
    if (!(await canEditSheet(ctx, existing, user))) {
      throw new Error("Sem permissão para alterar esta ficha.");
    }

    const { id: _id, sessionToken: _t, campaignId, campaignTitle: _ct, ...rest } = args;
    const patch: Record<string, unknown> = Object.fromEntries(
      Object.entries(rest).filter(([, val]) => val !== undefined)
    );

    if (campaignId !== undefined) {
      // Só o dono pode mover a ficha entre campanhas.
      if (existing.playerId !== user.id) {
        throw new Error("Apenas o dono da ficha pode trocar a campanha vinculada.");
      }
      const { canonicalId, camp } = await resolveCampaignForUser(ctx, campaignId, user);
      patch.campaignId = canonicalId;
      patch.campaignTitle = camp?.name || "";
    }

    await ctx.db.patch(sheetId, { ...patch, updatedAt: new Date().toISOString() });
  },
});

export const remove = mutation({
  args: {
    id: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    const sheetId = ctx.db.normalizeId("characterSheets", args.id);
    if (!sheetId) return;
    const existing = await ctx.db.get(sheetId);
    if (!existing) return;
    if (!(await canEditSheet(ctx, existing, user))) {
      throw new Error("Sem permissão para excluir esta ficha.");
    }
    await ctx.db.delete(sheetId);
  },
});
