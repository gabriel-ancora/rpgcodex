import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  requireDm,
  requireMember,
  requireDmOfRecord,
  memberOrNull,
  effectiveRole,
  collectByCampaign,
  firstByCampaign,
  getOrThrow,
  ViewerRole,
} from "./lib/tenancy";

/**
 * Modo Sessão: combate, rolagens de dados e bloco de notas do Mestre.
 *
 * Combate: todas as escritas são exclusivas do Mestre (não há vínculo entre
 * combatente e ficha de jogador que permita delegar PV/condições ao jogador).
 */

export type HealthState = "healthy" | "wounded" | "bloodied" | "down";

function healthStateOf(hp: number, maxHp: number): HealthState {
  if (hp <= 0) return "down";
  const ratio = hp / Math.max(1, maxHp);
  if (ratio <= 0.5) return "bloodied";
  if (ratio < 1) return "wounded";
  return "healthy";
}

/** Ordem canônica da iniciativa (maior primeiro; empate pela ordem de criação). */
function sortCombatants(list: Doc<"combatants">[]) {
  return [...list].sort(
    (a, b) => b.initiative - a.initiative || a._creationTime - b._creationTime
  );
}

async function sortedCombatants(ctx: QueryCtx, keys: string[]) {
  return sortCombatants(await collectByCampaign(ctx, "combatants", keys));
}

function combatantView(c: Doc<"combatants">, role: ViewerRole) {
  const base = {
    _id: c._id,
    _creationTime: c._creationTime,
    id: c._id as string,
    campaignId: c.campaignId,
    name: c.name,
    type: c.type,
    initiative: c.initiative,
    conditions: c.conditions,
    entityId: c.entityId,
    isHidden: c.isHidden ?? false,
  };
  if (role === "gm" || c.type === "pc") {
    return {
      ...base,
      healthState: healthStateOf(c.hp, c.maxHp) as HealthState | undefined,
      hp: c.hp as number | undefined,
      maxHp: c.maxHp as number | undefined,
      armorClass: c.armorClass as number | undefined,
      notes: c.notes as string | undefined,
    };
  }
  // Jogadores não recebem nenhuma informação de PV/vida/CA/notas de monstros e NPCs.
  return {
    ...base,
    healthState: undefined as HealthState | undefined,
    hp: undefined as number | undefined,
    maxHp: undefined as number | undefined,
    armorClass: undefined as number | undefined,
    notes: undefined as string | undefined,
  };
}

export const listCombatants = query({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    viewerRole: v.optional(v.union(v.literal("gm"), v.literal("player"))),
  },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return [];
    const role = effectiveRole(access, args.viewerRole);
    const list = await sortedCombatants(ctx, access.keys);
    return list
      .filter((c) => role === "gm" || !c.isHidden)
      .map((c) => combatantView(c, role));
  },
});

export const getCombatState = query({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    viewerRole: v.optional(v.union(v.literal("gm"), v.literal("player"))),
  },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return null;
    const role = effectiveRole(access, args.viewerRole);

    const state = await firstByCampaign(ctx, "combatState", access.keys);
    const all = await sortedCombatants(ctx, access.keys);
    const rawIndex = state?.activeCombatTurnIndex ?? 0;
    const active = all.length > 0 ? all[rawIndex % all.length] : undefined;

    // O índice devolvido é relativo à lista que o próprio visualizador recebe.
    const visible = role === "gm" ? all : all.filter((c) => !c.isHidden);
    const activeVisible = active && (role === "gm" || !active.isHidden) ? active : undefined;
    const activeIndex = activeVisible
      ? visible.findIndex((c) => c._id === activeVisible._id)
      : -1;

    return {
      campaignId: access.canonicalId,
      activeCombatTurnIndex: activeIndex,
      activeCombatantId: activeVisible ? (activeVisible._id as string) : null,
      combatRound: state?.combatRound ?? 1,
    };
  },
});

async function upsertCombatState(
  ctx: MutationCtx,
  canonicalId: string,
  keys: string[],
  next: { activeCombatTurnIndex: number; combatRound: number }
) {
  const existing = await firstByCampaign(ctx, "combatState", keys);
  const payload = { ...next, updatedAt: new Date().toISOString() };
  if (existing) {
    await ctx.db.patch(existing._id, payload);
  } else {
    await ctx.db.insert("combatState", { campaignId: canonicalId, ...payload });
  }
}

export const nextTurn = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
  },
  handler: async (ctx, args) => {
    const { canonicalId, keys } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const count = (await collectByCampaign(ctx, "combatants", keys)).length;
    if (count === 0) return;

    const existing = await firstByCampaign(ctx, "combatState", keys);
    const currentIdx = existing?.activeCombatTurnIndex ?? 0;
    const currentRound = existing?.combatRound ?? 1;
    const nextIdx = (currentIdx + 1) % count;
    await upsertCombatState(ctx, canonicalId, keys, {
      activeCombatTurnIndex: nextIdx,
      combatRound: nextIdx === 0 ? currentRound + 1 : currentRound,
    });
  },
});

