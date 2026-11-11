import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  matchesCampaign,
  normalizeCampaignId,
  resolveEffectiveRole,
  assertDmPermission,
} from "./lib/tenancy";

export const listCombatants = query({
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

    const list = await ctx.db.query("combatants").collect();
    return list
      .filter((c) => matchesCampaign(c.campaignId, args.campaignId))
      .sort((a, b) => b.initiative - a.initiative)
      .map((c) => ({
        ...c,
        id: c._id,
        // Na visão do jogador, oculta notas táticas internas de monstros
        notes: role === "player" && c.type === "monster" ? "" : c.notes,
      }));
  },
});

export const getCombatState = query({
  args: { campaignId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const normId = normalizeCampaignId(args.campaignId);
    const existing = await ctx.db
      .query("combatState")
      .withIndex("by_campaign", (q) => q.eq("campaignId", normId))
      .first();

    return (
      existing ?? {
        campaignId: normId,
        activeCombatTurnIndex: 0,
        combatRound: 1,
      }
    );
  },
});

export const nextTurn = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const normId = normalizeCampaignId(args.campaignId);
    const allCombatants = await ctx.db.query("combatants").collect();
    const count = allCombatants.filter((c) =>
      matchesCampaign(c.campaignId, normId)
    ).length;
    if (count === 0) return;

    const existing = await ctx.db
      .query("combatState")
      .withIndex("by_campaign", (q) => q.eq("campaignId", normId))
      .first();

    const currentIdx = existing?.activeCombatTurnIndex ?? 0;
    const currentRound = existing?.combatRound ?? 1;
    const nextIdx = (currentIdx + 1) % count;
    const nextRound = nextIdx === 0 ? currentRound + 1 : currentRound;

    if (existing) {
      await ctx.db.patch(existing._id, {
        activeCombatTurnIndex: nextIdx,
        combatRound: nextRound,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("combatState", {
        campaignId: normId,
        activeCombatTurnIndex: nextIdx,
        combatRound: nextRound,
        updatedAt: new Date().toISOString(),
      });
    }
  },
});

export const rollAllInitiatives = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const normId = normalizeCampaignId(args.campaignId);
    const all = await ctx.db.query("combatants").collect();
    const campaignCombatants = all.filter((c) =>
      matchesCampaign(c.campaignId, normId)
    );

    for (const c of campaignCombatants) {
      const bonus = c.type === "pc" ? 3 : 2;
      const rolled = Math.floor(Math.random() * 20) + 1 + bonus;
      await ctx.db.patch(c._id, { initiative: rolled, campaignId: normId });
    }

    const existing = await ctx.db
      .query("combatState")
      .withIndex("by_campaign", (q) => q.eq("campaignId", normId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        activeCombatTurnIndex: 0,
        combatRound: 1,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("combatState", {
        campaignId: normId,
        activeCombatTurnIndex: 0,
        combatRound: 1,
        updatedAt: new Date().toISOString(),
      });
    }
  },
});

export const addCombatant = mutation({
  args: {
    campaignId: v.optional(v.string()),
    name: v.string(),
    type: v.union(v.literal("pc"), v.literal("npc"), v.literal("monster")),
    initiative: v.number(),
    hp: v.number(),
    maxHp: v.number(),
    armorClass: v.number(),
    conditions: v.array(v.string()),
    notes: v.string(),
    entityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("combatants", {
      ...args,
      campaignId: normalizeCampaignId(args.campaignId),
    });
  },
});

export const adjustHp = mutation({
  args: {
    id: v.string(),
    delta: v.number(),
  },
  handler: async (ctx, args) => {
    const combId = ctx.db.normalizeId("combatants", args.id);
    if (!combId) return;
    const comb = await ctx.db.get(combId);
    if (!comb) return;

    const nextHp = Math.max(0, Math.min(comb.maxHp, comb.hp + args.delta));
    await ctx.db.patch(combId, { hp: nextHp });
  },
});

export const toggleCondition = mutation({
  args: {
    id: v.string(),
    condition: v.string(),
  },
  handler: async (ctx, args) => {
    const combId = ctx.db.normalizeId("combatants", args.id);
    if (!combId) return;
    const comb = await ctx.db.get(combId);
    if (!comb) return;

    const has = comb.conditions.includes(args.condition);
    const updated = has
      ? comb.conditions.filter((c) => c !== args.condition)
      : [...comb.conditions, args.condition];

    await ctx.db.patch(combId, { conditions: updated });
  },
});

