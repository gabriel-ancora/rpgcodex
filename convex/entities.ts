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
    const role = await resolveEffectiveRole(ctx, {
      sessionToken: args.sessionToken,
      viewerRole: args.viewerRole,
      campaignId: args.campaignId,
    });

    const allEntities = await ctx.db.query("entities").collect();
    const entities = allEntities.filter((e) => {
      if (!matchesCampaign(e.campaignId, args.campaignId)) return false;
      if (role === "player" && !e.isPublicToPlayers) return false;
      return true;
    });

    const secrets = await ctx.db.query("entitySecrets").collect();
    const attributes = await ctx.db.query("entityAttributes").collect();

    return entities.map((ent) => ({
      ...ent,
      id: ent._id,
      secrets: secrets
        .filter((s) => {
          if (s.entityId !== ent._id) return false;
          // Névoa de Guerra no servidor: jogadores só recebem segredos revelados
          if (role === "player" && !s.isRevealed) return false;
          return true;
        })
        .map((s) => ({
          id: s._id,
          title: s.title,
          content: s.content,
          isRevealed: s.isRevealed,
          revealedAt: s.revealedAt,
        })),
      attributes: attributes
        .filter((a) => a.entityId === ent._id)
        .map((a) => ({
          id: a._id,
          label: a.label,
          value: a.value,
          max: a.max,
          category: a.category,
        })),
    }));
  },
});

