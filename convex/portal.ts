import { query, mutation, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  requireDm,
  requireMember,
  requireDmOfRecord,
  requireMemberOfRecord,
  memberOrNull,
  effectiveRole,
  collectByCampaign,
  firstByCampaign,
  getOrThrow,
  ERR_NOT_FOUND,
} from "./lib/tenancy";
import { getOrCreatePartyResources } from "./lib/defaults";

/**
 * Portal dos jogadores: missões, diários e recursos do grupo.
 *
 * Permissões:
 *  - Missões: somente o Mestre altera (inclusive objetivos).
 *  - Diário coletivo: qualquer membro escreve; edição/remoção pelo autor ou pelo Mestre.
 *  - Diário pessoal: somente o dono; o Mestre lê apenas notas compartilhadas com ele.
 *  - Recursos do grupo (moedas, suprimentos, inventário e base): qualquer membro altera,
 *    pois a interface do Portal permite que jogadores administrem o inventário comum.
 *    A substituição completa (restauração de backup) é exclusiva do Mestre.
 */

const viewerRoleValidator = v.optional(v.union(v.literal("gm"), v.literal("player")));

const questStatusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("failed")
);

const objectiveValidator = v.object({
  id: v.string(),
  text: v.string(),
  completed: v.boolean(),
  isSecret: v.optional(v.boolean()),
});

const noteCategoryValidator = v.union(
  v.literal("theory"),
  v.literal("secret"),
  v.literal("backstory"),
  v.literal("goal")
);

const itemCategoryValidator = v.union(
  v.literal("weapon"),
  v.literal("relic"),
  v.literal("consumable"),
  v.literal("document"),
  v.literal("treasure")
);

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

// ============================================================================
// MISSÕES
// ============================================================================

export const listQuests = query({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    viewerRole: viewerRoleValidator,
  },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return [];
    const role = effectiveRole(access, args.viewerRole);
    const quests = await collectByCampaign(ctx, "quests", access.keys);
    return quests
      .filter((q) => role === "gm" || q.isPublic)
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
    sessionToken: v.string(),
    campaignId: v.string(),
    title: v.string(),
    subtitle: v.string(),
    giverHandle: v.string(),
    locationHandle: v.string(),
    status: questStatusValidator,
    // Padrão: oculta dos jogadores.
    isPublic: v.optional(v.boolean()),
    description: v.string(),
    gmSecretNote: v.optional(v.string()),
    reward: v.string(),
    objectives: v.array(objectiveValidator),
  },
  handler: async (ctx, args) => {
    const { canonicalId } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _t, campaignId: _c, isPublic, ...data } = args;
    return await ctx.db.insert("quests", {
      ...data,
      isPublic: isPublic === true,
      campaignId: canonicalId,
    });
  },
});

async function loadQuestForDm(ctx: MutationCtx, sessionToken: string, questId: string) {
  const quest = await getOrThrow(ctx, "quests", questId);
  await requireDmOfRecord(ctx, sessionToken, quest.campaignId);
  return quest;
}

export const updateQuestStatus = mutation({
  args: {
    sessionToken: v.string(),
    questId: v.string(),
    status: questStatusValidator,
  },
  handler: async (ctx, args) => {
    const quest = await loadQuestForDm(ctx, args.sessionToken, args.questId);
    await ctx.db.patch(quest._id, { status: args.status });
  },
});

export const updateQuest = mutation({
  args: {
    sessionToken: v.string(),
    questId: v.string(),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    giverHandle: v.optional(v.string()),
    locationHandle: v.optional(v.string()),
    status: v.optional(questStatusValidator),
    isPublic: v.optional(v.boolean()),
    description: v.optional(v.string()),
    gmSecretNote: v.optional(v.string()),
    reward: v.optional(v.string()),
    objectives: v.optional(v.array(objectiveValidator)),
  },
  handler: async (ctx, args) => {
    const quest = await loadQuestForDm(ctx, args.sessionToken, args.questId);
    const { sessionToken: _t, questId: _q, ...updates } = args;
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(quest._id, clean);
  },
});

export const toggleObjective = mutation({
  args: {
    sessionToken: v.string(),
    questId: v.string(),
    objectiveId: v.string(),
  },
  handler: async (ctx, args) => {
    const quest = await loadQuestForDm(ctx, args.sessionToken, args.questId);
    if (!quest.objectives.some((o) => o.id === args.objectiveId)) throw new Error(ERR_NOT_FOUND);
    await ctx.db.patch(quest._id, {
      objectives: quest.objectives.map((o) =>
        o.id === args.objectiveId ? { ...o, completed: !o.completed } : o
      ),
    });
  },
});

export const removeQuest = mutation({
  args: {
    sessionToken: v.string(),
    questId: v.string(),
  },
  handler: async (ctx, args) => {
    const quest = await loadQuestForDm(ctx, args.sessionToken, args.questId);
    await ctx.db.delete(quest._id);
  },
});

