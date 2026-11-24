import { query, mutation, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  requireDm,
  requireDmOfRecord,
  memberOrNull,
  effectiveRole,
  collectByCampaign,
  getOrThrow,
} from "./lib/tenancy";

const viewerRoleValidator = v.optional(v.union(v.literal("gm"), v.literal("player")));

const categoryValidator = v.union(
  v.literal("npc"),
  v.literal("faction"),
  v.literal("location"),
  v.literal("item"),
  v.literal("monster"),
  v.literal("lore")
);

const attrCategoryValidator = v.optional(
  v.union(v.literal("stat"), v.literal("resource"), v.literal("meta"))
);

export const list = query({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    viewerRole: viewerRoleValidator,
  },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return [];
    const role = effectiveRole(access, args.viewerRole);

    const all = await collectByCampaign(ctx, "entities", access.keys);
    // Névoa de Guerra: jogadores só recebem entidades explicitamente públicas.
    const entities = role === "player" ? all.filter((e) => e.isPublicToPlayers === true) : all;

    return await Promise.all(
      entities.map(async (ent) => {
        const secrets = await ctx.db
          .query("entitySecrets")
          .withIndex("by_entity", (q) => q.eq("entityId", ent._id))
          .collect();
        const attributes = await ctx.db
          .query("entityAttributes")
          .withIndex("by_entity", (q) => q.eq("entityId", ent._id))
          .collect();
        return {
          ...ent,
          id: ent._id,
          secrets: secrets
            .filter((s) => role === "gm" || s.isRevealed)
            .map((s) => ({
              id: s._id,
              title: s.title,
              content: s.content,
              isRevealed: s.isRevealed,
              revealedAt: s.revealedAt,
            })),
          // Atributos só chegam ao jogador quando a entidade é pública (filtrada acima).
          attributes: attributes.map((a) => ({
            id: a._id,
            label: a.label,
            value: a.value,
            max: a.max,
            category: a.category,
          })),
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    handle: v.string(),
    mentionPrefix: v.union(v.literal("@"), v.literal("#")),
    name: v.string(),
    subtitle: v.string(),
    category: categoryValidator,
    tags: v.array(v.string()),
    summary: v.string(),
    publicContent: v.string(),
    pinnedInSession: v.boolean(),
    // Padrão: oculto dos jogadores.
    isPublicToPlayers: v.optional(v.boolean()),
    imageUrl: v.optional(v.string()),
    // Ignorado: o servidor grava a data (ISO 8601).
    updatedAt: v.optional(v.string()),
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
          category: attrCategoryValidator,
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { canonicalId } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const {
      initialSecrets,
      initialAttributes,
      sessionToken: _t,
      campaignId: _c,
      updatedAt: _u,
      isPublicToPlayers,
      ...entityData
    } = args;

    const entityId = await ctx.db.insert("entities", {
      ...entityData,
      isPublicToPlayers: isPublicToPlayers === true,
      campaignId: canonicalId,
      updatedAt: new Date().toISOString(),
    });

    for (const sec of initialSecrets || []) {
      await ctx.db.insert("entitySecrets", {
        entityId,
        title: sec.title,
        content: sec.content,
        isRevealed: sec.isRevealed,
      });
    }

    for (const attr of initialAttributes || []) {
      await ctx.db.insert("entityAttributes", {
        entityId,
        label: attr.label,
        value: attr.value,
        max: attr.max,
        category: attr.category,
      });
    }

    return entityId;
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    name: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    summary: v.optional(v.string()),
    publicContent: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    pinnedInSession: v.optional(v.boolean()),
    isPublicToPlayers: v.optional(v.boolean()),
    imageUrl: v.optional(v.string()),
    // Ignorado: o servidor grava a data (ISO 8601).
    updatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ent = await getOrThrow(ctx, "entities", args.id);
    await requireDmOfRecord(ctx, args.sessionToken, ent.campaignId);

    const { id: _i, sessionToken: _t, updatedAt: _u, ...updates } = args;
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(ent._id, { ...clean, updatedAt: new Date().toISOString() });
  },
});

/**
 * Remove a entidade e tudo que depende dela: segredos, atributos, relações,
 * posições no grafo; limpa referências em pins, formas de mapa, nós manuais e combatentes.
 */
async function cascadeDeleteEntity(ctx: MutationCtx, ent: Doc<"entities">, keys: string[]) {
  const entityId = ent._id as string;

  const secrets = await ctx.db
    .query("entitySecrets")
    .withIndex("by_entity", (q) => q.eq("entityId", entityId))
    .collect();
  for (const s of secrets) await ctx.db.delete(s._id);

  const attributes = await ctx.db
    .query("entityAttributes")
    .withIndex("by_entity", (q) => q.eq("entityId", entityId))
    .collect();
  for (const a of attributes) await ctx.db.delete(a._id);

  const positions = await ctx.db
    .query("graphPositions")
    .withIndex("by_entity", (q) => q.eq("entityId", entityId))
    .collect();
  for (const p of positions) await ctx.db.delete(p._id);

  const relsOut = await ctx.db
    .query("relationships")
    .withIndex("by_source", (q) => q.eq("sourceId", entityId))
    .collect();
  const relsIn = await ctx.db
    .query("relationships")
    .withIndex("by_target", (q) => q.eq("targetId", entityId))
    .collect();
  for (const r of [...relsOut, ...relsIn]) {
    // by_source e by_target podem retornar a mesma aresta (auto-relação).
    if (await ctx.db.get(r._id)) await ctx.db.delete(r._id);
  }

  const maps = await collectByCampaign(ctx, "campaignMaps", keys);
  for (const m of maps) {
    const pins = await ctx.db
      .query("mapPins")
      .withIndex("by_map", (q) => q.eq("mapId", m._id))
      .collect();
    for (const p of pins) {
      const linked = p.linkedEntityIds || [];
      if (p.entityId === entityId || linked.includes(entityId)) {
        await ctx.db.patch(p._id, {
          entityId: p.entityId === entityId ? undefined : p.entityId,
          linkedEntityIds: linked.filter((id) => id !== entityId),
        });
      }
    }
    const shapes = m.shapes || [];
    if (
      shapes.some((s) => s.entityId === entityId || (s.linkedEntityIds || []).includes(entityId))
    ) {
      await ctx.db.patch(m._id, {
        shapes: shapes.map((s) => ({
          ...s,
          entityId: s.entityId === entityId ? undefined : s.entityId,
          linkedEntityIds: s.linkedEntityIds?.filter((id) => id !== entityId),
        })),
      });
    }
  }

  const manualNodes = await collectByCampaign(ctx, "manualGraphNodes", keys);
  for (const n of manualNodes) {
    if (n.entityId === entityId) await ctx.db.patch(n._id, { entityId: undefined });
  }

  const combatants = await collectByCampaign(ctx, "combatants", keys);
  for (const c of combatants) {
    if (c.entityId === entityId) await ctx.db.patch(c._id, { entityId: undefined });
  }

  await ctx.db.delete(ent._id);
}

export const remove = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const ent = await getOrThrow(ctx, "entities", args.id);
    const { keys } = await requireDmOfRecord(ctx, args.sessionToken, ent.campaignId);
    await cascadeDeleteEntity(ctx, ent, keys);
  },
});