export const create = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    handle: v.string(),
    mentionPrefix: v.union(v.literal("@"), v.literal("#")),
    name: v.string(),
    subtitle: v.string(),
    category: v.union(
      v.literal("npc"),
      v.literal("faction"),
      v.literal("location"),
      v.literal("item"),
      v.literal("monster"),
      v.literal("lore")
    ),
    tags: v.array(v.string()),
    summary: v.string(),
    publicContent: v.string(),
    pinnedInSession: v.boolean(),
    isPublicToPlayers: v.boolean(),
    imageUrl: v.optional(v.string()),
    updatedAt: v.string(),
    initialSecrets: v.optional(
      v.array(
        v.object({
          title: v.string(),
          content: v.string(),
          isRevealed: v.boolean(),
        })
      )
    ),
    initialAttributes: v.optional(
      v.array(
        v.object({
          label: v.string(),
          value: v.union(v.string(), v.number()),
          max: v.optional(v.number()),
          category: v.optional(
            v.union(
              v.literal("stat"),
              v.literal("resource"),
              v.literal("meta")
            )
          ),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const {
      initialSecrets,
      initialAttributes,
      sessionToken: _,
      ...entityData
    } = args;

    const entityId = await ctx.db.insert("entities", {
      ...entityData,
      campaignId: normalizeCampaignId(args.campaignId),
    });

    if (initialSecrets) {
      for (const sec of initialSecrets) {
        await ctx.db.insert("entitySecrets", {
          entityId,
          title: sec.title,
          content: sec.content,
          isRevealed: sec.isRevealed,
        });
      }
    }

    if (initialAttributes) {
      for (const attr of initialAttributes) {
        await ctx.db.insert("entityAttributes", {
          entityId,
          label: attr.label,
          value: attr.value,
          max: attr.max,
          category: attr.category,
        });
      }
    }

    return entityId;
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    sessionToken: v.optional(v.string()),
    name: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    summary: v.optional(v.string()),
    publicContent: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    pinnedInSession: v.optional(v.boolean()),
    isPublicToPlayers: v.optional(v.boolean()),
    imageUrl: v.optional(v.string()),
    updatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const entityId = ctx.db.normalizeId("entities", args.id);
    if (!entityId) return;
    const existing = await ctx.db.get(entityId);
    await assertDmPermission(ctx, args.sessionToken, existing?.campaignId);

    const { id: _, sessionToken: __, ...updates } = args;
    await ctx.db.patch(entityId, updates);
  },
});

export const remove = mutation({
  args: {
    id: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const entityId = ctx.db.normalizeId("entities", args.id);
    if (!entityId) return;
    const existing = await ctx.db.get(entityId);
    await assertDmPermission(ctx, args.sessionToken, existing?.campaignId);

    const secrets = await ctx.db
      .query("entitySecrets")
      .withIndex("by_entity", (q) => q.eq("entityId", entityId))
      .collect();
    for (const s of secrets) {
      await ctx.db.delete(s._id);
    }

    const attributes = await ctx.db
      .query("entityAttributes")
      .withIndex("by_entity", (q) => q.eq("entityId", entityId))
      .collect();
    for (const a of attributes) {
      await ctx.db.delete(a._id);
    }

    const pos = await ctx.db
      .query("graphPositions")
      .withIndex("by_entity", (q) => q.eq("entityId", entityId))
      .collect();
    for (const p of pos) {
      await ctx.db.delete(p._id);
    }

    const rels1 = await ctx.db
      .query("relationships")
      .withIndex("by_source", (q) => q.eq("sourceId", entityId))
      .collect();
    for (const r of rels1) {
      await ctx.db.delete(r._id);
    }

    const rels2 = await ctx.db
      .query("relationships")
      .withIndex("by_target", (q) => q.eq("targetId", entityId))
      .collect();
    for (const r of rels2) {
      await ctx.db.delete(r._id);
    }

    await ctx.db.delete(entityId);
  },
});

export const togglePin = mutation({
  args: {
    id: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const entityId = ctx.db.normalizeId("entities", args.id);
    if (!entityId) return;
    const ent = await ctx.db.get(entityId);
    if (!ent) return;
    await assertDmPermission(ctx, args.sessionToken, ent.campaignId);

    await ctx.db.patch(entityId, {
      pinnedInSession: !ent.pinnedInSession,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const addSecret = mutation({
  args: {
    entityId: v.string(),
    title: v.string(),
    content: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const entId = ctx.db.normalizeId("entities", args.entityId);
    const ent = entId ? await ctx.db.get(entId) : null;
    await assertDmPermission(ctx, args.sessionToken, ent?.campaignId);
    return await ctx.db.insert("entitySecrets", {
      entityId: args.entityId,
      title: args.title,
      content: args.content,
      isRevealed: false,
    });
  },
});

export const revealSecret = mutation({
  args: {
    secretId: v.string(),
    isRevealed: v.boolean(),
    revealedAt: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const secId = ctx.db.normalizeId("entitySecrets", args.secretId);
    if (!secId) return;
    const sec = await ctx.db.get(secId);
    const entId = sec ? ctx.db.normalizeId("entities", sec.entityId) : null;
    const ent = entId ? await ctx.db.get(entId) : null;
    await assertDmPermission(ctx, args.sessionToken, ent?.campaignId);
    await ctx.db.patch(secId, {
      isRevealed: args.isRevealed,
      revealedAt: args.revealedAt,
    });
  },
});

export const removeSecret = mutation({
  args: {
    secretId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const secId = ctx.db.normalizeId("entitySecrets", args.secretId);
    if (!secId) return;
    const sec = await ctx.db.get(secId);
    const entId = sec ? ctx.db.normalizeId("entities", sec.entityId) : null;
    const ent = entId ? await ctx.db.get(entId) : null;
    await assertDmPermission(ctx, args.sessionToken, ent?.campaignId);
    await ctx.db.delete(secId);
  },
});

export const addAttribute = mutation({
  args: {
    entityId: v.string(),
    label: v.string(),
    value: v.union(v.string(), v.number()),
    max: v.optional(v.number()),
    category: v.optional(
      v.union(v.literal("stat"), v.literal("resource"), v.literal("meta"))
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("entityAttributes", {
      entityId: args.entityId,
      label: args.label,
      value: args.value,
      max: args.max,
      category: args.category || "stat",
    });
  },
});

export const updateAttribute = mutation({
  args: {
    attributeId: v.string(),
    value: v.union(v.string(), v.number()),
  },
  handler: async (ctx, args) => {
    const attrId = ctx.db.normalizeId("entityAttributes", args.attributeId);
    if (!attrId) return;
    await ctx.db.patch(attrId, { value: args.value });
  },
});

export const removeAttribute = mutation({
  args: { attributeId: v.string() },
  handler: async (ctx, args) => {
    const attrId = ctx.db.normalizeId("entityAttributes", args.attributeId);
    if (!attrId) return;
    await ctx.db.delete(attrId);
  },
});