// ============================================================================
// DIÁRIO COLETIVO
// ============================================================================

export const listJournal = query({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    viewerRole: viewerRoleValidator,
  },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return [];
    const role = effectiveRole(access, args.viewerRole);
    const entries = await collectByCampaign(ctx, "journalEntries", access.keys);
    return entries
      .filter((j) => role === "gm" || j.isPublic || j.authorUserId === access.user.id)
      .map((j) => ({
        ...j,
        id: j._id,
        canEdit: access.isDm || j.authorUserId === access.user.id,
      }));
  },
});

export const addJournal = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    sessionNumber: v.number(),
    title: v.string(),
    inGameDate: v.string(),
    // Nome exibido (personagem ou jogador); se vazio, usa o nome da conta.
    author: v.optional(v.string()),
    content: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user, canonicalId } = await requireMember(ctx, args.sessionToken, args.campaignId);
    return await ctx.db.insert("journalEntries", {
      campaignId: canonicalId,
      sessionNumber: args.sessionNumber,
      title: args.title,
      inGameDate: args.inGameDate,
      author: args.author?.trim() || user.name,
      authorUserId: user.id,
      content: args.content,
      isPublic: args.isPublic,
    });
  },
});

async function loadJournalForEditor(ctx: MutationCtx, sessionToken: string, journalId: string) {
  const entry = await getOrThrow(ctx, "journalEntries", journalId);
  const access = await requireMemberOfRecord(ctx, sessionToken, entry.campaignId);
  if (!access.isDm && entry.authorUserId !== access.user.id) {
    throw new Error("Apenas o autor ou o Mestre pode alterar esta crônica.");
  }
  return entry;
}

export const updateJournal = mutation({
  args: {
    sessionToken: v.string(),
    journalId: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const entry = await loadJournalForEditor(ctx, args.sessionToken, args.journalId);
    const { journalId: _j, sessionToken: _t, ...updates } = args;
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(entry._id, clean);
  },
});

export const removeJournal = mutation({
  args: {
    sessionToken: v.string(),
    journalId: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await loadJournalForEditor(ctx, args.sessionToken, args.journalId);
    await ctx.db.delete(entry._id);
  },
});

// ============================================================================
// DIÁRIO PESSOAL
// ============================================================================

/**
 * Notas pessoais do usuário da sessão. O Mestre (em visão de Mestre) também
 * recebe as notas de jogadores que foram explicitamente compartilhadas com ele.
 */
export const listPersonalNotes = query({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    viewerRole: viewerRoleValidator,
    // Ignorado: o jogador é sempre o usuário da sessão.
    playerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return [];
    const role = effectiveRole(access, args.viewerRole);
    const notes = await collectByCampaign(ctx, "personalJournalNotes", access.keys);
    return notes
      .filter(
        (n) => n.playerId === access.user.id || (role === "gm" && n.sharedWithDm === true)
      )
      .map((n) => ({ ...n, id: n._id, isOwn: n.playerId === access.user.id }));
  },
});

export const addPersonalNote = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    playerName: v.optional(v.string()),
    characterName: v.string(),
    title: v.string(),
    content: v.string(),
    category: noteCategoryValidator,
    sharedWithDm: v.boolean(),
    // Ignorado: o dono é sempre o usuário da sessão.
    playerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, canonicalId } = await requireMember(ctx, args.sessionToken, args.campaignId);
    return await ctx.db.insert("personalJournalNotes", {
      campaignId: canonicalId,
      playerId: user.id,
      playerName: args.playerName?.trim() || user.name,
      characterName: args.characterName,
      title: args.title,
      content: args.content,
      category: args.category,
      sharedWithDm: args.sharedWithDm,
      updatedAt: new Date().toISOString(),
    });
  },
});

async function loadOwnNote(ctx: MutationCtx, sessionToken: string, id: string) {
  const note = await getOrThrow(ctx, "personalJournalNotes", id);
  const access = await requireMemberOfRecord(ctx, sessionToken, note.campaignId);
  if (note.playerId !== access.user.id) {
    throw new Error("Apenas o autor pode alterar esta nota pessoal.");
  }
  return note;
}

export const updatePersonalNote = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(noteCategoryValidator),
    sharedWithDm: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const note = await loadOwnNote(ctx, args.sessionToken, args.id);
    const { id: _i, sessionToken: _t, ...updates } = args;
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(note._id, { ...clean, updatedAt: new Date().toISOString() });
  },
});

export const removePersonalNote = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await loadOwnNote(ctx, args.sessionToken, args.id);
    await ctx.db.delete(note._id);
  },
});

// ============================================================================
// RECURSOS COMPARTILHADOS DO GRUPO & BASE
// ============================================================================

async function resourcesForMember(ctx: MutationCtx, sessionToken: string, campaignId: string) {
  const { canonicalId, keys } = await requireMember(ctx, sessionToken, campaignId);
  return await getOrCreatePartyResources(ctx, canonicalId, keys);
}