export const togglePin = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const ent = await getOrThrow(ctx, "entities", args.id);
    await requireDmOfRecord(ctx, args.sessionToken, ent.campaignId);
    await ctx.db.patch(ent._id, {
      pinnedInSession: !ent.pinnedInSession,
      updatedAt: new Date().toISOString(),
    });
  },
});

async function loadEntityForDm(ctx: MutationCtx, sessionToken: string, entityId: string) {
  const ent = await getOrThrow(ctx, "entities", entityId);
  await requireDmOfRecord(ctx, sessionToken, ent.campaignId);
  return ent;
}

export const addSecret = mutation({
  args: {
    sessionToken: v.string(),
    entityId: v.string(),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const ent = await loadEntityForDm(ctx, args.sessionToken, args.entityId);
    return await ctx.db.insert("entitySecrets", {
      entityId: ent._id,
      title: args.title,
      content: args.content,
      isRevealed: false,
    });
  },
});

export const revealSecret = mutation({
  args: {
    sessionToken: v.string(),
    secretId: v.string(),
    isRevealed: v.boolean(),
    revealedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sec = await getOrThrow(ctx, "entitySecrets", args.secretId);
    await loadEntityForDm(ctx, args.sessionToken, sec.entityId);
    await ctx.db.patch(sec._id, {
      isRevealed: args.isRevealed,
      revealedAt: args.isRevealed ? args.revealedAt : undefined,
    });
  },
});

export const removeSecret = mutation({
  args: {
    sessionToken: v.string(),
    secretId: v.string(),
  },
  handler: async (ctx, args) => {
    const sec = await getOrThrow(ctx, "entitySecrets", args.secretId);
    await loadEntityForDm(ctx, args.sessionToken, sec.entityId);
    await ctx.db.delete(sec._id);
  },
});

export const addAttribute = mutation({
  args: {
    sessionToken: v.string(),
    entityId: v.string(),
    label: v.string(),
    value: v.union(v.string(), v.number()),
    max: v.optional(v.number()),
    category: attrCategoryValidator,
  },
  handler: async (ctx, args) => {
    const ent = await loadEntityForDm(ctx, args.sessionToken, args.entityId);
    return await ctx.db.insert("entityAttributes", {
      entityId: ent._id,
      label: args.label,
      value: args.value,
      max: args.max,
      category: args.category || "stat",
    });
  },
});

export const updateAttribute = mutation({
  args: {
    sessionToken: v.string(),
    attributeId: v.string(),
    value: v.union(v.string(), v.number()),
  },
  handler: async (ctx, args) => {
    const attr = await getOrThrow(ctx, "entityAttributes", args.attributeId);
    await loadEntityForDm(ctx, args.sessionToken, attr.entityId);
    await ctx.db.patch(attr._id, { value: args.value });
  },
});

export const removeAttribute = mutation({
  args: {
    sessionToken: v.string(),
    attributeId: v.string(),
  },
  handler: async (ctx, args) => {
    const attr = await getOrThrow(ctx, "entityAttributes", args.attributeId);
    await loadEntityForDm(ctx, args.sessionToken, attr.entityId);
    await ctx.db.delete(attr._id);
  },
});
