import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  matchesCampaign,
  normalizeCampaignId,
  resolveEffectiveRole,
  assertDmPermission,
} from "./lib/tenancy";

export const listFronts = query({
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

    const allFronts = await ctx.db.query("threatFronts").collect();
    return allFronts
      .filter((f) => {
        if (!matchesCampaign(f.campaignId, args.campaignId)) return false;
        if (role === "player" && f.isSecret) return false;
        return true;
      })
      .map((f) => ({
        ...f,
        id: f._id,
      }));
  },
});

export const createFront = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    name: v.string(),
    subtitle: v.string(),
    associatedEntityHandle: v.string(),
    description: v.string(),
    clockSegments: v.union(
      v.literal(4),
      v.literal(6),
      v.literal(8),
      v.literal(12)
    ),
    clockFilled: v.number(),
    impendingDoom: v.string(),
    ignoreConsequence: v.string(),
    grimPortents: v.array(
      v.object({
        id: v.string(),
        step: v.number(),
        text: v.string(),
        triggered: v.boolean(),
      })
    ),
    status: v.union(
      v.literal("active"),
      v.literal("triggered"),
      v.literal("resolved")
    ),
    isSecret: v.boolean(),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _, ...data } = args;
    return await ctx.db.insert("threatFronts", {
      ...data,
      campaignId: normalizeCampaignId(args.campaignId),
    });
  },
});

export const updateFrontClock = mutation({
  args: {
    frontId: v.string(),
    clockFilled: v.number(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const frontId = ctx.db.normalizeId("threatFronts", args.frontId);
    if (!frontId) return;
    const front = await ctx.db.get(frontId);
    if (!front) return;
    await assertDmPermission(ctx, args.sessionToken, front.campaignId);

    const clamped = Math.max(0, Math.min(front.clockSegments, args.clockFilled));
    const nextStatus = clamped >= front.clockSegments ? "triggered" : "active";

    const updatedPortents = front.grimPortents.map((gp, idx) => ({
      ...gp,
      triggered: idx < clamped,
    }));

    await ctx.db.patch(frontId, {
      clockFilled: clamped,
      status: nextStatus,
      grimPortents: updatedPortents,
    });
  },
});

export const advanceAllFronts = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const allFronts = await ctx.db.query("threatFronts").collect();
    const fronts = allFronts.filter((f) =>
      matchesCampaign(f.campaignId, args.campaignId)
    );

    for (const f of fronts) {
      if (f.status === "active") {
        const nextFilled = Math.min(f.clockSegments, f.clockFilled + 1);
        const nextStatus =
          nextFilled >= f.clockSegments ? "triggered" : "active";
        const updatedPortents = f.grimPortents.map((gp, idx) => ({
          ...gp,
          triggered: idx < nextFilled,
        }));
        await ctx.db.patch(f._id, {
          clockFilled: nextFilled,
          status: nextStatus,
          grimPortents: updatedPortents,
        });
      }
    }
  },
});

export const togglePortent = mutation({
  args: {
    frontId: v.string(),
    portentId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const frontId = ctx.db.normalizeId("threatFronts", args.frontId);
    if (!frontId) return;
    const front = await ctx.db.get(frontId);
    if (!front) return;
    await assertDmPermission(ctx, args.sessionToken, front.campaignId);

    const updated = front.grimPortents.map((gp) =>
      gp.id === args.portentId ? { ...gp, triggered: !gp.triggered } : gp
    );
    await ctx.db.patch(frontId, { grimPortents: updated });
  },
});

export const updateFront = mutation({
  args: {
    frontId: v.string(),
    sessionToken: v.optional(v.string()),
    name: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    associatedEntityHandle: v.optional(v.string()),
    description: v.optional(v.string()),
    clockSegments: v.optional(v.number()),
    clockFilled: v.optional(v.number()),
    impendingDoom: v.optional(v.string()),
    ignoreConsequence: v.optional(v.string()),
    grimPortents: v.optional(
      v.array(
        v.object({
          id: v.string(),
          step: v.number(),
          text: v.string(),
          triggered: v.boolean(),
        })
      )
    ),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("triggered"),
        v.literal("resolved")
      )
    ),
    isSecret: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const frontId = ctx.db.normalizeId("threatFronts", args.frontId);
    if (!frontId) return;
    const front = await ctx.db.get(frontId);
    if (!front) return;
    await assertDmPermission(ctx, args.sessionToken, front.campaignId);
    const { frontId: _, sessionToken: __, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(frontId, cleanUpdates);
  },
});