export const getResources = query({
  args: { sessionToken: v.string(), campaignId: v.string() },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return null;
    return await firstByCampaign(ctx, "partyResources", access.keys);
  },
});

export const updateCurrency = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
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
    const res = await resourcesForMember(ctx, args.sessionToken, args.campaignId);
    if (!Number.isFinite(args.delta)) throw new Error("Valor inválido.");
    const nextVal = Math.max(0, res[args.field] + Math.trunc(args.delta));
    await ctx.db.patch(res._id, { [args.field]: nextVal } as Partial<Doc<"partyResources">>);
  },
});

export const addInventoryItem = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    name: v.string(),
    quantity: v.number(),
    holder: v.string(),
    category: itemCategoryValidator,
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const res = await resourcesForMember(ctx, args.sessionToken, args.campaignId);
    const newItem = {
      id: `item-${Date.now()}-${randomSuffix()}`,
      name: args.name,
      quantity: Math.max(0, Math.floor(args.quantity)),
      holder: args.holder,
      category: args.category,
      notes: args.notes,
    };
    await ctx.db.patch(res._id, { items: [...res.items, newItem] });
    return newItem.id;
  },
});

export const removeInventoryItem = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const res = await resourcesForMember(ctx, args.sessionToken, args.campaignId);
    if (!res.items.some((i) => i.id === args.itemId)) throw new Error(ERR_NOT_FOUND);
    await ctx.db.patch(res._id, { items: res.items.filter((i) => i.id !== args.itemId) });
  },
});

export const toggleStrongholdUpgrade = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    upgradeId: v.string(),
  },
  handler: async (ctx, args) => {
    const res = await resourcesForMember(ctx, args.sessionToken, args.campaignId);
    if (!res.stronghold.upgrades.some((u) => u.id === args.upgradeId)) {
      throw new Error(ERR_NOT_FOUND);
    }
    await ctx.db.patch(res._id, {
      stronghold: {
        ...res.stronghold,
        upgrades: res.stronghold.upgrades.map((u) =>
          u.id === args.upgradeId ? { ...u, installed: !u.installed } : u
        ),
      },
    });
  },
});

export const updateStronghold = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    locationHandle: v.optional(v.string()),
    integrity: v.optional(v.number()),
    maxIntegrity: v.optional(v.number()),
    upkeepPerMonth: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const res = await resourcesForMember(ctx, args.sessionToken, args.campaignId);
    const sh = res.stronghold;
    const nextMax =
      args.maxIntegrity !== undefined ? Math.max(1, args.maxIntegrity) : sh.maxIntegrity;
    const rawIntegrity = args.integrity !== undefined ? args.integrity : sh.integrity;

    await ctx.db.patch(res._id, {
      stronghold: {
        ...sh,
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.type !== undefined ? { type: args.type } : {}),
        ...(args.locationHandle !== undefined ? { locationHandle: args.locationHandle } : {}),
        ...(args.upkeepPerMonth !== undefined ? { upkeepPerMonth: args.upkeepPerMonth } : {}),
        ...(args.description !== undefined ? { description: args.description } : {}),
        maxIntegrity: nextMax,
        integrity: Math.max(0, Math.min(nextMax, rawIntegrity)),
      },
    });
  },
});

export const addStrongholdUpgrade = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    name: v.string(),
    cost: v.string(),
    benefit: v.string(),
  },
  handler: async (ctx, args) => {
    const res = await resourcesForMember(ctx, args.sessionToken, args.campaignId);
    const newUpgrade = {
      id: `upg-${Date.now()}-${randomSuffix()}`,
      name: args.name,
      installed: false,
      cost: args.cost,
      benefit: args.benefit,
    };
    await ctx.db.patch(res._id, {
      stronghold: { ...res.stronghold, upgrades: [...res.stronghold.upgrades, newUpgrade] },
    });
    return newUpgrade.id;
  },
});

export const removeStrongholdUpgrade = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    upgradeId: v.string(),
  },
  handler: async (ctx, args) => {
    const res = await resourcesForMember(ctx, args.sessionToken, args.campaignId);
    if (!res.stronghold.upgrades.some((u) => u.id === args.upgradeId)) {
      throw new Error(ERR_NOT_FOUND);
    }
    await ctx.db.patch(res._id, {
      stronghold: {
        ...res.stronghold,
        upgrades: res.stronghold.upgrades.filter((u) => u.id !== args.upgradeId),
      },
    });
  },
});

/** Substituição completa (restauração de backup). Exclusiva do Mestre. */
export const replaceResources = mutation({
  args: {
    sessionToken: v.string(),
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
        category: itemCategoryValidator,
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
    const { canonicalId, keys } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const res = await getOrCreatePartyResources(ctx, canonicalId, keys);
    const { campaignId: _c, sessionToken: _t, ...payload } = args;
    await ctx.db.patch(res._id, payload);
  },
});
