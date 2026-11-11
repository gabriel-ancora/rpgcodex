import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  matchesCampaign,
  normalizeCampaignId,
  resolveEffectiveRole,
  assertDmPermission,
} from "./lib/tenancy";

export const listQuests = query({
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

    const list = await ctx.db.query("quests").collect();
    return list
      .filter((q) => {
        if (!matchesCampaign(q.campaignId, args.campaignId)) return false;
        if (role === "player" && !q.isPublic) return false;
        return true;
      })
      .map((q) => ({
        ...q,
        id: q._id,
        gmSecretNote: role === "player" ? undefined : q.gmSecretNote,
        objectives:
          role === "player"
            ? q.objectives.filter((o) => !o.isSecret || o.completed)
            : q.objectives,
      }));
  },
});

export const createQuest = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    title: v.string(),
    subtitle: v.string(),
    giverHandle: v.string(),
    locationHandle: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("failed")
    ),
    isPublic: v.boolean(),
    description: v.string(),
    gmSecretNote: v.optional(v.string()),
    reward: v.string(),
    objectives: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        completed: v.boolean(),
        isSecret: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertDmPermission(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _, ...data } = args;
    return await ctx.db.insert("quests", {
      ...data,
      campaignId: normalizeCampaignId(args.campaignId),
    });
  },
});

export const updateQuestStatus = mutation({
  args: {
    questId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("failed")
    ),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const questId = ctx.db.normalizeId("quests", args.questId);
    if (!questId) return;
    const quest = await ctx.db.get(questId);
    if (!quest) return;
    await assertDmPermission(ctx, args.sessionToken, quest.campaignId);
    await ctx.db.patch(questId, { status: args.status });
  },
});

export const toggleObjective = mutation({
  args: {
    questId: v.string(),
    objectiveId: v.string(),
  },
  handler: async (ctx, args) => {
    const questId = ctx.db.normalizeId("quests", args.questId);
    if (!questId) return;
    const quest = await ctx.db.get(questId);
    if (!quest) return;

    const updated = quest.objectives.map((o) =>
      o.id === args.objectiveId ? { ...o, completed: !o.completed } : o
    );
    await ctx.db.patch(questId, { objectives: updated });
  },
});

export const removeQuest = mutation({
  args: {
    questId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const questId = ctx.db.normalizeId("quests", args.questId);
    if (!questId) return;
    const quest = await ctx.db.get(questId);
    if (!quest) return;
    await assertDmPermission(ctx, args.sessionToken, quest.campaignId);
    await ctx.db.delete(questId);
  },
});

export const listJournal = query({
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

    const list = await ctx.db.query("journalEntries").collect();
    return list
      .filter((j) => {
        if (!matchesCampaign(j.campaignId, args.campaignId)) return false;
        if (role === "player" && !j.isPublic) return false;
        return true;
      })
      .map((j) => ({
        ...j,
        id: j._id,
      }));
  },
});

export const addJournal = mutation({
  args: {
    campaignId: v.optional(v.string()),
    sessionNumber: v.number(),
    title: v.string(),
    inGameDate: v.string(),
    author: v.string(),
    content: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("journalEntries", {
      ...args,
      campaignId: normalizeCampaignId(args.campaignId),
    });
  },
});

export const updateJournal = mutation({
  args: {
    journalId: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const journalId = ctx.db.normalizeId("journalEntries", args.journalId);
    if (!journalId) return;
    const { journalId: _, ...updates } = args;
    await ctx.db.patch(journalId, updates);
  },
});

export const removeJournal = mutation({
  args: { journalId: v.string() },
  handler: async (ctx, args) => {
    const journalId = ctx.db.normalizeId("journalEntries", args.journalId);
    if (!journalId) return;
    await ctx.db.delete(journalId);
  },
});

// ============================================================================
// DIÁRIO PESSOAL DOS JOGADORES (COM PRIVACIDADE PARA O MESTRE)
// ============================================================================
export const listPersonalNotes = query({
  args: {
    campaignId: v.optional(v.string()),
    playerId: v.optional(v.string()),
    viewerRole: v.optional(v.union(v.literal("gm"), v.literal("player"))),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const role = await resolveEffectiveRole(ctx, {
      sessionToken: args.sessionToken,
      viewerRole: args.viewerRole,
      campaignId: args.campaignId,
    });
    const normId = normalizeCampaignId(args.campaignId);
    if (!normId) return [];

    const list = await ctx.db
      .query("personalJournalNotes")
      .withIndex("by_campaign", (q) => q.eq("campaignId", normId))
      .collect();

    return list
      .filter((note) => {
        if (role === "gm") {
          return note.sharedWithDm || Boolean(args.playerId && note.playerId === args.playerId);
        }
        if (args.playerId) {
          return note.playerId === args.playerId;
        }
        return false;
      })
      .map((n) => ({
        ...n,
        id: n._id,
      }));
  },
});

