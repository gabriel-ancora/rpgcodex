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
  assertUploadOwnedBy,
} from "./lib/tenancy";

const shapeValidator = v.object({
  id: v.string(),
  type: v.union(
    v.literal("road"),
    v.literal("river"),
    v.literal("polygon"),
    v.literal("circle"),
    v.literal("rect"),
    v.literal("text"),
    v.literal("fog")
  ),
  label: v.string(),
  color: v.string(),
  strokeWidth: v.number(),
  dashed: v.optional(v.boolean()),
  opacity: v.optional(v.number()),
  fontSize: v.optional(v.number()),
  entityId: v.optional(v.string()),
  linkedEntityIds: v.optional(v.array(v.string())),
  points: v.array(v.object({ x: v.number(), y: v.number() })),
  radius: v.optional(v.number()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  isSecret: v.optional(v.boolean()),
  isRevealed: v.optional(v.boolean()),
});

const pinIconValidator = v.union(
  v.literal("castle"),
  v.literal("city"),
  v.literal("village"),
  v.literal("tavern"),
  v.literal("dungeon"),
  v.literal("skull"),
  v.literal("ruins"),
  v.literal("camp"),
  v.literal("secret"),
  v.literal("quest"),
  v.literal("shrine"),
  v.literal("port"),
  v.literal("portal"),
  v.literal("shop"),
  v.literal("party")
);

const pinLayerValidator = v.union(
  v.literal("locations"),
  v.literal("dangers"),
  v.literal("secrets"),
  v.literal("quests")
);

/** Mapas sem flag explícita (legado, sem controle na interface) continuam visíveis. */
function isMapVisibleToPlayers(m: Doc<"campaignMaps">) {
  return m.isPublicToPlayers !== false;
}

export const list = query({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    viewerRole: v.optional(v.union(v.literal("gm"), v.literal("player"))),
  },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return [];
    const role = effectiveRole(access, args.viewerRole);
    const isPlayer = role === "player";

    const allMaps = await collectByCampaign(ctx, "campaignMaps", access.keys);
    const maps = isPlayer ? allMaps.filter(isMapVisibleToPlayers) : allMaps;
    const visibleMapIds = new Set(maps.map((m) => m._id as string));

    let publicEntityIds: Set<string> | null = null;
    if (isPlayer) {
      const entities = await collectByCampaign(ctx, "entities", access.keys);
      publicEntityIds = new Set(
        entities.filter((e) => e.isPublicToPlayers === true).map((e) => e._id as string)
      );
    }
    const scrubEntityRef = (id?: string) =>
      id && (!publicEntityIds || publicEntityIds.has(id)) ? id : undefined;
    const scrubEntityRefs = (ids?: string[]) =>
      ids && publicEntityIds ? ids.filter((id) => publicEntityIds!.has(id)) : ids;

    const results = [];
    for (const m of maps) {
      let resolvedUrl = m.customImageUrl;
      if (m.storageId) {
        const storageUrl = await ctx.storage.getUrl(m.storageId);
        if (storageUrl) resolvedUrl = storageUrl;
      }

      const shapes = (m.shapes || [])
        .filter((s) => !isPlayer || !s.isSecret || s.isRevealed === true)
        .map((s) =>
          isPlayer
            ? {
                ...s,
                entityId: scrubEntityRef(s.entityId),
                linkedEntityIds: scrubEntityRefs(s.linkedEntityIds),
              }
            : s
        );

      const pins = await ctx.db
        .query("mapPins")
        .withIndex("by_map", (q) => q.eq("mapId", m._id))
        .collect();

      results.push({
        ...m,
        id: m._id,
        customImageUrl: resolvedUrl,
        shapes,
        pins: pins
          .filter((p) => !isPlayer || !p.isSecret || p.isRevealed)
          .map((p) => ({
            ...p,
            id: p._id,
            secretNote: isPlayer ? undefined : p.secretNote,
            entityId: isPlayer ? scrubEntityRef(p.entityId) : p.entityId,
            linkedEntityIds: isPlayer ? scrubEntityRefs(p.linkedEntityIds) : p.linkedEntityIds,
            linkedMapId:
              isPlayer && p.linkedMapId && !visibleMapIds.has(p.linkedMapId)
                ? undefined
                : p.linkedMapId,
          })),
      });
    }

    return results;
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    name: v.string(),
    subtitle: v.string(),
    regionType: v.union(v.literal("regional"), v.literal("tactical"), v.literal("city")),
    presetSvgType: v.optional(v.string()),
    customImageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    isPublicToPlayers: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { canonicalId, user } = await requireDm(ctx, args.sessionToken, args.campaignId);
    if (args.storageId) await assertUploadOwnedBy(ctx, args.storageId, user.id);
    const { sessionToken: _t, campaignId: _c, ...data } = args;
    return await ctx.db.insert("campaignMaps", {
      ...data,
      campaignId: canonicalId,
      shapes: [],
    });
  },
});

