import { query, mutation, MutationCtx } from "./_generated/server";
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

const clockSegmentsValidator = v.union(v.literal(4), v.literal(6), v.literal(8), v.literal(12));

const portentValidator = v.object({
  id: v.string(),
  step: v.number(),
  text: v.string(),
  triggered: v.boolean(),
});

const frontStatusValidator = v.union(
  v.literal("active"),
  v.literal("triggered"),
  v.literal("resolved")
);

const sceneStatusValidator = v.union(
  v.literal("active"),
  v.literal("visited"),
  v.literal("unlocked"),
  v.literal("locked")
);

const clueTypeValidator = v.union(
  v.literal("social"),
  v.literal("investigation"),
  v.literal("occult"),
  v.literal("physical")
);

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

// ============================================================================
// FRENTES DE AMEAÇA
// ============================================================================

export const listFronts = query({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    viewerRole: v.optional(v.union(v.literal("gm"), v.literal("player"))),
  },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return [];
    const role = effectiveRole(access, args.viewerRole);
    const fronts = await collectByCampaign(ctx, "threatFronts", access.keys);
    return fronts
      .filter((f) => role === "gm" || !f.isSecret)
      .map((f) => ({ ...f, id: f._id }));
  },
});

export const createFront = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    name: v.string(),
    subtitle: v.string(),
    associatedEntityHandle: v.string(),
    description: v.string(),
    clockSegments: clockSegmentsValidator,
    clockFilled: v.number(),
    impendingDoom: v.string(),
    ignoreConsequence: v.string(),
    grimPortents: v.array(portentValidator),
    status: frontStatusValidator,
    // Padrão: secreta (oculta dos jogadores).
    isSecret: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { canonicalId } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _t, campaignId: _c, isSecret, ...data } = args;
    return await ctx.db.insert("threatFronts", {
      ...data,
      clockFilled: Math.max(0, Math.min(data.clockSegments, Math.floor(data.clockFilled))),
      isSecret: isSecret ?? true,
      campaignId: canonicalId,
    });
  },
});

async function loadFrontForDm(ctx: MutationCtx, sessionToken: string, frontId: string) {
  const front = await getOrThrow(ctx, "threatFronts", frontId);
  await requireDmOfRecord(ctx, sessionToken, front.campaignId);
  return front;
}

export const updateFrontClock = mutation({
  args: {
    sessionToken: v.string(),
    frontId: v.string(),
    clockFilled: v.number(),
  },
  handler: async (ctx, args) => {
    const front = await loadFrontForDm(ctx, args.sessionToken, args.frontId);
    const clamped = Math.max(0, Math.min(front.clockSegments, Math.floor(args.clockFilled)));
    await ctx.db.patch(front._id, {
      clockFilled: clamped,
      status: clamped >= front.clockSegments ? "triggered" : "active",
      grimPortents: front.grimPortents.map((gp, idx) => ({ ...gp, triggered: idx < clamped })),
    });
  },
});

export const advanceAllFronts = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
  },
  handler: async (ctx, args) => {
    const { keys } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const fronts = await collectByCampaign(ctx, "threatFronts", keys);
    for (const f of fronts) {
      if (f.status !== "active") continue;
      const nextFilled = Math.min(f.clockSegments, f.clockFilled + 1);
      await ctx.db.patch(f._id, {
        clockFilled: nextFilled,
        status: nextFilled >= f.clockSegments ? "triggered" : "active",
        grimPortents: f.grimPortents.map((gp, idx) => ({ ...gp, triggered: idx < nextFilled })),
      });
    }
  },
});

export const togglePortent = mutation({
  args: {
    sessionToken: v.string(),
    frontId: v.string(),
    portentId: v.string(),
  },
  handler: async (ctx, args) => {
    const front = await loadFrontForDm(ctx, args.sessionToken, args.frontId);
    if (!front.grimPortents.some((gp) => gp.id === args.portentId)) {
      throw new Error(ERR_NOT_FOUND);
    }
    await ctx.db.patch(front._id, {
      grimPortents: front.grimPortents.map((gp) =>
        gp.id === args.portentId ? { ...gp, triggered: !gp.triggered } : gp
      ),
    });
  },
});

export const updateFront = mutation({
  args: {
    sessionToken: v.string(),
    frontId: v.string(),
    name: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    associatedEntityHandle: v.optional(v.string()),
    description: v.optional(v.string()),
    clockSegments: v.optional(clockSegmentsValidator),
    clockFilled: v.optional(v.number()),
    impendingDoom: v.optional(v.string()),
    ignoreConsequence: v.optional(v.string()),
    grimPortents: v.optional(v.array(portentValidator)),
    status: v.optional(frontStatusValidator),
    isSecret: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const front = await loadFrontForDm(ctx, args.sessionToken, args.frontId);
    const { frontId: _f, sessionToken: _t, ...updates } = args;
    const clean: Record<string, unknown> = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    const segments = args.clockSegments ?? front.clockSegments;
    const filled = args.clockFilled ?? front.clockFilled;
    clean.clockFilled = Math.max(0, Math.min(segments, Math.floor(filled)));
    await ctx.db.patch(front._id, clean);
  },
});

