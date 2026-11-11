import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  matchesCampaign,
  normalizeCampaignId,
  resolveEffectiveRole,
  assertDmPermission,
} from "./lib/tenancy";

export const list = query({
  args: {
    campaignId: v.optional(v.string()),
    viewerRole: v.optional(v.union(v.literal("gm"), v.literal("player"))),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normId = normalizeCampaignId(args.campaignId);
    if (!normId) {
      return { relationships: [], positions: [], manualNodes: [] };
    }

    const role = await resolveEffectiveRole(ctx, {
      sessionToken: args.sessionToken,
      viewerRole: args.viewerRole,
      campaignId: normId,
    });

    const allRelationships = await ctx.db.query("relationships").collect();
    const relationships = allRelationships.filter((r) => {
      if (!matchesCampaign(r.campaignId, normId)) return false;
      if (role === "player" && r.isSecret && !r.isRevealed) return false;
      return true;
    });

    const allPositions = await ctx.db.query("graphPositions").collect();
    const positions = allPositions.filter((p) =>
      matchesCampaign(p.campaignId, normId)
    );

    const manualNodes = await ctx.db
      .query("manualGraphNodes")
      .withIndex("by_campaign", (q) => q.eq("campaignId", normId))
      .collect();

    return {
      relationships: relationships.map((r) => ({
        ...r,
        id: r._id,
      })),
      positions: positions.map((p) => ({
        entityId: p.entityId,
        x: p.x,
        y: p.y,
      })),
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
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    sourceId: v.string(),
    targetId: v.string(),
    label: v.string(),
    type: v.union(
      v.literal("hostile"),
      v.literal("allied"),
      v.literal("secret"),
      v.literal("neutral"),
      v.literal("patron"),
      v.literal("blood")
    ),
    notes: v.optional(v.string()),
    isSecret: v.boolean(),
    isRevealed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _, ...data } = args;
    return await ctx.db.insert("relationships", {
      ...data,
      campaignId: normalizeCampaignId(args.campaignId),
    });
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    label: v.string(),
    type: v.optional(
      v.union(
        v.literal("hostile"),
        v.literal("allied"),
        v.literal("secret"),
        v.literal("neutral"),
        v.literal("patron"),
        v.literal("blood")
      )
    ),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const relId = ctx.db.normalizeId("relationships", args.id);
    if (!relId) return;
    const rel = await ctx.db.get(relId);
    if (!rel) return;
    await assertDmPermission(ctx, args.sessionToken, rel.campaignId);
    await ctx.db.patch(relId, {
      label: args.label,
      ...(args.type ? { type: args.type } : {}),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const relId = ctx.db.normalizeId("relationships", args.id);
    if (!relId) return;
    const rel = await ctx.db.get(relId);
    if (!rel) return;
    await assertDmPermission(ctx, args.sessionToken, rel.campaignId);
    await ctx.db.delete(relId);
  },
});

export const toggleReveal = mutation({
  args: {
    id: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const relId = ctx.db.normalizeId("relationships", args.id);
    if (!relId) return;
    const rel = await ctx.db.get(relId);
    if (!rel) return;
    await assertDmPermission(ctx, args.sessionToken, rel.campaignId);
    await ctx.db.patch(relId, {
      isRevealed: !rel.isRevealed,
      isSecret: rel.isRevealed,
    });
  },
});

export const updatePosition = mutation({
  args: {
    campaignId: v.optional(v.string()),
    entityId: v.string(),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    const normId = normalizeCampaignId(args.campaignId);
    if (!normId) return;

    // Se for um nó manual, atualiza direto em manualGraphNodes
    const manualId = ctx.db.normalizeId("manualGraphNodes", args.entityId);
    if (manualId) {
      await ctx.db.patch(manualId, { x: args.x, y: args.y });
      return;
    }

    const existing = await ctx.db
      .query("graphPositions")
      .withIndex("by_entity", (q) => q.eq("entityId", args.entityId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        x: args.x,
        y: args.y,
        campaignId: normId,
      });
    } else {
      await ctx.db.insert("graphPositions", {
        campaignId: normId,
        entityId: args.entityId,
        x: args.x,
        y: args.y,
      });
    }
  },
});

export const addManualNode = mutation({
  args: {
    campaignId: v.string(),
    sessionToken: v.optional(v.string()),
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
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _, ...data } = args;
    return await ctx.db.insert("manualGraphNodes", {
      ...data,
      campaignId: normalizeCampaignId(args.campaignId),
    });
  },
});

export const removeManualNode = mutation({
  args: {
    id: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const nodeId = ctx.db.normalizeId("manualGraphNodes", args.id);
    if (!nodeId) return;
    const node = await ctx.db.get(nodeId);
    if (!node) return;
    await assertDmPermission(ctx, args.sessionToken, node.campaignId);

    const rels1 = await ctx.db
      .query("relationships")
      .withIndex("by_source", (q) => q.eq("sourceId", nodeId))
      .collect();
    for (const r of rels1) await ctx.db.delete(r._id);

    const rels2 = await ctx.db
      .query("relationships")
      .withIndex("by_target", (q) => q.eq("targetId", nodeId))
      .collect();
    for (const r of rels2) await ctx.db.delete(r._id);

    await ctx.db.delete(nodeId);
  },
});