export const removeCombatant = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const combId = ctx.db.normalizeId("combatants", args.id);
    if (!combId) return;
    await ctx.db.delete(combId);
  },
});

export const clearCombatants = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const normId = normalizeCampaignId(args.campaignId);
    const list = await ctx.db.query("combatants").collect();
    for (const c of list) {
      if (matchesCampaign(c.campaignId, normId)) {
        await ctx.db.delete(c._id);
      }
    }

    const existingState = await ctx.db
      .query("combatState")
      .withIndex("by_campaign", (q) => q.eq("campaignId", normId))
      .first();
    if (existingState) {
      await ctx.db.patch(existingState._id, {
        activeCombatTurnIndex: 0,
        combatRound: 1,
        updatedAt: new Date().toISOString(),
      });
    }
  },
});

// ============================================================================
// ROLADOR DE DADOS MULTIJOGADOR EM TEMPO REAL
// ============================================================================
export const listDiceRolls = query({
  args: { campaignId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const normId = normalizeCampaignId(args.campaignId);
    if (!normId) return [];
    const rolls = await ctx.db
      .query("diceRolls")
      .withIndex("by_campaign", (q) => q.eq("campaignId", normId))
      .order("desc")
      .take(30);

    return rolls.map((r) => ({
      ...r,
      id: r._id,
    }));
  },
});

export const addDiceRoll = mutation({
  args: {
    campaignId: v.optional(v.string()),
    rollerName: v.optional(v.string()),
    formula: v.string(),
    rolls: v.array(v.number()),
    modifier: v.number(),
    total: v.number(),
    label: v.string(),
    timestamp: v.string(),
    isCrit: v.optional(v.boolean()),
    isFumble: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const normId = normalizeCampaignId(args.campaignId);
    if (!normId) return null;
    const insertedId = await ctx.db.insert("diceRolls", {
      ...args,
      campaignId: normId,
    });

    // Mantém apenas as 40 rolagens mais recentes da campanha
    const all = await ctx.db
      .query("diceRolls")
      .withIndex("by_campaign", (q) => q.eq("campaignId", normId))
      .order("desc")
      .collect();
    if (all.length > 40) {
      for (const stale of all.slice(40)) {
        await ctx.db.delete(stale._id);
      }
    }

    return insertedId;
  },
});

export const clearDiceRolls = mutation({
  args: { campaignId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const normId = normalizeCampaignId(args.campaignId);
    const all = await ctx.db
      .query("diceRolls")
      .withIndex("by_campaign", (q) => q.eq("campaignId", normId))
      .collect();
    for (const r of all) {
      await ctx.db.delete(r._id);
    }
  },
});

// ============================================================================
// SCRATCHPAD DO MESTRE (PROTEGIDO DA VISÃO DO JOGADOR)
// ============================================================================
export const listScratchpad = query({
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
    if (role === "player") return [];

    const list = await ctx.db.query("scratchpadNotes").collect();
    return list
      .filter((s) => matchesCampaign(s.campaignId, args.campaignId))
      .map((s) => ({
        ...s,
        id: s._id,
      }));
  },
});

export const addScratchpad = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    text: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _, ...data } = args;
    return await ctx.db.insert("scratchpadNotes", {
      ...data,
      campaignId: normalizeCampaignId(args.campaignId),
    });
  },
});

export const removeScratchpad = mutation({
  args: {
    id: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const noteId = ctx.db.normalizeId("scratchpadNotes", args.id);
    if (!noteId) return;
    const note = await ctx.db.get(noteId);
    if (!note) return;
    await assertDmPermission(ctx, args.sessionToken, note.campaignId);
    await ctx.db.delete(noteId);
  },
});

export const markScratchpadConverted = mutation({
  args: {
    id: v.string(),
    convertedEntityHandle: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const noteId = ctx.db.normalizeId("scratchpadNotes", args.id);
    if (!noteId) return;
    const note = await ctx.db.get(noteId);
    if (!note) return;
    await assertDmPermission(ctx, args.sessionToken, note.campaignId);
    await ctx.db.patch(noteId, {
      convertedEntityHandle: args.convertedEntityHandle,
    });
  },
});