export const addPersonalNote = mutation({
  args: {
    campaignId: v.optional(v.string()),
    playerId: v.string(),
    playerName: v.string(),
    characterName: v.string(),
    title: v.string(),
    content: v.string(),
    category: v.union(
      v.literal("theory"),
      v.literal("secret"),
      v.literal("backstory"),
      v.literal("goal")
    ),
    sharedWithDm: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("personalJournalNotes", {
      ...args,
      campaignId: normalizeCampaignId(args.campaignId),
      updatedAt: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  },
});

export const updatePersonalNote = mutation({
  args: {
    id: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("theory"),
        v.literal("secret"),
        v.literal("backstory"),
        v.literal("goal")
      )
    ),
    sharedWithDm: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const noteId = ctx.db.normalizeId("personalJournalNotes", args.id);
    if (!noteId) return;
    const { id: _, ...updates } = args;
    await ctx.db.patch(noteId, {
      ...updates,
      updatedAt: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  },
});

export const removePersonalNote = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const noteId = ctx.db.normalizeId("personalJournalNotes", args.id);
    if (!noteId) return;
    await ctx.db.delete(noteId);
  },
});

// ============================================================================
// RECURSOS COMPARTILHADOS DO GRUPO & BASE (STRONGHOLD)
// ============================================================================
async function getOrCreateCampaignResources(ctx: any, campaignId?: string) {
  const normId = normalizeCampaignId(campaignId);
  if (!normId) return null;
  const all = await ctx.db.query("partyResources").collect();
  let res = all.find((r: any) => matchesCampaign(r.campaignId, normId));
  if (!res) {
    const id = await ctx.db.insert("partyResources", {
      campaignId: normId,
      gold: 0,
      silver: 0,
      copper: 0,
      rations: 0,
      torches: 0,
      healerKits: 0,
      items: [],
      stronghold: {
        name: "Base da Companhia",
        type: "Refúgio",
        locationHandle: "",
        integrity: 100,
        maxIntegrity: 100,
        upkeepPerMonth: "0 PO",
        description: "Configure o nome, descrição e melhorias da base de operações do grupo.",
        upgrades: [],
      },
    });
    res = await ctx.db.get(id);
  }
  return res;
}

export const getResources = query({
  args: { campaignId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("partyResources").collect();
    return (
      all.find((r) => matchesCampaign(r.campaignId, args.campaignId)) ?? null
    );
  },
});

export const updateCurrency = mutation({
  args: {
    campaignId: v.optional(v.string()),
    field: v.union(
      v.literal("gold"),
      v.literal("silver"),
      v.literal("copper"),
      v.literal("rations"),
      v.literal("torches"),
      v.literal("healerKits")
    ),
    delta: v.number(),
  },
  handler: async (ctx, args) => {
    const res = await getOrCreateCampaignResources(ctx, args.campaignId);
    if (!res) return;

    const currentVal = res[args.field];
    const nextVal = Math.max(0, currentVal + args.delta);
    await ctx.db.patch(res._id, {
      [args.field]: nextVal,
      campaignId: normalizeCampaignId(args.campaignId),
    });
  },
});

export const addInventoryItem = mutation({
  args: {
    campaignId: v.optional(v.string()),
    name: v.string(),
    quantity: v.number(),
    holder: v.string(),
    category: v.union(
      v.literal("weapon"),
      v.literal("relic"),
      v.literal("consumable"),
      v.literal("document"),
      v.literal("treasure")
    ),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const res = await getOrCreateCampaignResources(ctx, args.campaignId);
    if (!res) return;

    const newItem = {
      id: `item-${Date.now()}`,
      name: args.name,
      quantity: args.quantity,
      holder: args.holder,
      category: args.category,
      notes: args.notes,
    };

    await ctx.db.patch(res._id, {
      campaignId: normalizeCampaignId(args.campaignId),
      items: [...res.items, newItem],
    });
  },
});