export const rollAllInitiatives = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
  },
  handler: async (ctx, args) => {
    const { canonicalId, keys } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const combatants = await collectByCampaign(ctx, "combatants", keys);
    for (const c of combatants) {
      const bonus = c.type === "pc" ? 3 : 2;
      const rolled = Math.floor(Math.random() * 20) + 1 + bonus;
      await ctx.db.patch(c._id, { initiative: rolled });
    }
    await upsertCombatState(ctx, canonicalId, keys, { activeCombatTurnIndex: 0, combatRound: 1 });
  },
});

export const addCombatant = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    name: v.string(),
    type: v.union(v.literal("pc"), v.literal("npc"), v.literal("monster")),
    initiative: v.number(),
    hp: v.number(),
    maxHp: v.number(),
    armorClass: v.number(),
    conditions: v.array(v.string()),
    notes: v.string(),
    entityId: v.optional(v.string()),
    isHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { canonicalId } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const { sessionToken: _t, campaignId: _c, ...data } = args;
    const maxHp = Math.max(1, Math.floor(data.maxHp));
    return await ctx.db.insert("combatants", {
      ...data,
      maxHp,
      hp: Math.max(0, Math.min(maxHp, Math.floor(data.hp))),
      campaignId: canonicalId,
    });
  },
});

async function loadCombatantForDm(ctx: MutationCtx, sessionToken: string, id: string) {
  const comb = await getOrThrow(ctx, "combatants", id);
  await requireDmOfRecord(ctx, sessionToken, comb.campaignId);
  return comb;
}

export const adjustHp = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    delta: v.number(),
  },
  handler: async (ctx, args) => {
    const comb = await loadCombatantForDm(ctx, args.sessionToken, args.id);
    const nextHp = Math.max(0, Math.min(comb.maxHp, comb.hp + Math.trunc(args.delta)));
    await ctx.db.patch(comb._id, { hp: nextHp });
  },
});

export const toggleCondition = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    condition: v.string(),
  },
  handler: async (ctx, args) => {
    const comb = await loadCombatantForDm(ctx, args.sessionToken, args.id);
    const has = comb.conditions.includes(args.condition);
    await ctx.db.patch(comb._id, {
      conditions: has
        ? comb.conditions.filter((c) => c !== args.condition)
        : [...comb.conditions, args.condition],
    });
  },
});

/** Oculta/revela um combatente para os jogadores. */
export const setCombatantHidden = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    isHidden: v.boolean(),
  },
  handler: async (ctx, args) => {
    const comb = await loadCombatantForDm(ctx, args.sessionToken, args.id);
    await ctx.db.patch(comb._id, { isHidden: args.isHidden });
  },
});

export const removeCombatant = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const comb = await loadCombatantForDm(ctx, args.sessionToken, args.id);
    await ctx.db.delete(comb._id);
  },
});

export const clearCombatants = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
  },
  handler: async (ctx, args) => {
    const { canonicalId, keys } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const list = await collectByCampaign(ctx, "combatants", keys);
    for (const c of list) await ctx.db.delete(c._id);
    await upsertCombatState(ctx, canonicalId, keys, { activeCombatTurnIndex: 0, combatRound: 1 });
  },
});

// ============================================================================
// ROLADOR DE DADOS MULTIJOGADOR (resultados gerados no servidor)
// ============================================================================

const MAX_STORED_ROLLS = 40;

export const listDiceRolls = query({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    viewerRole: v.optional(v.union(v.literal("gm"), v.literal("player"))),
  },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access) return [];
    const role = effectiveRole(access, args.viewerRole);
    const rolls: Doc<"diceRolls">[] = [];
    for (const key of access.keys) {
      rolls.push(
        ...(await ctx.db
          .query("diceRolls")
          .withIndex("by_campaign", (q) => q.eq("campaignId", key))
          .order("desc")
          .take(MAX_STORED_ROLLS + 20))
      );
    }
    const isHiddenDmRoll = (r: Doc<"diceRolls">) =>
      r.isDmRoll === true ||
      (Boolean(r.rollerUserId) && r.rollerUserId === access.camp.dmUserId) ||
      (r.isDmRoll === undefined &&
        !r.rollerUserId &&
        Boolean(access.camp.dmName) &&
        r.rollerName === access.camp.dmName);

    return rolls
      .filter((r) => role === "gm" || !isHiddenDmRoll(r))
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 30)
      .map((r) => ({
        ...r,
        id: r._id,
        isDmRoll: isHiddenDmRoll(r),
      }));
  },
});

