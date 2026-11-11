import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  matchesCampaign,
  normalizeCampaignId,
  resolveEffectiveRole,
  assertDmPermission,
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

    const allMaps = await ctx.db.query("campaignMaps").collect();
    const maps = allMaps.filter((m) =>
      matchesCampaign(m.campaignId, args.campaignId)
    );
    const pins = await ctx.db.query("mapPins").collect();

    const results = [];
    for (const m of maps) {
      let resolvedUrl = m.customImageUrl;
      if (m.storageId) {
        const storageUrl = await ctx.storage.getUrl(m.storageId);
        if (storageUrl) resolvedUrl = storageUrl;
      }

      const mapShapes = (m.shapes || []).filter((s) => {
        if (role === "player" && s.isSecret && !s.isRevealed) return false;
        return true;
      });

      results.push({
        ...m,
        id: m._id,
        customImageUrl: resolvedUrl,
        shapes: mapShapes,
        pins: pins
          .filter((p) => {
            if (p.mapId !== m._id) return false;
            if (role === "player" && p.isSecret && !p.isRevealed) return false;
            return true;
          })
          .map((p) => ({
            ...p,
            id: p._id,
            secretNote: role === "player" ? undefined : p.secretNote,
          })),
      });
    }

    return results;
  },
});

export const create = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    name: v.string(),
    subtitle: v.string(),
    regionType: v.union(
      v.literal("regional"),
      v.literal("tactical"),
      v.literal("city")
    ),
    presetSvgType: v.optional(v.string()),
    customImageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _, ...data } = args;
    return await ctx.db.insert("campaignMaps", {
      ...data,
      campaignId: normalizeCampaignId(args.campaignId),
      shapes: [],
    });
  },
});

export const updateShapes = mutation({
  args: {
    mapId: v.string(),
    shapes: v.array(shapeValidator),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mapId = ctx.db.normalizeId("campaignMaps", args.mapId);
    if (!mapId) return;
    const map = await ctx.db.get(mapId);
    await assertDmPermission(ctx, args.sessionToken, map?.campaignId);

    await ctx.db.patch(mapId, { shapes: args.shapes });
  },
});

export const remove = mutation({
  args: {
    id: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mapId = ctx.db.normalizeId("campaignMaps", args.id);
    if (!mapId) return;
    const map = await ctx.db.get(mapId);
    await assertDmPermission(ctx, args.sessionToken, map?.campaignId);

    if (map?.storageId) {
      await ctx.storage.delete(map.storageId);
    }

    const pins = await ctx.db
      .query("mapPins")
      .withIndex("by_map", (q) => q.eq("mapId", mapId))
      .collect();
    for (const p of pins) {
      await ctx.db.delete(p._id);
    }
    await ctx.db.delete(mapId);
  },
});

export const addPin = mutation({
  args: {
    sessionToken: v.optional(v.string()),
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
    isSecret: v.boolean(),
    isRevealed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const mapDocId = ctx.db.normalizeId("campaignMaps", args.mapId);
    const mapDoc = mapDocId ? await ctx.db.get(mapDocId) : null;
    await assertDmPermission(ctx, args.sessionToken, mapDoc?.campaignId);
    const { sessionToken: _, ...data } = args;
    return await ctx.db.insert("mapPins", data);
  },
});

export const updatePin = mutation({
  args: {
    sessionToken: v.optional(v.string()),
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
    const pinId = ctx.db.normalizeId("mapPins", args.pinId);
    if (!pinId) return;
    const pin = await ctx.db.get(pinId);
    const mapDocId = pin ? ctx.db.normalizeId("campaignMaps", pin.mapId) : null;
    const mapDoc = mapDocId ? await ctx.db.get(mapDocId) : null;
    await assertDmPermission(ctx, args.sessionToken, mapDoc?.campaignId);
    const { pinId: _, sessionToken: __, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(pinId, cleanUpdates);
  },
});

export const removePin = mutation({
  args: {
    pinId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pinId = ctx.db.normalizeId("mapPins", args.pinId);
    if (!pinId) return;
    const pin = await ctx.db.get(pinId);
    const mapDocId = pin ? ctx.db.normalizeId("campaignMaps", pin.mapId) : null;
    const mapDoc = mapDocId ? await ctx.db.get(mapDocId) : null;
    await assertDmPermission(ctx, args.sessionToken, mapDoc?.campaignId);
    await ctx.db.delete(pinId);
  },
});

export const toggleRevealPin = mutation({
  args: {
    pinId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pinId = ctx.db.normalizeId("mapPins", args.pinId);
    if (!pinId) return;
    const pin = await ctx.db.get(pinId);
    if (!pin) return;
    const mapDocId = ctx.db.normalizeId("campaignMaps", pin.mapId);
    const mapDoc = mapDocId ? await ctx.db.get(mapDocId) : null;
    await assertDmPermission(ctx, args.sessionToken, mapDoc?.campaignId);
    await ctx.db.patch(pinId, {
      isRevealed: !pin.isRevealed,
      isSecret: pin.isRevealed,
    });
  },
});