export const removeInventoryItem = mutation({
  args: {
    campaignId: v.optional(v.string()),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const res = await getOrCreateCampaignResources(ctx, args.campaignId);
    if (!res) return;

    const updated = res.items.filter((i: any) => i.id !== args.itemId);
    await ctx.db.patch(res._id, { items: updated });
  },
});

export const toggleStrongholdUpgrade = mutation({
  args: {
    campaignId: v.optional(v.string()),
    upgradeId: v.string(),
  },
  handler: async (ctx, args) => {
    const res = await getOrCreateCampaignResources(ctx, args.campaignId);
    if (!res) return;

    const updatedUpgrades = res.stronghold.upgrades.map((u: any) =>
      u.id === args.upgradeId ? { ...u, installed: !u.installed } : u
    );

    await ctx.db.patch(res._id, {
      stronghold: {
        ...res.stronghold,
        upgrades: updatedUpgrades,
      },
    });
  },
});

export const updateStronghold = mutation({
  args: {
    campaignId: v.optional(v.string()),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    locationHandle: v.optional(v.string()),
    integrity: v.optional(v.number()),
    maxIntegrity: v.optional(v.number()),
    upkeepPerMonth: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const res = await getOrCreateCampaignResources(ctx, args.campaignId);
    if (!res) return;

    const { campaignId: _, ...updates } = args;
    const nextMax = updates.maxIntegrity !== undefined ? Math.max(1, updates.maxIntegrity) : res.stronghold.maxIntegrity;
    const rawIntegrity = updates.integrity !== undefined ? updates.integrity : res.stronghold.integrity;
    const nextIntegrity = Math.max(0, Math.min(nextMax, rawIntegrity));

    await ctx.db.patch(res._id, {
      stronghold: {
        ...res.stronghold,
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.type !== undefined ? { type: updates.type } : {}),
        ...(updates.locationHandle !== undefined ? { locationHandle: updates.locationHandle } : {}),
        ...(updates.upkeepPerMonth !== undefined ? { upkeepPerMonth: updates.upkeepPerMonth } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        maxIntegrity: nextMax,
        integrity: nextIntegrity,
      },
    });
  },
});

export const addStrongholdUpgrade = mutation({
  args: {
    campaignId: v.optional(v.string()),
    name: v.string(),
    cost: v.string(),
    benefit: v.string(),
  },
  handler: async (ctx, args) => {
    const res = await getOrCreateCampaignResources(ctx, args.campaignId);
    if (!res) return;

    const newUpgrade = {
      id: `upg-${Date.now()}`,
      name: args.name,
      installed: false,
      cost: args.cost,
      benefit: args.benefit,
    };

    await ctx.db.patch(res._id, {
      stronghold: {
        ...res.stronghold,
        upgrades: [...res.stronghold.upgrades, newUpgrade],
      },
    });
  },
});

export const removeStrongholdUpgrade = mutation({
  args: {
    campaignId: v.optional(v.string()),
    upgradeId: v.string(),
  },
  handler: async (ctx, args) => {
    const res = await getOrCreateCampaignResources(ctx, args.campaignId);
    if (!res) return;

    await ctx.db.patch(res._id, {
      stronghold: {
        ...res.stronghold,
        upgrades: res.stronghold.upgrades.filter((u: any) => u.id !== args.upgradeId),
      },
    });
  },
});

export const replaceResources = mutation({
  args: {
    campaignId: v.string(),
    gold: v.number(),
    silver: v.number(),
    copper: v.number(),
    rations: v.number(),
    torches: v.number(),
    healerKits: v.number(),
    items: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        quantity: v.number(),
        holder: v.string(),
        category: v.union(
          v.literal("weapon"),
          v.literal("relic"),
          v.literal("consumable"),
          v.literal("document"),
          v.literal("treasure")
        ),
        notes: v.string(),
      })
    ),
    stronghold: v.object({
      name: v.string(),
      type: v.string(),
      locationHandle: v.string(),
      integrity: v.number(),
      maxIntegrity: v.number(),
      upkeepPerMonth: v.string(),
      description: v.string(),
      upgrades: v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          installed: v.boolean(),
          cost: v.string(),
          benefit: v.string(),
        })
      ),
    }),
  },
  handler: async (ctx, args) => {
    const normId = normalizeCampaignId(args.campaignId);
    if (!normId) return;
    const res = await getOrCreateCampaignResources(ctx, normId);
    if (!res) return;
    const { campaignId: _, ...payload } = args;
    await ctx.db.patch(res._id, {
      ...payload,
      campaignId: normId,
    });
  },
});