/**
 * Rola dados no servidor. Qualquer membro da campanha pode rolar; rolagens do
 * Mestre são marcadas como `isDmRoll: true` e ocultadas dos jogadores.
 */
export const addDiceRoll = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    sides: v.number(),
    count: v.optional(v.number()),
    modifier: v.optional(v.number()),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, isDm, canonicalId, keys } = await requireMember(
      ctx,
      args.sessionToken,
      args.campaignId
    );

    const sides = Math.floor(args.sides);
    const count = Math.floor(args.count ?? 1);
    const modifier = Math.trunc(args.modifier ?? 0);
    if (!Number.isFinite(sides) || sides < 2 || sides > 1000) {
      throw new Error("Número de faces inválido (2 a 1000).");
    }
    if (!Number.isFinite(count) || count < 1 || count > 100) {
      throw new Error("Quantidade de dados inválida (1 a 100).");
    }
    if (!Number.isFinite(modifier) || Math.abs(modifier) > 1000) {
      throw new Error("Modificador inválido.");
    }
    const label = (args.label ?? "Rolagem").trim().slice(0, 80) || "Rolagem";

    const rolls: number[] = [];
    for (let i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((acc, n) => acc + n, 0) + modifier;
    const modStr = modifier > 0 ? ` + ${modifier}` : modifier < 0 ? ` - ${Math.abs(modifier)}` : "";

    const doc = {
      campaignId: canonicalId,
      rollerName: user.name,
      rollerUserId: user.id,
      isDmRoll: isDm,
      formula: `${count}d${sides}${modStr}`,
      rolls,
      modifier,
      total,
      label,
      // ISO 8601; formatação para exibição no cliente.
      timestamp: new Date().toISOString(),
      isCrit: sides === 20 && rolls.includes(20),
      isFumble: sides === 20 && rolls.includes(1) && !rolls.includes(20),
    };
    const insertedId = await ctx.db.insert("diceRolls", doc);

    // Mantém apenas as rolagens mais recentes da campanha.
    for (const key of keys) {
      const recent = await ctx.db
        .query("diceRolls")
        .withIndex("by_campaign", (q) => q.eq("campaignId", key))
        .order("desc")
        .take(MAX_STORED_ROLLS + 50);
      for (const stale of recent.slice(MAX_STORED_ROLLS)) await ctx.db.delete(stale._id);
    }

    return { ...doc, id: insertedId as string };
  },
});

export const removeDiceRoll = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const roll = await getOrThrow(ctx, "diceRolls", args.id);
    await requireDmOfRecord(ctx, args.sessionToken, roll.campaignId);
    await ctx.db.delete(roll._id);
  },
});

export const clearDiceRolls = mutation({
  args: { sessionToken: v.string(), campaignId: v.string() },
  handler: async (ctx, args) => {
    const { keys } = await requireDm(ctx, args.sessionToken, args.campaignId);
    const all = await collectByCampaign(ctx, "diceRolls", keys);
    for (const r of all) await ctx.db.delete(r._id);
  },
});

// ============================================================================
// SCRATCHPAD DO MESTRE (nunca enviado a jogadores)
// ============================================================================

export const listScratchpad = query({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    viewerRole: v.optional(v.union(v.literal("gm"), v.literal("player"))),
  },
  handler: async (ctx, args) => {
    const access = await memberOrNull(ctx, args.sessionToken, args.campaignId);
    if (!access || effectiveRole(access, args.viewerRole) !== "gm") return [];
    const list = await collectByCampaign(ctx, "scratchpadNotes", access.keys);
    return list.map((s) => ({ ...s, id: s._id }));
  },
});

export const addScratchpad = mutation({
  args: {
    sessionToken: v.string(),
    campaignId: v.string(),
    text: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    const { canonicalId } = await requireDm(ctx, args.sessionToken, args.campaignId);
    return await ctx.db.insert("scratchpadNotes", {
      text: args.text,
      timestamp: args.timestamp,
      campaignId: canonicalId,
    });
  },
});

async function loadNoteForDm(ctx: MutationCtx, sessionToken: string, id: string) {
  const note = await getOrThrow(ctx, "scratchpadNotes", id);
  await requireDmOfRecord(ctx, sessionToken, note.campaignId);
  return note;
}

export const removeScratchpad = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await loadNoteForDm(ctx, args.sessionToken, args.id);
    await ctx.db.delete(note._id);
  },
});

export const markScratchpadConverted = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    convertedEntityHandle: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await loadNoteForDm(ctx, args.sessionToken, args.id);
    await ctx.db.patch(note._id, { convertedEntityHandle: args.convertedEntityHandle });
  },
});