async function loadMapForDm(ctx: MutationCtx, sessionToken: string, mapId: string) {
  const map = await getOrThrow(ctx, "campaignMaps", mapId);
  const access = await requireDmOfRecord(ctx, sessionToken, map.campaignId);
  return { map, access };
}

export const updateShapes = mutation({
  args: {
    sessionToken: v.string(),
    mapId: v.string(),
    shapes: v.array(shapeValidator),
  },
  handler: async (ctx, args) => {
    const { map } = await loadMapForDm(ctx, args.sessionToken, args.mapId);
    await ctx.db.patch(map._id, { shapes: args.shapes });
  },
});

export const remove = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const { map, access } = await loadMapForDm(ctx, args.sessionToken, args.id);
    const mapId = map._id as string;

    if (map.storageId) {
      await ctx.storage.delete(map.storageId).catch(() => {});
    }

    const pins = await ctx.db
      .query("mapPins")
      .withIndex("by_map", (q) => q.eq("mapId", mapId))
      .collect();
    for (const p of pins) await ctx.db.delete(p._id);

    // Limpa referências de outros mapas que apontavam para este.
    const otherMaps = await collectByCampaign(ctx, "campaignMaps", access.keys);
    for (const other of otherMaps) {
      if (other._id === map._id) continue;
      const otherPins = await ctx.db
        .query("mapPins")
        .withIndex("by_map", (q) => q.eq("mapId", other._id))
        .collect();
      for (const p of otherPins) {
        if (p.linkedMapId === mapId) await ctx.db.patch(p._id, { linkedMapId: undefined });
      }
    }

    await ctx.db.delete(map._id);
  },
});

export const addPin = mutation({
  args: {
    sessionToken: v.string(),
    mapId: v.string(),
    x: v.number(),
    y: v.number(),
    label: v.string(),
    subtitle: v.string(),
    entityId: v.optional(v.string()),
    linkedEntityIds: v.optional(v.array(v.string())),
    linkedMapId: v.optional(v.string()),
    layer: pinLayerValidator,
    iconType: pinIconValidator,
    description: v.string(),
    monsters: v.array(v.string()),
    treasures: v.array(v.string()),
    secretNote: v.optional(v.string()),
    // Padrão: oculto dos jogadores até ser revelado.
    isSecret: v.optional(v.boolean()),
    isRevealed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { map } = await loadMapForDm(ctx, args.sessionToken, args.mapId);
    const { sessionToken: _t, mapId: _m, isSecret, isRevealed, ...data } = args;
    return await ctx.db.insert("mapPins", {
      ...data,
      mapId: map._id,
      isSecret: isSecret ?? true,
      isRevealed: isRevealed ?? false,
    });
  },
});

async function loadPinForDm(ctx: MutationCtx, sessionToken: string, pinId: string) {
  const pin = await getOrThrow(ctx, "mapPins", pinId);
  await loadMapForDm(ctx, sessionToken, pin.mapId);
  return pin;
}

export const updatePin = mutation({
  args: {
    sessionToken: v.string(),
    pinId: v.string(),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    label: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    entityId: v.optional(v.string()),
    linkedEntityIds: v.optional(v.array(v.string())),
    linkedMapId: v.optional(v.string()),
    layer: v.optional(pinLayerValidator),
    iconType: v.optional(pinIconValidator),
    description: v.optional(v.string()),
    monsters: v.optional(v.array(v.string())),
    treasures: v.optional(v.array(v.string())),
    secretNote: v.optional(v.string()),
    isSecret: v.optional(v.boolean()),
    isRevealed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const pin = await loadPinForDm(ctx, args.sessionToken, args.pinId);
    const { pinId: _p, sessionToken: _t, ...updates } = args;
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(pin._id, clean);
  },
});

export const removePin = mutation({
  args: {
    sessionToken: v.string(),
    pinId: v.string(),
  },
  handler: async (ctx, args) => {
    const pin = await loadPinForDm(ctx, args.sessionToken, args.pinId);
    await ctx.db.delete(pin._id);
  },
});

/** Alterna apenas `isRevealed`; `isSecret` nunca é alterado aqui. */
export const toggleRevealPin = mutation({
  args: {
    sessionToken: v.string(),
    pinId: v.string(),
  },
  handler: async (ctx, args) => {
    const pin = await loadPinForDm(ctx, args.sessionToken, args.pinId);
    await ctx.db.patch(pin._id, { isRevealed: !pin.isRevealed });
  },
});