export const removeFront = mutation({
  args: {
    frontId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const frontId = ctx.db.normalizeId("threatFronts", args.frontId);
    if (!frontId) return;
    const front = await ctx.db.get(frontId);
    if (!front) return;
    await assertDmPermission(ctx, args.sessionToken, front.campaignId);
    await ctx.db.delete(frontId);
  },
});

export const listScenes = query({
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

    // O Fluxograma Investigativo do Mestre contém cenas futuras/secretas; para jogadores exibimos apenas cenas visitadas e pistas descobertas
    const allScenes = await ctx.db.query("mysteryScenes").collect();
    return allScenes
      .filter((s) => {
        if (!matchesCampaign(s.campaignId, args.campaignId)) return false;
        if (role === "player" && s.status !== "visited") return false;
        return true;
      })
      .map((s) => ({
        ...s,
        id: s._id,
        clues:
          role === "player" ? s.clues.filter((c) => c.discovered) : s.clues,
      }));
  },
});

export const createScene = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    title: v.string(),
    subtitle: v.string(),
    locationHandle: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("visited"),
      v.literal("unlocked"),
      v.literal("locked")
    ),
    x: v.number(),
    y: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _, ...data } = args;
    return await ctx.db.insert("mysteryScenes", {
      ...data,
      campaignId: normalizeCampaignId(args.campaignId),
      clues: [],
    });
  },
});

export const updateScenePosition = mutation({
  args: {
    sceneId: v.string(),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    const sceneId = ctx.db.normalizeId("mysteryScenes", args.sceneId);
    if (!sceneId) return;
    await ctx.db.patch(sceneId, { x: args.x, y: args.y });
  },
});

export const updateSceneStatus = mutation({
  args: {
    sceneId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("visited"),
      v.literal("unlocked"),
      v.literal("locked")
    ),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sceneId = ctx.db.normalizeId("mysteryScenes", args.sceneId);
    if (!sceneId) return;
    const scene = await ctx.db.get(sceneId);
    if (!scene) return;
    await assertDmPermission(ctx, args.sessionToken, scene.campaignId);
    await ctx.db.patch(sceneId, { status: args.status });
  },
});

export const removeScene = mutation({
  args: {
    sceneId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sceneId = ctx.db.normalizeId("mysteryScenes", args.sceneId);
    if (!sceneId) return;
    const scene = await ctx.db.get(sceneId);
    if (!scene) return;
    await assertDmPermission(ctx, args.sessionToken, scene.campaignId);
    await ctx.db.delete(sceneId);
  },
});

export const addClue = mutation({
  args: {
    sceneId: v.string(),
    name: v.string(),
    description: v.string(),
    targetSceneId: v.string(),
    type: v.union(
      v.literal("social"),
      v.literal("investigation"),
      v.literal("occult"),
      v.literal("physical")
    ),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sceneId = ctx.db.normalizeId("mysteryScenes", args.sceneId);
    if (!sceneId) return;
    const scene = await ctx.db.get(sceneId);
    if (!scene) return;
    await assertDmPermission(ctx, args.sessionToken, scene.campaignId);

    const newClue = {
      id: `clue-${Date.now()}`,
      name: args.name,
      description: args.description,
      targetSceneId: args.targetSceneId,
      discovered: false,
      type: args.type,
    };

    await ctx.db.patch(sceneId, {
      clues: [...scene.clues, newClue],
    });
  },
});

export const toggleClue = mutation({
  args: {
    sceneId: v.string(),
    clueId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sceneId = ctx.db.normalizeId("mysteryScenes", args.sceneId);
    if (!sceneId) return;
    const scene = await ctx.db.get(sceneId);
    if (!scene) return;
    await assertDmPermission(ctx, args.sessionToken, scene.campaignId);

    const updatedClues = scene.clues.map((c) =>
      c.id === args.clueId ? { ...c, discovered: !c.discovered } : c
    );
    await ctx.db.patch(sceneId, { clues: updatedClues });
  },
});