export const removeFront = mutation({
  args: {
    sessionToken: v.string(),
    frontId: v.string(),
  },
  handler: async (ctx, args) => {
    const front = await loadFrontForDm(ctx, args.sessionToken, args.frontId);
    await ctx.db.delete(front._id);
  },
});

// ============================================================================
// FLUXOGRAMA DE CENAS & PISTAS
// ============================================================================

export const listScenes = query({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    viewerRole: v.optional(v.union(v.literal("gm"), v.literal("player"))),
  },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return [];
    const role = effectiveRole(access, args.viewerRole);
    const all = await collectByCampaign(ctx, "mysteryScenes", access.keys);

    if (role === "gm") {
      return all.map((s) => ({ ...s, id: s._id }));
    }

    // Jogadores: apenas cenas visitadas e pistas descobertas; o destino de uma pista
    // só é informado se a cena de destino também estiver visível.
    const visible = all.filter((s) => s.status === "visited");
    const visibleIds = new Set(visible.map((s) => s._id as string));
    return visible.map((s) => ({
      ...s,
      id: s._id,
      clues: s.clues
        .filter((c) => c.discovered)
        .map((c) => ({
          ...c,
          targetSceneId: visibleIds.has(c.targetSceneId) ? c.targetSceneId : "",
        })),
    }));
  },
});

export const createScene = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    title: v.string(),
    subtitle: v.string(),
    locationHandle: v.optional(v.string()),
    // Padrão: "locked" (oculta dos jogadores, que só veem cenas "visited").
    status: v.optional(sceneStatusValidator),
    x: v.number(),
    y: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const { canonicalId } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _t, campaignId: _c, status, ...data } = args;
    return await ctx.db.insert("mysteryScenes", {
      ...data,
      status: status ?? "locked",
      campaignId: canonicalId,
      clues: [],
    });
  },
});

async function loadSceneForDm(ctx: MutationCtx, sessionToken: string, sceneId: string) {
  const scene = await getOrThrow(ctx, "mysteryScenes", sceneId);
  const access = await requireDmOfRecord(ctx, sessionToken, scene.campaignId);
  return { scene, access };
}

export const updateScenePosition = mutation({
  args: {
    sessionToken: v.string(),
    sceneId: v.string(),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    const { scene } = await loadSceneForDm(ctx, args.sessionToken, args.sceneId);
    await ctx.db.patch(scene._id, { x: args.x, y: args.y });
  },
});

export const updateSceneStatus = mutation({
  args: {
    sessionToken: v.string(),
    sceneId: v.string(),
    status: sceneStatusValidator,
  },
  handler: async (ctx, args) => {
    const { scene } = await loadSceneForDm(ctx, args.sessionToken, args.sceneId);
    await ctx.db.patch(scene._id, { status: args.status });
  },
});

export const removeScene = mutation({
  args: {
    sessionToken: v.string(),
    sceneId: v.string(),
  },
  handler: async (ctx, args) => {
    const { scene, access } = await loadSceneForDm(ctx, args.sessionToken, args.sceneId);
    const sceneId = scene._id as string;

    // Remove pistas de outras cenas que levavam a esta.
    const others = await collectByCampaign(ctx, "mysteryScenes", access.keys);
    for (const other of others) {
      if (other._id === scene._id) continue;
      if (other.clues.some((c) => c.targetSceneId === sceneId)) {
        await ctx.db.patch(other._id, {
          clues: other.clues.filter((c) => c.targetSceneId !== sceneId),
        });
      }
    }

    await ctx.db.delete(scene._id);
  },
});

export const addClue = mutation({
  args: {
    sessionToken: v.string(),
    sceneId: v.string(),
    name: v.string(),
    description: v.string(),
    targetSceneId: v.string(),
    type: clueTypeValidator,
  },
  handler: async (ctx, args) => {
    const { scene, access } = await loadSceneForDm(ctx, args.sessionToken, args.sceneId);

    if (args.targetSceneId) {
      const target = await getOrThrow(ctx, "mysteryScenes", args.targetSceneId);
      if (!target.campaignId || !access.keys.includes(target.campaignId)) {
        throw new Error(ERR_NOT_FOUND);
      }
    }

    const newClue = {
      id: `clue-${Date.now()}-${randomSuffix()}`,
      name: args.name,
      description: args.description,
      targetSceneId: args.targetSceneId,
      discovered: false,
      type: args.type,
    };
    await ctx.db.patch(scene._id, { clues: [...scene.clues, newClue] });
    return newClue.id;
  },
});

export const toggleClue = mutation({
  args: {
    sessionToken: v.string(),
    sceneId: v.string(),
    clueId: v.string(),
  },
  handler: async (ctx, args) => {
    const { scene } = await loadSceneForDm(ctx, args.sessionToken, args.sceneId);
    if (!scene.clues.some((c) => c.id === args.clueId)) throw new Error(ERR_NOT_FOUND);
    await ctx.db.patch(scene._id, {
      clues: scene.clues.map((c) =>
        c.id === args.clueId ? { ...c, discovered: !c.discovered } : c
      ),
    });
  },
});
