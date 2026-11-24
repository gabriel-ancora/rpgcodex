import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  requireDm,
  requireDmOfRecord,
  memberOrNull,
  effectiveRole,
  collectByCampaign,
  getOrThrow,
  ERR_NOT_FOUND,
} from "./lib/tenancy";

const relTypeValidator = v.union(
  v.literal("hostile"),
  v.literal("allied"),
  v.literal("secret"),
  v.literal("neutral"),
  v.literal("patron"),
  v.literal("blood")
);

export const list = query({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    viewerRole: v.optional(v.union(v.literal("gm"), v.literal("player"))),
  },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return { relationships: [], positions: [], manualNodes: [] };
    const role = effectiveRole(access, args.viewerRole);

    const allRels = await collectByCampaign(ctx, "relationships", access.keys);
    const allPositions = await collectByCampaign(ctx, "graphPositions", access.keys);
    const allManual = await collectByCampaign(ctx, "manualGraphNodes", access.keys);

    let relationships = allRels;
    let positions = allPositions;
    let manualNodes = allManual;

    if (role === "player") {
      const entities = await collectByCampaign(ctx, "entities", access.keys);
      const publicEntityIds = new Set(
        entities.filter((e) => e.isPublicToPlayers === true).map((e) => e._id as string)
      );
      // Nós manuais não têm flag de visibilidade; ficam ocultos se apontarem para entidade oculta.
      manualNodes = allManual.filter((n) => !n.entityId || publicEntityIds.has(n.entityId));
      const visibleNodeIds = new Set<string>([
        ...publicEntityIds,
        ...manualNodes.map((n) => n._id as string),
      ]);
      relationships = allRels.filter(
        (r) =>
          (!r.isSecret || r.isRevealed === true) &&
          visibleNodeIds.has(r.sourceId) &&
          visibleNodeIds.has(r.targetId)
      );
      positions = allPositions.filter((p) => publicEntityIds.has(p.entityId));
    }

    return {
      relationships: relationships.map((r) => ({ ...r, id: r._id })),
      positions: positions.map((p) => ({ entityId: p.entityId, x: p.x, y: p.y })),
      manualNodes: manualNodes.map((n) => ({
        id: n._id,
        label: n.label,
        subtitle: n.subtitle,
        category: n.category,
        entityId: n.entityId,
        x: n.x,
        y: n.y,
      })),
    };
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    sourceId: v.string(),
    targetId: v.string(),
    label: v.string(),
    type: relTypeValidator,
    notes: v.optional(v.string()),
    // Padrão: secreta (oculta dos jogadores) até ser revelada.
    isSecret: v.optional(v.boolean()),
    isRevealed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { canonicalId } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _t, campaignId: _c, isSecret, isRevealed, ...data } = args;
    return await ctx.db.insert("relationships", {
      ...data,
      isSecret: isSecret ?? true,
      isRevealed: isRevealed ?? false,
      campaignId: canonicalId,
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    label: v.string(),
    type: v.optional(relTypeValidator),
  },
  handler: async (ctx, args) => {
    const rel = await getOrThrow(ctx, "relationships", args.id);
    await requireDmOfRecord(ctx, args.sessionToken, rel.campaignId);
    await ctx.db.patch(rel._id, {
      label: args.label,
      ...(args.type ? { type: args.type } : {}),
    });
  },
});

export const remove = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const rel = await getOrThrow(ctx, "relationships", args.id);
    await requireDmOfRecord(ctx, args.sessionToken, rel.campaignId);
    await ctx.db.delete(rel._id);
  },
});

/** Alterna apenas `isRevealed`; `isSecret` nunca é alterado aqui. */
export const toggleReveal = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const rel = await getOrThrow(ctx, "relationships", args.id);
    await requireDmOfRecord(ctx, args.sessionToken, rel.campaignId);
    await ctx.db.patch(rel._id, { isRevealed: !rel.isRevealed });
  },
});

export const updatePosition = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    entityId: v.string(),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    const { canonicalId, keys } = await requireDm(ctx, args.sessionToken, args.campaignId);

    // Nó manual: posição gravada no próprio nó.
    const manualId = ctx.db.normalizeId("manualGraphNodes", args.entityId);
    if (manualId) {
      const node = await ctx.db.get(manualId);
      if (!node || !keys.includes(node.campaignId)) throw new Error(ERR_NOT_FOUND);
      await ctx.db.patch(manualId, { x: args.x, y: args.y });
      return;
    }

    const entId = ctx.db.normalizeId("entities", args.entityId);
    const ent = entId ? await ctx.db.get(entId) : null;
    if (!ent || !ent.campaignId || !keys.includes(ent.campaignId)) {
      throw new Error(ERR_NOT_FOUND);
    }

    const existing = await ctx.db
      .query("graphPositions")
      .withIndex("by_entity", (q) => q.eq("entityId", args.entityId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { x: args.x, y: args.y, campaignId: canonicalId });
    } else {
      await ctx.db.insert("graphPositions", {
        campaignId: canonicalId,
        entityId: args.entityId,
        x: args.x,
        y: args.y,
      });
    }
  },
});

export const addManualNode = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    label: v.string(),
    subtitle: v.optional(v.string()),
    category: v.union(
      v.literal("npc"),
      v.literal("faction"),
      v.literal("location"),
      v.literal("player"),
      v.literal("item"),
      v.literal("monster"),
      v.literal("lore"),
      v.literal("note")
    ),
    entityId: v.optional(v.string()),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    const { canonicalId } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _t, campaignId: _c, ...data } = args;
    return await ctx.db.insert("manualGraphNodes", { ...data, campaignId: canonicalId });
  },
});

export const removeManualNode = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const node = await getOrThrow(ctx, "manualGraphNodes", args.id);
    await requireDmOfRecord(ctx, args.sessionToken, node.campaignId);
    const nodeId = node._id as string;

    const relsOut = await ctx.db
      .query("relationships")
      .withIndex("by_source", (q) => q.eq("sourceId", nodeId))
      .collect();
    const relsIn = await ctx.db
      .query("relationships")
      .withIndex("by_target", (q) => q.eq("targetId", nodeId))
      .collect();
    for (const r of [...relsOut, ...relsIn]) {
      if (await ctx.db.get(r._id)) await ctx.db.delete(r._id);
    }

    await ctx.db.delete(node._id);
  },
});
